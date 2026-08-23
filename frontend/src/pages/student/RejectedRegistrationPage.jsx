import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { XCircle, Mail, Building, User, LogOut, HelpCircle } from 'lucide-react';

export default function RejectedRegistrationPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-rose-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Top Danger Header */}
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-md shadow-rose-500/20 text-white shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-rose-700 uppercase">Registration Notice</span>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Registration Not Approved</h1>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Reason Box */}
          <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-4 space-y-2">
            <div className="text-xs font-bold text-rose-800 uppercase tracking-wider">Reason for Decision:</div>
            <p className="text-sm text-rose-900 leading-relaxed font-medium">
              {user?.rejectionReason || 'Your registration was reviewed and could not be approved at this time. Please ensure your student ID and details match college records.'}
            </p>
          </div>

          {/* Details Box */}
          <div className="border border-slate-100 rounded-xl p-4 space-y-2.5 text-sm bg-slate-50/50">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Application Details</div>
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
                <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-slate-400" /> Reg ID:</span>
                <span className="font-medium text-slate-800">{user.profile.studentId}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-1 text-slate-600">
              <span>Status:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                🔴 Rejected
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              If you believe this is an error or would like to submit updated enrollment documents, please contact the SRKR Hostel Office in person.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleLogout}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" /> Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
