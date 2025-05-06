import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LayoutsRoutingModule } from './layouts-routing.module';
import { HomeComponent } from './home/home.component';
import { MarketComponent } from './market/market.component';
import { CreateLeagueModalComponent } from '../modals/create-league-modal/create-league-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ClassificationComponent } from './classification/classification.component';
import { SharedModule } from '../shared/shared.module';
import { MyTeamComponent } from './my-team/my-team.component';

@NgModule({
  declarations: [
    HomeComponent,
    MarketComponent,
    CreateLeagueModalComponent,
    ClassificationComponent,
    MyTeamComponent
    ],
  imports: [
    CommonModule,
    HttpClientModule,
    LayoutsRoutingModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class LayoutsModule { }
