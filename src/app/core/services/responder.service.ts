import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Responder, ResponderStatus } from '../models/responder.model';
import { PatientData } from '../models/emergency.model';

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
}

export interface UpdateStatusRequest {
  status: ResponderStatus;
}

export interface SubmitPatientDataRequest {
  callId: string;
  patientData: PatientData;
}

@Injectable({ providedIn: 'root' })
export class ResponderService {
  private apiUrl = 'http://localhost:5003/api/responders';

  private currentResponder$ = new BehaviorSubject<Responder | null>(null);
  responder$ = this.currentResponder$.asObservable();

  private watchId: number | null = null;

  // שירות לניהול פרופיל כונן, סטטוס, דיווח מיקום ושליחת נתוני מטופל.
  constructor(private http: HttpClient) {}

  // ─── Profile ───────────────────────────────────────────────
  // מביא את פרופיל הכונן מהשרת ושומר אותו ב-state המקומי.
  getMyProfile(): Observable<Responder> {
    return this.http.get<Responder>(`${this.apiUrl}/me`).pipe(
      tap(r => this.currentResponder$.next(r))
    );
  }

  // ─── Status ────────────────────────────────────────────────
  // מעדכן את סטטוס הכונן (בדרך, בזירה, מפנה וכו') בשרת.
  updateStatus(status: ResponderStatus): Observable<Responder> {
    return this.http.patch<Responder>(`${this.apiUrl}/me/status`, { status }).pipe(
      tap(r => this.currentResponder$.next(r))
    );
  }

  // ─── Patient Data ──────────────────────────────────────────
  // שולח את נתוני המטופל לשרת כדי לקבל המלצת AI ואישור המשך טיפול.
  submitPatientData(callId: string, patientData: PatientData): Observable<any> {
    return this.http.post<any>(
      `http://localhost:5002/api/emergency/calls/${callId}/patient`,
      patientData
    );
  }

  // ─── GPS Tracking ──────────────────────────────────────────
  // מפעיל מעקב GPS רציף ושולח עדכוני מיקום לשרת בזמן אמת.
  startLocationTracking(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.sendLocationToServer({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  // מפסיק את מעקב המיקום כדי להפסיק לשלוח עדכונים בזמן אמת.
  stopLocationTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // שולח מיקום עדכני לשרת כדי לשמור על עמדת הכונן על המפה.
  private sendLocationToServer(location: UpdateLocationRequest): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/me/location`, location);
  }

  // מחזיר את מיקום המשתמש הנוכחי פעם אחת, לשימוש במצבים דינמיים.
  getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // ─── Availability ──────────────────────────────────────────
  // מסמן את הכונן כזמין לקבלת קריאות חדשות.
  setAvailable(): Observable<Responder> {
    return this.updateStatus(ResponderStatus.Available);
  }

  // מסמן את הכונן כ"בדרך לזירה".
  setEnRoute(): Observable<Responder> {
    return this.updateStatus(ResponderStatus.EnRoute);
  }

  // מסמן את הכונן כ"בזירה".
  setOnScene(): Observable<Responder> {
    return this.updateStatus(ResponderStatus.OnScene);
  }

  // מסמן את הכונן כ"משנע" לבית החולים.
  setTransporting(): Observable<Responder> {
    return this.updateStatus(ResponderStatus.Transporting);
  }

  // מחזיר את פרופיל הכונן הנוכחי מה-state המקומי.
  get currentResponder(): Responder | null {
    return this.currentResponder$.value;
  }
}