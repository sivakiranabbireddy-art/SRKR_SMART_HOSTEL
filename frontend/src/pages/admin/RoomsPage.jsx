import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { StudentQuestionnaireModal } from '../../components/StudentQuestionnaireModal';
import { StudentComparisonModal } from '../../components/StudentComparisonModal';
import {
  DoorOpen, Users, ChevronDown, ChevronUp, FileText, Mail, GraduationCap, Building,
  GitCompareArrows, X, CheckSquare, Square,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRooms, setExpandedRooms] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  // selectedForCompare: array of up to 5 { id, name, studentId }
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const { toast } = useToast();

  const fetchRooms = () => {
    setLoading(true);
    api.get('/admin/rooms')
      .then(({ data }) => setRooms(data.rooms || []))
      .catch(() => toast({ type: 'error', title: 'Failed to load rooms' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRooms(); }, []);

  const toggleRoomExpand = (roomId) => {
    setExpandedRooms((prev) => ({ ...prev, [roomId]: !prev[roomId] }));
  };

  // Toggle a student in/out of the compare selection (max 5)
  const toggleCompareStudent = (profile) => {
    setSelectedForCompare((prev) => {
      const already = prev.find((s) => s.id === profile.id);
      if (already) return prev.filter((s) => s.id !== profile.id);
      if (prev.length >= 5) {
        toast({ type: 'error', title: 'Max 5 students', description: 'Deselect a student before selecting another.' });
        return prev;
      }
      return [...prev, { id: profile.id, name: `${profile.firstName} ${profile.lastName}`, studentId: profile.studentId }];
    });
  };

  const clearCompareSelection = () => setSelectedForCompare([]);

  const openCompare = () => {
    if (selectedForCompare.length < 2) return;
    setCompareOpen(true);
  };

  // Group rooms dynamically by floor ascending
  const groupedRoomsByFloor = useMemo(() => {
    const map = new Map();
    for (const room of rooms) {
      const floorNum = room.floor != null ? Number(room.floor) : 1;
      if (!map.has(floorNum)) map.set(floorNum, []);
      map.get(floorNum).push(room);
    }
    const sortedFloors = Array.from(map.keys()).sort((a, b) => a - b);
    return sortedFloors.map((floor) => ({
      floor,
      rooms: map.get(floor).sort((a, b) => {
        const numA = parseInt(String(a.number).replace(/[^\d]/g, ''), 10);
        const numB = parseInt(String(b.number).replace(/[^\d]/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
      }),
    }));
  }, [rooms]);

  const occupancyColor = (occupied, capacity) => {
    const ratio = occupied / capacity;
    if (ratio >= 1) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (ratio > 0) return 'bg-brand-100 text-brand-800 border-brand-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title="Rooms & Allocations"
        description={`${groupedRoomsByFloor.length} floor${groupedRoomsByFloor.length !== 1 ? 's' : ''} · ${rooms.length} total rooms — select 2 to 5 students to compare`}
      />

      {rooms.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms found" description="Add rooms in the database to get started." />
      ) : (
        <div className="space-y-8 pb-32">
          {groupedRoomsByFloor.map(({ floor, rooms: floorRooms }) => (
            <div key={floor} className="space-y-4">
              {/* Dynamic Floor Header */}
              <div className="flex items-center gap-3 pb-2 border-b-2 border-brand-100">
                <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {floor}
                </div>
                <h2 className="text-lg font-bold text-slate-900">Floor {floor}</h2>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {floorRooms.length} room{floorRooms.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Grid of rooms for this floor */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {floorRooms.map((room) => {
                  const allocations = room.allocations || [];
                  const currentStudentCount = Math.min(room.capacity, room.occupiedCount || allocations.length);
                  const availableSpaces = Math.max(0, room.capacity - currentStudentCount);
                  const isFull = currentStudentCount >= room.capacity;
                  const isExpanded = !!expandedRooms[room.id];

                  return (
                    <div key={room.id} className="card p-5 hover:shadow-card-hover transition-all duration-200 border border-slate-200 flex flex-col justify-between">
                      <div>
                        {/* Top Room Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-xl">Room {room.number}</h3>
                              <span className="text-[11px] uppercase font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">
                                {room.gender || 'MIXED'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              {room.building || 'Main Block'} · Floor {room.floor || floor}
                            </p>
                          </div>
                          <span className={cn('badge text-xs font-bold border px-2.5 py-1', occupancyColor(currentStudentCount, room.capacity))}>
                            {currentStudentCount}/{room.capacity}
                          </span>
                        </div>

                        {/* Occupancy Progress Bar */}
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', isFull ? 'bg-emerald-500' : currentStudentCount > 0 ? 'bg-brand-500' : 'bg-slate-300')}
                            style={{ width: `${Math.min(100, (currentStudentCount / room.capacity) * 100)}%` }}
                          />
                        </div>

                        {/* Room Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-50 rounded-lg mb-4 border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Capacity</span>
                            <span className="font-bold text-slate-800">{room.capacity}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Students</span>
                            <span className="font-bold text-slate-800">{currentStudentCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Available</span>
                            <span className={cn('font-bold', availableSpaces > 0 ? 'text-brand-600' : 'text-slate-500')}>
                              {availableSpaces}
                            </span>
                          </div>
                        </div>

                        {/* Expand / Collapse Students */}
                        <div className="border-t border-slate-100 pt-3">
                          <button
                            onClick={() => toggleRoomExpand(room.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {isExpanded ? 'Hide Students' : `View Students (${allocations.length})`}
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Expandable Students List */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                            {allocations.length === 0 ? (
                              <p className="text-xs text-slate-400 italic p-2 bg-slate-50 rounded">No students assigned to this room yet.</p>
                            ) : (
                              <>
                                <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                                  Check ☑ up to 5 students across any room to compare
                                </p>
                                {allocations.map((alloc) => {
                                  const s = alloc.studentProfile;
                                  if (!s) return null;
                                  const isChecked = selectedForCompare.some((x) => x.id === s.id);
                                  const isDisabled = !isChecked && selectedForCompare.length >= 5;

                                  return (
                                    <div
                                      key={alloc.id}
                                      className={cn(
                                        'p-3 rounded-xl border space-y-2 text-xs transition-all',
                                        isChecked ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-400/30' : 'bg-slate-50 border-slate-200/80',
                                        isDisabled && 'opacity-50'
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                          {/* Compare Checkbox */}
                                          <button
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => toggleCompareStudent(s)}
                                            className={cn(
                                              'flex-shrink-0 transition-colors',
                                              isChecked ? 'text-brand-600' : 'text-slate-400 hover:text-brand-500',
                                              isDisabled && 'cursor-not-allowed'
                                            )}
                                            title={isChecked ? 'Deselect for comparison' : 'Select for comparison'}
                                          >
                                            {isChecked
                                              ? <CheckSquare className="w-4.5 h-4.5 w-5 h-5" />
                                              : <Square className="w-5 h-5" />}
                                          </button>
                                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                            {s.firstName?.[0]}{s.lastName?.[0]}
                                          </div>
                                          <div>
                                            <p className="font-bold text-slate-900">{s.firstName} {s.lastName}</p>
                                            <p className="text-[11px] text-slate-500 font-medium">{s.studentId}</p>
                                          </div>
                                        </div>
                                        {/* View Questionnaire */}
                                        <button
                                          onClick={() => setSelectedStudent(s)}
                                          className="px-2 py-1 bg-white hover:bg-slate-100 text-brand-700 border border-slate-200 rounded-md font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                                        >
                                          <FileText className="w-3 h-3" />
                                          Questionnaire
                                        </button>
                                      </div>

                                      {/* Basic Info */}
                                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                          <span className="truncate">{s.user?.email || 'No email'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <GraduationCap className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                          <span>{s.department || 'N/A'} (Yr {s.year || 'N/A'})</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sticky Compare Bar — visible when 1 or 2 students are selected ── */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="m-4 w-full max-w-2xl pointer-events-auto">
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center justify-between gap-4 border border-slate-700">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <GitCompareArrows className="w-5 h-5 text-brand-400 flex-shrink-0" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                  {selectedForCompare.map((s, i) => (
                    <span key={s.id} className="flex items-center gap-1.5 text-sm">
                      {i > 0 && <span className="text-slate-500 text-xs hidden sm:inline">,</span>}
                      <span className="bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1 font-semibold text-white truncate max-w-[140px]">
                        {s.name}
                      </span>
                    </span>
                  ))}
                  {selectedForCompare.length < 2 && (
                    <span className="text-xs text-slate-400">— select {2 - selectedForCompare.length} more student to compare</span>
                  )}
                  {selectedForCompare.length >= 2 && selectedForCompare.length < 5 && (
                    <span className="text-xs text-slate-400">— optional: select up to {5 - selectedForCompare.length} more</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={openCompare}
                  disabled={selectedForCompare.length < 2}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all',
                    selectedForCompare.length >= 2
                      ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <GitCompareArrows className="w-4 h-4" />
                  Compare Students
                </button>
                <button
                  onClick={clearCompareSelection}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Questionnaire Modal */}
      <StudentQuestionnaireModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
      />

      {/* Student Comparison Modal */}
      <StudentComparisonModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        selectedStudents={selectedForCompare}
      />
    </DashboardLayout>
  );
}
