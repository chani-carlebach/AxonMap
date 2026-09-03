export enum EmergencyType {
  Fire = 'FIRE',
  Attack = 'ATTACK',
  Accident = 'ACCIDENT',
  Cardiac = 'CARDIAC',
  Stroke = 'STROKE',
  Birth = 'BIRTH',
  Trauma = 'TRAUMA'
}

export enum EmergencyStatus {
  Pending = 'PENDING',
  Assigned = 'ASSIGNED',
  EnRoute = 'EN_ROUTE',
  OnScene = 'ON_SCENE',
  Transporting = 'TRANSPORTING',
  Closed = 'CLOSED'
}

export enum Priority {
  Critical = 'CRITICAL',
  Urgent = 'URGENT',
  NonUrgent = 'NON_URGENT'
}

export interface PatientData {
  consciousness: 'ALERT' | 'VOICE' | 'PAIN' | 'UNRESPONSIVE';
  breathing: 'NORMAL' | 'LABORED' | 'AGONAL' | 'NONE';
  pulse: 'NORMAL' | 'WEAK' | 'NONE';
  injuryType: 'HEAD' | 'CHEST' | 'ABDOMEN' | 'LIMBS' | 'BURN' | 'MULTI' | 'OTHER';
  skinColor?: 'NORMAL' | 'PALE' | 'CYANOTIC' | 'FLUSHED';
  skinTemp?: 'NORMAL' | 'COLD' | 'HOT';
  skinMoisture?: 'NORMAL' | 'MOIST' | 'DRY';
  estimatedAge?: number;
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  minutesSinceIncident?: number;
}

export interface EmergencyCase {
  id: string;
  type: EmergencyType;
  status: EmergencyStatus;
  priority: Priority;
  location: { lat: number; lng: number; address?: string };
  patientData?: PatientData;
  assignedResponderId?: string;
  destinationHospitalId?: string;
  createdAt: Date;
  updatedAt: Date;
}