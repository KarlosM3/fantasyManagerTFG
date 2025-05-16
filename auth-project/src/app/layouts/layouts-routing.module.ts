import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PlayersComponent } from './players/players.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ClassificationComponent } from './classification/classification.component';
import { MyTeamComponent } from './my-team/my-team.component';
import { MarketComponent } from './market/market.component';
import { OffersComponent } from './offers/offers.component';
import { TeamPointsComponent } from './team-points/team-points.component';
import { LeagueGuard } from '../auth/guards/league.guard';

const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'players',
    component: PlayersComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'classification',
    component: ClassificationComponent,
    canActivate: [AuthGuard, LeagueGuard]
  },
  {
    path: 'classification/:leagueId',
    component: ClassificationComponent,
    canActivate: [AuthGuard, LeagueGuard]
  },
  {
    path: 'my-team',
    component: MyTeamComponent,
    canActivate: [AuthGuard, LeagueGuard]
  },
  {
    path: 'my-team/:leagueId',
    component: MyTeamComponent,
    canActivate: [AuthGuard, LeagueGuard]
  },
  {
    path: 'market',
    component: MarketComponent,
    canActivate: [AuthGuard, LeagueGuard]
  },
  {
    path: 'offers',
    component: OffersComponent,
    canActivate: [AuthGuard, LeagueGuard]
  },
  {
    path: 'team-points',
    component: TeamPointsComponent,
    canActivate: [AuthGuard, LeagueGuard]
  },
  {
    path: 'team-points/:leagueId',
    component: TeamPointsComponent,
    canActivate: [AuthGuard, LeagueGuard]
  }


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LayoutsRoutingModule { }
