import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
// Guard שמגביל כניסה לדפים רק למשתמשים מחוברים.
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  // בודק אם יש טוקן מחובר; אם לא, מעביר את המשתמש למסך הכניסה.
  canActivate(): boolean {
    if (this.authService.isLoggedIn()) return true;
    this.router.navigate(['/login']);
    return false;
  }
}