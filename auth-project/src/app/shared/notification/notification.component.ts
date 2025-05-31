// shared/notification/notification.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

interface Notification {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info'; // Añadir 'info'
  timeout?: any;
}

@Component({
  selector: 'app-notification',
  template: `
    <div class="notification-container" *ngIf="notification.show">
      <div class="notification" [ngClass]="notification.type">
        <span class="notification-message">{{ notification.message }}</span>
        <button class="notification-close" (click)="hideNotification()">&times;</button>
      </div>
    </div>
  `,
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  notification: Notification = {
    show: false,
    message: '',
    type: 'success',
    timeout: null
  };

  private notificationCallback = (notification: Notification) => {
    this.notification = notification;
  };

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.subscribe(this.notificationCallback);
    this.notification = this.notificationService.getCurrentNotification();
  }

  ngOnDestroy(): void {
    this.notificationService.unsubscribe(this.notificationCallback);
  }

  hideNotification(): void {
    this.notificationService.hideNotification();
  }
}
