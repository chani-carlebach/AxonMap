import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ResponderComponent } from './responder.component';

const routes: Routes = [
  { path: '', component: ResponderComponent }
];

@NgModule({
  declarations: [ResponderComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes)]
})
export class ResponderModule {}