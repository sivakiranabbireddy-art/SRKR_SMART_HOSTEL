import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, StatCard, LoadingSpinner } from '../../components/ui';
import { Users, DoorOpen, Star, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import api from '../../lib/api';

export default function ManagementDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/management/dashboard').then(({ data }) => setData(data))
    .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const occupancyData = data?.roomOccupancy || [];
  const feedbackTrend = data?.feedbackTrend || [];

  return (
    <DashboardLayout>
      <PageHeader title="Management Overview" description="High-level hostel statistics and trends." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value={data?.totalStudents} icon={Users} color="blue" />
        <StatCard title="Rooms Filled" value={data?.roomsFilled} subtitle={`of ${data?.totalRooms} rooms`} icon={DoorOpen} color="green" />
        <StatCard title="Avg Compatibility" value={data?.avgCompatibility ? `${data.avgCompatibility}%` : '—'} icon={Star} color="amber" />
        <StatCard title="Avg Satisfaction" value={data?.avgSatisfaction ? `${data.avgSatisfaction}/5` : '—'} subtitle="From feedback" icon={TrendingUp} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="section-title mb-4">Room Occupancy</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={occupancyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="number" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="occupied" name="Occupied" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="capacity" name="Capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Feedback Satisfaction Trend</h2>
          {feedbackTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={feedbackTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="avgSatisfaction" stroke="#0ea5e9" name="Avg Satisfaction" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-slate-400">
              No feedback data yet
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
