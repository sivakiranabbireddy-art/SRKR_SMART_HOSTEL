import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { CompatibilityBadge, CompatibilityBreakdown } from '../../components/CompatibilityBadge';
import { Modal } from '../../components/Modal';
import { useToast } from '../../contexts/ToastContext';
import { getInitials } from '../../lib/utils';
import { Grid3X3, Search, DoorClosed, Users } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

export default function CompatibilityPage() {
  const [students, setStudents] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    api.get('/admin/compatibility/matrix').then(({ data }) => {
      const studentList = data.students || [];
      setStudents(studentList);

      const scores = data.matrix || [];
      // Build matrix keyed by sorted id pair
      const matrixObj = {};
      scores.forEach(s => {
        const key = [s.studentAId, s.studentBId].sort().join('_');
        matrixObj[key] = s.hardConflict ? -1 : s;
      });
      setMatrix(matrixObj);
    }).catch(() => toast({ type: 'error', title: 'Failed to load compatibility matrix' }))
    .finally(() => setLoading(false));
  }, []);

  // Extract unique rooms from students
  const uniqueRooms = Array.from(
    new Set(students.map(s => s.roomNumber).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  const filtered = students.filter((s) => {
    const matchesSearch = !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesRoom = selectedRoom === 'ALL' || s.roomNumber === selectedRoom;
    return matchesSearch && matchesRoom;
  });

  const getScore = (aId, bId) => {
    const key = [aId, bId].sort().join('_');
    const val = matrix[key] ?? null;
    if (val === null) return null;
    if (val === -1) return -1;  // hard conflict
    return typeof val === 'object' ? val.score : val;
  };

  const getScoreObj = (aId, bId) => {
    const key = [aId, bId].sort().join('_');
    return matrix[key] ?? null;
  };

  const getCellColor = (score) => {
    if (score === null) return 'bg-slate-50 text-slate-300 hover:bg-slate-100';
    if (score === -1) return 'bg-red-100 text-red-700';
    if (score >= 90) return 'bg-emerald-100 text-emerald-700 font-semibold';
    if (score >= 75) return 'bg-blue-100 text-blue-700 font-semibold';
    if (score >= 60) return 'bg-sky-100 text-sky-700 font-semibold';
    if (score >= 40) return 'bg-amber-100 text-amber-700 font-semibold';
    return 'bg-red-50 text-red-600 font-semibold';
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const maxDisplay = 25;
  const displayStudents = filtered.slice(0, maxDisplay);

  return (
    <DashboardLayout>
      <PageHeader
        title="Roommate Compatibility Matrix"
        description="Pairwise compatibility scores calculated strictly for roommates assigned to the same room."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Filter students..."
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <DoorClosed className="w-4 h-4 text-slate-400" />
          <select
            className="input text-sm py-1.5 px-3 min-w-[150px]"
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
          >
            <option value="ALL">All Rooms ({uniqueRooms.length})</option>
            {uniqueRooms.map(r => (
              <option key={r} value={r}>Room {r}</option>
            ))}
          </select>
        </div>
      </div>

      {displayStudents.length < 2 ? (
        <EmptyState
          icon={Grid3X3}
          title="Not enough roommates"
          description="Select a room with at least 2 assigned students to view roommate compatibility."
        />
      ) : (
        <div className="card overflow-auto shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500 px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span>
              Showing <strong>{displayStudents.length}</strong> of {filtered.length} students
              {selectedRoom !== 'ALL' && ` in Room ${selectedRoom}`}
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Roommates highlighted
            </span>
          </div>

          <table className="min-w-max text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 bg-slate-50 z-10 px-3 py-2.5 text-left border-r border-slate-200 min-w-[160px] font-semibold text-slate-700">
                  Student
                </th>
                {displayStudents.map((s) => (
                  <th key={s.id} className="px-2 py-2 text-center font-medium text-slate-600 min-w-[64px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shadow-xs">
                        {getInitials(s.firstName, s.lastName)}
                      </div>
                      <span className="text-[10px] font-medium text-slate-700 truncate max-w-[60px]">{s.firstName}</span>
                      {s.roomNumber && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 text-slate-600 font-mono">
                          R{s.roomNumber}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayStudents.map((rowS) => (
                <tr key={rowS.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="sticky left-0 bg-white z-10 px-3 py-2 border-r border-slate-200 font-medium text-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{rowS.firstName} {rowS.lastName}</span>
                      {rowS.roomNumber && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-semibold border border-brand-100 shrink-0">
                          Rm {rowS.roomNumber}
                        </span>
                      )}
                    </div>
                  </td>
                  {displayStudents.map((colS) => {
                    if (rowS.id === colS.id) {
                      return (
                        <td key={colS.id} className="px-1 py-1 text-center">
                          <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-300 font-mono">—</div>
                        </td>
                      );
                    }
                    const score = getScore(rowS.id, colS.id);
                    const scoreObj = getScoreObj(rowS.id, colS.id);
                    const isSameRoom = rowS.roomNumber && rowS.roomNumber === colS.roomNumber;

                    return (
                      <td key={colS.id} className="px-1 py-1 text-center">
                        <button
                          onClick={() => {
                            if (scoreObj) {
                              setSelected({ a: rowS, b: colS, score: scoreObj, roomNumber: rowS.roomNumber });
                            }
                          }}
                          disabled={!scoreObj}
                          title={isSameRoom ? `Room ${rowS.roomNumber} Roommates: ${score != null ? score.toFixed(0) + '%' : 'N/A'}` : 'Different rooms'}
                          className={cn(
                            'w-12 h-8 rounded text-xs transition-all',
                            scoreObj ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-default opacity-40',
                            getCellColor(score)
                          )}
                        >
                          {score === null ? '—' : score === -1 ? '✗' : `${score.toFixed(0)}%`}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Score legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
        {[
          ['bg-emerald-100 text-emerald-700', '≥90% Excellent'],
          ['bg-blue-100 text-blue-700', '75–89% Very Good'],
          ['bg-sky-100 text-sky-700', '60–74% Good'],
          ['bg-amber-100 text-amber-700', '40–59% Moderate'],
          ['bg-red-50 text-red-600', '<40% Poor'],
          ['bg-red-100 text-red-700', '✗ Hard Conflict'],
          ['bg-slate-100 text-slate-400', '— Different Rooms'],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn('w-4 h-4 rounded text-xs flex items-center justify-center font-medium', cls)} />
            {label}
          </span>
        ))}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Roommate Compatibility Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">Assigned Room</span>
              <p className="text-lg font-bold text-brand-900">Room {selected.roomNumber || selected.score?.roomNumber || 'N/A'}</p>
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  {getInitials(selected.a.firstName, selected.a.lastName)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800">{selected.a.firstName} {selected.a.lastName}</p>
                  <p className="text-xs text-slate-500">Roommate</p>
                </div>
              </div>

              <CompatibilityBadge score={selected.score?.score ?? selected.score} size="md" />

              <div className="flex items-center gap-2 text-right">
                <div>
                  <p className="font-semibold text-sm text-slate-800">{selected.b.firstName} {selected.b.lastName}</p>
                  <p className="text-xs text-slate-500">Roommate</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                  {getInitials(selected.b.firstName, selected.b.lastName)}
                </div>
              </div>
            </div>

            {selected.score && typeof selected.score === 'object' && (
              <CompatibilityBreakdown score={selected.score} />
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
