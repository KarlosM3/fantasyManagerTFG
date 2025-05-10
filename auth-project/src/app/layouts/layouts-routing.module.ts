import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PlayersComponent } from './players/players.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ClassificationComponent } from './classification/classification.component';
import { MyTeamComponent } from './my-team/my-team.component';
import { MarketComponent } from './market/market.component';
import { OffersComponent } from './offers/offers.component';

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
    path: 'classification/:leagueId',
    component: ClassificationComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'my-team/:leagueId',
    component: MyTeamComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'market',
    component: MarketComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'offers',
    component: OffersComponent,
    canActivate: [AuthGuard]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LayoutsRoutingModule { }
