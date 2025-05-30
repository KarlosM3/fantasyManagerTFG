import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamModalComponent } from '../modals/team-modal/team-modal.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    TeamModalComponent,

  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    TeamModalComponent
  ]
})
export class SharedModule { }
