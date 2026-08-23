import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { LoadingSpinner } from './ui';
import {
  Moon, Sun, BookOpen, Volume2, Sparkles, Users, Lock, ShieldAlert, CheckCircle, XCircle
} from 'lucide-react';
import api from '../lib/api';

const SLEEP_MAP = {
  '1': 'Before 10:00 PM', '2': '10:00–10:30 PM', '3': '10:30–11:00 PM', '4': '11:00–11:30 PM',
  '5': '11:30 PM–12:00 AM', '6': '12:00–12:30 AM', '7': '12:30–1:00 AM', '8': '1:00–1:30 AM',
  '9': '1:30–2:00 AM', '10': 'After 2:00 AM',
};

const WAKE_MAP = {
  '1': 'Before 5:30 AM', '2': '5:30–6:00 AM', '3': '6:00–6:30 AM', '4': '6:30–7:00 AM',
  '5': '7:00–7:30 AM', '6': '7:30–8:00 AM', '7': '8:00–8:30 AM', '8': '8:30–9:00 AM',
  '9': '9:00–10:00 AM', '10': 'After 10:00 AM',
};

const LEVEL_MAP = {
  1: 'Very Low / Relaxed', 2: 'Low / Moderate', 3: 'Balanced / Medium', 4: 'High / Clean', 5: 'Very High / Extremely Clean'
};

const LIFESTYLE_MAP = { 1: 'Very Relaxed', 2: 'Balanced', 3: 'Active', 4: 'Highly Active' };
const EXERCISE_MAP = { 1: 'Never', 2: 'Rarely', 3: 'Occasionally', 4: 'Regularly', 5: 'Very Regularly' };
const STUDY_ENV_MAP = { 1: 'Very Quiet', 2: 'Quiet', 3: 'Moderate', 4: 'Social', 5: 'Very Social' };
const CLEANLINESS_MAP = { 1: 'Relaxed', 2: 'Moderately Clean', 3: 'Clean', 4: 'Very Clean', 5: 'Extremely Clean' };
const FREQ_MAP = { 1: 'Never', 2: 'Rarely', 3: 'Occasionally', 4: 'Frequently', 5: 'Very Frequently' };
const SOCIAL_MAP = { 1: 'Very Private', 2: 'Mostly Private', 3: 'Balanced', 4: 'Social', 5: 'Very Social' };
const PRIVACY_MAP = { 1: 'Very Low', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Very High' };

export function StudentQuestionnaireModal({ isOpen, onClose, student }) {
  const [fetchedData, setFetchedData] = useState(null);
  const [loading, setLoading] = useState(false);

  const initialProfile = student?.profile || student;
  const targetId = initialProfile?.id || student?.id || student?.userId;

  useEffect(() => {
    if (!isOpen || !targetId) {
      setFetchedData(null);
      return;
    }

    setLoading(true);
    api.get(`/admin/students/${targetId}`)
      .then(({ data }) => setFetchedData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, targetId]);

  if (!student) return null;

  const currentStudent = fetchedData || student;
  const profile = currentStudent.profile || currentStudent;
  const user = currentStudent.user || (currentStudent.email ? currentStudent : {});
  const pref = profile.preference || currentStudent.preference || null;
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Student';
  const email = user.email || currentStudent.email || profile.email || 'N/A';
  const studentId = profile.studentId || currentStudent.studentId || 'N/A';
  const department = profile.department || currentStudent.department || 'N/A';
  const year = profile.year || currentStudent.year || 'N/A';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Questionnaire Details — ${fullName}`} size="xl">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {loading && (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        )}

        {/* Student Header Summary */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{fullName}</h3>
            <p className="text-xs text-slate-500">
              ID: <span className="font-semibold text-slate-700">{studentId}</span> · Email: <span className="font-semibold text-slate-700">{email}</span>
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-medium text-slate-700">{department} · Year {year}</p>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${pref?.isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {pref?.isComplete ? 'Questionnaire Complete' : 'Incomplete Questionnaire'}
            </span>
          </div>
        </div>

        {!pref ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-500 font-medium">No questionnaire responses recorded for this student yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Section A: Lifestyle */}
            <div className="card p-4 space-y-3 bg-white border border-slate-200">
              <div className="flex items-center gap-2 text-brand-700 font-bold text-sm border-b border-slate-100 pb-2">
                <Moon className="w-4 h-4 text-brand-600" />
                Section A: Sleep & Lifestyle
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Weekday Sleep Time</span>
                  <span className="font-semibold text-slate-800">{SLEEP_MAP[String(pref.sleepTime)] || pref.sleepTime || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Weekday Wake Time</span>
                  <span className="font-semibold text-slate-800">{WAKE_MAP[String(pref.wakeTime)] || pref.wakeTime || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Weekend Sleep Time</span>
                  <span className="font-semibold text-slate-800">{SLEEP_MAP[String(pref.weekendSleepTime)] || pref.weekendSleepTime || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Weekend Wake Time</span>
                  <span className="font-semibold text-slate-800">{WAKE_MAP[String(pref.weekendWakeTime)] || pref.weekendWakeTime || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Lifestyle Type</span>
                  <span className="font-semibold text-slate-800">{LIFESTYLE_MAP[pref.lifestyleType] || LEVEL_MAP[pref.lifestyleType] || pref.lifestyleType || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Exercise Frequency</span>
                  <span className="font-semibold text-slate-800">{EXERCISE_MAP[pref.exerciseHabits] || LEVEL_MAP[pref.exerciseHabits] || pref.exerciseHabits || 'N/A'}</span>
                </div>

                {pref.hobbies && (Array.isArray(pref.hobbies) ? pref.hobbies : []).length > 0 && (
                  <div className="col-span-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block text-[11px] mb-1 font-medium">Hobbies & Interests (Selected {pref.hobbies.length}/5)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(pref.hobbies) ? pref.hobbies : []).map((h, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-semibold text-[10px] border border-brand-100">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section B: Study Habits */}
            <div className="card p-4 space-y-3 bg-white border border-slate-200">
              <div className="flex items-center gap-2 text-brand-700 font-bold text-sm border-b border-slate-100 pb-2">
                <BookOpen className="w-4 h-4 text-brand-600" />
                Section B: Study Habits
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Daily Study Hours</span>
                  <span className="font-semibold text-slate-800">{pref.studyHoursPerDay != null ? `${pref.studyHoursPerDay} hrs / day` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Studies in Room</span>
                  <span className="font-semibold text-slate-800">{pref.studiesInRoom ? 'Yes (in room)' : 'No (outside)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Study Environment</span>
                  <span className="font-semibold text-slate-800">{STUDY_ENV_MAP[pref.studyEnvironment] || LEVEL_MAP[pref.studyEnvironment] || pref.studyEnvironment || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Noise Tolerance (Study)</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.noiseWhileStudy] || pref.noiseWhileStudy || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Exam Period Intensity</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.examIntensity] || pref.examIntensity || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section C: Cleanliness */}
            <div className="card p-4 space-y-3 bg-white border border-slate-200">
              <div className="flex items-center gap-2 text-brand-700 font-bold text-sm border-b border-slate-100 pb-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                Section C: Cleanliness Standards
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Overall Cleanliness</span>
                  <span className="font-semibold text-slate-800">{CLEANLINESS_MAP[pref.cleanlinessLevel] || LEVEL_MAP[pref.cleanlinessLevel] || pref.cleanlinessLevel || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Organization Level</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.organizationLevel] || pref.organizationLevel || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bathroom Cleanliness</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.bathroomCleanliness] || pref.bathroomCleanliness || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Garbage Disposal</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.garbageDisposal] || pref.garbageDisposal || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Shared Space Standard</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.sharedSpaceCleanliness] || pref.sharedSpaceCleanliness || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section D: Noise & Media */}
            <div className="card p-4 space-y-3 bg-white border border-slate-200">
              <div className="flex items-center gap-2 text-brand-700 font-bold text-sm border-b border-slate-100 pb-2">
                <Volume2 className="w-4 h-4 text-brand-600" />
                Section D: Noise & Media
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">General Noise Tolerance</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.noiseTolerance] || pref.noiseTolerance || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Music Frequency</span>
                  <span className="font-semibold text-slate-800">{FREQ_MAP[pref.musicFrequency] || LEVEL_MAP[pref.musicFrequency] || pref.musicFrequency || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Gaming Frequency</span>
                  <span className="font-semibold text-slate-800">{FREQ_MAP[pref.gamingFrequency] || LEVEL_MAP[pref.gamingFrequency] || pref.gamingFrequency || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone Calls in Room</span>
                  <span className="font-semibold text-slate-800">{FREQ_MAP[pref.callsFrequency] || LEVEL_MAP[pref.callsFrequency] || pref.callsFrequency || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Media Playback without Headphones</span>
                  <span className="font-semibold text-slate-800">{FREQ_MAP[pref.mediaFrequency] || LEVEL_MAP[pref.mediaFrequency] || pref.mediaFrequency || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section E: Social & Interaction */}
            <div className="card p-4 space-y-3 bg-white border border-slate-200">
              <div className="flex items-center gap-2 text-brand-700 font-bold text-sm border-b border-slate-100 pb-2">
                <Users className="w-4 h-4 text-brand-600" />
                Section E: Social & Interaction
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Social Activity Level</span>
                  <span className="font-semibold text-slate-800">{SOCIAL_MAP[pref.socialLevel] || LEVEL_MAP[pref.socialLevel] || pref.socialLevel || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Preferred Interaction</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.preferredInteraction] || pref.preferredInteraction || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Visitor Frequency</span>
                  <span className="font-semibold text-slate-800">{FREQ_MAP[pref.visitorFrequency] || LEVEL_MAP[pref.visitorFrequency] || pref.visitorFrequency || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Friends Visiting Room</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.friendsInRoom] || pref.friendsInRoom || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Section F: Privacy & Boundaries */}
            <div className="card p-4 space-y-3 bg-white border border-slate-200">
              <div className="flex items-center gap-2 text-brand-700 font-bold text-sm border-b border-slate-100 pb-2">
                <Lock className="w-4 h-4 text-brand-600" />
                Section F: Privacy & Boundaries
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Privacy Importance</span>
                  <span className="font-semibold text-slate-800">{PRIVACY_MAP[pref.privacyImportance] || LEVEL_MAP[pref.privacyImportance] || pref.privacyImportance || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Personal Space Need</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.personalSpaceNeed] || pref.personalSpaceNeed || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sharing Comfort</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.sharingComfort] || pref.sharingComfort || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Boundary Strictness</span>
                  <span className="font-semibold text-slate-800">{LEVEL_MAP[pref.boundaryStrictness] || pref.boundaryStrictness || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
