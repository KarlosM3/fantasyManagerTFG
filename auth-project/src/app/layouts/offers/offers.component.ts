import { Component, OnInit } from '@angular/core';
import { MarketService } from '../../services/market.service';
import { ActiveLeagueService } from '../home/services/active-league.service';
import { NotificationService } from '../../services/notification.service';


@Component({
  selector: 'app-offers',
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.scss']
})
export class OffersComponent implements OnInit {
  activeLeagueId: string | null = null;
  receivedOffers: any[] = [];
  isLoading = true;


  constructor(
    private marketService: MarketService,
    private activeLeagueService: ActiveLeagueService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.activeLeagueId = this.activeLeagueService.getActiveLeague();
    if (this.activeLeagueId) {
      this.loadOffers();
    } else {
      this.isLoading = false;
    }
  }

  loadOffers(): void {
    this.isLoading = true;

    this.marketService.getReceivedOffers(this.activeLeagueId!)
      .subscribe({
        next: (data) => {
          this.receivedOffers = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando ofertas:', error);
          this.showNotification('Error al cargar las ofertas', 'error');
          this.isLoading = false;
        }
      });
  }

  acceptOffer(offerId: string): void {
    this.marketService.acceptOffer(offerId)
      .subscribe({
        next: (response) => {
          this.showNotification('Oferta aceptada con éxito', 'success');
          this.loadOffers();
        },
        error: (error) => {
          console.error('Error al aceptar oferta:', error);
          this.showNotification(error.error?.message || 'Error al aceptar la oferta', 'error');
        }
      });
  }

  rejectOffer(offerId: string): void {
    this.marketService.rejectOffer(offerId)
      .subscribe({
        next: (response) => {
          this.showNotification('Oferta rechazada', 'success');
          this.loadOffers();
        },
        error: (error) => {
          console.error('Error al rechazar oferta:', error);
          this.showNotification(error.error?.message || 'Error al rechazar la oferta', 'error');
        }
      });
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M €`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K €`;
    }
    return `${value} €`;
  }

  getPositionColor(positionId: string): string {
    const colors: { [key: string]: string } = {
      "1": "#FFC107", // Portero - Amarillo
      "2": "#4CAF50", // Defensa - Verde
      "3": "#2196F3", // Centrocampista - Azul
      "4": "#F44336", // Delantero - Rojo
    };
    return colors[positionId] || "#9E9E9E";
  }

  getPositionName(positionId: string): string {
    const positions: { [key: string]: string } = {
      "1": "POR",
      "2": "DEF",
      "3": "MED",
      "4": "DEL",
    };
    return positions[positionId] || "JUG";
  }


  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
  switch(type) {
    case 'success':
      this.notificationService.showSuccess(message);
      break;
    case 'error':
      this.notificationService.showError(message);
      break;
    case 'warning':
      this.notificationService.showWarning(message);
      break;
    case 'info':
      this.notificationService.showInfo(message);
      break;
  }
}
}
