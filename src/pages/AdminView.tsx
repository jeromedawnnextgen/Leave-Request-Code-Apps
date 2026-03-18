import { useState, useMemo } from 'react';
import {
  Download,
  Search,
  SlidersHorizontal,
  Users,
  CalendarDays,
  CheckCircle,
  Clock,
  Pencil,
} from 'lucide-react';
import { useLeaveStore } from '../store/useLeaveStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LEAVE_TYPES } from '../data/mockData';
import { fmtDate, fmtRange } from '../utils/dates';
import type { LeaveBalance, LeaveTypeName } from '../types';

const LEAVE_ICONS: Record<string, string> = {
  Vacation: '🏖️',
  Sick: '🤒',
  Personal: '🙋',
  Bereavement: '🕊️',
  FMLA: '👶',
  Unpaid: '💼',
};

function AdjustModal({
  balance,
  onConfirm,
  onCancel,
}: {
  balance: LeaveBalance;
  onConfirm: (days: number) => void;
  onCancel: () => void;
}) {
  const [days, setDays] = useState(balance.availableDays);
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Adjust Balance</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
          {balance.leaveTypeName} balance for employee #{balance.employeeId}
        </p>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Available Days</label>
        <input
          type="number"
          min={0}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-gray-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(days)}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminView() {
  const { users, requests, balances, adjustBalance } = useLeaveStore();
  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'types'>('requests');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [adjustModal, setAdjustModal] = useState<LeaveBalance | null>(null);

  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (typeFilter !== 'all' && r.leaveTypeName !== typeFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            r.employeeName.toLowerCase().includes(q) ||
            r.leaveTypeName.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.submittedOn).getTime() - new Date(a.submittedOn).getTime());
  }, [requests, search, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === 'Submitted').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    employees: users.filter((u) => u.role !== 'HR Admin').length,
  }), [requests, users]);

  function exportCSV() {
    const headers = ['Employee', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Submitted', 'Reviewer'];
    const rows = filteredRequests.map((r) => [
      r.employeeName,
      r.leaveTypeName,
      r.startDate,
      r.endDate,
      r.totalDays,
      r.status,
      r.submittedOn,
      r.reviewedBy ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leave_requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin View</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Full visibility across all leave requests and balances.</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Requests', value: stats.total, icon: CalendarDays, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Employees', value: stats.employees, icon: Users, color: 'text-purple-600 dark:text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-800 mb-6">
        {(['requests', 'balances', 'types'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors -mb-px ${
              activeTab === tab
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300'
            }`}
          >
            {tab === 'requests' ? 'All Requests' : tab === 'balances' ? 'Leave Balances' : 'Leave Types'}
          </button>
        ))}
      </div>

      {/* All Requests Tab */}
      {activeTab === 'requests' && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee or type…"
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-gray-800 dark:text-slate-200 text-sm placeholder:text-gray-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-700 dark:text-slate-300 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Denied">Denied</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-700 dark:text-slate-300 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {LEAVE_TYPES.map((lt) => (
                  <option key={lt.id} value={lt.name}>{lt.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-transparent">
                  {['Employee', 'Type', 'Dates', 'Days', 'Status', 'Submitted', 'Reviewer'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/30">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
                      No requests match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-slate-300">
                            {req.employeeName.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-slate-200">{req.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">
                        {LEAVE_ICONS[req.leaveTypeName] || '📅'} {req.leaveTypeName}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {fmtRange(req.startDate, req.endDate)}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">{req.totalDays}d</td>
                      <td className="px-5 py-3.5"><StatusBadge status={req.status} /></td>
                      <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-slate-500">{fmtDate(req.submittedOn)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-slate-500">{req.reviewedBy ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Balances Tab */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {users
            .filter((u) => u.role !== 'HR Admin')
            .map((user) => {
              const userBalances = balances.filter((b) => b.employeeId === user.id);
              if (userBalances.length === 0) return null;
              return (
                <div key={user.id} className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-300">
                      {user.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{user.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{user.department} · {user.role}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-slate-700/30">
                    {userBalances.map((bal) => {
                      const lt = LEAVE_TYPES.find((l) => l.id === bal.leaveTypeId);
                      const total = bal.availableDays + bal.usedDays;
                      const pct = total > 0 ? (bal.usedDays / total) * 100 : 0;
                      return (
                        <div key={bal.id} className="px-5 py-3.5 flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lt?.color ?? '#3b82f6' }} />
                          <span className="text-sm text-gray-600 dark:text-slate-300 w-28 flex-shrink-0">{bal.leaveTypeName}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-1">
                              <span>{bal.usedDays} used</span>
                              <span>{bal.availableDays} available</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: lt?.color ?? '#3b82f6' }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => setAdjustModal(bal)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            Adjust
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Leave Types Tab */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {LEAVE_TYPES.map((lt) => {
            const usageCount = requests.filter(
              (r) => r.leaveTypeName === (lt.name as LeaveTypeName) && r.status === 'Approved'
            ).length;
            return (
              <div key={lt.id} className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: lt.color + '20', border: `1px solid ${lt.color}40` }}
                    >
                      {LEAVE_ICONS[lt.name] || '📅'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{lt.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">Max {lt.maxDays} days/year</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lt.color }} />
                  <span className="text-xs text-gray-400 dark:text-slate-400">{usageCount} approved this year</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustModal && (
        <AdjustModal
          balance={adjustModal}
          onConfirm={(days) => {
            adjustBalance(adjustModal.id, days);
            setAdjustModal(null);
          }}
          onCancel={() => setAdjustModal(null)}
        />
      )}
    </div>
  );
}
