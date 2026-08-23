import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader, StatCard, LoadingSpinner, EmptyState } from '../../components/ui';
import { CompatibilityBadge } from '../../components/CompatibilityBadge';
import { getInitials, formatDate } from '../../lib/utils';
import { Users, Star, DoorOpen, FileText, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { motion } from 'framer-motion';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [room, setRoom] = useState(null);
  const [pref, setPref] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/students/me/matches').catch(() => ({ data: { matches: [] } })),
      api.get('/students/me/room').catch(() => ({ data: { allocation: null } })),
      api.get('/preferences/me').catch(() => ({ data: { preference: null } })),
    ]).then(([m, r, p]) => {
      const matchData = m?.data?.matches ?? m?.data?.data ?? m?.data ?? [];
      const roomData = r?.data?.allocation ?? r?.data?.data ?? r?.data ?? null;
      const prefData = p?.data?.preference ?? p?.data?.data ?? p?.data ?? null;
      setMatches(Array.isArray(matchData) ? matchData.slice(0, 5) : []);
      setRoom(roomData);
      setPref(prefData);
    }).finally(() => setLoading(false));
  }, []);

  const profile = user?.profile;
  const isComplete = pref?.isComplete;
  const name = profile ? `${profile.firstName} ${profile.lastName}` : user?.email;

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.firstName || 'Student'} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">{formatDate(new Date())} · {profile?.department} · Year {profile?.year}</p>
      </div>

      {/* Profile completion banner */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">Complete your questionnaire</p>
            <p className="text-xs text-amber-700 mt-0.5">You need to complete the roommate questionnaire before matching can include you.</p>
          </div>
          <Link to="/student/questionnaire" className="btn-primary btn-sm flex-shrink-0">
            Start now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Questionnaire"
          value={isComplete ? 'Complete' : 'Incomplete'}
          icon={isComplete ? CheckCircle : FileText}
          color={isComplete ? 'green' : 'amber'}
        />
        <StatCard
          title="Roommate Matches"
          value={matches.length}
          subtitle="Compatible students"
          icon={Star}
          color="blue"
        />
        <StatCard
          title="Room Status"
          value={room ? `Room ${room.room.number}` : 'Not Assigned'}
          subtitle={room ? `${room.status}` : 'Pending allocation'}
          icon={DoorOpen}
          color={room ? 'green' : 'slate'}
        />
        <StatCard
          title="Department"
          value={profile?.year ? `Year ${profile.year}` : '—'}
          subtitle={profile?.department}
          icon={Users}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Matches */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Top Roommate Matches</h2>
            <Link to="/student/matches" className="text-xs text-brand-600 hover:underline font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {matches.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No matches yet"
              description="Complete your questionnaire and wait for admin to run the matching algorithm."
            />
          ) : (
            <div className="space-y-3">
              {matches.map(({ student, compatibility }, i) => (
                <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="text-xs text-slate-400 w-4 flex-shrink-0 font-medium">{i + 1}</div>
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {getInitials(student.firstName, student.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-slate-500">{student.department} · Year {student.year}</p>
                  </div>
                  <CompatibilityBadge score={compatibility.score} showLabel={false} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room Info */}
        <div className="card p-5">
          <h2 className="section-title mb-4">My Room</h2>
          {!room ? (
            <EmptyState
              icon={DoorOpen}
              title="No room allocated"
              description="The admin hasn't run room allocation yet. Check back after the matching algorithm runs."
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-brand-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-brand-700">Room {room.room.number}</p>
                <p className="text-sm text-brand-600 mt-1">{room.room.building || 'Main Building'} · Floor {room.room.floor || '—'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge ${room.status === 'CONFIRMED' ? 'badge-green' : 'badge-amber'}`}>
                    {room.status}
                  </span>
                  {room.roomCompatibility && (
                    <CompatibilityBadge score={room.roomCompatibility} />
                  )}
                </div>
              </div>
              {room.roommates && room.roommates.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Roommates</p>
                  <div className="space-y-2">
                    {room.roommates.map((r) => (
                      <div key={r.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {getInitials(r.firstName, r.lastName)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{r.firstName} {r.lastName}</p>
                          <p className="text-xs text-slate-500">{r.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Link to="/student/room" className="btn-secondary w-full justify-center text-xs">
                View room details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
