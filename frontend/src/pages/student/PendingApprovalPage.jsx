import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, ShieldAlert, CheckCircle2, Mail, Building, User, LogOut, RefreshCw } from 'lucide-react';

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCheckStatus = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Top Accent Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20 text-white shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-amber-700 uppercase">Status Notice</span>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Registration Under Review</h1>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress Timeline */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-slate-700 font-medium">Registration Details Submitted</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-slate-700 font-medium">Email OTP Verified Successfully</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-xs font-bold shrink-0">
                🟡
              </div>
              <span className="text-amber-800 font-semibold">Awaiting Administrator Approval</span>
            </div>
          </div>

          {/* Details Box */}
          <div className="border border-slate-100 rounded-xl p-4 space-y-2.5 text-sm bg-slate-50/50">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Account Summary</div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-600">
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Student Name:</span>
              <span className="font-semibold text-slate-800">{user?.profile?.firstName} {user?.profile?.lastName}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-600">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> Email:</span>
              <span className="font-medium text-slate-800">{user?.email}</span>
            </div>
            {user?.profile?.studentId && (
              <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-600">
                <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-slate-400" /> Reg ID / Dept:</span>
                <span className="font-medium text-slate-800">{user.profile.studentId} ({user.profile.department})</span>
              </div>
            )}
            <div className="flex items-center justify-between py-1 text-slate-600">
              <span>Approval Status:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                🟡 Pending Approval
              </span>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="text-xs text-slate-500 leading-relaxed space-y-2">
            <p>
              Your email has been verified. To maintain hostel security and room management integrity, all new student registrations must be authorized by an administrator before room matching and allocation access is granted.
            </p>
            <p className="text-slate-400">
              You will receive an email confirmation once your registration is approved.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCheckStatus}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Check Status
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
