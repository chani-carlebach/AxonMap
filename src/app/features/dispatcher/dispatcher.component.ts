import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { EmergencyCase, EmergencyStatus, EmergencyType, Priority } from '../../core/models/emergency.model';
import { Responder, ResponderRole, ResponderStatus } from '../../core/models/responder.model';
import { RouteRecommendation, HospitalSpeciality } from '../../core/models/hospital.model';
import { EmergencyService, CreateEmergencyRequest } from '../../core/services/emergency.service';
import { SignalrService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/services/auth.service';
import { HospitalService } from '../../core/services/hospital.service';

// ⚠️ זמני — מצב פיתוח בלבד, להסרה כשהשרת האמיתי וה-SignalR מחוברים ⚠️
const DEV_MOCK_CALLS: EmergencyCase[] = [
  {
    id: 'dev-1', type: EmergencyType.Cardiac, status: EmergencyStatus.Pending, priority: Priority.Critical,
    location: { lat: 31.7683, lng: 35.2137, address: 'רחוב יפו 42, ירושלים' },
    createdAt: new Date(), updatedAt: new Date()
  },
  {
    id: 'dev-2', type: EmergencyType.Accident, status: EmergencyStatus.Assigned, priority: Priority.Urgent,
    location: { lat: 31.78, lng: 35.22, address: 'כביש 1, מחלף שער הגיא' },
    createdAt: new Date(), updatedAt: new Date()
  },
  {
    id: 'dev-3', type: EmergencyType.Trauma, status: EmergencyStatus.EnRoute, priority: Priority.NonUrgent,
    location: { lat: 32.0853, lng: 34.7818, address: 'רחוב הרצל 10, תל אביב' },
    createdAt: new Date(), updatedAt: new Date()
  }
];

const DEV_MOCK_CALL_WITH_PATIENT: EmergencyCase = {
  ...DEV_MOCK_CALLS[0],
  id: 'dev-detail',
  patientData: {
    consciousness: 'VOICE', breathing: 'LABORED', pulse: 'WEAK',
    injuryType: 'CHEST', skinColor: 'PALE', skinTemp: 'COLD', skinMoisture: 'MOIST',
    estimatedAge: 67
  }
};

const DEV_MOCK_RESPONDERS: Responder[] = [
  {
    id: 'r1', name: 'רוני כונן', role: ResponderRole.Paramedic, status: ResponderStatus.Available,
    currentLocation: { lat: 31.77, lng: 35.21, updatedAt: new Date() },
    vehicleType: 'AMBULANCE', isAvailable: true
  },
  {
    id: 'r2', name: 'מיכל פרמדיק', role: ResponderRole.EMT, status: ResponderStatus.EnRoute,
    currentLocation: { lat: 31.76, lng: 35.20, updatedAt: new Date() },
    vehicleType: 'ICU_MOBILE', isAvailable: false
  },
  {
    id: 'r3', name: 'אבי כונן', role: ResponderRole.Volunteer, status: ResponderStatus.Available,
    currentLocation: { lat: 31.78, lng: 35.22, updatedAt: new Date() },
    vehicleType: 'MOTORCYCLE', isAvailable: true
  }
];

const DEV_MOCK_ROUTES: RouteRecommendation[] = [
  {
    hospital: {
      id: 'h1', name: 'בית חולים שערי צדק', address: 'רחוב שמואל בייט 12, ירושלים',
      location: { lat: 31.7794, lng: 35.2066 },
      specialities: [HospitalSpeciality.Cardiology, HospitalSpeciality.Trauma],
      load: { erLoadScore: 42, estimatedWaitMinutes: 15, availableBeds: 6, lastUpdated: new Date() },
      phone: '02-6555111'
    },
    travelTimeMinutes: 8, trafficScore: 0.3, totalTTC: 11, rank: 1, isRecommended: true
  },
  {
    hospital: {
      id: 'h2', name: 'בית חולים הדסה עין כרם', address: 'דרך חברון, ירושלים',
      location: { lat: 31.7614, lng: 35.1969 },
      specialities: [HospitalSpeciality.Neurology, HospitalSpeciality.Pediatrics],
      load: { erLoadScore: 71, estimatedWaitMinutes: 28, availableBeds: 2, lastUpdated: new Date() },
      phone: '02-6777111'
    },
    travelTimeMinutes: 14, trafficScore: 0.6, totalTTC: 22, rank: 2, isRecommended: false
  }
];

@Component({
  selector: 'app-dispatcher',
  templateUrl: './dispatcher.component.html',
  styleUrls: ['./dispatcher.component.scss'],
  standalone: false
})
// דף המוקד: מציג את כל הקריאות הפעילות, מאפשר פתיחת קריאה חדשה, שיוך כוננים והצגת המלצות AI.
export class DispatcherComponent implements OnInit, OnDestroy {
  activeCalls: EmergencyCase[] = [];
  responders: Responder[] = [];
  selectedCall: EmergencyCase | null = null;
  routeRecommendations: RouteRecommendation[] = [];
  loadingRoutes = false;
  showNewCallForm = false;
  isLoading = false;

  // ─── Reactive Form לפתיחת קריאה ───────────────────────────
  newCallForm: FormGroup = new FormGroup({});

  // ⚠️ זמני — רשימת מצבים לבדיקה ידנית, להסרה כשהשרת מחובר ⚠️
  devScreens: { label: string; action: () => void }[] = [
    { label: '1️⃣ רשימה ריקה',          action: () => this.devGoTo('EMPTY') },
    { label: '2️⃣ רשימת קריאות',        action: () => this.devGoTo('LIST') },
    { label: '3️⃣ טופס קריאה חדשה',     action: () => this.devGoTo('NEW_FORM') },
    { label: '4️⃣ פרטי קריאה + מטופל',  action: () => this.devGoTo('DETAIL') },
    { label: '5️⃣ המלצות ניתוב AI',     action: () => this.devGoTo('ROUTES') }
  ];

  devGoTo(target: 'EMPTY' | 'LIST' | 'NEW_FORM' | 'DETAIL' | 'ROUTES'): void {
    this.showNewCallForm = false;
    this.selectedCall = null;
    this.routeRecommendations = [];
    this.isLoading = false;

    if (target === 'EMPTY') {
      this.activeCalls = [];
      this.responders = [];
    }
    if (target === 'LIST') {
      this.activeCalls = [...DEV_MOCK_CALLS];
      this.responders = [...DEV_MOCK_RESPONDERS];
    }
    if (target === 'NEW_FORM') {
      this.activeCalls = [...DEV_MOCK_CALLS];
      this.showNewCallForm = true;
    }
    if (target === 'DETAIL') {
      this.activeCalls = [DEV_MOCK_CALL_WITH_PATIENT, ...DEV_MOCK_CALLS];
      this.responders = [...DEV_MOCK_RESPONDERS];
      this.selectedCall = DEV_MOCK_CALL_WITH_PATIENT;
    }
    if (target === 'ROUTES') {
      this.activeCalls = [DEV_MOCK_CALL_WITH_PATIENT, ...DEV_MOCK_CALLS];
      this.responders = [...DEV_MOCK_RESPONDERS];
      this.selectedCall = DEV_MOCK_CALL_WITH_PATIENT;
      this.routeRecommendations = [...DEV_MOCK_ROUTES];
    }
  }

  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  private toastTimer: any;

  cityInput = '';
  streetInput = '';
  houseInput = '';
  selectedAge = '';

  ageOptions = [
    { label: '👶 תינוק', value: 'INFANT' },
    { label: '🧒 ילד',   value: 'CHILD'  },
    { label: '🧑 נוער',  value: 'TEEN'   },
    { label: '👨 מבוגר', value: 'ADULT'  }
  ];

  newCall: CreateEmergencyRequest = {
    type: EmergencyType.Accident,
    location: { lat: 0, lng: 0 },
    description: ''
  };

  emergencyTypes = Object.values(EmergencyType);
  emergencyTypeLabels: Record<string, string> = {
    FIRE:     '🔥 שריפה',
    ATTACK:   '💥 פיגוע',
    ACCIDENT: '🚗 תאונה',
    CARDIAC:  '❤️ לבבי',
    STROKE:   '🧠 שבץ',
    BIRTH:    '👶 לידה',
    TRAUMA:   '🩸 טראומה'
  };

  private subs = new Subscription();

  constructor(
    private emergencyService: EmergencyService,
    private signalrService: SignalrService,
    private authService: AuthService,
    private hospitalService: HospitalService
  ) {}

  // אתחול דף המוקד: טעינת קריאות, חיבור SignalR והאזנה לעדכונים בזמן אמת.
  ngOnInit(): void {
    this.loadActiveCalls();
    this.initNewCallForm();
    this.hospitalService.getAll().subscribe();

    const token = this.authService.getToken();
    if (token) this.signalrService.startConnection(token);

    this.subs.add(this.signalrService.newCall$.subscribe(call => {
      this.activeCalls.unshift(call);
      this.showToast(`קריאה חדשה: ${this.emergencyTypeLabels[call.type]}`, 'info');
    }));

    this.subs.add(this.signalrService.callUpdated$.subscribe(updated => {
      const index = this.activeCalls.findIndex(c => c.id === updated.id);
      if (index !== -1) this.activeCalls[index] = updated;
      if (this.selectedCall?.id === updated.id) this.selectedCall = updated;
    }));

    this.subs.add(this.signalrService.responderLocationUpdated$.subscribe(responder => {
      const index = this.responders.findIndex(r => r.id === responder.id);
      if (index !== -1) this.responders[index] = responder;
      else this.responders.push(responder);
    }));
  }

  // ─── Calls ────────────────────────────────────────────────
  // טוען את הקריאות הפעילות מהשרת ומעדכן את רשימת המוקד.
  loadActiveCalls(): void {
    this.isLoading = true;
    this.emergencyService.getActiveCalls().subscribe({
      next: (calls) => { this.activeCalls = calls; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  // בוחר קריאה כדי להציג פרטים ולהפעיל טעינת המלצות ניתוב.
  selectCall(call: EmergencyCase): void {
    if (this.selectedCall?.id === call.id) {
      this.selectedCall = null;
      this.routeRecommendations = [];
      return;
    }
    this.selectedCall = call;
    this.loadRouteRecommendations(call.id);
  }

  // ─── Route recommendations ────────────────────────────────
  // מביא המלצות ניתוב למיקום הקריאה הנבחרת כדי לבחור בית חולים מתאים.
  loadRouteRecommendations(callId: string): void {
    this.loadingRoutes = true;
    this.routeRecommendations = [];
    this.emergencyService.getRouteRecommendations(callId).subscribe({
      next: (recs) => { this.routeRecommendations = recs; this.loadingRoutes = false; },
      error: () => { this.loadingRoutes = false; }
    });
  }

  // ─── Manual assign ────────────────────────────────────────
  // משייך כונן ידנית לקריאה נבחרת ומעדכן את המצב על המסך.
  assignResponder(responderId: string): void {
    if (!this.selectedCall) return;
    this.emergencyService.assignResponder(this.selectedCall.id, responderId).subscribe({
      next: (updatedCall) => {
        const index = this.activeCalls.findIndex(c => c.id === updatedCall.id);
        if (index !== -1) this.activeCalls[index] = updatedCall;
        this.selectedCall = updatedCall;
        this.showToast('כונן שויך לקריאה', 'success');
      },
      error: () => this.showToast('שגיאה בשיוך כונן', 'error')
    });
  }

  // ─── New call ─────────────────────────────────────────────
  // מאתחל את טופס פתיחת הקריאה עם שדות חובה ובדיקות תקינות.
  initNewCallForm(): void {
    this.newCallForm = new FormGroup({
      city:        new FormControl('', [Validators.required, Validators.minLength(2)]),
      street:      new FormControl('', [Validators.required]),
      house:       new FormControl(''),
      description: new FormControl('', [Validators.maxLength(200)])
    });
  }

  get fCity()        { return this.newCallForm?.controls['city']; }
  get fStreet()      { return this.newCallForm?.controls['street']; }
  get fDescription() { return this.newCallForm?.controls['description']; }

  // ממיר כתובת טקסטית לקואורדינטות גאוגרפיות באמצעות Google Maps Geocoder.
  geocodeAddress(): void {
    const city = this.newCallForm?.value['city'] || this.cityInput;
    const street = this.newCallForm?.value['street'] || this.streetInput;
    const house = this.newCallForm?.value['house'] || this.houseInput;
    if (!city || !street) return;
    const fullAddress = `${street} ${house}, ${city}, ישראל`;
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        this.newCall.location = {
          lat: loc.lat(),
          lng: loc.lng(),
          address: results[0].formatted_address
        };
        this.showToast('מיקום אותר בהצלחה', 'success');
      }
    });
  }

  // שולח את הקריאה החדשה לשרת לאחר בדיקת מיקום והגדרת שדות חובה.
  submitNewCall(): void {
    if (!this.newCall.location.lat) {
      this.showToast('יש לאתר את המיקום תחילה', 'error');
      return;
    }
    this.emergencyService.createCall(this.newCall).subscribe({
      next: (call) => {
        this.activeCalls.unshift(call);
        this.showNewCallForm = false;
        this.resetForm();
        this.showToast('קריאה נפתחה בהצלחה', 'success');
      },
      error: () => this.showToast('שגיאה בפתיחת קריאה', 'error')
    });
  }

  // סוגר קריאה פעילה ומסיר אותה מרשימת הקריאות הפעילות.
  closeCall(callId: string): void {
    this.emergencyService.updateCallStatus(callId, 'CLOSED').subscribe({
      next: () => {
        this.activeCalls = this.activeCalls.filter(c => c.id !== callId);
        if (this.selectedCall?.id === callId) this.selectedCall = null;
        this.showToast('קריאה נסגרה', 'info');
      },
      error: () => this.showToast('שגיאה בסגירת קריאה', 'error')
    });
  }

  // ─── Toast ────────────────────────────────────────────────
  // מציג הודעת סטטוס קצרה למשתמש, למשל הצלחה, שגיאה או מידע.
  showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMessage = ''; }, 3500);
  }

  // ─── Helpers ──────────────────────────────────────────────
  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      CRITICAL:   'priority-critical',
      URGENT:     'priority-urgent',
      NON_URGENT: 'priority-normal'
    };
    return map[priority] || '';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING:      'ממתין',
      ASSIGNED:     'שויך',
      EN_ROUTE:     'בדרך',
      ON_SCENE:     'בזירה',
      TRANSPORTING: 'מפנה',
      CLOSED:       'סגור'
    };
    return map[status] || status;
  }

  getLoadColor(score: number): string {
    if (score >= 80) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    return '#22c55e';
  }

  getVehicleIcon(vehicleType: string): string {
    const map: Record<string, string> = {
      AMBULANCE:   '🚑',
      ICU_MOBILE:  '🚐',
      MOTORCYCLE:  '🏍️',
      CAR:         '🚗',
      HELICOPTER:  '🚁'
    };
    return map[vehicleType] || '🚑';
  }

  // מתנתק מהמערכת ומחזיר את המשתמש למסך הכניסה.
  logout(): void {
    this.signalrService.stopConnection();
    this.authService.logout();
    window.location.href = '/login';
  }

  // מאפס את טופס הקריאה החדשה אחרי שליחה מוצלחת.
  resetForm(): void {
    this.cityInput = '';
    this.streetInput = '';
    this.houseInput = '';
    this.selectedAge = '';
    this.newCall = { type: EmergencyType.Accident, location: { lat: 0, lng: 0 }, description: '' };
    this.newCallForm.reset();
  }

  // מחזיר את כמות הקריאות הפעילות לצורך תצוגת KPI.
  get activeCount() { return this.activeCalls.filter(c => c.status !== EmergencyStatus.Closed).length; }
  // מחזיר את כמות הכוננים זמינים על המסך.
  get availableResponders() { return this.responders.filter(r => r.isAvailable).length; }

  // מנקה subscriptions וחותם את חיבור SignalR כשהדף נסגר.
  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.signalrService.stopConnection();
  }
}
