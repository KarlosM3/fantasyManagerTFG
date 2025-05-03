import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LayoutsRoutingModule } from './layouts-routing.module';
import { HomeComponent } from './home/home.component';
import { MarketComponent } from './market/market.component';
import { CreateLeagueModalComponent } from '../modals/create-league-modal/create-league-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { TeamModalComponent } from '../modals/team-modal/team-modal.component';
import { ClassificationComponent } from './classification/classification.component';

@NgModule({
  declarations: [
    HomeComponent,
    MarketComponent,
    CreateLeagueModalComponent,
    TeamModalComponent,
    ClassificationComponent
    ],
  imports: [
    CommonModule,
    HttpClientModule,
    LayoutsRoutingModule,
    ReactiveFormsModule
  ]
})
export class LayoutsModule { }
