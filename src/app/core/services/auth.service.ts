import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, delay } from 'rxjs';
import { AuthResponse, LoginRequest, User, UserRole } from '../models/user.model';

// ⚠️ זמני — להסרה כשה-Auth-Service האמיתי בסי-שארפ יהיה מוכן ⚠️
// כדי להתחבר ב-mock: השתמשי באחת מהכתובות הבאות (כל סיסמה עובדת):
//   dispatcher@test.com  → דיספצ'ר
//   responder@test.com   → כונן/פרמדיק
//   volunteer@test.com   → מתנדב
const MOCK_LOGIN_ENABLED = true;

const MOCK_USERS: Record<string, User> = {
  'dispatcher@test.com': {
    id: 'mock-1', name: 'דנה דיספצ\'ר', email: 'dispatcher@test.com',
    role: UserRole.Dispatcher, phone: '050-0000001', isActive: true
  },
  'responder@test.com': {
    id: 'mock-2', name: 'רוני כונן', email: 'responder@test.com',
    role: UserRole.Paramedic, phone: '050-0000002', isActive: true
  },
  'volunteer@test.com': {
    id: 'mock-3', name: 'ולדימיר מתנדב', email: 'volunteer@test.com',
    role: UserRole.Volunteer, phone: '050-0000003', isActive: true
  }
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5001/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  // בונה את השירות ומעדכן את המשתמש הנוכחי מה-localStorage אם כבר נרשם בעבר.
  constructor(private http: HttpClient) {
    const stored = localStorage.getItem('user');
    if (stored) this.currentUserSubject.next(JSON.parse(stored));
  }

  // מבצע כניסה למערכת ומחזיר טוקן, משתמש ותוקף. אם מצב mock פעיל, מחזיר נתוני בדיקה במקום שרת.
  login(request: LoginRequest): Observable<AuthResponse> {
    // ⚠️ זמני — מסלול mock שעוקף את השרת, להסרה כשה-Auth-Service מוכן ⚠️
    if (MOCK_LOGIN_ENABLED && MOCK_USERS[request.email]) {
      const user = MOCK_USERS[request.email];
      const mockResponse: AuthResponse = {
        token: 'MOCK-TOKEN-' + user.id,
        refreshToken: 'MOCK-REFRESH-' + user.id,
        user,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8)
      }; 
      return of(mockResponse).pipe(
        delay(400),
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        })
      );
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  }

  // מתנתק מהמערכת ומנקה את המידע המקומי של המשתמש הנוכחי.
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  // מחזיר את הטוקן המאוחסן במכשיר כדי להשתמש בו בחיבורים הבאים.
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // בודק האם המשתמש מחובר כרגע על סמך קיום טוקן.
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // מחזיר את המשתמש הנוכחי מה-BehaviorSubject של המעמד.
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }
}