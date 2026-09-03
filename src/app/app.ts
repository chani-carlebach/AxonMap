import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
// Root component של האפליקציה: מייצג את המתחם הראשי שבו נטען ה-router outlet של כל דף.
export class AppComponent {
  protected readonly title = signal('pulse-route-client');
}
