import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, StatCard, LoadingSpinner } from '../../components/ui';
import { Users, DoorOpen, CheckSquare, Star, Zap, ArrowRight, TrendingUp, MessageSquare } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import api from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { QuestionnaireDeadlineManager } from '../../components/QuestionnaireDeadlineManager';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [compatReport, setCompatReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/reports/compatibility'),
    ]).then(([s, c]) => {
      setStats(s.data);
      setCompatReport(c.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const dist = compatReport?.distribution;
  const chartData = dist ? [
    { name: 'Excellent\n90–100%', value: dist.excellent, color: '#10b981' },
    { name: 'Very Good\n75–89%', value: dist.veryGood, color: '#3b82f6' },
    { name: 'Good\n60–74%', value: dist.good, color: '#0ea5e9' },
    { name: 'Moderate\n40–59%', value: dist.moderate, color: '#f59e0b' },
    { name: 'Poor\n<40%', value: dist.poor, color: '#ef4444' },
  ] : [];

  return (
    <DashboardLayout>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of the hostel matching system."
        actions={
          <Link to="/admin/matching" className="btn-primary">
            <Zap className="w-4 h-4" /> Run Matching
          </Link>
        }
      />

      {/* Deadline Manager */}
      <div className="mb-6">
        <QuestionnaireDeadlineManager />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value={stats?.totalStudents ?? '—'} icon={Users} color="blue" />
        <StatCard title="Questionnaires" value={stats?.studentsWithPrefs ?? '—'} subtitle="Completed" icon={CheckSquare} color="green" />
        <StatCard title="Total Rooms" value={stats?.totalRooms ?? '—'} icon={DoorOpen} color="purple" />
        <StatCard
          title="Avg Compatibility"
          value={stats?.latestRun?.avgCompatibility ? `${stats.latestRun.avgCompatibility}%` : '—'}
          subtitle={stats?.latestRun ? `Run on ${formatDate(stats.latestRun.createdAt)}` : 'No runs yet'}
          icon={Star}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Allocation stats */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Allocation Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Students Assigned</span>
              <span className="font-semibold text-slate-900">{stats?.activeAllocations ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Students Unassigned</span>
              <span className="font-semibold text-slate-900">{stats?.studentsUnassigned ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Feedback Received</span>
              <span className="font-semibold text-slate-900">{stats?.totalFeedback ?? '—'}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Link to="/admin/allocations" className="btn-secondary text-xs justify-center">
              View Allocations <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link to="/admin/students" className="btn-secondary text-xs justify-center">
              View Students <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Compatibility distribution */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Compatibility Distribution</h2>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-400">
              Run matching to see compatibility distribution
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) => [v, 'Pairs']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {compatReport?.avgCompatibility != null && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              Average: <span className="font-semibold text-slate-700">{compatReport.avgCompatibility.toFixed(1)}%</span>
              · {compatReport.totalPairs} pairs analyzed
            </p>
          )}
        </div>
      </div>

      {/* Latest run info */}
      {stats?.latestRun && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="section-title">Latest Matching Run</h2>
            <Link to="/admin/matching" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              All runs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Status', value: stats.latestRun.status },
              { label: 'Students', value: stats.latestRun.totalStudents },
              { label: 'Rooms', value: stats.latestRun.totalRooms },
              { label: 'Avg Compatibility', value: stats.latestRun.avgCompatibility ? `${stats.latestRun.avgCompatibility}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-semibold text-slate-900 mt-0.5">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
