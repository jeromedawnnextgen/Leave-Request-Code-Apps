import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, MessageSquare, Users, Clock } from 'lucide-react';
import { useLeaveStore } from '../store/useLeaveStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { fmtDate, fmtRange } from '../utils/dates';
import type { LeaveRequest } from '../types';

const LEAVE_ICONS: Record<string, string> = {
  Vacation: '🏖️',
  Sick: '🤒',
  Personal: '🙋',
  Bereavement: '🕊️',
  FMLA: '👶',
  Unpaid: '💼',
};

function ReviewModal({
  request,
  action,
  onConfirm,
  onCancel,
}: {
  request: LeaveRequest;
  action: 'Approved' | 'Denied';
  onConfirm: (comments: string) => void;
  onCancel: () => void;
}) {
  const [comments, setComments] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
            action === 'Approved'
              ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/40 dark:border-emerald-700/50'
              : 'bg-red-50 border border-red-200 dark:bg-red-900/40 dark:border-red-700/50'
          }`}>
            {action === 'Approved'
              ? <CheckCircle className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
              : <XCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
            }
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {action === 'Approved' ? 'Approve' : 'Deny'} Request
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
            {request.leaveTypeName} leave for{' '}
            <span className="text-gray-700 dark:text-slate-300 font-medium">{request.employeeName}</span>
            {' '}({request.totalDays} day{request.totalDays !== 1 ? 's' : ''},{' '}
            {fmtRange(request.startDate, request.endDate)})
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Reviewer Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder="Add a note to the employee…"
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-gray-800 dark:text-slate-200 text-sm placeholder:text-gray-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(comments)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${
              action === 'Approved'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-red-600 hover:bg-red-500'
            }`}
          >
            {action === 'Approved' ? 'Approve' : 'Deny'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApprovalQueue() {
  const { currentUser, users, requests, updateRequest, updateBalance } = useLeaveStore();
  const [modal, setModal] = useState<{
    request: LeaveRequest;
    action: 'Approved' | 'Denied';
  } | null>(null);
  const [filter, setFilter] = useState<'Submitted' | 'all'>('Submitted');

  const directReportIds = useMemo(
    () => users.filter((u) => u.managerId === currentUser.id).map((u) => u.id),
    [users, currentUser.id]
  );

  const queueRequests = useMemo(() => {
    return requests
      .filter((r) => {
        if (!directReportIds.includes(r.employeeId)) return false;
        if (filter === 'Submitted') return r.status === 'Submitted';
        return true;
      })
      .sort((a, b) => new Date(b.submittedOn).getTime() - new Date(a.submittedOn).getTime());
  }, [requests, directReportIds, filter]);

  const pendingCount = useMemo(
    () =>
      requests.filter(
        (r) => directReportIds.includes(r.employeeId) && r.status === 'Submitted'
      ).length,
    [requests, directReportIds]
  );

  function handleAction(action: 'Approved' | 'Denied', reviewerComments: string) {
    if (!modal) return;
    const today = new Date().toISOString().slice(0, 10);
    updateRequest(modal.request.id, {
      status: action,
      reviewedBy: currentUser.name,
      reviewerComments,
      reviewedOn: today,
    });
    if (action === 'Approved') {
      updateBalance(modal.request.employeeId, modal.request.leaveTypeId, modal.request.totalDays);
    }
    setModal(null);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approval Queue</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Review leave requests from your direct reports.</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-full">
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">{pendingCount} pending</span>
          </div>
        )}
      </div>

      {/* Team stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Direct Reports', value: directReportIds.length, icon: Users, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Pending Review', value: pendingCount, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Reviewed (All Time)', value: requests.filter(r => directReportIds.includes(r.employeeId) && (r.status === 'Approved' || r.status === 'Denied')).length, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl px-5 py-4 flex items-center gap-4">
            <Icon className={`w-8 h-8 ${color}`} />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['Submitted', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600/30'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            {f === 'Submitted' ? 'Pending' : 'All Requests'}
          </button>
        ))}
      </div>

      {/* Request cards */}
      {queueRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl py-16 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-gray-800 dark:text-white font-medium">You're all caught up!</p>
          <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">No pending requests to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queueRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-5 hover:border-gray-300 dark:hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-300 flex-shrink-0">
                    {req.employeeName.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white">{req.employeeName}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {LEAVE_ICONS[req.leaveTypeName] || '📅'} {req.leaveTypeName}
                      </span>
                      <span className="text-gray-300 dark:text-slate-600">·</span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {fmtRange(req.startDate, req.endDate)}
                      </span>
                      <span className="text-gray-300 dark:text-slate-600">·</span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">{req.totalDays} day{req.totalDays !== 1 ? 's' : ''}</span>
                    </div>
                    {req.comments && (
                      <p className="mt-2 text-sm text-gray-400 dark:text-slate-500 italic">"{req.comments}"</p>
                    )}
                    {req.reviewerComments && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                        <span className="text-gray-600 dark:text-slate-400">Reviewer note:</span> {req.reviewerComments}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-300 dark:text-slate-600">Submitted {fmtDate(req.submittedOn)}</p>
                  </div>
                </div>
                {req.status === 'Submitted' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setModal({ request: req, action: 'Denied' })}
                      className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setModal({ request: req, action: 'Approved' })}
                      className="px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {modal && (
        <ReviewModal
          request={modal.request}
          action={modal.action}
          onConfirm={(comments) => handleAction(modal.action, comments)}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
