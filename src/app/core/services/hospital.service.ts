import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Hospital, HospitalLoad, RouteRecommendation } from '../models/hospital.model';

@Injectable({ providedIn: 'root' })
export class HospitalService {
  private apiUrl = 'http://localhost:5004/api/hospitals';

  private hospitals$ = new BehaviorSubject<Hospital[]>([]);
  hospitals = this.hospitals$.asObservable();

  // שירות לניהול בתי חולים, עומסים והמלצות ניתוב.
  constructor(private http: HttpClient) {}

  // ─── All hospitals ────────────────────────────────────────
  // מביא את כל בתי החולים ומעדכן את ה-cache המקומי.
  getAll(): Observable<Hospital[]> {
    return this.http.get<Hospital[]>(this.apiUrl).pipe(
      tap(h => this.hospitals$.next(h))
    );
  }

  // מחזיר בית חולים לפי מזהה בודד.
  getById(id: string): Observable<Hospital> {
    return this.http.get<Hospital>(`${this.apiUrl}/${id}`);
  }

  // ─── Load ─────────────────────────────────────────────────
  // מביא את עומס בית החולים, כולל זמינות מיטות ומשך המתנה.
  getLoad(hospitalId: string): Observable<HospitalLoad> {
    return this.http.get<HospitalLoad>(`${this.apiUrl}/${hospitalId}/load`);
  }

  // מחזיר עומסים לכל בתי החולים במקביל כדי לבחור יעד מיטבי.
  getAllLoads(): Observable<{ hospitalId: string; load: HospitalLoad }[]> {
    return this.http.get<{ hospitalId: string; load: HospitalLoad }[]>(
      `${this.apiUrl}/loads`
    );
  }

  // ─── Routing ──────────────────────────────────────────────
  // מחזיר המלצות ניתוב לפי קריאה, כדי למצוא את בית החולים הטוב ביותר.
  getRouteRecommendations(callId: string): Observable<RouteRecommendation[]> {
    return this.http.get<RouteRecommendation[]>(
      `http://localhost:5002/api/emergency/calls/${callId}/routes`
    );
  }

  // מחזיר בתי חולים בקרבת נקודת קואורדינטות בתוך רדיוס נתון.
  getNearby(lat: number, lng: number, radiusKm = 20): Observable<Hospital[]> {
    return this.http.get<Hospital[]>(`${this.apiUrl}/nearby`, {
      params: { lat: lat.toString(), lng: lng.toString(), radiusKm: radiusKm.toString() }
    });
  }

  // ─── Cache ────────────────────────────────────────────────
  // מחזיר את בתי החולים שכבר נשמרו בזיכרון המקומי של השירות.
  get cachedHospitals(): Hospital[] {
    return this.hospitals$.value;
  }

  // מחזיר שם בית חולים לפי מזהה מתוך ה-cache אם הוא זמין.
  getHospitalName(id: string): string {
    return this.hospitals$.value.find(h => h.id === id)?.name ?? 'בית חולים';
  }
}