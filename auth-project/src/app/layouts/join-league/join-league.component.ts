// join-league.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';

@Component({
  selector: 'app-join-league',
  templateUrl: './join-league.component.html',
  styleUrls: ['./join-league.component.scss']
})
export class JoinLeagueComponent implements OnInit {
  inviteCode: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leagueService: LeagueService
  ) {}

  ngOnInit() {
    this.inviteCode = this.route.snapshot.paramMap.get('code');
    if (this.inviteCode) {
      this.joinLeague();
    }
  }

  joinLeague() {
    if (!this.inviteCode) return;

    this.isLoading = true;
    this.leagueService.joinLeagueByCode(this.inviteCode).subscribe({
      next: (res) => {
        this.isLoading = false;
        // Navegar a la clasificación de la liga
        this.router.navigate(['/layouts/classification', res.leagueId]);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error.message || 'Error al unirse a la liga';
      }
    });
  }
}
