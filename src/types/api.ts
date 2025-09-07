// Centralized API types

export type Role = 'ADMIN' | 'EMPLOYEE';
export type RosterStatus = 'DRAFT' | 'PUBLISHED';

export interface Department {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

export interface Employee {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId?: string | null;
  active: boolean;
  createdAt?: string; // ISO datetime
  updatedAt?: string; // ISO datetime
}

export interface ShiftTemplate {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  startMinutes: number;
  endMinutes: number;
  color: string;
}

export interface Roster {
  id: string;
  departmentId: string;
  startDate: string; // ISO datetime (backend DateTime -> ISO)
  endDate: string;   // ISO datetime
  status?: RosterStatus;
  version?: number;
  locked?: boolean;
  publishedAt?: string | null;
  createdAt?: string; // ISO datetime
  updatedAt?: string; // ISO datetime
}

export interface ShiftAssignment {
  id: string;
  rosterId: string;
  employeeId: string;
  date: string;        // ISO datetime
  startMinutes: number;
  endMinutes: number;
  templateId?: string | null;
  createdAt?: string;  // ISO datetime
  updatedAt?: string;  // ISO datetime
}

export type AvailabilityRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface AvailabilityRequest {
  id: string;
  employeeId: string;
  date: string; // ISO datetime
  startMinutes?: number | null;
  endMinutes?: number | null;
  note?: string | null;
  status: AvailabilityRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  employee?: {
    id: string;
    email: string;
    fullName: string;
    departmentId?: string | null;
  };
}

export type SwapRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';
export interface SwapRequest {
  id: string;
  status: SwapRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  requestedById: string;
  requestedBy?: { id: string; email: string; fullName: string };
  fromAssignment: {
    id: string;
    date: string;
    startMinutes: number;
    endMinutes: number;
    employeeId: string;
    employee?: { id: string; fullName: string; email: string };
  };
  toAssignment: {
    id: string;
    date: string;
    startMinutes: number;
    endMinutes: number;
    employeeId: string;
    employee?: { id: string; fullName: string; email: string };
  };
}
