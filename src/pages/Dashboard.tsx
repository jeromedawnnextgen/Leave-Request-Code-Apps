import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Clock, CheckCircle, XCircle, TrendingUp, Trash2, Send, Pencil, AlertTriangle } from 'lucide-react';
import { useLeaveStore } from '../store/useLeaveStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LEAVE_TYPES } from '../data/mockData';
import { fmtDate, fmtRange } from '../utils/dates';
import type { LeaveBalance } from '../types';

const LEAVE_TYPE_ICONS: Record<string, string> = {
  Vacation: '🏖️',
  Sick: '🤒',
  Personal: '🙋',
  Bereavement: '🕊️',
  FMLA: '👶',
  Unpaid: '💼',
};

function BalanceCard({ balance }: { balance: LeaveBalance }) {
  const leaveType = LEAVE_TYPES.find((lt) => lt.id === balance.leaveTypeId);
  const total = balance.availableDays + balance.usedDays;
  const usedPct = total > 0 ? (balance.usedDays / total) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-5 hover:border-gray-300 dark:hover:border-slate-600/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xl mb-1">{LEAVE_TYPE_ICONS[balance.leaveTypeName] || '📅'}</div>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{balance.leaveTypeName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{balance.availableDays}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">days left</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
          <span>{balance.usedDays} used</span>
          <span>{total} total</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${usedPct}%`,
              backgroundColor: leaveType?.color ?? '#3b82f6',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, balances, requests, updateRequest, deleteRequest } = useLeaveStore();
  const [cancelId, setCancelId] = useState<string | null>(null);

  const myBalances = useMemo(
    () => balances.filter((b) => b.employeeId === currentUser.id),
    [balances, currentUser.id]
  );

  const myDrafts = useMemo(
    () => requests.filter((r) => r.employeeId === currentUser.id && r.status === 'Draft'),
    [requests, currentUser.id]
  );

  const myRequests = useMemo(
    () =>
      requests
        .filter((r) => r.employeeId === currentUser.id && r.status !== 'Draft')
        .sort((a, b) => new Date(b.submittedOn).getTime() - new Date(a.submittedOn).getTime()),
    [requests, currentUser.id]
  );

  const stats = useMemo(() => {
    const pending = myRequests.filter((r) => r.status === 'Submitted').length;
    const approved = myRequests.filter((r) => r.status === 'Approved').length;
    const denied = myRequests.filter((r) => r.status === 'Denied').length;
    const totalUsed = myBalances.reduce((sum, b) => sum + b.usedDays, 0);
    return { pending, approved, denied, totalUsed };
  }, [myRequests, myBalances]);

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">
            Here's your leave overview for {new Date().getFullYear()}
          </p>
        </div>
        <Link
          to="/new-request"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Request
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Pending Review',
            value: stats.pending,
            icon: Clock,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30',
          },
          {
            label: 'Approved',
            value: stats.approved,
            icon: CheckCircle,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/30',
          },
          {
            label: 'Denied',
            value: stats.denied,
            icon: XCircle,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30',
          },
          {
            label: 'Days Used',
            value: stats.totalUsed,
            icon: TrendingUp,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/30',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl p-5 border ${bg}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Leave Balances */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leave Balances</h2>
        {myBalances.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {myBalances.map((balance) => (
              <BalanceCard key={balance.id} balance={balance} />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-slate-500 text-sm">No balances found.</p>
        )}
      </section>

      {/* Drafts */}
      {myDrafts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Drafts
            <span className="ml-2 text-sm font-normal text-gray-400 dark:text-slate-500">({myDrafts.length})</span>
          </h2>
          <div className="space-y-3">
            {myDrafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-white dark:bg-slate-800/50 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="text-xl">{LEAVE_TYPE_ICONS[draft.leaveTypeName] || '📅'}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                      {draft.leaveTypeName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      {fmtRange(draft.startDate, draft.endDate)} · {draft.totalDays} day{draft.totalDays !== 1 ? 's' : ''}
                    </p>
                    {draft.comments && (
                      <p className="text-xs text-gray-400 dark:text-slate-500 italic mt-0.5">"{draft.comments}"</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => deleteRequest(draft.id)}
                    className="p-2 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/new-request?edit=${draft.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => updateRequest(draft.id, { status: 'Submitted' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Submit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Requests */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Requests</h2>
        <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
          {myRequests.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-transparent">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Dates</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Days</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/30">
                {myRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span>{LEAVE_TYPE_ICONS[req.leaveTypeName] || '📅'}</span>
                        <span className="text-sm text-gray-700 dark:text-slate-200">{req.leaveTypeName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">
                      {fmtRange(req.startDate, req.endDate)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-slate-400">{req.totalDays}d</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-slate-500">{fmtDate(req.submittedOn)}</td>
                    <td className="px-5 py-3.5">
                      {req.status === 'Submitted' && (
                        <button
                          onClick={() => setCancelId(req.id)}
                          title="Cancel"
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-gray-400 dark:text-slate-500 text-sm">No requests yet.</p>
              <Link
                to="/new-request"
                className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                <PlusCircle className="w-4 h-4" />
                Submit your first request
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Cancel confirmation modal */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Cancel this request?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
              This will withdraw the pending request. It will be marked as withdrawn in your history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelId(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={() => {
                  updateRequest(cancelId, { status: 'Withdrawn' });
                  setCancelId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
              >
                Yes, cancel it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
