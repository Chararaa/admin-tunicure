// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';


export interface User {
  _id?: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

const AUTH_TOKEN_KEY = 'auth_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl.replace(/\/$/, ''); // remove trailing slash if any

  // BehaviourSubject interne (mutable) + observable public en lecture seule
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // expose la valeur courante rapidement (utile pour guards / conditions synchrone)
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  constructor(private http: HttpClient, private router: Router) {
    // initialisation : si token présent, vérifier côté serveur et initialiser user
    const token = this.getToken();
    if (token) {
      // on vérifie le token côté serveur ; si invalide, logout
      this.verifyToken().subscribe({
        next: (user) => this.currentUserSubject.next(user),
        error: () => this.clearSession()
      });
    }
  }

  /**
   * Appel de login : renvoie Observable<AuthResponse>.
   * Le tap stocke le token et initialise le currentUser.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const url = `${this.apiUrl}/auth/login`;
    const req = this.http.post<AuthResponse>(url, { email, password })
      .pipe(
        tap(resp => {
          if (!resp || !resp.token) {
            throw new Error('Réponse d\'authentification invalide : token manquant');
          }
          this.setToken(resp.token);
          this.currentUserSubject.next(resp.user ?? null);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError(err => this.handleError(err))
      );

    return req;
  }

  /**
   * Enregistrement (si nécessaire) — exemple générique.
   */
  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData)
      .pipe(catchError(err => this.handleError(err)));
  }

  /**
   * Vérifie le token côté serveur et renvoie directement l'objet User.
   */
  verifyToken(): Observable<User> {
    const url = `${this.apiUrl}/auth/verify`;
    return this.http.get<{ user: User }>(url)
      .pipe(
        map(res => {
          if (!res || !res.user) throw new Error('Token invalide ou réponse inattendue');
          return res.user;
        }),
        catchError(err => this.handleError(err))
      );
  }

  /**
   * Supprime tout côté client et (optionnel) redirige.
   * Si tu souhaites appeler un endpoint backend pour invalider le token (logout côté serveur),
   * ajoute l'appel ici avant de clearSession().
   */
  logout(redirectToLogin = true): void {
    this.clearSession();
    if (redirectToLogin) {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Getter/Setter encapsulés pour le token.
   */
  private setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  private removeToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  /**
   * Clear state local sans redirection.
   */
  private clearSession(): void {
    this.removeToken();
    this.currentUserSubject.next(null);
  }

  /**
   * Check synchrone si l'utilisateur est connecté (vérifie présence et expiration du token).
   * Note : pour une sécurité maximale, ne pas se fier uniquement à ce check; backend doit vérifier.
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  /**
   * Vérification simple de l'expiration du JWT (décodage base64 du payload).
   * Ne nécessite pas de dépendance externe.
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      if (!payload) return true;
      const json = JSON.parse(atob(this.padBase64(payload)));
      if (!json.exp) return false; // si pas d'exp, on considère non-expiré (mais backend doit vérifier)
      // exp est en secondes depuis epoch
      const nowSec = Math.floor(Date.now() / 1000);
      return json.exp < nowSec;
    } catch (e) {
      // en cas d'erreur de parsing, considérer le token comme invalide/expiré
      return true;
    }
  }

  // helper pour base64 url safe
  private padBase64(b64: string): string {
    // remplace url-safe chars
    b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    // padding
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    return b64;
  }

  /**
   * Vérifie si l'utilisateur a un rôle donné (synchrone).
   */
  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return !!user && user.role === role;
  }

  /**
   * Gestion centralisée des erreurs HTTP / réseau.
   * Ici on log plutôt que d'afficher UI; remplace par ton service de notification si tu as.
   */
  private handleError(error: any) {
    // console / monitoring
    console.error('[AuthService] Error:', error);

    // Exemples : gérer 401 -> clear session automatiquement
    if (error?.status === 401) {
      this.clearSession();
    }

    // Normaliser l'erreur renvoyée au composant appelant
    const message = error?.error?.message ?? error?.message ?? 'Erreur inconnue';
    return throwError(() => ({ status: error?.status, message }));
  }
}
