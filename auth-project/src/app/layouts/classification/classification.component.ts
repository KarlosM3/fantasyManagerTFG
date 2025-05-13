import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { PointsService } from '../../services/points.service';
import { AuthService } from '../../auth/services/auth.service';
import { ActiveLeagueService } from '../home/services/active-league.service';

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
  ligaActivaId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private leagueService: LeagueService,
    private pointsService: PointsService,
    private authService: AuthService,
    private activeLeagueService: ActiveLeagueService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.leagueId = params['leagueId'];
      this.loadLeagueData();
      this.loadClassification();
      this.ligaActivaId = this.activeLeagueService.getActiveLeague();
    });
  }

  loadLeagueData(): void {
    this.leagueService.getLeagueById(this.leagueId).subscribe((league: any) => {
      this.leagueName = league.name;

      // Si la liga ya tiene un código de invitación, úsalo
      if (league.inviteCode) {
        this.inviteLink = `${window.location.origin}/join-league/${league.inviteCode}`;
      }
      // Si no tiene código, solicita uno nuevo
      else {
        this.leagueService.generateInviteCode(this.leagueId).subscribe(response => {
          if (response.success) {
            this.inviteLink = `${window.location.origin}/join-league/${response.inviteCode}`;
          }
        });
      }
    });
  }


  loadClassification(): void {
    this.leagueService.getLeagueClassification(this.leagueId).subscribe(users => {
      this.leagueUsers = users;
    });

    this.pointsService.getLeagueStandingsByPoints(this.leagueId).subscribe(response => {
      console.log('Datos recibidos:', response); // Añade este log para depurar
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
