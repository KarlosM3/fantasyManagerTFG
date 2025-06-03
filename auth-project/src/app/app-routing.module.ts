import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'auth', loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) },
  { path: 'layouts', loadChildren: () => import('./layouts/layouts.module').then(m => m.LayoutsModule) },
  { path: 'join-league/:code', loadChildren: () => import('./layouts/join-league/join-league.module').then(m => m.JoinLeagueModule) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
