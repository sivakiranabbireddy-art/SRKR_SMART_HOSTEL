import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, StatCard } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../lib/api';
import { BarChart3, Users, Star, DoorOpen } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#0ea5e9', '#f59e0b', '#ef4444'];

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/summary').then(({ data }) => setReport(data))
    .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const deptData = report?.byDepartment || [];
  const compatDist = [
    { name: 'Excellent', value: report?.compatibility?.excellent || 0 },
    { name: 'Very Good', value: report?.compatibility?.veryGood || 0 },
    { name: 'Good', value: report?.compatibility?.good || 0 },
    { name: 'Moderate', value: report?.compatibility?.moderate || 0 },
    { name: 'Poor', value: report?.compatibility?.poor || 0 },
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout>
      <PageHeader title="Reports" description="Aggregated hostel metrics and analytics." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value={report?.totalStudents} icon={Users} color="blue" />
        <StatCard title="Questionnaire Rate" value={report?.completionRate ? `${report.completionRate}%` : '—'} subtitle="Completed" icon={BarChart3} color="green" />
        <StatCard title="Avg Compatibility" value={report?.avgCompatibility ? `${report.avgCompatibility}%` : '—'} icon={Star} color="amber" />
        <StatCard title="Occupancy Rate" value={report?.occupancyRate ? `${report.occupancyRate}%` : '—'} icon={DoorOpen} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="section-title mb-4">Students by Department</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
              <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Compatibility Distribution</h2>
          {compatDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={compatDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name">
                  {compatDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-slate-400">Run matching to see distribution</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
