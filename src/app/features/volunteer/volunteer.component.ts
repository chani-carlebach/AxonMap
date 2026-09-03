import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SignalrService } from '../../core/services/signalr.service';
import { AuthService } from '../../core/services/auth.service';
import { VolunteerService, EvacuationRecommendation } from '../../core/services/volunteer.service';
import { EmergencyCase, EmergencyType, EmergencyStatus, Priority, PatientData } from '../../core/models/emergency.model';

// IDLE              — המתנדב מחובר אך לא בכוננות (לא קיבל בקשה / לא אישר)
// INCOMING_REQUEST  — התקבלה בקשת כוננות מהמערכת (רף 30%)
// AVAILABLE         — המתנדב אישר זמינות, מחכה לקריאה
// ACTIVE            — קריאה הוקצתה, בדרך לזירה
// ON_SCENE_REPORT   — המתנדב הגיע, ממלא הערכת מצב
// AI_RESULT         — קיבל הנחיה: פינוי מיידי / ייצוב בשטח
type VolunteerScreen =
  | 'IDLE'
  | 'INCOMING_REQUEST'
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'ON_SCENE_REPORT'
  | 'AI_RESULT';

// ⚠️ זמני — מצב פיתוח בלבד, להסרה כשה-SignalR יתחבר לשרת אמיתי ⚠️
const DEV_MOCK_CALL: EmergencyCase = {
  id: 'dev-vol-call-1',
  type: EmergencyType.Trauma,
  status: EmergencyStatus.Assigned,
  priority: Priority.Urgent,
  location: { lat: 31.7683, lng: 35.2137, address: 'רחוב הנביאים 8, ירושלים' },
  createdAt: new Date(),
  updatedAt: new Date()
};

const DEV_MOCK_STAY_PLAY: EvacuationRecommendation = {
  type: 'STAY_AND_PLAY',
  action: 'מצב יציב — בצע ייצוב ראשוני באתר וחכה לכוננים מקצועיים',
  confidence: 78,
  hospital: {
    name: 'בית חולים הדסה עין כרם',
    address: 'דרך חברון, ירושלים',
    location: { lat: 31.7614, lng: 35.1969 },
    load: { erLoadScore: 35, availableBeds: 9, estimatedWaitMinutes: 10 }
  }
};

const DEV_MOCK_SCOOP_RUN: EvacuationRecommendation = {
  type: 'SCOOP_AND_RUN',
  action: 'חשד לפגיעה רב מערכתית — פנה מיידית לבית החולים הקרוב',
  confidence: 88,
  travelMinutes: 6,
  hospital: {
    name: 'בית חולים שערי צדק',
    address: 'רחוב שמואל בייט 12, ירושלים',
    location: { lat: 31.7794, lng: 35.2066 },
    load: { erLoadScore: 58, availableBeds: 4, estimatedWaitMinutes: 20 }
  }
};

@Component({
  selector: 'app-volunteer',
  templateUrl: './volunteer.component.html',
  styleUrls: ['./volunteer.component.scss'],
  standalone: false
})
// דף המתנדב: מקבל בקשות כוננות, מציין זמינות ומספק הערכת מצב לקבלת הנחיית פינוי.
export class VolunteerComponent implements OnInit, OnDestroy {
  screen: VolunteerScreen = 'IDLE';
  activeCall: EmergencyCase | null = null;
  volunteerMessage = '';
  isUpdatingAvailability = false;
  isSubmitting = false;

  // ⚠️ זמני — רשימת מסכים לבדיקה ידנית, להסרה כשה-SignalR מחובר לשרת אמיתי ⚠️
  devScreens: { label: string; action: () => void }[] = [
    { label: '1️⃣ לא בכוננות',        action: () => this.devGoTo('IDLE') },
    { label: '2️⃣ בקשת כוננות',       action: () => this.devGoTo('INCOMING_REQUEST') },
    { label: '3️⃣ כונן פעיל',         action: () => this.devGoTo('AVAILABLE') },
    { label: '4️⃣ קריאה פעילה',       action: () => this.devGoTo('ACTIVE') },
    { label: '5️⃣ הערכת מצב',         action: () => this.devGoTo('ON_SCENE_REPORT') },
    { label: '6️⃣א AI: ייצוב בשטח',   action: () => this.devGoTo('AI_RESULT', DEV_MOCK_STAY_PLAY) },
    { label: '6️⃣ב AI: פינוי מיידי',  action: () => this.devGoTo('AI_RESULT', DEV_MOCK_SCOOP_RUN) }
  ];

  devGoTo(target: VolunteerScreen, result?: EvacuationRecommendation): void {
    if (target === 'INCOMING_REQUEST') {
      this.volunteerMessage = 'רמת הכוננות באזורך עלתה — האם אתה זמין לעזרה?';
    }
    if (['ACTIVE', 'ON_SCENE_REPORT', 'AI_RESULT'].includes(target)) {
      this.activeCall = { ...DEV_MOCK_CALL };
    }
    if (target === 'AI_RESULT') {
      this.evacuationResult = result ?? DEV_MOCK_STAY_PLAY;
    }
    this.screen = target;
  }

  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  private toastTimer: any;

  // ─── On-scene quick assessment ─────────────────────────────
  assessment = {
    consciousness: '',
    breathing: '',
    pulse: '',
    injuryType: '',
    age: null as number | null
  };

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

  evacuationResult: EvacuationRecommendation | null = null;

  private subs = new Subscription();

  constructor(
    private signalrService: SignalrService,
    private authService: AuthService,
    private volunteerService: VolunteerService
  ) {}

  // אתחול דף המתנדב: חיבור SignalR והאזנה לבקשות כוננות ומקריאות שוייכו.
  ngOnInit(): void {
    const token = this.authService.getToken();
    if (token) this.signalrService.startConnection(token);

    // מגיע מהשרת כשזמינות הצי הראשי יורדת מתחת ל-30%
    this.subs.add(this.signalrService.volunteerRequest$.subscribe(message => {
      this.volunteerMessage = message;
      if (this.screen === 'IDLE') this.screen = 'INCOMING_REQUEST';
    }));

    // מגיע רק למי שאישר זמינות ושויך לקריאה
    this.subs.add(this.signalrService.newCall$.subscribe(call => {
      if (this.screen === 'AVAILABLE') {
        this.activeCall = call;
        this.screen = 'ACTIVE';
        this.showToast('שויכת לקריאה — פנה לזירה', 'success');
      }
    }));
  }

  // ─── Availability flow ─────────────────────────────────────
  // מקבל או דוחה בקשת כוננות של המערכת לפי בחירת המתנדב.
  respondToRequest(accept: boolean): void {
    if (accept) {
      this.goAvailable();
    } else {
      this.screen = 'IDLE';
      this.volunteerMessage = '';
    }
  }

  // מגדיר את המתנדב כזמין ונכנס לרשימת הכוננים הפעילים.
  goAvailable(): void {
    this.isUpdatingAvailability = true;
    this.volunteerService.setAvailable().subscribe({
      next: () => {
        this.isUpdatingAvailability = false;
        this.screen = 'AVAILABLE';
        this.showToast('סטטוס: כונן פעיל — ממתין לקריאה', 'success');
      },
      error: () => {
        this.isUpdatingAvailability = false;
        this.showToast('שגיאה בעדכון זמינות', 'error');
      }
    });
  }

  // מסיר את המתנדב מהרשימת הכוננים הפעילים ומחזירו למצב לא זמין.
  goOffline(): void {
    this.isUpdatingAvailability = true;
    this.volunteerService.setOffline().subscribe({
      next: () => {
        this.isUpdatingAvailability = false;
        this.screen = 'IDLE';
        this.activeCall = null;
        this.volunteerMessage = '';
        this.showToast('סטטוס: לא בכוננות', 'info');
      },
      error: () => {
        this.isUpdatingAvailability = false;
        this.showToast('שגיאה בעדכון זמינות', 'error');
      }
    });
  }

  // ─── Active call ────────────────────────────────────────────
  // דוחה קריאה פעילה שחולקה למתנדב ומחזיר אותו למסך ההמתנה.
  declineCall(): void {
    this.activeCall = null;
    this.screen = 'AVAILABLE';
    this.showToast('הקריאה נדחתה', 'info');
  }

  // פותח ניווט ב-Waze אל נקודת הזירה של הקריאה.
  navigateToScene(): void {
    if (this.activeCall?.location) {
      const { lat, lng } = this.activeCall.location;
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    }
  }

  // "הגעתי לזירה" — מדווח לשרת ועובר למסך הערכת מצב.
  reportArrival(): void {
    if (!this.activeCall) return;
    this.volunteerService.reportArrival(this.activeCall.id).subscribe({
      next: () => {
        this.screen = 'ON_SCENE_REPORT';
        this.showToast('הגעה לזירה דווחה', 'success');
      },
      error: () => this.showToast('שגיאה בדיווח הגעה', 'error')
    });
  }

  // ─── On-scene assessment ────────────────────────────────────
  // בודק אם כל נתוני ההערכה הראשונית מולאו כדי לאפשר שליחה.
  get assessmentComplete(): boolean {
    return !!(
      this.assessment.consciousness &&
      this.assessment.breathing &&
      this.assessment.pulse &&
      this.assessment.injuryType
    );
  }

  // שולח את הערכת המצב הראשונית לשרת ומקבל המלצת פינוי או ייצוב.
  submitAssessment(): void {
    if (!this.assessmentComplete || !this.activeCall) return;
    this.isSubmitting = true;

    const patientData: PatientData = {
      consciousness: this.assessment.consciousness as any,
      breathing: this.assessment.breathing as any,
      pulse: this.assessment.pulse as any,
      injuryType: this.assessment.injuryType as any,
      estimatedAge: this.assessment.age ?? undefined
    };

    this.volunteerService.submitAssessment({ callId: this.activeCall.id, patientData }).subscribe({
      next: (recommendation) => {
        this.isSubmitting = false;
        this.evacuationResult = recommendation;
        this.screen = 'AI_RESULT';
      },
      error: () => {
        this.isSubmitting = false;
        this.showToast('שגיאה בקבלת הנחיה', 'error');
      }
    });
  }

  // ─── Finishing the call ─────────────────────────────────────
  // פותח ניווט לבית החולים המומלץ מההמלצה שקיבל המתנדב.
  navigateToHospital(): void {
    if (this.evacuationResult?.hospital?.location) {
      const { lat, lng } = this.evacuationResult.hospital.location;
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    }
  }

  // מסיים את הקריאה הנוכחית וחוזר למסך הכוננות של המתנדב.
  finishCall(): void {
    this.activeCall = null;
    this.evacuationResult = null;
    this.resetAssessment();
    this.screen = 'AVAILABLE';
    this.showToast('הקריאה הסתיימה — חוזר לכוננות', 'info');
  }

  // מאפס את הערכת המצב כדי להכין את הטופס לקריאה הבאה.
  resetAssessment(): void {
    this.assessment = { consciousness: '', breathing: '', pulse: '', injuryType: '', age: null };
  }

  // ─── Toast ────────────────────────────────────────────────
  // מציג הודעת מצב קצרת מועד כדי לתעד את הפעולה שבוצעה.
  showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMessage = ''; }, 3500);
  }

  // מתנתק מהמערכת ויוצא למסך הכניסה.
  logout(): void {
    this.signalrService.stopConnection();
    this.authService.logout();
    window.location.href = '/login';
  }

  // מנקה subscriptions וחותם את חיבור SignalR כשהדף נסגר.
  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.signalrService.stopConnection();
  }
}
