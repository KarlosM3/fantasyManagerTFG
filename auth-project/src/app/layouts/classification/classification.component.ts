import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { PointsService } from '../../services/points.service';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-classification',
  templateUrl: './classification.component.html',
  styleUrls: ['./classification.component.scss']
})

export class ClassificationComponent implements OnInit {
  leagueId!: string;
  leagueName: string = 'Mi Liga';
  leagueUsers: any[] = [];
  pointsStandings: any[] = [];
  showPointsStandings: boolean = false;
  showInvite: boolean = false;
  inviteLink: string = '';

  constructor(
    private route: ActivatedRoute,
    private leagueService: LeagueService,
    private pointsService: PointsService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.leagueId = params['leagueId'];
      this.loadLeagueData();
      this.loadClassification();
    });
  }

  loadLeagueData(): void {
    this.leagueService.getLeagueById(this.leagueId).subscribe((league: any) => {
      this.leagueName = league.name;
      this.inviteLink = `${window.location.origin}/join-league/${this.leagueId}`;
    });
  }

  loadClassification(): void {
    this.leagueService.getLeagueClassification(this.leagueId).subscribe(users => {
      this.leagueUsers = users;
    });

    this.pointsService.getLeagueStandingsByPoints(this.leagueId).subscribe(response => {
      if (response.success) {
        this.pointsStandings = response.data;
      }
    });
  }

  showInviteModal(): void {
    this.showInvite = !this.showInvite;
  }

  copyInviteLink(inputElement: HTMLInputElement): void {
    inputElement.select();
    document.execCommand('copy');
    // Mostrar notificación de copiado (opcional)
  }

  getUserInitials(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  isCurrentUser(userId: string): boolean {
    return userId === this.authService.getCurrentUserId();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }


}
