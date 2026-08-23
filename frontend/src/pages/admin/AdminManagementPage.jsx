import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Shield, UserPlus, UserCheck, UserX, Trash2, Mail, Lock,
  KeyRound, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Eye, EyeOff
} from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'ADMIN' });
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/management/admins');
      setAdmins(data.admins || []);
    } catch (err) {
      toast({ type: 'error', title: 'Failed to load admins', description: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const validateForm = () => {
    const errs = {};
    if (!form.email || !form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!form.password || form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const { data } = await api.post('/management/admins', form);
      toast({ type: 'success', title: 'Admin created!', description: data.message || 'New admin added successfully.' });
      setIsModalOpen(false);
      setForm({ email: '', password: '', role: 'ADMIN' });
      setFormErrors({});
      fetchAdmins();
    } catch (err) {
      toast({ type: 'error', title: 'Creation failed', description: err.response?.data?.error || 'Could not add admin.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    if (admin.id === currentUser?.id) {
      toast({ type: 'error', title: 'Action Denied', description: 'You cannot deactivate your own account.' });
      return;
    }

    try {
      const { data } = await api.patch(`/management/admins/${admin.id}/toggle`);
      toast({ type: 'success', title: 'Status updated', description: data.message });
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, isActive: data.isActive } : a));
    } catch (err) {
      toast({ type: 'error', title: 'Failed to update status', description: err.response?.data?.error || err.message });
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === currentUser?.id) {
      toast({ type: 'error', title: 'Action Denied', description: 'You cannot delete your own account.' });
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    try {
      const { data } = await api.delete(`/management/admins/${deleteTarget.id}`);
      toast({ type: 'success', title: 'Admin deleted', description: data.message });
      setAdmins(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast({ type: 'error', title: 'Delete failed', description: err.response?.data?.error || err.message });
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = admins.filter(a => a.isActive).length;
  const adminRoleCount = admins.filter(a => a.role === 'ADMIN').length;
  const managementRoleCount = admins.filter(a => a.role === 'MANAGEMENT').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Management</h1>
                <p className="text-sm text-slate-500">
                  Manage authorized admins and management staff accounts.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm({ email: '', password: '', role: 'ADMIN' });
              setFormErrors({});
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Admin
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-4 bg-white border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Admins</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{admins.length}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-4 bg-white border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Accounts</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCount}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-4 bg-white border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role Breakdown</p>
              <p className="text-xs font-medium text-slate-700 mt-1">
                <span className="font-bold text-slate-900">{adminRoleCount}</span> System Admins · <span className="font-bold text-slate-900">{managementRoleCount}</span> Management
              </p>
            </div>
          </div>
        </div>

        {/* Admin List Card */}
        <div className="card bg-white border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Authorized Admin Accounts</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                {admins.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Shield}
                title="No administrators found"
                description="Click 'Add Administrator' above to grant admin access to a staff member."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">User & Email</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.map((admin) => {
                    const isSelf = admin.id === currentUser?.id;
                    const formattedDate = admin.createdAt
                      ? new Date(admin.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—';

                    return (
                      <tr key={admin.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0',
                              admin.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                            )}>
                              {admin.email?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">{admin.email}</span>
                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[10px] font-bold border border-brand-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 font-mono">ID: {admin.id}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold',
                            admin.role === 'ADMIN'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          )}>
                            <Shield className="w-3.5 h-3.5" />
                            {admin.role === 'ADMIN' ? 'System Admin' : 'Hostel Management'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                            admin.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', admin.isActive ? 'bg-emerald-500' : 'bg-rose-500')} />
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                          {formattedDate}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(admin)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot deactivate your own account' : admin.isActive ? 'Deactivate account' : 'Activate account'}
                              className={cn(
                                'btn-sm flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1 border transition-all',
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed border-slate-200 text-slate-400'
                                  : admin.isActive
                                  ? 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              )}
                            >
                              {admin.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              {admin.isActive ? 'Deactivate' : 'Activate'}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(admin)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot delete your own account' : 'Delete administrator'}
                              className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              )}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      </div>

      {/* Add Administrator Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Admin"
        size="md"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4 pt-2">
          <div>
            <label className="label">Admin Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="warden@hostelsync.com"
                className={cn('input pl-9 text-sm', formErrors.email && 'input-error')}
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
          </div>

          <div>
            <label className="label">Temporary / Permanent Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                className={cn('input pl-9 pr-9 text-sm', formErrors.password && 'input-error')}
                value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
          </div>

          <div>
            <label className="label">Administrative Role *</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setForm(p => ({ ...p, role: 'ADMIN' }))}
                className={cn(
                  'p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col items-start gap-1',
                  form.role === 'ADMIN'
                    ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Shield className="w-4 h-4 text-brand-600" /> System Admin
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">Full access to matching, rooms, allocations & admin management.</p>
              </label>

              <label
                onClick={() => setForm(p => ({ ...p, role: 'MANAGEMENT' }))}
                className={cn(
                  'p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col items-start gap-1',
                  form.role === 'MANAGEMENT'
                    ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Management Staff
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">View-only analytics, rooms management, and hostel reports.</p>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Creating Account...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Confirm Account Deletion"
          size="sm"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                Are you sure you want to delete admin <span className="font-bold">{deleteTarget.email}</span>?
                This action is permanent and will revoke their login access immediately.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                disabled={deleting}
                className="btn-danger bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs"
              >
                {deleting ? 'Deleting...' : 'Delete Admin'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
