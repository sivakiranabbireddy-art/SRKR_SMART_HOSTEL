import { useState, useEffect } from 'react';
import { Calendar, Clock, Lock, Unlock, CheckCircle, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';

export function QuestionnaireDeadlineManager({ onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [status, setStatus] = useState('OPEN');
  const [serverTime, setServerTime] = useState(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/admin/questionnaire-settings');
      if (data?.settings) {
        const s = data.settings;
        setIsOpen(s.questionnaireOpen ?? true);
        setStatus(s.status || 'OPEN');
        setServerTime(s.serverTime);
        if (s.questionnaireDeadline) {
          // Format ISO date string for datetime-local input (YYYY-MM-THH:mm)
          const d = new Date(s.questionnaireDeadline);
          const tzOffset = d.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
          setDeadline(localISOTime);
        } else {
          setDeadline('');
        }
      }
    } catch (error) {
      console.error('Failed to load questionnaire settings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        questionnaireOpen: isOpen,
        questionnaireDeadline: deadline ? new Date(deadline).toISOString() : null,
      };
      const { data } = await api.put('/admin/questionnaire-settings', payload);
      toast({ type: 'success', title: 'Questionnaire deadline updated successfully' });
      if (data?.settings) {
        setStatus(data.settings.status);
      }
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ type: 'error', title: 'Failed to update deadline settings' });
    } finally {
      setSaving(false);
    }
  };

  const formattedDeadlineIST = deadline ? new Date(deadline).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) : 'No deadline set';

  if (loading) {
    return (
      <div className="card p-5 animate-pulse bg-white">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-slate-100 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="card p-5 bg-white border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            Questionnaire Deadline Management
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Control when student questionnaire submissions open or close.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge px-3 py-1 text-xs font-bold ${status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {status === 'OPEN' ? '🟢 OPEN' : '🔴 CLOSED'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Questionnaire Deadline (Date & Time)
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="input text-xs w-full"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            IST Formatted: <span className="font-semibold text-slate-700">{formattedDeadlineIST}</span>
          </p>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Manual Questionnaire Status
          </label>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
            >
              {isOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isOpen ? 'Open for Submissions' : 'Manually Closed'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Toggling closed immediately prevents any further submissions regardless of deadline date.
          </p>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
        <span className="text-[11px] text-slate-400">
          Server time authority: Asia/Kolkata
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Deadline Settings'}
        </button>
      </div>
    </div>
  );
}
