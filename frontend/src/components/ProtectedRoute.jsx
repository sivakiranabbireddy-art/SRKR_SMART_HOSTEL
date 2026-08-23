import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, roles, allowPending = false, allowRejected = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (roles && !roles.includes(user.role)) {
    const redirects = { STUDENT: '/student/dashboard', ADMIN: '/admin/dashboard', MANAGEMENT: '/management/dashboard' };
    return <Navigate to={redirects[user.role] || '/login'} replace />;
  }

  // Handle student approval status routing
  if (user.role === 'STUDENT') {
    const status = user.approvalStatus || 'APPROVED';
    if (status === 'PENDING' && !allowPending) {
      return <Navigate to="/student/pending-approval" replace />;
    }
    if (status === 'REJECTED' && !allowRejected) {
      return <Navigate to="/student/rejected" replace />;
    }
    if (status === 'APPROVED' && (allowPending || allowRejected)) {
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  return children;
}

