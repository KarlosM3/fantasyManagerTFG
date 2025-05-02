import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { MarketComponent } from './market/market.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ClassificationComponent } from './classification/classification.component';

const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'market',
    component: MarketComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'classification/:leagueId',
    component: ClassificationComponent,
    canActivate: [AuthGuard]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LayoutsRoutingModule { }
