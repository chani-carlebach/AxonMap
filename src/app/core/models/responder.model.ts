export enum ResponderRole {
  Paramedic = 'PARAMEDIC',
  EMT = 'EMT',
  Volunteer = 'VOLUNTEER'
}

export enum ResponderStatus {
  Available = 'AVAILABLE',
  EnRoute = 'EN_ROUTE',
  OnScene = 'ON_SCENE',
  Transporting = 'TRANSPORTING',
  Offline = 'OFFLINE'
}

export interface ResponderLocation {
  lat: number;
  lng: number;
  updatedAt: Date;
}

export type VehicleType = 'AMBULANCE' | 'ICU_MOBILE' | 'MOTORCYCLE' | 'CAR' | 'HELICOPTER';

export interface Responder {
  id: string;
  name: string;
  role: ResponderRole;
  status: ResponderStatus;
  currentLocation: ResponderLocation;
  vehicleType: VehicleType;
  isAvailable: boolean;
  activeCallId?: string;
}