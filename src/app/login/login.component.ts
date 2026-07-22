// src/app/login/login.component.ts
import { Component } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],

})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  isLoading = false;
  errorMessage = '';
  private returnUrl: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  }

  onSubmit() {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Email et mot de passe requis.';
      return;
    }
    this.isLoading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (resp) => {
        this.isLoading = false;
        // resp.user existe normalement (backend renvoie user). Utiliser returnUrl si présent.
        const dest = this.returnUrl || '/home';
        this.router.navigateByUrl(dest);
      },
      error: (err) => {
        this.isLoading = false;
        // Affiche message d'erreur renvoyé par le backend si présent
        if (err?.error?.error) this.errorMessage = err.error.error;
        else if (err?.error?.message) this.errorMessage = err.error.message;
        else this.errorMessage = 'Erreur connexion — vérifie tes identifiants.';
      }
    });
  }
}
