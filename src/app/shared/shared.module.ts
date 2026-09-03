import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriorityLabelPipe } from './pipes/priority-label.pipe';
import { PulseDirective } from './directives/pulse.directive';
import { ActionButtonComponent } from './components/action-button.component';

// Shared module שמאגד Pipes, Directives וקומפוננטים משותפים לשימוש במודולים השונים.
@NgModule({
  declarations: [PriorityLabelPipe, PulseDirective, ActionButtonComponent],
  imports: [CommonModule],
  exports: [PriorityLabelPipe, PulseDirective, ActionButtonComponent]
})
export class SharedModule {}
