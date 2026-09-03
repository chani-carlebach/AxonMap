export enum HospitalSpeciality {
  Trauma = 'TRAUMA',
  Cardiology = 'CARDIOLOGY',
  Neurology = 'NEUROLOGY',
  Maternity = 'MATERNITY',
  Burns = 'BURNS',
  Pediatrics = 'PEDIATRICS'
}

export interface HospitalLoad {
  erLoadScore: number; 
  estimatedWaitMinutes: number;
  availableBeds: number;
  lastUpdated: Date;
}

export interface Hospital {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  address: string;
  specialities: HospitalSpeciality[];
  load: HospitalLoad;
  phone: string;
}

export interface RouteRecommendation {
  hospital: Hospital;
  travelTimeMinutes: number;
  trafficScore: number;
  totalTTC: number; // Total Time to Care
  rank: number;
  isRecommended: boolean;
}