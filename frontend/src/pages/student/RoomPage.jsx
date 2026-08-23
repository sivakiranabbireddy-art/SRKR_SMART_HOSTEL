import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { CompatibilityBadge } from '../../components/CompatibilityBadge';
import { getInitials } from '../../lib/utils';
import { DoorOpen, Users } from 'lucide-react';
import api from '../../lib/api';

export default function RoomPage() {
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students/me/room').then(({ data }) => {
      setRoomData(data.allocation);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="My Room" description="Your current room allocation details." />
      {!roomData ? (
        <EmptyState
          icon={DoorOpen}
          title="No room allocated yet"
          description="Room allocations will appear here once the admin runs and confirms the matching algorithm."
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Room details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Room {roomData.room.number}</h2>
                  <p className="text-slate-500 mt-1">
                    {roomData.room.building || 'Main Building'}
                    {roomData.room.floor ? ` · Floor ${roomData.room.floor}` : ''}
                    {' · '}{roomData.room.gender} room
                  </p>
                </div>
                <span className={`badge ${roomData.status === 'CONFIRMED' ? 'badge-green' : 'badge-amber'}`}>
                  {roomData.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Capacity</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{roomData.room.capacity} students</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Room Compatibility</p>
                  <div className="mt-0.5">
                    {roomData.roomCompatibility ? (
                      <CompatibilityBadge score={roomData.roomCompatibility} size="md" />
                    ) : <span className="text-slate-400 text-sm">N/A</span>}
                  </div>
                </div>
              </div>
              {roomData.room.description && (
                <p className="text-sm text-slate-600 mt-4 border-t border-slate-100 pt-4">{roomData.room.description}</p>
              )}
            </div>
          </div>

          {/* Roommates */}
          <div className="card p-5">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" /> Roommates
            </h3>
            {roomData.roommates.length === 0 ? (
              <p className="text-sm text-slate-400">No roommates assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {roomData.roommates.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                      {getInitials(r.firstName, r.lastName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-slate-500">{r.department} · Year {r.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
