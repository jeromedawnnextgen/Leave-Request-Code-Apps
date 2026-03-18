import { create } from 'zustand';
import type { User, LeaveBalance, LeaveRequest } from '../types';
import { USERS, LEAVE_BALANCES, LEAVE_REQUESTS } from '../data/mockData';

interface LeaveStore {
  currentUser: User;
  users: User[];
  balances: LeaveBalance[];
  requests: LeaveRequest[];

  setCurrentUser: (user: User) => void;
  addRequest: (request: LeaveRequest) => void;
  updateRequest: (id: string, updates: Partial<LeaveRequest>) => void;
  deleteRequest: (id: string) => void;
  updateBalance: (employeeId: string, leaveTypeId: string, delta: number) => void;
  adjustBalance: (id: string, availableDays: number) => void;
}

export const useLeaveStore = create<LeaveStore>((set) => ({
  currentUser: USERS[0], // default: Alex Johnson (Employee)
  users: USERS,
  balances: LEAVE_BALANCES,
  requests: LEAVE_REQUESTS,

  setCurrentUser: (user) => set({ currentUser: user }),

  addRequest: (request) =>
    set((state) => ({ requests: [request, ...state.requests] })),

  updateRequest: (id, updates) =>
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  deleteRequest: (id) =>
    set((state) => ({ requests: state.requests.filter((r) => r.id !== id) })),

  updateBalance: (employeeId, leaveTypeId, delta) =>
    set((state) => ({
      balances: state.balances.map((b) =>
        b.employeeId === employeeId && b.leaveTypeId === leaveTypeId
          ? { ...b, usedDays: b.usedDays + delta, availableDays: b.availableDays - delta }
          : b
      ),
    })),

  adjustBalance: (id, availableDays) =>
    set((state) => ({
      balances: state.balances.map((b) =>
        b.id === id ? { ...b, availableDays } : b
      ),
    })),
}));
