import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="message" class="notif-backdrop">
      <div class="notif-modal">
        <h4>Accès refusé</h4>
        <p>{{ message }}</p>
        <button class="btn btn-primary w-100 mt-2" (click)="close()">OK</button>
      </div>
    </div>
  `,
  styles: [`
    .notif-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 5000;
    }
    .notif-modal {
      background: white;
      padding: 20px;
      border-radius: 10px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0px 8px 25px rgba(0,0,0,0.25);
    }
  `]
})
export class NotificationComponent {
  message: string | null = null;

  constructor(private notif: NotificationService) {
    this.notif.message$.subscribe(m => this.message = m);
  }

  close() {
    this.notif.clear();
  }
}
