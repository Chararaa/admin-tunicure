import { environment } from '../../environments/environment';

import { ChangeDetectorRef, Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeListComponent } from '../employee-list/employee-list.component';
import { DoctorComponent } from '../doctor/doctor.component';
import { CommandeComponent } from '../commande/commande.component';
import { CalendrierComponent } from '../calendrier/calendrier.component';
import { NotificationComponent } from '../notification/notification.component';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { EmployeeService, Employee } from '../services/employee.service';
import { Observable, Subscription, of } from 'rxjs';
import { filter, switchMap, take, catchError } from 'rxjs/operators';
import { CategoryManagerComponent } from "../category-manager/category-manager.component";
import { GeneralCategoryManagerComponent } from "../general-category-manager/general-category-manager.component";

type View = 'dashboard' | 'employees' | 'doctors' | 'orders' | 'calendar' | 'gcategories' | 'categories';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    EmployeeListComponent,
    DoctorComponent,
    CommandeComponent,
    CalendrierComponent,
    NotificationComponent,
    CategoryManagerComponent,
    GeneralCategoryManagerComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnDestroy {
  defaultView: View = 'dashboard';
  currentView: View = this.defaultView;
  pageTitle = 'Tableau de bord';
  private loadingRoleCheck = false;

  // observable exposée au template (nom, email, role etc. venant du AuthService)
  public currentUser$: Observable<any>;

  // Employee complet correspondant au current user (si existant)
  public currentEmployee: Employee | null = null;
  private subs: Subscription[] = [];

  // dropdown
  public showUserMenu = false;

  // fallback local
  public avatarFallback = 'assets/images/profile/user-1.jpg';

  private viewRoles: Record<View, string[] | undefined> = {
    dashboard: undefined,
    employees: undefined,
    doctors: undefined,
    orders: undefined,
    calendar: undefined,
    categories: undefined,
    gcategories: undefined
  };

  constructor(
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private notifier: NotificationService,
    private employeeService: EmployeeService
  ) {
    this.currentUser$ = this.auth.currentUser$;

    // One-shot : dès que user existe, essayer de charger l'Employee correspondant
    const s = this.auth.currentUser$
      .pipe(
        filter(u => !!u),
        take(1),
        switchMap(u => {
          if (!u || !u._id) return of(null);
          return this.employeeService.getByUser(u._id).pipe(
            catchError(err => {
              // si pas d'employee, on ignore (peut être admin sans employee)
              console.warn('employee by-user not found or error', err);
              return of(null);
            })
          );
        })
      )
      .subscribe(emp => {
        if (emp) {
          this.currentEmployee = emp;
          this.cdr.detectChanges();
        }
      });

    this.subs.push(s);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }



  // ---------- IMAGE / AVATAR HELPERS ----------
  getEmployeeImage(): string {
    const empImg = this.currentEmployee?.personalInfo?.image;
    let img: string | undefined = empImg ?? undefined;

    const user = this.auth.currentUserValue;
    if (!img && user) {
      img = (user as any).image ?? (user as any).avatar ?? undefined;
    }

    if (!img) return this.avatarFallback;

    // normalize whitespace
    img = ('' + img).trim();

    // --- DATA URI detection (exact / embedded) ---
    // si la chaîne contient "data:" quelque part -> retourner la portion data:...
    const dataPos = img.indexOf('data:');
    if (dataPos !== -1) {
      const dataUri = img.slice(dataPos);
      // validate minimalement que ça ressemble à data:image/...
      if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(dataUri)) {
        return dataUri;
      }
      // si ce n'est pas une image base64, fallback
      return this.avatarFallback;
    }

    // --- URL absolue ?
    if (/^https?:\/\//i.test(img)) return img;

    // --- commence par slash => host + path
    if (img.startsWith('/')) return `${environment.apiUrl}${img}`;

    // --- commence par 'api/' -> préfixer host
    if (img.startsWith('api/')) return `${environment.apiUrl}/${img}`;

    return `${environment.apiUrl}/uploads/${img}`;
  }

  onAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && img.src !== this.avatarFallback) {
      img.src = this.avatarFallback;
    }
  }


  // ---------- VIEW & ROLE LOGIC (inchangé) ----------
  setView(view: View) {
    if (this.currentView === view) return;
    if (this.loadingRoleCheck) return;

    const requiredRoles = this.viewRoles[view];
    if (!requiredRoles || requiredRoles.length === 0) {
      this.applyView(view);
      return;
    }

    const user = this.auth.currentUserValue;
    if (user) {
      const ok = requiredRoles.some(r => this.auth.hasRole(r));
      if (!ok) {
        this.notifier.show("Vous n'avez pas l'accès à cette page.");
        return;
      }
      this.applyView(view);
      return;
    }

    if (!this.auth.getToken()) {
      this.notifier.show("Vous devez être connecté pour accéder à cette page.");
      return;
    }

    this.loadingRoleCheck = true;
    const s = this.auth.verifyToken().pipe(take(1)).subscribe({
      next: (usr) => {
        this.loadingRoleCheck = false;
        if (!usr) {
          this.notifier.show("Impossible de vérifier votre session. Veuillez vous reconnecter.");
          return;
        }
        const ok = requiredRoles.some(r => usr.role === r || this.auth.hasRole(r));
        if (!ok) {
          this.notifier.show("Vous n'avez pas l'accès à cette page.");
          return;
        }
        this.applyView(view);
      },
      error: (err) => {
        this.loadingRoleCheck = false;
        console.error('[Home] verifyToken error', err);
        this.notifier.show("Erreur de vérification. Veuillez réessayer.");
      }
    });
    this.subs.push(s);
  }

  private applyView(view: View) {
    this.currentView = view;
    this.cdr.detectChanges();
  }

  isActive(view: View) {
    return this.currentView === view;
  }

  // ---------- USER DROPDOWN ----------
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  logout() {
    this.closeUserMenu();
    this.auth.logout(true);
  }

  onProfile() {
    this.closeUserMenu();
    this.notifier.show('Profil (fonctionnalité à implémenter)');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown-wrapper')) {
      if (this.showUserMenu) {
        this.showUserMenu = false;
        this.cdr.detectChanges();
      }
    }
  }
}
