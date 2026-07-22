import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { NotificationComponent } from "./notification/notification.component";

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, NotificationComponent],
  templateUrl: './app.component.html',
  template: `
    <router-outlet></router-outlet>
  `})
export class AppComponent {
  title = 'admin-dashboard';
}
