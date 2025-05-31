// notification.service.ts
import { Injectable } from '@angular/core';

interface Notification {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info'; // Añadir 'info'
  timeout?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notification: Notification = {
    show: false,
    message: '',
    type: 'success',
    timeout: null
  };

  private notificationCallbacks: ((notification: Notification) => void)[] = [];

  // Método para suscribirse a las notificaciones
  subscribe(callback: (notification: Notification) => void): void {
    this.notificationCallbacks.push(callback);
  }

  // Método para desuscribirse
  unsubscribe(callback: (notification: Notification) => void): void {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index > -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  private notifySubscribers(): void {
    this.notificationCallbacks.forEach(callback => callback(this.notification));
  }

  showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  showError(message: string): void {
    this.showNotification(message, 'error');
  }

  showWarning(message: string): void {
    this.showNotification(message, 'warning');
  }

  // AÑADIR este método
  showInfo(message: string): void {
    this.showNotification(message, 'info');
  }

  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void { // Añadir 'info'
    // Limpiar timeout anterior si existe
    if (this.notification.timeout) {
      clearTimeout(this.notification.timeout);
    }

    // Mostrar nueva notificación
    this.notification = {
      show: true,
      message,
      type,
      timeout: setTimeout(() => {
        this.hideNotification();
      }, 3000) // Desaparece después de 3 segundos
    };

    this.notifySubscribers();
  }

  hideNotification(): void {
    this.notification.show = false;
    if (this.notification.timeout) {
      clearTimeout(this.notification.timeout);
    }
    this.notifySubscribers();
  }

  getCurrentNotification(): Notification {
    return this.notification;
  }
}
