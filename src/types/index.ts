export type LeaveStatus = 'Draft' | 'Submitted' | 'Approved' | 'Denied' | 'Withdrawn';

export type LeaveTypeName =
  | 'Vacation'
  | 'Sick'
  | 'Personal'
  | 'Bereavement'
  | 'FMLA'
  | 'Unpaid';

export type UserRole = 'Employee' | 'Manager' | 'HR Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  managerId?: string;
  managerEmail?: string;
  avatar: string;
}

export interface LeaveType {
  id: string;
  name: LeaveTypeName;
  color: string;
  maxDays: number;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: LeaveTypeName;
  availableDays: number;
  usedDays: number;
  year: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: LeaveTypeName;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: LeaveStatus;
  comments: string;
  submittedOn: string;
  reviewedBy?: string;
  reviewerComments?: string;
  reviewedOn?: string;
}
