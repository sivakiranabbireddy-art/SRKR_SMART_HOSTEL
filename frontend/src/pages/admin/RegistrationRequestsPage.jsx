import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, EmptyState, TableSkeleton } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { getInitials, formatDate, cn } from '../../lib/utils';
import {
  UserCheck, Search, CheckCircle, XCircle, Clock, Eye, AlertCircle,
  Filter, Phone, Mail, Calendar, Building, User, BookOpen, Shield,
  RefreshCw, Check, X,
} from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/Modal';

export default function RegistrationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  
  // Modals
  const [detailsUser, setDetailsUser] = useState(null);
  const [rejectUser, setRejectUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/admin/registration-requests', { params });
      setRequests(res.data.requests || []);
      if (res.data.counts) setCounts(res.data.counts);
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to load registration requests.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchRequests]);

  const handleApprove = async (user) => {
    try {
      setActionLoading(true);
      const res = await api.patch(`/admin/registration-requests/${user.id}/approve`);
      toast({
        title: 'Approved',
        description: res.data.message || `${user.profile?.firstName || user.email} has been approved!`,
        type: 'success',
      });
      fetchRequests();
      if (detailsUser?.id === user.id) setDetailsUser(null);
    } catch (err) {
      toast({
        title: 'Approval Failed',
        description: err.response?.data?.error || 'Could not approve registration.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectUser) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/admin/registration-requests/${rejectUser.id}/reject`, {
        reason: rejectReason,
      });
      toast({
        title: 'Registration Rejected',
        description: res.data.message || 'Student registration has been rejected.',
        type: 'info',
      });
      setRejectUser(null);
      setRejectReason('');
      fetchRequests();
      if (detailsUser?.id === rejectUser.id) setDetailsUser(null);
    } catch (err) {
      toast({
        title: 'Rejection Failed',
        description: err.response?.data?.error || 'Could not reject registration.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-500" /> Pending Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-500" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Registration Requests"
          subtitle="Review, approve, or reject new student registrations before granting hostel application access."
          icon={UserCheck}
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              statusFilter === 'PENDING'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{counts.pending}</div>
            <div className="text-xs text-slate-500 mt-0.5">Awaiting decision</div>
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              statusFilter === 'APPROVED'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30'
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Approved</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{counts.approved}</div>
            <div className="text-xs text-slate-500 mt-0.5">Full access granted</div>
          </button>

          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              statusFilter === 'REJECTED'
                ? 'bg-rose-500/10 border-rose-500/40 shadow-sm ring-1 ring-rose-500/30'
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Rejected</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{counts.rejected}</div>
            <div className="text-xs text-slate-500 mt-0.5">Access denied</div>
          </button>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              statusFilter === 'ALL'
                ? 'bg-brand-500/10 border-brand-500/40 shadow-sm ring-1 ring-brand-500/30'
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">All Students</span>
              <UserCheck className="w-4 h-4 text-brand-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{counts.total}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total registered</div>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, ID..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-medium">
              {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-md transition-all',
                    statusFilter === status
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <button
              onClick={fetchRequests}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title={`No ${statusFilter.toLowerCase()} registration requests`}
              description={
                search
                  ? 'No students matched your search criteria.'
                  : statusFilter === 'PENDING'
                  ? 'Great job! There are no pending student registrations awaiting review.'
                  : 'No records found in this category.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student Details</th>
                    <th className="py-3.5 px-4">Reg ID & Dept</th>
                    <th className="py-3.5 px-4">Phone & Gender</th>
                    <th className="py-3.5 px-4">Registered Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {requests.map((u) => {
                    const profile = u.profile || {};
                    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'New Student';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0">
                              {getInitials(profile.firstName || u.email, profile.lastName || '')}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{fullName}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{profile.studentId || 'N/A'}</div>
                          <div className="text-xs text-slate-500">
                            {profile.department || 'N/A'} {profile.year ? `• Year ${profile.year}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-700 text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {profile.phone || 'N/A'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {profile.gender === 'FEMALE' ? 'Female' : 'Male'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          {renderStatusBadge(u.approvalStatus || 'APPROVED')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setDetailsUser(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" /> Details
                            </button>

                            {u.approvalStatus === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprove(u)}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                                  title="Approve student"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectUser(u);
                                    setRejectReason('');
                                  }}
                                  disabled={actionLoading}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Reject registration"
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                              </>
                            )}

                            {u.approvalStatus === 'REJECTED' && (
                              <button
                                onClick={() => handleApprove(u)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                              >
                                Re-approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Details Modal */}
        <Modal
          isOpen={!!detailsUser}
          onClose={() => setDetailsUser(null)}
          title="Student Registration Details"
          size="lg"
        >
          {detailsUser && (
            <div className="space-y-6">
              {/* Header Profile Summary */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base">
                    {getInitials(detailsUser.profile?.firstName || detailsUser.email, detailsUser.profile?.lastName || '')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {detailsUser.profile?.firstName} {detailsUser.profile?.lastName}
                    </h3>
                    <p className="text-xs text-slate-500">{detailsUser.email}</p>
                  </div>
                </div>
                <div>{renderStatusBadge(detailsUser.approvalStatus || 'APPROVED')}</div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-400 font-medium uppercase">Student Registration ID</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{detailsUser.profile?.studentId || 'N/A'}</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-400 font-medium uppercase">Department & Year</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailsUser.profile?.department || 'N/A'} (Year {detailsUser.profile?.year || '1'})
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-400 font-medium uppercase">Phone Number</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{detailsUser.profile?.phone || 'N/A'}</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-400 font-medium uppercase">Gender</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{detailsUser.profile?.gender || 'MALE'}</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 col-span-2">
                  <span className="text-xs text-slate-400 font-medium uppercase">Registration Timestamp</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{formatDate(detailsUser.createdAt)}</div>
                </div>
              </div>

              {detailsUser.rejectionReason && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-rose-800 uppercase tracking-wider">Rejection Reason:</div>
                  <p className="text-sm text-rose-900">{detailsUser.rejectionReason}</p>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDetailsUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close
                </button>

                {detailsUser.approvalStatus === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectUser(detailsUser);
                        setRejectReason('');
                      }}
                      className="px-4 py-2 text-sm font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(detailsUser)}
                      disabled={actionLoading}
                      className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
                    >
                      Approve Student
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Reject Confirmation & Reason Modal */}
        <Modal
          isOpen={!!rejectUser}
          onClose={() => setRejectUser(null)}
          title="Reject Registration"
          size="md"
        >
          {rejectUser && (
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 leading-relaxed">
                  You are rejecting the registration for <strong>{rejectUser.profile?.firstName} {rejectUser.profile?.lastName}</strong> ({rejectUser.email}).
                  The student will not be allowed to access the hostel portal.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Student ID does not match college enrollment records, incomplete documents..."
                  className="w-full p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                <span className="text-xs text-slate-400">
                  This reason will be provided to the student in their rejection update email.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
