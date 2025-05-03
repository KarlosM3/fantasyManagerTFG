// join-league.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { JoinLeagueComponent } from './join-league.component';

const routes: Routes = [
  { path: '', component: JoinLeagueComponent }
];

@NgModule({
  declarations: [
    JoinLeagueComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class JoinLeagueModule { }
