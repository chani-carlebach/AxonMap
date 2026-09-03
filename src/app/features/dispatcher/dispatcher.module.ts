import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { DispatcherComponent } from './dispatcher.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  { path: '', component: DispatcherComponent }
];

@NgModule({
  declarations: [DispatcherComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule.forChild(routes), SharedModule]
})
export class DispatcherModule {}
