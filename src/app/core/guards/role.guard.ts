import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

// ─── Maps each role to the route it owns ─────────────────────
const HOME_ROUTE_BY_ROLE: Record<UserRole, string> = {
  [UserRole.Dispatcher]: '/dispatcher',
  [UserRole.Paramedic]: '/responder',
  [UserRole.Volunteer]: '/volunteer',
  [UserRole.Admin]: '/dispatcher'
};

@Injectable({ providedIn: 'root' })
// Guard שמוודא שלמשתמש יש את התפקיד המתאים ל-route המבוקש.
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  // בודק אם המשתמש שייך לרשימת התפקידים המותרים, אחרת מפנה אותו לבית שלו.
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles = route.data['roles'] as UserRole[] | undefined;
    const user = this.authService.currentUser;

    // No user (shouldn't happen if AuthGuard ran first) — send to login.
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    // Route has no role restriction — allow.
    if (!allowedRoles || allowedRoles.length === 0) return true;

    // Role matches — allow.
    if (allowedRoles.includes(user.role)) return true;

    // Role mismatch — redirect to the screen that belongs to this user.
    const home = HOME_ROUTE_BY_ROLE[user.role] ?? '/login';
    this.router.navigate([home]);
    return false;
  }
}
