import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { DoorOpen, Users, Bath, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

const FLOOR_ORDER = [1, 2, 3, 4, 5];

const statusColor = {
  FULL:    'bg-emerald-500',
  PARTIAL: 'bg-brand-500',
  EMPTY:   'bg-slate-200',
};
const badgeClass = {
  FULL:    'badge-green',
  PARTIAL: 'badge-blue',
  EMPTY:   'badge-slate',
};

export default function ManagementRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFloors, setExpandedFloors] = useState({ 1: true, 2: true, 3: false, 4: false, 5: false });

  useEffect(() => {
    api.get('/management/rooms')
      .then(({ data }) => setRooms(data.rooms || []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load rooms'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  if (error) return (
    <DashboardLayout>
      <div className="card p-6 text-center">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    </DashboardLayout>
  );

  // Summary stats
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const totalOccupied = rooms.reduce((s, r) => s + (r.occupiedCount || 0), 0);
  const fourSharing   = rooms.filter(r => r.capacity === 4).length;
  const fiveSharing   = rooms.filter(r => r.capacity === 5).length;

  // Group by floor
  const byFloor = {};
  rooms.forEach(r => {
    const f = r.floor || 1;
    if (!byFloor[f]) byFloor[f] = [];
    byFloor[f].push(r);
  });

  const toggleFloor = (f) => setExpandedFloors(p => ({ ...p, [f]: !p[f] }));

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Overview"
        description={`${rooms.length} rooms in the system · ${totalOccupied} of ${totalCapacity} beds occupied`}
      />

      {rooms.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms configured" description="Add rooms via the admin panel." />
      ) : (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Rooms',   value: rooms.length },
              { label: '4-Sharing',     value: fourSharing },
              { label: '5-Sharing',     value: fiveSharing },
              { label: 'Total Beds',    value: totalCapacity },
            ].map(({ label, value }) => (
              <div key={label} className="card p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Rooms grouped by floor */}
          {FLOOR_ORDER.map(floor => {
            const floorRooms = byFloor[floor] || [];
            if (floorRooms.length === 0) return null;
            const isOpen = expandedFloors[floor];
            const floorOccupied = floorRooms.reduce((s, r) => s + (r.occupiedCount || 0), 0);
            const floorCapacity = floorRooms.reduce((s, r) => s + r.capacity, 0);

            return (
              <div key={floor} className="mb-4">
                {/* Floor header */}
                <button
                  onClick={() => toggleFloor(floor)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl mb-2 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-800">Floor {floor}</span>
                    <span className="text-xs text-slate-500">{floorRooms.length} rooms · {floorOccupied}/{floorCapacity} beds</span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {floorRooms.map((room) => {
                      const occupied = room.occupiedCount || 0;
                      const pct = room.occupancyPercentage ?? Math.round((occupied / room.capacity) * 100);
                      const avail = room.availableBeds ?? (room.capacity - occupied);
                      const status = occupied >= room.capacity ? 'FULL' : occupied > 0 ? 'PARTIAL' : 'EMPTY';

                      return (
                        <div key={room.id} className="card p-4 hover:shadow-md transition-shadow">
                          {/* Room header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-slate-900 text-base">Room {room.number}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {room.capacity}-Sharing · Floor {room.floor}
                              </p>
                            </div>
                            <span className={cn('badge text-xs', badgeClass[status])}>
                              {status === 'FULL' ? 'Full' : status === 'PARTIAL' ? 'Partial' : 'Empty'}
                            </span>
                          </div>

                          {/* Info pills */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              <Users className="w-2.5 h-2.5" /> Male
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-100">
                              <Bath className="w-2.5 h-2.5" /> Attached Bath
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div
                              className={cn('h-full rounded-full transition-all', statusColor[status])}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          {/* Occupancy */}
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Occupied: {occupied}/{room.capacity}
                            </span>
                            <span>{avail} bed{avail !== 1 ? 's' : ''} free</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 text-right">{pct}% filled</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </DashboardLayout>
  );
}
