import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LeagueService } from '../../modals/create-league-modal/services/create-league.service';

@Component({
  selector: 'app-classification',
  templateUrl: './classification.component.html',
  styleUrls: ['./classification.component.scss']
})
export class ClassificationComponent implements OnInit {
  leagueId: string = '';
  league: any;
  leagueUsers: any[] = [];
  isInviteModalOpen = false;

  constructor(
    private route: ActivatedRoute,
    private leagueService: LeagueService
  ) {}

  ngOnInit(): void {
    // Suponiendo que la ruta es /clasificacion/:leagueId
    this.leagueId = this.route.snapshot.paramMap.get('leagueId') || '';
    this.loadLeagueData();
  }

  loadLeagueData(): void {
    // Obtiene info de la liga y sus usuarios (ajusta según tu API)
    this.leagueService.getUserLeagues().subscribe((league) => {
      this.league = league;
      // Si la API ya devuelve los usuarios ordenados por puntos:
      this.leagueUsers = league.members;
      // Si no, puedes ordenar aquí:
      // this.leagueUsers = league.members.sort((a, b) => b.points - a.points);
    });
  }

  openInviteModal() {
    this.isInviteModalOpen = true;
  }

  closeInviteModal() {
    this.isInviteModalOpen = false;
  }
}
