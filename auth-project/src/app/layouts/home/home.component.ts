import { Component, OnInit } from '@angular/core';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  userName: string = '';
  userLeagues: any[] = [];
  isCreateLeagueModalOpen = false;
  isTeamModalOpen = false;
  randomTeam: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private leagueService: LeagueService
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    this.loadUserLeagues();
  }

  loadUserLeagues(): void {
    this.leagueService.getUserLeagues().subscribe(leagues => {
      this.userLeagues = leagues;
    });
  }

  openCreateLeagueModal() {
    this.isCreateLeagueModalOpen = true;
  }

  closeCreateLeagueModal() {
    this.isCreateLeagueModalOpen = false;
  }

  onCreateLeague(leagueData: any) {
    this.leagueService.createLeague(leagueData).subscribe({
      next: (res) => {
        this.closeCreateLeagueModal();
        this.loadUserLeagues();
      },
      error: (err) => {
        console.error('Error al crear la liga:', err);
      }
    });
  }

  onSelectLeague(liga: any) {
    this.leagueService.assignRandomTeam(liga._id).subscribe({
      next: (team) => {
        this.randomTeam = team;
        this.isTeamModalOpen = true;
      },
      error: (err) => {
        console.error('Error al asignar equipo aleatorio:', err);
      }
    });
  }

  closeTeamModal() {
    this.isTeamModalOpen = false;
  }

  navegarA(ruta: string) {
    this.router.navigate(['/layouts/' + ruta]);
  }
}
