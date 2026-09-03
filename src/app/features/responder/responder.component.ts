import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { EmergencyCase, EmergencyType, EmergencyStatus, Priority, PatientData } from '../../core/models/emergency.model';
import { SignalrService } from '../../core/services/signalr.service';
import { EmergencyService } from '../../core/services/emergency.service';
import { AuthService } from '../../core/services/auth.service';
import { ResponderService } from '../../core/services/responder.service';
import { ResponderStatus } from '../../core/models/responder.model';

type AppScreen = 'WAITING' | 'INCOMING_CALL' | 'PATIENT_FORM' | 'AI_RESULT';

// ⚠️ זמני — מצב פיתוח בלבד, להסרה כשה-SignalR יתחבר לשרת אמיתי ⚠️
const DEV_MOCK_CALL: EmergencyCase = {
  id: 'dev-call-1',
  type: EmergencyType.Cardiac,
  status: EmergencyStatus.Assigned,
  priority: Priority.Critical,
  location: { lat: 31.7683, lng: 35.2137, address: 'רחוב יפו 42, ירושלים' },
  createdAt: new Date(),
  updatedAt: new Date()
};

const DEV_MOCK_AI_RESULT = {
  type: 'SCOOP_AND_RUN',
  action: 'חשד לדימום פנימי — יש לפנות מיידית לבית חולים עם טראומה',
  confidence: 91,
  travelMinutes: 8,
  hospital: {
    name: 'בית חולים שערי צדק',
    address: 'רחוב שמואל בייט 12, ירושלים',
    location: { lat: 31.7794, lng: 35.2066 },
    load: { erLoadScore: 42, availableBeds: 6, estimatedWaitMinutes: 15 }
  }
};

@Component({
  selector: 'app-responder',
  templateUrl: './responder.component.html',
  styleUrls: ['./responder.component.scss'],
  standalone: false
})
// דף הכונן: מקבל קריאות, מרחיב את סטטוס, מזין נתוני מטופל ומקבל המלצות AI.
export class ResponderComponent implements OnInit, OnDestroy {
  screen: AppScreen = 'WAITING';
  activeCall: EmergencyCase | null = null;
  isSubmitting = false;
  currentStatus: ResponderStatus = ResponderStatus.Available;
  statusUpdating = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  private toastTimer: any;

  // ⚠️ זמני — רשימת מסכים לבדיקה ידנית, להסרה כשה-SignalR מחובר לשרת אמיתי ⚠️
  devScreens: { label: string; action: () => void }[] = [
    { label: '1️⃣ ממתין',           action: () => this.devGoTo('WAITING') },
    { label: '2️⃣ קריאה נכנסת',     action: () => this.devGoTo('INCOMING_CALL') },
    { label: '3️⃣ טופס מטופל',      action: () => this.devGoTo('PATIENT_FORM') },
    { label: '4️⃣ תוצאת AI',        action: () => this.devGoTo('AI_RESULT') }
  ];

  devGoTo(target: AppScreen): void {
    this.activeCall = { ...DEV_MOCK_CALL };
    if (target === 'AI_RESULT') {
      this.aiResult = DEV_MOCK_AI_RESULT;
    }
    this.screen = target;
  }

  patient = {
    consciousness: '',
    breathing: '',
    pulse: '',
    injuryType: '',
    skinColor: '',
    skinTemp: '',
    skinMoisture: '',
    age: null as number | null
  };

  aiResult: any = null;

  // ─── Option arrays ───────────────────────────────────────
  consciousnessOptions = [
    { label: 'ערני',       value: 'ALERT',        icon: '😊' },
    { label: 'מגיב לקול', value: 'VOICE',        icon: '🔊' },
    { label: 'מגיב לכאב', value: 'PAIN',         icon: '😣' },
    { label: 'לא מגיב',   value: 'UNRESPONSIVE', icon: '😶' }
  ];

  breathingOptions = [
    { label: 'תקינה',  value: 'NORMAL',  icon: '✅' },
    { label: 'מאומצת', value: 'LABORED', icon: '😤' },
    { label: 'גסה',    value: 'AGONAL',  icon: '⚠️' },
    { label: 'אין',    value: 'NONE',    icon: '🚫' }
  ];

  pulseOptions = [
    { label: 'תקין', value: 'NORMAL', icon: '💚' },
    { label: 'חלש',  value: 'WEAK',   icon: '💛' },
    { label: 'אין',  value: 'NONE',   icon: '🚫' }
  ];

  injuryOptions = [
    { label: 'ראש',         value: 'HEAD',    icon: '🧠' },
    { label: 'חזה',         value: 'CHEST',   icon: '🫁' },
    { label: 'בטן',         value: 'ABDOMEN', icon: '🫃' },
    { label: 'גפיים',       value: 'LIMBS',   icon: '🦵' },
    { label: 'שריפה',       value: 'BURN',    icon: '🔥' },
    { label: 'רב מערכתית', value: 'MULTI',   icon: '🆘' }
  ];

  skinColorOptions = [
    { label: 'רגיל',  value: 'NORMAL',   icon: '🟤' },
    { label: 'חיוור', value: 'PALE',     icon: '⬜' },
    { label: 'כחלחל', value: 'CYANOTIC', icon: '🔵' },
    { label: 'אדום',  value: 'FLUSHED',  icon: '🔴' }
  ];

  skinTempOptions = [
    { label: 'רגיל', value: 'NORMAL', icon: '✅' },
    { label: 'קר',   value: 'COLD',   icon: '🧊' },
    { label: 'חם',   value: 'HOT',    icon: '🌡️' }
  ];

  skinMoistureOptions = [
    { label: 'רגיל', value: 'NORMAL', icon: '✅' },
    { label: 'לח',   value: 'MOIST',  icon: '💧' },
    { label: 'יבש',  value: 'DRY',    icon: '🏜️' }
  ];

  statusButtons = [
    { label: 'בדרך לזירה',  value: ResponderStatus.EnRoute,      icon: '🚗', action: 'enRoute'      },
    { label: 'הגעתי לזירה', value: ResponderStatus.OnScene,      icon: '📍', action: 'onScene'      },
    { label: 'מפנה לבי"ח',  value: ResponderStatus.Transporting, icon: '🏥', action: 'transporting' },
    { label: 'פנוי',         value: ResponderStatus.Available,    icon: '✅', action: 'available'    }
  ];

  ResponderStatus = ResponderStatus;

  private subs = new Subscription();

  constructor(
    private signalrService: SignalrService,
    private emergencyService: EmergencyService,
    private authService: AuthService,
    private responderService: ResponderService
  ) {}

  // אתחול דף הכונן: חיבור SignalR, התחלת מעקב GPS והאזנה לקריאות נכנסות.
  ngOnInit(): void {
    const token = this.authService.getToken();
    if (token) this.signalrService.startConnection(token);

    this.responderService.startLocationTracking();

    this.subs.add(this.signalrService.newCall$.subscribe(call => {
      this.activeCall = call;
      this.screen = 'INCOMING_CALL';
    }));

    this.subs.add(this.signalrService.aiRecommendationReady$.subscribe(result => {
      this.aiResult = result;
      this.screen = 'AI_RESULT';
      this.isSubmitting = false;
    }));
  }

  // ─── Call actions ─────────────────────────────────────────
  // מקבל קריאה, מעדכן סטטוס ל"בדרך" ומעביר למסך הזנת מטופל.
  acceptCall(): void {
    this.updateStatus(ResponderStatus.EnRoute);
    this.screen = 'PATIENT_FORM';
    this.showToast('קריאה התקבלה — פנה לזירה', 'success');
  }

  // דוחה את הקריאה הנוכחית ומחזיר את המסך למצב המתנה.
  declineCall(): void {
    this.activeCall = null;
    this.screen = 'WAITING';
    this.showToast('הקריאה נדחתה', 'info');
  }

  // ─── Status update ────────────────────────────────────────
  // מעדכן את סטטוס הכונן בשרת ומסמן את המסך בהתאם.
  updateStatus(status: ResponderStatus): void {
    this.statusUpdating = true;
    this.currentStatus = status;

    this.responderService.updateStatus(status).subscribe({
      next: () => {
        this.statusUpdating = false;
        const label = this.statusButtons.find(b => b.value === status)?.label || '';
        this.showToast(`סטטוס עודכן: ${label}`, 'success');

        if (status === ResponderStatus.Available) {
          this.activeCall = null;
          this.screen = 'WAITING';
          this.resetPatient();
        }
      },
      error: () => {
        this.statusUpdating = false;
        this.showToast('שגיאה בעדכון סטטוס', 'error');
      }
    });
  }

  // ─── Patient form ─────────────────────────────────────────
  // בודק אם כל שדות הערכת המטופל מולאו כדי לאפשר שליחה.
  get formComplete(): boolean {
    return !!(
      this.patient.consciousness &&
      this.patient.breathing &&
      this.patient.pulse &&
      this.patient.injuryType &&
      this.patient.skinColor &&
      this.patient.skinTemp &&
      this.patient.skinMoisture
    );
  }

  // שולח את נתוני המטופל לשרת כדי לקבל המלצת AI ולעדכן את מצב הקריאה.
  submitPatient(): void {
    if (!this.formComplete || !this.activeCall) return;
    this.isSubmitting = true;

    const patientData: PatientData = {
      consciousness: this.patient.consciousness as any,
      breathing: this.patient.breathing as any,
      pulse: this.patient.pulse as any,
      injuryType: this.patient.injuryType as any,
      skinColor: this.patient.skinColor as any,
      skinTemp: this.patient.skinTemp as any,
      skinMoisture: this.patient.skinMoisture as any,
      estimatedAge: this.patient.age ?? undefined
    };

    this.responderService.submitPatientData(this.activeCall.id, patientData).subscribe({
      next: () => {
        this.emergencyService.updateCallStatus(this.activeCall!.id, 'ON_SCENE').subscribe();
        this.updateStatus(ResponderStatus.OnScene);
        this.showToast('נתוני מטופל נשלחו — ממתין להמלצת AI...', 'info');
      },
      error: () => {
        this.isSubmitting = false;
        this.showToast('שגיאה בשליחת נתונים', 'error');
      }
    });
  }

  // ─── Navigation ───────────────────────────────────────────
  // פותח ניווט ל-Waze אל בית החולים המומלץ מההמלצה.
  navigateToHospital(): void {
    if (this.aiResult?.hospital?.location) {
      const { lat, lng } = this.aiResult.hospital.location;
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
      this.updateStatus(ResponderStatus.Transporting);
    }
  }

  // פותח ניווט ל-Waze אל מיקום הזירה של הקריאה הנוכחית.
  navigateToScene(): void {
    if (this.activeCall?.location) {
      const { lat, lng } = this.activeCall.location;
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    }
  }

  // ─── Toast ────────────────────────────────────────────────
  // מציג הודעת מצב קצרה בעקבות פעולה כמו קבלת קריאה, דחייה או שגיאה.
  showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMessage = ''; }, 3500);
  }

  // ─── Helpers ──────────────────────────────────────────────
  // מאפס את תוכן טופס המטופל לאחר סגירת קריאה או חזרה למצב פנוי.
  resetPatient(): void {
    this.patient = {
      consciousness: '', breathing: '', pulse: '',
      injuryType: '', skinColor: '', skinTemp: '',
      skinMoisture: '', age: null
    };
    this.aiResult = null;
  }

  // ממיר את enum של סטטוס לכותרת ברורה למשתמש.
  getStatusLabel(status: ResponderStatus): string {
    const map: Record<string, string> = {
      AVAILABLE:    'פנוי',
      EN_ROUTE:     'בדרך',
      ON_SCENE:     'בזירה',
      TRANSPORTING: 'מפנה',
      OFFLINE:      'לא מחובר'
    };
    return map[status] || status;
  }

  // מתנתק מהמערכת, מפסיק מעקב GPS ומחזיר למסך הכניסה.
  logout(): void {
    this.responderService.stopLocationTracking();
    this.signalrService.stopConnection();
    this.authService.logout();
    window.location.href = '/login';
  }

  // מנקה subscriptions ומפסיק את חיבור SignalR ו-GPS כשהדף נסגר.
  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.signalrService.stopConnection();
    this.responderService.stopLocationTracking();
  }
}
