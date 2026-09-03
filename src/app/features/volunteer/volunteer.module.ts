import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { VolunteerComponent } from './volunteer.component';

const routes: Routes = [
  { path: '', component: VolunteerComponent }
];

@NgModule({
  declarations: [VolunteerComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class VolunteerModule {}