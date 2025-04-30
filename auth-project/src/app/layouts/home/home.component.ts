import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { LeagueService } from '../create-league-modal/services/create-league.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  userName: string = '';
  isCreateLeagueModalOpen = false;
  userLeagues: any[] = []; // <-- Añade este array

  constructor(
    private authService: AuthService,
    private router: Router,
    private leagueService: LeagueService // <-- Inyecta el servicio
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    this.loadUserLeagues(); // <-- Carga las ligas al iniciar
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
        this.loadUserLeagues(); // Esto refresca la lista en "MIS LIGAS"
        this.router.navigate(['/layouts/home']); // Redirige al home
      },
      error: (err) => {
        // Manejo de errores
      }
    });
  }

  navegarA(ruta: string) {
    this.router.navigate(['/layouts/' + ruta]);
  }
}
