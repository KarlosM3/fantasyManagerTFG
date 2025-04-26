import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LayoutsRoutingModule } from './layouts-routing.module';
import { HomeComponent } from './home/home.component';
import { MarketComponent } from './market/market.component';

@NgModule({
  declarations: [
    HomeComponent,
    MarketComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    LayoutsRoutingModule
  ]
})
export class LayoutsModule { }
