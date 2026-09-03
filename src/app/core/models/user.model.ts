export enum UserRole {
  Dispatcher = 'DISPATCHER',
  Paramedic = 'PARAMEDIC',
  Volunteer = 'VOLUNTEER',
  Admin = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}