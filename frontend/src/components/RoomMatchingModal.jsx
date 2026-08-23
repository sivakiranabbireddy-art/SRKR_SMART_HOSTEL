import { Modal } from './Modal';
import { CompatibilityBadge } from './CompatibilityBadge';
import { Users, ArrowUpDown, ShieldCheck } from 'lucide-react';

export function RoomMatchingModal({ isOpen, onClose, room }) {
  if (!room) return null;

  const allocations = room.allocations || [];
  const pairCompatibilities = room.pairCompatibilities || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Matching Analysis — Room ${room.number}`} size="lg">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Room Header Info */}
        <div className="p-4 bg-brand-50/60 rounded-xl border border-brand-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Room {room.number}</h3>
            <p className="text-xs text-slate-500">
              Floor {room.floor || 1} · Capacity: {room.capacity} students · Occupied: {allocations.length} / {room.capacity}
            </p>
          </div>
          <span className="badge bg-brand-100 text-brand-700 font-semibold">
            {room.gender?.toUpperCase() || 'MIXED'}
          </span>
        </div>

        {/* Assigned Students List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-brand-600" />
            Assigned Roommates ({allocations.length})
          </h4>
          {allocations.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">No students currently allocated to this room.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allocations.map((alloc) => {
                const p = alloc.studentProfile;
                if (!p) return null;
                return (
                  <div key={alloc.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {p.firstName?.[0]}{p.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-slate-900 truncate">{p.firstName} {p.lastName}</p>
                      <p className="text-slate-500 truncate">{p.studentId} · {p.department}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pairwise Compatibility Scores */}
        <div className="pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-brand-600" />
            Pairwise Compatibility Scores
          </h4>

          {allocations.length < 2 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Need at least 2 students in the room to evaluate roommate compatibility.</p>
            </div>
          ) : pairCompatibilities.length === 0 ? (
            <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
              Calculating pairwise compatibility...
            </div>
          ) : (
            <div className="space-y-3">
              {pairCompatibilities.map((pair, idx) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md">{pair.studentA.name}</span>
                      <span className="text-slate-400 font-semibold">↕</span>
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md">{pair.studentB.name}</span>
                    </div>
                    <CompatibilityBadge score={pair.compatibility} size="sm" />
                  </div>

                  {pair.breakdown && (
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-5 gap-1 text-[11px] text-center">
                      <div className="bg-slate-50 p-1.5 rounded">
                        <span className="text-slate-400 block text-[10px]">Lifestyle</span>
                        <span className="font-semibold text-slate-700">{pair.breakdown.lifestyleScore ?? 'N/A'}%</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded">
                        <span className="text-slate-400 block text-[10px]">Study</span>
                        <span className="font-semibold text-slate-700">{pair.breakdown.studyScore ?? 'N/A'}%</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded">
                        <span className="text-slate-400 block text-[10px]">Cleanliness</span>
                        <span className="font-semibold text-slate-700">{pair.breakdown.cleanlinessScore ?? 'N/A'}%</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded">
                        <span className="text-slate-400 block text-[10px]">Social</span>
                        <span className="font-semibold text-slate-700">{pair.breakdown.socialScore ?? 'N/A'}%</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded">
                        <span className="text-slate-400 block text-[10px]">Boundaries</span>
                        <span className="font-semibold text-slate-700">{pair.breakdown.boundaryScore ?? 'N/A'}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
