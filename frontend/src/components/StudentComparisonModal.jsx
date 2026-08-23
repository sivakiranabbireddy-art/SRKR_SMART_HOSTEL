import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { CompatibilityBadge } from './CompatibilityBadge';
import { LoadingSpinner } from './ui';
import {
  User, Mail, GraduationCap, AlertTriangle, CheckCircle2, Info, Moon, BookOpen, Sparkles, Volume2, Users, Lock, ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';

// ─── Human-readable labels matching QuestionnairePage.jsx field names exactly ───
const SLEEP_MAP = {
  '1': 'Before 10:00 PM', '2': '10:00–10:30 PM', '3': '10:30–11:00 PM',
  '4': '11:00–11:30 PM', '5': '11:30 PM–12:00 AM', '6': '12:00–12:30 AM',
  '7': '12:30–1:00 AM', '8': '1:00–1:30 AM', '9': '1:30–2:00 AM', '10': 'After 2:00 AM',
};

const WAKE_MAP = {
  '1': 'Before 5:30 AM', '2': '5:30–6:00 AM', '3': '6:00–6:30 AM', '4': '6:30–7:00 AM',
  '5': '7:00–7:30 AM', '6': '7:30–8:00 AM', '7': '8:00–8:30 AM', '8': '8:30–9:00 AM',
  '9': '9:00–10:00 AM', '10': 'After 10:00 AM',
};

const NUM_LABEL = {
  1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High',
};

const LIFESTYLE_MAP = { 1: 'Very Relaxed', 2: 'Balanced', 3: 'Active', 4: 'Highly Active' };
const EXERCISE_MAP = { 1: 'Never', 2: 'Rarely', 3: 'Occasionally', 4: 'Regularly', 5: 'Very Regularly' };
const STUDY_ENV_MAP = { 1: 'Very Quiet', 2: 'Quiet', 3: 'Moderate', 4: 'Social', 5: 'Very Social' };
const CLEANLINESS_MAP = { 1: 'Relaxed', 2: 'Moderately Clean', 3: 'Clean', 4: 'Very Clean', 5: 'Extremely Clean' };
const FREQ_MAP = { 1: 'Never', 2: 'Rarely', 3: 'Occasionally', 4: 'Frequently', 5: 'Very Frequently' };
const SOCIAL_MAP = { 1: 'Very Private', 2: 'Mostly Private', 3: 'Balanced', 4: 'Social', 5: 'Very Social' };
const PRIVACY_MAP = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' };
const BOOL_MAP = (v) => v ? '✅ Yes' : '❌ No';

// All questionnaire fields in display order, grouped by section
const QUESTIONNAIRE_SECTIONS = [
  {
    title: 'A — Lifestyle & Sleep Schedule',
    icon: Moon,
    color: 'bg-violet-50/70 border-violet-200',
    headerColor: 'text-violet-800 bg-violet-100/70',
    fields: [
      { key: 'sleepTime', label: 'Sleep Time (weekday)', render: (v) => SLEEP_MAP[String(v)] || v, time: true },
      { key: 'wakeTime', label: 'Wake Time (weekday)', render: (v) => WAKE_MAP[String(v)] || v, time: true },
      { key: 'weekendSleepTime', label: 'Sleep Time (weekend)', render: (v) => SLEEP_MAP[String(v)] || v, time: true },
      { key: 'weekendWakeTime', label: 'Wake Time (weekend)', render: (v) => WAKE_MAP[String(v)] || v, time: true },
      { key: 'lifestyleType', label: 'Lifestyle Type', render: (v) => LIFESTYLE_MAP[v] || v, numeric: true },
      { key: 'exerciseHabits', label: 'Exercise Habits', render: (v) => EXERCISE_MAP[v] || v, numeric: true },
      { key: 'hobbies', label: 'Hobbies & Interests (Max 5)', render: (v) => Array.isArray(v) && v.length > 0 ? v.join(', ') : (v || 'None specified'), text: true },
    ],
  },
  {
    title: 'B — Study Habits',
    icon: BookOpen,
    color: 'bg-blue-50/70 border-blue-200',
    headerColor: 'text-blue-800 bg-blue-100/70',
    fields: [
      { key: 'studyHoursPerDay', label: 'Daily Study Hours', render: (v) => `${v} hrs / day`, numeric: true },
      { key: 'studiesInRoom', label: 'Studies in Room', render: BOOL_MAP, boolean: true },
      { key: 'studyEnvironment', label: 'Study Environment', render: (v) => STUDY_ENV_MAP[v] || v, numeric: true },
      { key: 'noiseWhileStudy', label: 'Noise Tolerance (Study)', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'examIntensity', label: 'Exam Period Intensity', render: (v) => NUM_LABEL[v] || v, numeric: true },
    ],
  },
  {
    title: 'C — Cleanliness Standards',
    icon: Sparkles,
    color: 'bg-emerald-50/70 border-emerald-200',
    headerColor: 'text-emerald-800 bg-emerald-100/70',
    fields: [
      { key: 'cleanlinessLevel', label: 'Overall Cleanliness', render: (v) => CLEANLINESS_MAP[v] || v, numeric: true },
      { key: 'organizationLevel', label: 'Organization Level', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'bathroomCleanliness', label: 'Bathroom Cleanliness', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'garbageDisposal', label: 'Garbage Disposal Frequency', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'sharedSpaceCleanliness', label: 'Shared Space Standard', render: (v) => NUM_LABEL[v] || v, numeric: true },
    ],
  },
  {
    title: 'D — Noise & Media Habits',
    icon: Volume2,
    color: 'bg-amber-50/70 border-amber-200',
    headerColor: 'text-amber-800 bg-amber-100/70',
    fields: [
      { key: 'noiseTolerance', label: 'Room Noise Tolerance', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'musicFrequency', label: 'Music Frequency', render: (v) => FREQ_MAP[v] || v, numeric: true },
      { key: 'gamingFrequency', label: 'Gaming Frequency', render: (v) => FREQ_MAP[v] || v, numeric: true },
      { key: 'callsFrequency', label: 'Phone Calls Frequency', render: (v) => FREQ_MAP[v] || v, numeric: true },
      { key: 'mediaFrequency', label: 'Media Without Headphones', render: (v) => FREQ_MAP[v] || v, numeric: true },
    ],
  },
  {
    title: 'E — Social Preferences',
    icon: Users,
    color: 'bg-pink-50/70 border-pink-200',
    headerColor: 'text-pink-800 bg-pink-100/70',
    fields: [
      { key: 'socialLevel', label: 'Social Activity Level', render: (v) => SOCIAL_MAP[v] || v, numeric: true },
      { key: 'preferredInteraction', label: 'Preferred Interaction', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'visitorFrequency', label: 'Daytime Visitor Frequency', render: (v) => FREQ_MAP[v] || v, numeric: true },
      { key: 'friendsInRoom', label: "Friends in Room Comfort", render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'socialRoommatePreference', label: 'Social Roommate Preference', render: (v) => NUM_LABEL[v] || v, numeric: true },
    ],
  },
  {
    title: 'F — Privacy & Boundaries',
    icon: Lock,
    color: 'bg-slate-50 border-slate-200',
    headerColor: 'text-slate-800 bg-slate-100',
    fields: [
      { key: 'privacyImportance', label: 'Privacy Importance', render: (v) => PRIVACY_MAP[v] || v, numeric: true },
      { key: 'personalSpaceNeed', label: 'Personal Space Need', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'sharingComfort', label: 'Belonging Sharing Comfort', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'visitorComfort', label: 'Overnight Visitor Comfort', render: (v) => NUM_LABEL[v] || v, numeric: true },
      { key: 'boundaryStrictness', label: 'Boundary Strictness', render: (v) => NUM_LABEL[v] || v, numeric: true },
    ],
  },
];

function parseTimeToMinutes(val) {
  if (!val) return null;
  const s = String(val);
  const sleepMap = { '1': 21*60+30, '2': 22*60+15, '3': 22*60+45, '4': 23*60+15, '5': 23*60+45, '6': 15, '7': 45, '8': 75, '9': 105, '10': 150 };
  const wakeMap  = { '1': 5*60, '2': 5*60+45, '3': 6*60+15, '4': 6*60+45, '5': 7*60+15, '6': 7*60+45, '7': 8*60+15, '8': 8*60+45, '9': 9*60+30, '10': 10*60+30 };
  if (sleepMap[s] !== undefined) return sleepMap[s];
  if (wakeMap[s] !== undefined) return wakeMap[s];
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  }
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function groupMatchStatus(field, values) {
  if (!values || values.length === 0 || values.some(v => v == null || v === '')) return 'unknown';
  
  if (field.boolean || field.text) {
    const allSame = values.every(v => String(v).trim().toLowerCase() === String(values[0]).trim().toLowerCase());
    return allSame ? 'match' : 'diff';
  }
  
  if (field.time) {
    const mins = values.map(parseTimeToMinutes);
    if (mins.some(m => m === null)) return 'unknown';
    let maxCircularDiff = 0;
    for (let i = 0; i < mins.length; i++) {
      for (let j = i + 1; j < mins.length; j++) {
        const rawDiff = Math.abs(mins[i] - mins[j]);
        const circ = Math.min(rawDiff, 1440 - rawDiff);
        if (circ > maxCircularDiff) maxCircularDiff = circ;
      }
    }
    if (maxCircularDiff <= 30) return 'match';
    if (maxCircularDiff <= 90) return 'close';
    return 'diff';
  }

  if (field.numeric) {
    const nums = values.map(v => Number(v));
    if (nums.some(n => isNaN(n))) return 'unknown';
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const maxDiff = max - min;
    if (maxDiff === 0) return 'match';
    if (maxDiff <= 1) return 'close';
    return 'diff';
  }
  
  return 'unknown';
}

const STATUS_STYLES = {
  match:   { row: 'bg-emerald-50/50', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />, cell: 'text-emerald-900 font-semibold' },
  close:   { row: 'bg-amber-50/50',   icon: <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />, cell: 'text-amber-900 font-semibold' },
  diff:    { row: 'bg-rose-50/50',     icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />, cell: 'text-rose-900 font-semibold' },
  unknown: { row: '',                  icon: null, cell: 'text-slate-700' },
};

function StudentHeader({ profile }) {
  if (!profile) return null;
  const isComplete = profile.preference?.isComplete;
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs flex-shrink-0 ring-2 ring-brand-200">
            {profile.firstName?.[0]}{profile.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{profile.firstName} {profile.lastName}</p>
            <p className="text-[11px] font-semibold text-brand-600">{profile.studentId}</p>
          </div>
        </div>
        <div className="space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate text-[11px]">{profile.user?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>{profile.department || 'N/A'} · Year {profile.year || 'N/A'}</span>
          </div>
        </div>
      </div>
      <div className="pt-2 mt-2 border-t border-slate-100">
        <span className={cn(
          'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold',
          isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        )}>
          {isComplete ? '✓ Answers Submitted' : '⚠ Incomplete / No Data'}
        </span>
      </div>
    </div>
  );
}

export function StudentComparisonModal({ isOpen, onClose, selectedStudents = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || selectedStudents.length < 2) return;
    setLoading(true);
    setData(null);
    setError(null);
    
    const studentIds = selectedStudents.map(s => s.id).join(',');
    
    api.get('/admin/students/compare', { params: { studentIds } })
      .then(({ data: res }) => setData(res))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load comparison'))
      .finally(() => setLoading(false));
  }, [isOpen, selectedStudents]);

  const compat = data?.compatibility;
  const students = data?.students || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Side-by-Side Student Comparison" size="xl">
      <div className="space-y-5 max-h-[82vh] overflow-y-auto pr-1">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <LoadingSpinner />
            <p className="text-xs font-semibold text-slate-500">Loading student questionnaire responses & calculating compatibility...</p>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Student Headers in side-by-side columns */}
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-3 items-stretch min-w-max">
                {/* Fixed Spacer column aligned with Question Labels */}
                <div className="w-[200px] flex-shrink-0 flex items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Comparing {students.length} Students
                </div>
                {students.map((student) => (
                  <div key={student.id} className="w-[220px] flex-shrink-0">
                    <StudentHeader profile={student} />
                  </div>
                ))}
              </div>
            </div>

            {/* Compatibility Score Banner */}
            <div className={cn(
              'flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border gap-4 shadow-2xs',
              compat ? 'bg-brand-50/60 border-brand-200' : 'bg-slate-50 border-slate-200'
            )}>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {students.length > 2 ? 'Average Group Compatibility Score' : 'Pair Compatibility Score'}
                </p>
                {compat ? (
                  <>
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-black text-brand-700">{Math.round(compat.score)}%</p>
                      <span className="text-xs text-slate-500 font-medium">
                        calculated across {students.length} student responses
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                      {[
                        { label: 'Lifestyle', val: compat.lifestyleScore },
                        { label: 'Study',     val: compat.studyScore },
                        { label: 'Cleanliness', val: compat.cleanlinessScore },
                        { label: 'Social',    val: compat.socialScore },
                        { label: 'Boundaries', val: compat.boundaryScore },
                      ].map(({ label, val }) => (
                        <span key={label} className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-600 font-semibold shadow-2xs">
                          {label}: <span className="text-brand-700 font-bold">{val != null ? `${Math.round(val)}%` : 'N/A'}</span>
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Questionnaire data incomplete for one or more students — cannot compute full compatibility.
                  </p>
                )}
              </div>
              {compat && (
                <div className="flex-shrink-0 flex items-center justify-end">
                  <CompatibilityBadge score={compat.score} size="lg" />
                </div>
              )}
            </div>


            {/* Match Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium px-1">
              <span className="text-slate-500 font-semibold">Answer Match Legend:</span>
              <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Identical Match</span>
              <span className="flex items-center gap-1.5 text-amber-700"><Info className="w-3.5 h-3.5 text-amber-500" /> Close Answer (±1)</span>
              <span className="flex items-center gap-1.5 text-rose-700"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Notable Difference</span>
            </div>

            {/* Side-by-Side Questionnaire Table */}
            <div className="space-y-5">
              {QUESTIONNAIRE_SECTIONS.map((section) => {
                const SectionIcon = section.icon;
                return (
                  <div key={section.title} className={cn('rounded-xl border overflow-hidden shadow-2xs', section.color)}>
                    {/* Section Header */}
                    <div className={cn('px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b flex items-center gap-2', section.headerColor)}>
                      {SectionIcon && <SectionIcon className="w-4 h-4" />}
                      {section.title}
                    </div>

                    {/* Section Question Rows */}
                    <div className="overflow-x-auto">
                      <div className="divide-y divide-slate-100 min-w-max">
                        {section.fields.map((field) => {
                          const values = students.map((s) => (s.preference || {})[field.key]);
                          const status = groupMatchStatus(field, values);
                          const styles = STATUS_STYLES[status];

                          return (
                            <div key={field.key} className={cn('flex items-center px-4 py-2.5 text-xs transition-colors', styles.row)}>
                              {/* Question Label Column */}
                              <div className="flex items-center gap-2 w-[200px] flex-shrink-0 pr-4">
                                {styles.icon || <div className="w-3.5 h-3.5 flex-shrink-0" />}
                                <span className="text-slate-800 font-semibold text-xs leading-snug" title={field.label}>
                                  {field.label}
                                </span>
                              </div>

                              {/* Student Answer Columns */}
                              {students.map((student, i) => {
                                const val = values[i];
                                const hasVal = val != null && val !== '';
                                return (
                                  <div
                                    key={student.id}
                                    className={cn(
                                      'w-[220px] flex-shrink-0 border-l border-slate-200/80 px-4 py-1 text-xs',
                                      styles.cell
                                    )}
                                  >
                                    {hasVal ? (
                                      field.render(val)
                                    ) : (
                                      <span className="text-slate-400 font-normal italic">Not answered</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

