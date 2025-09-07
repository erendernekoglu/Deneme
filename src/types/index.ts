export type UserRole = 'admin' | 'employee';

export interface Department {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  phone: string;
  departmentId: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  color: string;
  departmentId: string;
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  date: string;
  shiftTemplateId: string;
}

export interface WeekDay {
  date: string;
  dayName: string;
  dayNumber: number;
}
