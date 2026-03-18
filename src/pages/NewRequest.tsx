import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, CalendarRange, FileText } from 'lucide-react';
import { useLeaveStore } from '../store/useLeaveStore';
import { LEAVE_TYPES } from '../data/mockData';

function calcBusinessDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function hasOverlap(
  newStart: string,
  newEnd: string,
  existingRequests: { id: string; startDate: string; endDate: string; status: string }[],
  excludeId?: string
): boolean {
  const s = new Date(newStart);
  const e = new Date(newEnd);
  return existingRequests.some((r) => {
    if (r.id === excludeId) return false;
    if (r.status === 'Denied' || r.status === 'Draft' || r.status === 'Withdrawn') return false;
    const rs = new Date(r.startDate);
    const re = new Date(r.endDate);
    return s <= re && e >= rs;
  });
}

export function NewRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const { currentUser, balances, requests, addRequest, updateRequest } = useLeaveStore();

  const draftToEdit = useMemo(
    () => (editId ? requests.find((r) => r.id === editId) : null),
    [editId, requests]
  );

  const [leaveTypeId, setLeaveTypeId] = useState(draftToEdit?.leaveTypeId ?? '');
  const [startDate, setStartDate] = useState(draftToEdit?.startDate ?? '');
  const [endDate, setEndDate] = useState(draftToEdit?.endDate ?? '');
  const [comments, setComments] = useState(draftToEdit?.comments ?? '');
  const [submitMode, setSubmitMode] = useState<'Draft' | 'Submitted'>('Submitted');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Keep form in sync if draft loads async (e.g. after navigation)
  useEffect(() => {
    if (draftToEdit) {
      setLeaveTypeId(draftToEdit.leaveTypeId);
      setStartDate(draftToEdit.startDate);
      setEndDate(draftToEdit.endDate);
      setComments(draftToEdit.comments);
    }
  }, [draftToEdit?.id]);

  const totalDays = useMemo(
    () => calcBusinessDays(startDate, endDate),
    [startDate, endDate]
  );

  const myRequests = useMemo(
    () => requests.filter((r) => r.employeeId === currentUser.id),
    [requests, currentUser.id]
  );

  const selectedBalance = useMemo(() => {
    if (!leaveTypeId) return null;
    return balances.find(
      (b) => b.employeeId === currentUser.id && b.leaveTypeId === leaveTypeId
    );
  }, [balances, currentUser.id, leaveTypeId]);

  const selectedLeaveType = LEAVE_TYPES.find((lt) => lt.id === leaveTypeId);

  function validate(): string[] {
    const errs: string[] = [];
    if (!leaveTypeId) errs.push('Please select a leave type.');
    if (!startDate) errs.push('Please select a start date.');
    if (!endDate) errs.push('Please select an end date.');
    if (startDate && endDate && new Date(endDate) < new Date(startDate))
      errs.push('End date must be after start date.');
    if (totalDays === 0 && startDate && endDate)
      errs.push('Selected range contains no business days.');
    if (
      submitMode === 'Submitted' &&
      selectedBalance &&
      totalDays > selectedBalance.availableDays
    )
      errs.push(
        `Insufficient balance. You have ${selectedBalance.availableDays} days available for ${selectedLeaveType?.name}.`
      );
    if (
      submitMode === 'Submitted' &&
      startDate &&
      endDate &&
      hasOverlap(startDate, endDate, myRequests, editId ?? undefined)
    )
      errs.push('This request overlaps with an existing leave request.');
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    const leaveType = LEAVE_TYPES.find((lt) => lt.id === leaveTypeId)!;

    if (editId) {
      updateRequest(editId, {
        leaveTypeId,
        leaveTypeName: leaveType.name,
        startDate,
        endDate,
        totalDays,
        status: submitMode,
        comments,
        submittedOn: new Date().toISOString().slice(0, 10),
      });
    } else {
      addRequest({
        id: `lr${Date.now()}`,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        leaveTypeId,
        leaveTypeName: leaveType.name,
        startDate,
        endDate,
        totalDays,
        status: submitMode,
        comments,
        submittedOn: new Date().toISOString().slice(0, 10),
      });
    }

    setSubmitted(true);
    setTimeout(() => navigate('/'), 1800);
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {submitMode === 'Draft' ? 'Draft saved!' : 'Request submitted!'}
          </h2>
          <p className="text-gray-400 dark:text-slate-400 text-sm">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  const isEditing = !!editId;

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Draft' : 'New Leave Request'}
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">
          {isEditing
            ? 'Update your draft and save or submit for approval.'
            : 'Fill in the details below to submit your request.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Leave Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LEAVE_TYPES.map((lt) => {
              const bal = balances.find(
                (b) => b.employeeId === currentUser.id && b.leaveTypeId === lt.id
              );
              return (
                <button
                  key={lt.id}
                  type="button"
                  onClick={() => setLeaveTypeId(lt.id)}
                  className={`px-3 py-3 rounded-lg border text-sm font-medium transition-all text-left ${
                    leaveTypeId === lt.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span
                    className="block w-2 h-2 rounded-full mb-2"
                    style={{ backgroundColor: lt.color }}
                  />
                  <span className="block">{lt.name}</span>
                  {bal && (
                    <span className="block text-xs mt-0.5 opacity-60">
                      {bal.availableDays}d left
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-gray-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-gray-800 dark:text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>
        </div>

        {/* Business days preview */}
        {startDate && endDate && new Date(endDate) >= new Date(startDate) && (
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
            <CalendarRange className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{totalDays} business day{totalDays !== 1 ? 's' : ''}</strong> (weekends excluded)
              {selectedBalance && (
                <span className="text-gray-500 dark:text-slate-400 ml-2">
                  · {selectedBalance.availableDays} available
                </span>
              )}
            </span>
          </div>
        )}

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            <FileText className="w-4 h-4 inline mr-1.5" />
            Comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Add any notes or context for your manager…"
            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-gray-800 dark:text-slate-200 text-sm placeholder:text-gray-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none"
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {e}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={() => setSubmitMode('Draft')}
            className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            onClick={() => setSubmitMode('Submitted')}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Submit for Approval
          </button>
        </div>
      </form>
    </div>
  );
}
