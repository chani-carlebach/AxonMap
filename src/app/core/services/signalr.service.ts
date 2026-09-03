import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { EmergencyCase } from '../models/emergency.model';
import { Responder } from '../models/responder.model';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection: signalR.HubConnection | null = null;
  private hubUrl = 'http://localhost:5002/hubs/emergency';

  // Streams שמייצגים אירועים מהשרת בזמן אמת: קריאה חדשה, עדכון קריאה, מיקום כונן ועוד.
  newCall$ = new Subject<EmergencyCase>();
  callUpdated$ = new Subject<EmergencyCase>();
  responderLocationUpdated$ = new Subject<Responder>();
  volunteerRequest$ = new Subject<string>();
  aiRecommendationReady$ = new Subject<any>();

  // מתחיל חיבור SignalR עם טוקן ומרכיב את הקונקשן ל-SocketHub של האירועים.
  startConnection(token: string): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => console.log('SignalR Connected'))
      .catch(err => console.error('SignalR Error:', err));

    this.registerEvents();
  }

  // מחבר את כל האירועים שהשרת שולח, כדי להעביר את הנתונים ל-Components הרלוונטיים.
  private registerEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('NewEmergencyCall', (call: EmergencyCase) => {
      this.newCall$.next(call);
    });

    this.hubConnection.on('CallStatusChanged', (call: EmergencyCase) => {
      this.callUpdated$.next(call);
    });

    this.hubConnection.on('ResponderLocationUpdate', (responder: Responder) => {
      this.responderLocationUpdated$.next(responder);
    });

    this.hubConnection.on('VolunteerRequest', (message: string) => {
      this.volunteerRequest$.next(message);
    });

    this.hubConnection.on('AIRecommendationReady', (data: any) => {
      this.aiRecommendationReady$.next(data);
    });
  }

  // סוגר את החיבור SignalR כשהמשתמש עובר לדף אחר או מתנתק.
  stopConnection(): void {
    this.hubConnection?.stop();
  }
}