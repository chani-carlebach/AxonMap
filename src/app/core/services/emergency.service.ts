import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmergencyCase, EmergencyType } from '../models/emergency.model';
import { RouteRecommendation } from '../models/hospital.model';

export interface CreateEmergencyRequest {
  type: EmergencyType;
  location: { lat: number; lng: number; address?: string };
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class EmergencyService {
  private apiUrl = 'http://localhost:5002/api/emergency';

  // שירות לניהול קריאות חירום מול ה-API של תשתית האירועים.
  constructor(private http: HttpClient) {}

  // פותח קריאה חדשה עם פרטי מיקום, סוג אירוע ותיאור.
  createCall(request: CreateEmergencyRequest): Observable<EmergencyCase> {
    return this.http.post<EmergencyCase>(`${this.apiUrl}/calls`, request);
  }

  // מביא את כל הקריאות הפעילות שממתינות או בתהליך.
  getActiveCalls(): Observable<EmergencyCase[]> {
    return this.http.get<EmergencyCase[]>(`${this.apiUrl}/calls/active`);
  }

  // מחזיר פרטי קריאה ספציפית לפי מזהה.
  getCallById(id: string): Observable<EmergencyCase> {
    return this.http.get<EmergencyCase>(`${this.apiUrl}/calls/${id}`);
  }

  // שואל את ה-AI/השירות על מסלולים והתאמת בתי חולים לקריאה מסוימת.
  getRouteRecommendations(callId: string): Observable<RouteRecommendation[]> {
    return this.http.get<RouteRecommendation[]>(`${this.apiUrl}/calls/${callId}/routes`);
  }

  // מעדכן את סטטוס הקריאה, למשל "בדרך", "בזירה" או "סגור".
  updateCallStatus(callId: string, status: string): Observable<EmergencyCase> {
    return this.http.patch<EmergencyCase>(`${this.apiUrl}/calls/${callId}/status`, { status });
  }

  // משייך כונן או מתנדב לקריאה נתונה.
  assignResponder(callId: string, responderId: string): Observable<EmergencyCase> {
    return this.http.patch<EmergencyCase>(`${this.apiUrl}/calls/${callId}/assign`, { responderId });
  }
}