import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'priorityLabel',
  standalone: false
})
export class PriorityLabelPipe implements PipeTransform {
  transform(priority: string): string {
    const map: Record<string, string> = {
      CRITICAL:   '🔴 קריטי',
      URGENT:     '🟠 דחוף',
      NON_URGENT: '🟢 לא דחוף'
    };
    return map[priority] ?? priority;
  }
}
