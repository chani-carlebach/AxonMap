import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-action-button',
  templateUrl: './action-button.component.html',
  styleUrls: ['./action-button.component.scss'],
  standalone: false
})
export class ActionButtonComponent {
  @Input() label: string = '';         // מה כתוב על הכפתור
  @Input() icon: string = '';          // אייקון אמוג'י
  @Input() disabled: boolean = false;  // האם מושבת
  @Input() variant: 'primary' | 'danger' | 'neutral' = 'primary';

  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}
