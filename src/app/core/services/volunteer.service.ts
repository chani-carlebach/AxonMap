import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PatientData } from '../models/emergency.model';

export interface VolunteerProfile {
  id: string;
  name: string;
  isAvailable: boolean;
  vehicleType: 'AMBULANCE' | 'ICU_MOBILE' | 'MOTORCYCLE' | 'CAR';
}

export interface OnSceneAssessment {
  callId: string;
  patientData: PatientData;
}

export interface EvacuationRecommendation {
  type: 'SCOOP_AND_RUN' | 'STAY_AND_PLAY';
  action: string;
  confidence?: number;
  travelMinutes?: number;
  hospital?: {
    name: string;
    address?: string;
    location: { lat: number; lng: number };
    load?: { erLoadScore: number; availableBeds: number; estimatedWaitMinutes: number };
  };
}

@Injectable({ providedIn: 'root' })
export class VolunteerService {
  private apiUrl = 'http://localhost:5005/api/volunteers';

  private availability$ = new BehaviorSubject<boolean>(false);
  isAvailable$ = this.availability$.asObservable();

  constructor(private http: HttpClient) {}

  // ─── Availability registration (the 30% threshold flow) ───
  setAvailable(): Observable<VolunteerProfile> {
    return this.http.patch<VolunteerProfile>(`${this.apiUrl}/me/availability`, { isAvailable: true }).pipe(
      tap(() => this.availability$.next(true))
    );
  }

  setOffline(): Observable<VolunteerProfile> {
    return this.http.patch<VolunteerProfile>(`${this.apiUrl}/me/availability`, { isAvailable: false }).pipe(
      tap(() => this.availability$.next(false))
    );
  }

  // ─── On-scene reporting ────────────────────────────────────
  reportArrival(callId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/me/calls/${callId}/arrived`, {});
  }

  // Submits the quick assessment and gets back a Stay & Play / Scoop & Run recommendation.
  submitAssessment(assessment: OnSceneAssessment): Observable<EvacuationRecommendation> {
    return this.http.post<EvacuationRecommendation>(
      `${this.apiUrl}/me/calls/${assessment.callId}/assessment`,
      assessment.patientData
    );
  }

  get currentlyAvailable(): boolean {
    return this.availability$.value;
  }
}
