import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn, getInitials } from '../lib/utils';
import {
  LayoutDashboard, Users, DoorOpen, Zap, Grid3X3, CheckSquare,
  MessageSquare, BarChart3, FileText, Settings, LogOut, Home, Star, ChevronRight, Shield, UserCheck,
} from 'lucide-react';

const navConfig = {
  STUDENT: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/student/dashboard' },
    { label: 'My Profile', icon: Settings, to: '/student/profile' },
    { label: 'Questionnaire', icon: FileText, to: '/student/questionnaire' },
    { label: 'Roommate Matches', icon: Star, to: '/student/matches' },
    { label: 'My Room', icon: DoorOpen, to: '/student/room' },
    { label: 'Feedback', icon: MessageSquare, to: '/student/feedback' },
  ],
  ADMIN: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
    { label: 'Registration Requests', icon: UserCheck, to: '/admin/registration-requests' },
    { label: 'Students', icon: Users, to: '/admin/students' },
    { label: 'Rooms', icon: DoorOpen, to: '/admin/rooms' },
    { label: 'Run Matching', icon: Zap, to: '/admin/matching' },
    { label: 'Compatibility', icon: Grid3X3, to: '/admin/compatibility' },
    { label: 'Allocations', icon: CheckSquare, to: '/admin/allocations' },
    { label: 'Feedback', icon: MessageSquare, to: '/admin/feedback' },
  ],
  MANAGEMENT: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/management/dashboard' },
    { label: 'Registration Requests', icon: UserCheck, to: '/management/registration-requests' },
    { label: 'Rooms', icon: DoorOpen, to: '/management/rooms' },
    { label: 'Reports', icon: BarChart3, to: '/management/reports' },
    { label: 'Admin Management', icon: Shield, to: '/management/admins' },
  ],
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = navConfig[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-60 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">SRKR SMART HOSTEL</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')} />
                <span>{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-brand-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {user?.profile
              ? getInitials(user.profile.firstName, user.profile.lastName)
              : user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">
              {user?.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user?.email}
            </p>
            <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-100"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
