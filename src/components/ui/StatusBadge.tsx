import type { LeaveStatus } from '../../types';

const STATUS_CONFIG: Record<LeaveStatus, { label: string; classes: string }> = {
  Draft: {
    label: 'Draft',
    classes: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  },
  Submitted: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  },
  Approved: {
    label: 'Approved',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
  },
  Denied: {
    label: 'Denied',
    classes: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50',
  },
  Withdrawn: {
    label: 'Withdrawn',
    classes: 'bg-gray-50 text-gray-500 border border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}
