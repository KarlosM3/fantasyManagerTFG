// src/app/layouts/layouts.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LayoutsRoutingModule } from './layouts-routing.module';
import { HomeComponent } from './home/home.component';
import { PlayersComponent } from './players/players.component';
import { CreateLeagueModalComponent } from '../modals/create-league-modal/create-league-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ClassificationComponent } from './classification/classification.component';
import { SharedModule } from '../shared/shared.module';
import { MyTeamComponent } from './my-team/my-team.component';
import { MarketComponent } from './market/market.component';
import { FormsModule } from '@angular/forms';
import { OffersComponent } from './offers/offers.component';
import { TeamPointsComponent } from './team-points/team-points.component';
import { TeamDataStatusComponent } from '../shared/team-data-status/team-data-status.component';

@NgModule({
  declarations: [
    HomeComponent,
    PlayersComponent,
    CreateLeagueModalComponent,
    ClassificationComponent,
    MyTeamComponent,
    MarketComponent,
    OffersComponent,
    TeamPointsComponent,
    TeamDataStatusComponent // Añadir el nuevo componente
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    LayoutsRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule
  ]
})
export class LayoutsModule { }
