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
    this.leagueId = this.route.snapshot.paramMap.get('leagueId') || '';
    console.log('League ID:', this.leagueId); // Para depurar
    if (this.leagueId) {
      this.loadClassification();
    } else {
      console.error('No se ha proporcionado un ID de liga válido');
    }
  }


  loadClassification(): void {
    this.leagueService.getLeagueClassification(this.leagueId).subscribe((users) => {
      this.leagueUsers = users;
    });

  }


  openInviteModal() {
    this.isInviteModalOpen = true;
  }

  closeInviteModal() {
    this.isInviteModalOpen = false;
  }
}
