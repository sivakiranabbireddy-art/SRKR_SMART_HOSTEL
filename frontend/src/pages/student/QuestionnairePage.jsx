import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, LoadingSpinner } from '../../components/ui';
import {
  ChevronLeft, ChevronRight, CheckCircle, Check,
  Moon, Sun, Sunrise, Sunset, Zap, Dumbbell,
  BookOpen, Volume2, VolumeX, Users, Lock, Music,
  Gamepad2, Phone, Tv, UserX, Calendar, Clock, AlertTriangle,
  Shuffle, Sparkles, Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

// ============================================================
// STEP DEFINITIONS
// ============================================================
const STEPS = [
  { id: 'A', title: 'Lifestyle',        desc: 'Sleep schedule & daily routine' },
  { id: 'B', title: 'Study Habits',     desc: 'How and where you study' },
  { id: 'C', title: 'Cleanliness',      desc: 'Room & shared space standards' },
  { id: 'D', title: 'Noise & Media',    desc: 'Music, gaming & sound tolerance' },
  { id: 'E', title: 'Social Life',      desc: 'Interaction & visitor preferences' },
  { id: 'F', title: 'Privacy',          desc: 'Personal space & boundaries' },
];

const SLEEP_OPTIONS = [
  { value: '1',  label: 'Before 10:00 PM',     desc: 'Very early',   icon: Sunset  },
  { value: '2',  label: '10:00–10:30 PM',       desc: 'Early',        icon: Moon    },
  { value: '3',  label: '10:30–11:00 PM',       desc: 'Early-ish',    icon: Moon    },
  { value: '4',  label: '11:00–11:30 PM',       desc: 'Typical',      icon: Moon    },
  { value: '5',  label: '11:30 PM–12:00 AM',    desc: 'Midnight',     icon: Moon    },
  { value: '6',  label: '12:00–12:30 AM',       desc: 'Late',         icon: Moon    },
  { value: '7',  label: '12:30–1:00 AM',        desc: 'Late night',   icon: Moon    },
  { value: '8',  label: '1:00–1:30 AM',         desc: 'Very late',    icon: Moon    },
  { value: '9',  label: '1:30–2:00 AM',         desc: 'Extremely late', icon: Moon  },
  { value: '10', label: 'After 2:00 AM',        desc: 'Night owl',    icon: Moon    },
];

const WAKE_OPTIONS = [
  { value: '1',  label: 'Before 5:30 AM',   desc: 'Very early bird', icon: Sunrise },
  { value: '2',  label: '5:30–6:00 AM',     desc: 'Early bird',      icon: Sunrise },
  { value: '3',  label: '6:00–6:30 AM',     desc: 'Early',           icon: Sunrise },
  { value: '4',  label: '6:30–7:00 AM',     desc: 'Early-ish',       icon: Sun     },
  { value: '5',  label: '7:00–7:30 AM',     desc: 'Typical',         icon: Sun     },
  { value: '6',  label: '7:30–8:00 AM',     desc: 'Moderate',        icon: Sun     },
  { value: '7',  label: '8:00–8:30 AM',     desc: 'Late-ish',        icon: Sun     },
  { value: '8',  label: '8:30–9:00 AM',     desc: 'Late',            icon: Sun     },
  { value: '9',  label: '9:00–10:00 AM',    desc: 'Very late',       icon: Sun     },
  { value: '10', label: 'After 10:00 AM',   desc: 'Extremely late',  icon: Sun     },
];

const LIFESTYLE_OPTIONS = [
  { value: 1, label: 'Very Relaxed',  desc: 'Slow-paced, low-key',          icon: Moon    },
  { value: 2, label: 'Balanced',      desc: 'Mix of activity and rest',      icon: Zap     },
  { value: 3, label: 'Active',        desc: 'Busy schedule, moderate pace',  icon: Zap     },
  { value: 4, label: 'Highly Active', desc: 'Very busy, always on the go',   icon: Dumbbell},
];

const EXERCISE_OPTIONS = [
  { value: 1, label: 'Never',          desc: 'Do not exercise',         icon: Dumbbell },
  { value: 2, label: 'Rarely',         desc: 'Once a month or less',    icon: Dumbbell },
  { value: 3, label: 'Occasionally',   desc: 'A few times a month',     icon: Dumbbell },
  { value: 4, label: 'Regularly',      desc: '3–4 times a week',        icon: Dumbbell },
  { value: 5, label: 'Very Regularly', desc: 'Daily or almost daily',   icon: Dumbbell },
];

const STUDY_ENV_OPTIONS = [
  { value: 1, label: 'Very Quiet',  desc: 'Complete silence needed',     icon: VolumeX  },
  { value: 2, label: 'Quiet',       desc: 'Prefer minimal background',   icon: VolumeX  },
  { value: 3, label: 'Moderate',    desc: 'Some noise is OK',            icon: Volume2  },
  { value: 4, label: 'Social',      desc: 'Comfortable with noise',      icon: Volume2  },
  { value: 5, label: 'Very Social', desc: 'Study best with activity around', icon: Users },
];

const CLEANLINESS_OPTIONS = [
  { value: 1, label: 'Relaxed',          desc: 'Not a priority',           icon: null },
  { value: 2, label: 'Moderately Clean', desc: 'Basic tidiness',           icon: null },
  { value: 3, label: 'Clean',            desc: 'Generally tidy',           icon: null },
  { value: 4, label: 'Very Clean',       desc: 'High standard of clean',   icon: null },
  { value: 5, label: 'Extremely Clean',  desc: 'Spotless at all times',    icon: null },
];

const NOISE_OPTIONS = [
  { value: 1, label: 'Very Low',  desc: 'Need near-silence',        icon: VolumeX  },
  { value: 2, label: 'Low',       desc: 'Prefer quiet environment', icon: VolumeX  },
  { value: 3, label: 'Moderate',  desc: 'Normal room noise OK',     icon: Volume2  },
  { value: 4, label: 'High',      desc: 'Handle noisy environment', icon: Volume2  },
  { value: 5, label: 'Very High', desc: 'Noise does not bother me', icon: Volume2  },
];

const SOCIAL_OPTIONS = [
  { value: 1, label: 'Very Private',    desc: 'Keep to myself',           icon: Lock  },
  { value: 2, label: 'Mostly Private',  desc: 'Minimal interaction',      icon: Lock  },
  { value: 3, label: 'Balanced',        desc: 'Mix of social and private', icon: Users },
  { value: 4, label: 'Social',          desc: 'Enjoy interacting often',  icon: Users },
  { value: 5, label: 'Very Social',     desc: 'Love socialising a lot',   icon: Users },
];

const PRIVACY_OPTIONS = [
  { value: 1, label: 'Very Low',  desc: 'Privacy is not important',    icon: Lock },
  { value: 2, label: 'Low',       desc: 'Slightly important',          icon: Lock },
  { value: 3, label: 'Moderate',  desc: 'Moderately important',        icon: Lock },
  { value: 4, label: 'High',      desc: 'Very important to me',        icon: Lock },
  { value: 5, label: 'Very High', desc: 'Privacy is top priority',     icon: Lock },
];

const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Never',           desc: 'Not at all'           },
  { value: 2, label: 'Rarely',          desc: 'Once in a while'      },
  { value: 3, label: 'Occasionally',    desc: 'A few times a month'  },
  { value: 4, label: 'Frequently',      desc: 'Several times a week' },
  { value: 5, label: 'Very Frequently', desc: 'Daily or almost daily' },
];

const defaultPrefs = {
  sleepTime: '5', wakeTime: '5', weekendSleepTime: '6', weekendWakeTime: '6',
  lifestyleType: 2, exerciseHabits: 3,
  studyHoursPerDay: 3, studiesInRoom: true, studyEnvironment: 3, noiseWhileStudy: 3, examIntensity: 3,
  cleanlinessLevel: 3, organizationLevel: 3, bathroomCleanliness: 3, garbageDisposal: 3, sharedSpaceCleanliness: 3,
  noiseTolerance: 3, musicFrequency: 3, gamingFrequency: 2, callsFrequency: 3, mediaFrequency: 3,
  socialLevel: 3, preferredInteraction: 3, visitorFrequency: 3, friendsInRoom: 2, socialRoommatePreference: 3,
  privacyImportance: 3, personalSpaceNeed: 3, sharingComfort: 3, visitorComfort: 3, boundaryStrictness: 3,
};

const OptionCard = ({ option, selected, onSelect, compact = false, disabled = false }) => {
  const Icon = option.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => !disabled && onSelect(option.value)}
      className={cn(
        'group relative text-left rounded-xl border transition-all duration-150',
        compact ? 'p-2.5' : 'p-4',
        selected
          ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
        disabled && 'opacity-60 cursor-not-allowed hover:bg-white hover:border-slate-200'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        {Icon && (
          <div className={cn(
            'rounded-lg flex items-center justify-center',
            compact ? 'w-5 h-5' : 'w-7 h-7 mb-2',
            selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
          )}>
            <Icon className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </div>
        )}
        <div className={cn(
          'w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-auto',
          selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
        )}>
          {selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </div>
      </div>
      <p className={cn(
        'font-semibold leading-tight',
        compact ? 'text-xs' : 'text-sm',
        selected ? 'text-brand-800' : 'text-slate-800'
      )}>
        {option.label}
      </p>
      {option.desc && (
        <p className={cn(
          'mt-0.5 leading-tight',
          compact ? 'text-[10px]' : 'text-xs',
          selected ? 'text-brand-600' : 'text-slate-500'
        )}>
          {option.desc}
        </p>
      )}
    </button>
  );
};

const CardSelect = ({ label, desc, value, onChange, options, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', compact = false, disabled = false }) => (
  <div className="space-y-3">
    <div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
    </div>
    <div className={cn('grid gap-2', cols)}>
      {options.map(opt => (
        <OptionCard key={opt.value} option={opt} selected={String(value) === String(opt.value)} onSelect={onChange} compact={compact} disabled={disabled} />
      ))}
    </div>
  </div>
);

const FrequencySelect = ({ label, desc, value, onChange, disabled }) => (
  <CardSelect
    label={label}
    desc={desc}
    value={value}
    onChange={onChange}
    options={FREQUENCY_OPTIONS}
    cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    compact
    disabled={disabled}
  />
);

const ToggleQuestion = ({ label, desc, value, onChange, disabled }) => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
    <div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        value ? 'bg-brand-600' : 'bg-slate-200',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  </div>
);

const ScaleQuestion = ({ label, desc, value, onChange, min = 1, max = 5, labels, disabled }) => (
  <div className="space-y-3">
    <div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
    </div>
    <div className="flex gap-2">
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(v)}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all',
            value === v
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:bg-brand-50',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          {v}
        </button>
      ))}
    </div>
    {labels && (
      <div className="flex justify-between text-xs text-slate-400">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    )}
  </div>
);

const HOBBIES_FALLBACK = [
  'Competitive Coding', 'Web & App Development', 'AI & Machine Learning', 'Cybersecurity & Ethical Hacking',
  'Robotics & Arduino', 'Game Development & 3D Modeling', 'Cricket', 'Football / Soccer',
  'Badminton', 'Basketball', 'Table Tennis', 'Gym & Weightlifting', 'Running & Marathon',
  'Swimming', 'Yoga & Meditation', 'Photography & Videography', 'Guitar & Music Production',
  'Singing & Vocals', 'Sketching & Digital Art', 'Creative Writing & Poetry', 'Cooking & Culinary Arts',
  'Blogging & Podcasting', 'Video Games & Esports', 'Anime & Manga', 'Sci-Fi & Fantasy Novels',
  'Watching Movies & Web Series', 'Chess & Strategy Games', 'Board Games & Rubik\'s Cube',
  'Traveling & Backpacking', 'Trekking & Hiking', 'Astronomy & Stargazing', 'Stock Market & Crypto Trading',
  'Debating & Public Speaking', 'Volunteering & Community Service', 'Book Club & Reading', 'Stand-up Comedy & Theater'
];

function HobbiesSelector({ selectedHobbies = [], onChange, disabled = false }) {
  const [allHobbies, setAllHobbies] = useState(HOBBIES_FALLBACK);
  const [displayedHobbies, setDisplayedHobbies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    api.get('/preferences/hobbies?count=5').then(({ data }) => {
      if (data.allHobbies) setAllHobbies(data.allHobbies);
      if (data.suggestedHobbies) {
        setDisplayedHobbies(data.suggestedHobbies);
      }
    }).catch(() => {
      const shuffled = [...HOBBIES_FALLBACK].sort(() => 0.5 - Math.random());
      setDisplayedHobbies(shuffled.slice(0, 5));
    });
  }, []);

  const shuffleHobbies = () => {
    const available = allHobbies.filter(h => !selectedHobbies.includes(h));
    const pool = available.length >= 5 ? available : allHobbies;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setDisplayedHobbies(shuffled.slice(0, 5));
  };

  const toggleHobby = (hobby) => {
    if (disabled) return;
    if (selectedHobbies.includes(hobby)) {
      onChange(selectedHobbies.filter(h => h !== hobby));
    } else {
      if (selectedHobbies.length >= 5) {
        return;
      }
      onChange([...selectedHobbies, hobby]);
    }
  };

  const filteredAll = allHobbies.filter(h =>
    h.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleChecklist = Array.from(new Set([...selectedHobbies, ...displayedHobbies]));

  return (
    <div className="card p-5 bg-white border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Hobbies & Interests Checklist</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold',
              selectedHobbies.length === 5 ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'
            )}>
              {selectedHobbies.length}/5 Selected
            </span>
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Select up to 5 hobbies randomly suggested from 30+ database hobbies to improve roommate matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={shuffleHobbies}
            disabled={disabled}
            className="btn-secondary btn-sm text-xs flex items-center gap-1.5 hover:border-brand-300"
            title="Randomly pick another 5 hobbies from the database"
          >
            <Shuffle className="w-3.5 h-3.5 text-brand-600" /> Shuffle 5 Hobbies
          </button>

          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="btn-secondary btn-sm text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {showAll ? 'Show 5 Random' : 'Browse All (36)'}
          </button>
        </div>
      </div>

      {/* Active Selected Chips */}
      {selectedHobbies.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your Chosen Hobbies (Max 5):</span>
          <div className="flex flex-wrap gap-2">
            {selectedHobbies.map(hobby => (
              <span
                key={hobby}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-50 text-brand-800 border border-brand-200 text-xs font-semibold shadow-2xs"
              >
                <Check className="w-3 h-3 text-brand-600 stroke-[3]" />
                {hobby}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleHobby(hobby)}
                    className="ml-1 text-slate-400 hover:text-red-600 font-bold transition-colors"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Checklist Options */}
      {!showAll ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>5 Randomly Suggested Hobbies from Database:</span>
            {selectedHobbies.length >= 5 && (
              <span className="text-amber-600 text-[11px] font-medium">Max 5 hobbies reached</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {visibleChecklist.map((hobby) => {
              const isChecked = selectedHobbies.includes(hobby);
              const isDisabled = disabled || (!isChecked && selectedHobbies.length >= 5);

              return (
                <label
                  key={hobby}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isDisabled) toggleHobby(hobby);
                  }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none text-xs font-medium',
                    isChecked
                      ? 'border-brand-500 bg-brand-50/70 text-brand-900 ring-1 ring-brand-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70',
                    isDisabled && !isChecked && 'opacity-40 cursor-not-allowed hover:border-slate-200 hover:bg-white'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                    isChecked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
                  )}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{hobby}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        /* Full 36 Hobbies Browser with Quick Search */
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-9 text-xs py-2"
              placeholder="Search across all 36 database hobbies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredAll.map((hobby) => {
              const isChecked = selectedHobbies.includes(hobby);
              const isDisabled = disabled || (!isChecked && selectedHobbies.length >= 5);

              return (
                <label
                  key={hobby}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isDisabled) toggleHobby(hobby);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none text-xs font-medium',
                    isChecked
                      ? 'border-brand-500 bg-brand-50/70 text-brand-900 ring-1 ring-brand-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                    isDisabled && !isChecked && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    isChecked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'
                  )}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{hobby}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionnairePage() {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deadlineInfo, setDeadlineInfo] = useState(null);
  const [remainingText, setRemainingText] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDeadline = () => {
    api.get('/preferences/deadline').then(({ data }) => {
      const info = data?.settings ?? data?.data ?? data ?? null;
      setDeadlineInfo(info);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchDeadline();
    api.get('/preferences/me').then(({ data }) => {
      const prefData = data?.preference ?? data?.data ?? data;
      if (prefData && typeof prefData === 'object') setPrefs({ ...defaultPrefs, ...prefData });
    }).catch((err) => {
      console.error('Failed to load preferences:', err.response?.data || err.message);
    }).finally(() => setLoading(false));
  }, []);

  const rawDeadline = deadlineInfo?.deadline ?? deadlineInfo?.questionnaireDeadline ?? null;
  const isOpen = deadlineInfo?.isOpen ?? deadlineInfo?.questionnaireOpen ?? true;

  // Ticking countdown timer for remaining time
  useEffect(() => {
    if (!rawDeadline) {
      setRemainingText('');
      return;
    }

    const updateTimer = () => {
      const targetTime = new Date(rawDeadline).getTime();
      if (isNaN(targetTime)) {
        setRemainingText('');
        return;
      }
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0 || !isOpen) {
        setRemainingText('Deadline passed');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
      parts.push(`${hours} Hour${hours !== 1 ? 's' : ''}`);
      parts.push(`${minutes} Min${minutes !== 1 ? 's' : ''}`);
      parts.push(`${seconds} Sec${seconds !== 1 ? 's' : ''}`);

      setRemainingText(`${parts.join(' ')} Remaining`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rawDeadline, isOpen]);

  const isExpired = rawDeadline ? (() => {
    const t = new Date(rawDeadline).getTime();
    return !isNaN(t) ? Date.now() >= t : false;
  })() : false;
  const isFormLocked = deadlineInfo ? (!isOpen || isExpired) : false;

  const formattedDeadlineIST = rawDeadline ? (() => {
    try {
      const d = new Date(rawDeadline);
      return !isNaN(d.getTime()) ? d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) : null;
    } catch {
      return null;
    }
  })() : null;

  const set = (field) => (value) => {
    if (isFormLocked) return;
    setPrefs(p => ({ ...p, [field]: value }));
  };

  const save = async (goNext = true) => {
    if (isFormLocked) {
      toast({ type: 'error', title: 'Submission Locked', description: 'Questionnaire submission deadline has passed.' });
      return;
    }
    setSaving(true);
    try {
      await api.put('/preferences/me', prefs);
      if (goNext) {
        if (step < STEPS.length - 1) {
          setStep(step + 1);
        } else {
          toast({ type: 'success', title: 'Questionnaire complete!', description: 'Your preferences have been saved.' });
          navigate('/student/dashboard');
        }
      } else {
        toast({ type: 'success', title: 'Progress saved', description: 'Your answers have been saved.' });
      }
    } catch (err) {
      console.error('Questionnaire save error:', err.response?.data || err.message);
      toast({ type: 'error', title: 'Save failed', description: err.response?.data?.error || 'Questionnaire submission deadline has passed.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-8">
          <CardSelect
            label="Usual sleep time"
            desc="When do you typically go to sleep on weekdays?"
            value={prefs.sleepTime}
            onChange={set('sleepTime')}
            options={SLEEP_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <CardSelect
            label="Usual wake time"
            desc="When do you typically wake up on weekdays?"
            value={prefs.wakeTime}
            onChange={set('wakeTime')}
            options={WAKE_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <CardSelect
            label="Weekend sleep time"
            desc="When do you sleep on weekends?"
            value={prefs.weekendSleepTime}
            onChange={set('weekendSleepTime')}
            options={SLEEP_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <CardSelect
            label="Weekend wake time"
            desc="When do you wake up on weekends?"
            value={prefs.weekendWakeTime}
            onChange={set('weekendWakeTime')}
            options={WAKE_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <CardSelect
            label="Lifestyle type"
            desc="How would you describe your overall daily rhythm?"
            value={prefs.lifestyleType}
            onChange={set('lifestyleType')}
            options={LIFESTYLE_OPTIONS}
            disabled={isFormLocked}
          />
          <CardSelect
            label="Exercise habits"
            desc="How often do you work out or exercise?"
            value={prefs.exerciseHabits}
            onChange={set('exerciseHabits')}
            options={EXERCISE_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />

          {/* Section A: Multi-Select Checklist for Hobbies (5 Randomly Suggested from 30+ DB Hobbies) */}
          <HobbiesSelector
            selectedHobbies={prefs.hobbies || []}
            onChange={set('hobbies')}
            disabled={isFormLocked}
          />
        </div>
      );

      case 1: return (
        <div className="space-y-8">
          <ScaleQuestion
            label="Daily study hours"
            desc="How many hours do you study per day on average?"
            value={prefs.studyHoursPerDay}
            onChange={set('studyHoursPerDay')}
            labels={['< 2 hours', '2–4 hrs', '4–6 hrs', '6–8 hrs', '> 8 hours']}
            disabled={isFormLocked}
          />
          <ToggleQuestion
            label="I study in my room"
            desc="Do you prefer to study inside your hostel room rather than library/common areas?"
            value={prefs.studiesInRoom}
            onChange={set('studiesInRoom')}
            disabled={isFormLocked}
          />
          <CardSelect
            label="Study environment preference"
            desc="What kind of environment do you need while studying?"
            value={prefs.studyEnvironment}
            onChange={set('studyEnvironment')}
            options={STUDY_ENV_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <CardSelect
            label="Noise tolerance while studying"
            desc="How much noise can you tolerate in the room while studying?"
            value={prefs.noiseWhileStudy}
            onChange={set('noiseWhileStudy')}
            options={NOISE_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Exam period intensity"
            desc="How much does your routine change during exam periods?"
            value={prefs.examIntensity}
            onChange={set('examIntensity')}
            labels={['No change', 'Slight increase', 'Moderate', 'High intensity', 'Extreme (all-nighters)']}
            disabled={isFormLocked}
          />
        </div>
      );

      case 2: return (
        <div className="space-y-8">
          <CardSelect
            label="General cleanliness level"
            desc="How clean do you keep your living space?"
            value={prefs.cleanlinessLevel}
            onChange={set('cleanlinessLevel')}
            options={CLEANLINESS_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Organization & tidiness"
            desc="How organized are your belongings (desk, wardrobe, bed)?"
            value={prefs.organizationLevel}
            onChange={set('organizationLevel')}
            labels={['Disorganized', 'Somewhat tidy', 'Organized', 'Very tidy', 'Meticulously organized']}
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Bathroom cleanliness expectation"
            desc="How important is bathroom cleanliness and hygiene to you?"
            value={prefs.bathroomCleanliness}
            onChange={set('bathroomCleanliness')}
            labels={['Basic', 'Moderate', 'Clean', 'Very clean', 'Spotless']}
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Garbage disposal frequency"
            desc="How often should garbage be emptied from the room?"
            value={prefs.garbageDisposal}
            onChange={set('garbageDisposal')}
            labels={['When full', 'Every few days', 'Alternate days', 'Daily', 'Immediately after use']}
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Shared space cleanliness"
            desc="Expectations for keeping shared room areas clean"
            value={prefs.sharedSpaceCleanliness}
            onChange={set('sharedSpaceCleanliness')}
            labels={['Flexible', 'Moderate', 'Clean', 'Very clean', 'Strict rules']}
            disabled={isFormLocked}
          />
        </div>
      );

      case 3: return (
        <div className="space-y-8">
          <CardSelect
            label="General noise tolerance"
            desc="How tolerant are you of room noise during non-study hours?"
            value={prefs.noiseTolerance}
            onChange={set('noiseTolerance')}
            options={NOISE_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <FrequencySelect
            label="Playing music in room"
            desc="How often do you play music (with or without headphones)?"
            value={prefs.musicFrequency}
            onChange={set('musicFrequency')}
            disabled={isFormLocked}
          />
          <FrequencySelect
            label="Gaming frequency"
            desc="How often do you game in the room?"
            value={prefs.gamingFrequency}
            onChange={set('gamingFrequency')}
            disabled={isFormLocked}
          />
          <FrequencySelect
            label="Phone calls in room"
            desc="How often do you take long phone calls inside the room?"
            value={prefs.callsFrequency}
            onChange={set('callsFrequency')}
            disabled={isFormLocked}
          />
          <FrequencySelect
            label="Watching media without headphones"
            desc="How often do you watch videos/movies on speaker?"
            value={prefs.mediaFrequency}
            onChange={set('mediaFrequency')}
            disabled={isFormLocked}
          />
        </div>
      );

      case 4: return (
        <div className="space-y-8">
          <CardSelect
            label="Social activity level"
            desc="How social are you in daily life?"
            value={prefs.socialLevel}
            onChange={set('socialLevel')}
            options={SOCIAL_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Preferred interaction with roommate"
            desc="How much interaction do you want with your roommate?"
            value={prefs.preferredInteraction}
            onChange={set('preferredInteraction')}
            labels={['Minimal / Independent', 'Polite & quiet', 'Friendly', 'Close friends', 'Best friends / Do everything together']}
            disabled={isFormLocked}
          />
          <FrequencySelect
            label="Having visitors in room"
            desc="How often do you plan to have guests/friends visit your room?"
            value={prefs.visitorFrequency}
            onChange={set('visitorFrequency')}
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Comfort with roommate's friends visiting"
            desc="How comfortable are you if your roommate brings friends over?"
            value={prefs.friendsInRoom}
            onChange={set('friendsInRoom')}
            labels={['Not comfortable', 'With notice', 'Occasionally OK', 'Generally fine', 'Always welcome']}
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Social roommate preference"
            desc="Do you prefer a social or quiet roommate?"
            value={prefs.socialRoommatePreference}
            onChange={set('socialRoommatePreference')}
            labels={['Very quiet', 'Mostly quiet', 'Balanced', 'Social', 'Very social']}
            disabled={isFormLocked}
          />
        </div>
      );

      case 5: return (
        <div className="space-y-8">
          <CardSelect
            label="Importance of personal privacy"
            desc="How important is personal privacy to you in the room?"
            value={prefs.privacyImportance}
            onChange={set('privacyImportance')}
            options={PRIVACY_OPTIONS}
            cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            compact
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Personal space needs"
            desc="How much personal space do you need within the shared room?"
            value={prefs.personalSpaceNeed}
            onChange={set('personalSpaceNeed')}
            labels={['Minimal', 'Moderate', 'Significant', 'High', 'Maximum / Clear boundaries']}
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Comfort with sharing belongings"
            desc="How comfortable are you sharing items (chargers, stationery, snacks)?"
            value={prefs.sharingComfort}
            onChange={set('sharingComfort')}
            labels={['Strictly no sharing', 'Ask first always', 'Small items OK', 'Generally open', 'Share everything']}
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Overnight visitors comfort"
            desc="How comfortable are you with overnight guests in the room?"
            value={prefs.visitorComfort}
            onChange={set('visitorComfort')}
            labels={['Never', 'Rarely / Emergency', 'With advance notice', 'Occasionally OK', 'Completely fine']}
            disabled={isFormLocked}
          />
          <ScaleQuestion
            label="Boundary strictness"
            desc="How strictly do you enforce agreed room rules?"
            value={prefs.boundaryStrictness}
            onChange={set('boundaryStrictness')}
            labels={['Very flexible', 'Flexible', 'Moderate', 'Strict', 'Very strict']}
            disabled={isFormLocked}
          />
        </div>
      );

      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Roommate Questionnaire"
        description="Help us understand your preferences to find the best roommate matches."
      />

      {/* Deadline & Status Header Banner */}
      <div className="card p-4 mb-6 bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            <h3 className="font-bold text-slate-900 text-sm">Questionnaire Deadline</h3>
            <span className={cn('badge text-xs font-bold px-2.5 py-0.5', !isFormLocked ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
              {!isFormLocked ? '🟢 Questionnaire Open' : '🔴 Questionnaire Closed'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {formattedDeadlineIST ? (
              <>Deadline: <span className="font-semibold text-slate-700">{formattedDeadlineIST} (IST)</span></>
            ) : (
              'No deadline specified by Administrator'
            )}
          </p>
        </div>

        {remainingText && !isFormLocked && (
          <div className="bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 flex items-center gap-1.5 shadow-2xs">
            <span>⏳</span>
            <span>{remainingText}</span>
          </div>
        )}
      </div>

      {isFormLocked && (
        <div className="p-4 mb-6 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>The questionnaire deadline has passed or has been closed by Admin. Submissions and changes are disabled.</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setStep(i)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                i === step
                  ? 'bg-brand-600 text-white shadow-sm'
                  : i < step
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              {i < step ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{s.id}</span>}
              <span className="hidden sm:inline">{s.title}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('w-4 h-px', i < step ? 'bg-brand-300' : 'bg-slate-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card p-6 mb-6">
        <div className="mb-6">
          <h2 className="section-title">Section {STEPS[step].id} — {STEPS[step].title}</h2>
          <p className="text-muted mt-1">{STEPS[step].desc}</p>
        </div>
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-secondary disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <div className="flex gap-3">
          <button onClick={() => save(false)} disabled={saving || isFormLocked} className="btn-secondary disabled:opacity-50">
            Save progress
          </button>
          <button onClick={() => save(true)} disabled={saving || isFormLocked} className="btn-primary disabled:opacity-50">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : step === STEPS.length - 1 ? (
              <><CheckCircle className="w-4 h-4" /> Complete</>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
