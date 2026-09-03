import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest, UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
// דף הכניסה הראשי: מקבל אימייל וסיסמה ומנווט לפי תפקיד המשתמש.
export class LoginComponent {
  credentials: LoginRequest = { email: '', password: '' };
  isLoading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  // שולח את פרטי הכניסה, ומנווט את המשתמש לעמוד המתאים לפי התפקיד.
  onLogin(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        switch (response.user.role) {
          case UserRole.Dispatcher: this.router.navigate(['/dispatcher']); break;
          case UserRole.Paramedic:  this.router.navigate(['/responder']); break;
          case UserRole.Volunteer:  this.router.navigate(['/volunteer']); break;
          case UserRole.Admin:      this.router.navigate(['/dispatcher']); break;
          default:                  this.router.navigate(['/login']);
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'אימייל או סיסמה שגויים';
      }
    });
  }
}