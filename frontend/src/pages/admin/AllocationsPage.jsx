import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { CompatibilityBadge } from '../../components/CompatibilityBadge';
import { ConfirmModal } from '../../components/Modal';
import { getInitials, formatDate } from '../../lib/utils';
import { CheckSquare, XCircle, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unassigning, setUnassigning] = useState(null);
  const { toast } = useToast();

  const load = () => {
    api.get('/admin/allocations').then(({ data }) => {
      // Backend returns { rooms, run } — flatten into a list of allocations
      if (data.rooms) {
        const flat = [];
        (data.rooms || []).forEach(room => {
          (room.allocations || []).forEach(alloc => {
            flat.push({ ...alloc, room });
          });
        });
        setAllocations(flat);
      } else {
        setAllocations(data.allocations || []);
      }
    }).catch(() => toast({ type: 'error', title: 'Failed to load allocations' }))
    .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUnassign = async (id) => {
    try {
      await api.delete(`/admin/allocations/${id}`);
      toast({ type: 'success', title: 'Student unassigned' });
      load();
    } catch (err) {
      toast({ type: 'error', title: 'Failed to unassign', description: err.response?.data?.error });
    }
    setUnassigning(null);
  };

  // Group by room
  const grouped = allocations.reduce((acc, alloc) => {
    const key = alloc.room.number;
    if (!acc[key]) acc[key] = { room: alloc.room, students: [] };
    acc[key].students.push(alloc);
    return acc;
  }, {});

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Allocations"
        description={`${allocations.length} student-room assignments`}
      />

      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No allocations yet"
          description="Run the matching algorithm and confirm the results to create allocations."
        />
      ) : (
        <div className="grid gap-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([number, { room, students }]) => (
            <div key={number} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">Room {number}</h3>
                  <p className="text-xs text-slate-500">
                    {room.building || 'Main Building'}
                    {room.floor ? ` · Floor ${room.floor}` : ''}
                    {' · '}{room.gender || 'Any'} · {students.length}/{room.capacity} occupied
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('badge', students.length >= room.capacity ? 'badge-green' : 'badge-blue')}>
                    <Users className="w-3 h-3 mr-1" />
                    {students.length}/{room.capacity}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-xs font-medium text-slate-500">Student</th>
                      <th className="text-left py-2 text-xs font-medium text-slate-500">Department</th>
                      <th className="text-left py-2 text-xs font-medium text-slate-500">Compatibility</th>
                      <th className="text-left py-2 text-xs font-medium text-slate-500">Status</th>
                      <th className="text-left py-2 text-xs font-medium text-slate-500">Assigned</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.map((alloc) => {
                      const s = alloc.studentProfile;
                      return (
                        <tr key={alloc.id}>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {getInitials(s?.firstName, s?.lastName)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{s?.firstName} {s?.lastName}</p>
                                <p className="text-xs text-slate-500">{s?.studentId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 text-slate-600">{s?.department}</td>
                          <td className="py-2.5">
                            <CompatibilityBadge score={alloc.roomCompatibility} showLabel={false} />
                          </td>
                          <td className="py-2.5">
                            <span className={`badge ${alloc.status === 'CONFIRMED' ? 'badge-green' : 'badge-amber'}`}>
                              {alloc.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-xs text-slate-500">{formatDate(alloc.assignedAt)}</td>
                          <td className="py-2.5">
                            <button
                              onClick={() => setUnassigning(alloc)}
                              className="btn-ghost btn-sm text-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!unassigning}
        onClose={() => setUnassigning(null)}
        onConfirm={() => handleUnassign(unassigning?.id)}
        title="Unassign Student?"
        description={`This will remove ${unassigning?.studentProfile?.firstName} ${unassigning?.studentProfile?.lastName} from Room ${unassigning?.room?.number}. The student can be reassigned in a future matching run.`}
        confirmLabel="Unassign"
        variant="danger"
      />
    </DashboardLayout>
  );
}
