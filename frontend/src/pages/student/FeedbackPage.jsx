import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { MessageSquare, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

const RatingInput = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="label">{label}</label>
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all flex items-center justify-center gap-1',
            value >= v
              ? 'bg-amber-400 text-white border-amber-400'
              : 'bg-white text-slate-400 border-slate-200 hover:border-amber-200'
          )}
        >
          <Star className="w-3.5 h-3.5 fill-current" /> {v}
        </button>
      ))}
    </div>
  </div>
);

export default function FeedbackPage() {
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    overallSatisfaction: 0, cleanlinessScore: 0, studyCompatibility: 0,
    lifestyleCompatibility: 0, noiseCompatibility: 0,
    wouldChooseAgain: null, conflictExperienced: null, comment: '',
  });
  const { toast } = useToast();
  const set = (f) => (v) => setForm(p => ({ ...p, [f]: v }));

  useEffect(() => {
    api.get('/students/me/room').then(({ data }) => {
      if (data.allocation) setAllocation(data.allocation);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allocation) return;
    if (!form.overallSatisfaction) return toast({ type: 'error', title: 'Please rate overall satisfaction' });
    if (form.wouldChooseAgain === null) return toast({ type: 'error', title: 'Please answer all required questions' });

    setSubmitting(true);
    try {
      await api.post('/students/me/feedback', {
        roomAllocationId: allocation.id,
        ...form,
      });
      setSubmitted(true);
      toast({ type: 'success', title: 'Feedback submitted!', description: 'Thank you for your response.' });
    } catch (err) {
      toast({ type: 'error', title: 'Submission failed', description: err.response?.data?.error || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  if (!allocation) return (
    <DashboardLayout>
      <PageHeader title="Feedback" />
      <EmptyState
        icon={MessageSquare}
        title="No confirmed allocation"
        description="Feedback will be available once your room allocation is confirmed and you have lived with your roommates."
      />
    </DashboardLayout>
  );

  if (submitted) return (
    <DashboardLayout>
      <PageHeader title="Feedback" />
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-emerald-500 fill-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Thank you!</h2>
        <p className="text-slate-500 text-sm">Your feedback helps improve the matching algorithm for future students.</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Room Feedback"
        description={`Feedback for Room ${allocation.room.number}`}
      />
      <form onSubmit={handleSubmit} className="card p-6 space-y-6 max-w-xl">
        <RatingInput label="Overall satisfaction (1–5 stars)" value={form.overallSatisfaction} onChange={set('overallSatisfaction')} />
        <RatingInput label="Cleanliness satisfaction" value={form.cleanlinessScore} onChange={set('cleanlinessScore')} />
        <RatingInput label="Study compatibility" value={form.studyCompatibility} onChange={set('studyCompatibility')} />
        <RatingInput label="Lifestyle compatibility" value={form.lifestyleCompatibility} onChange={set('lifestyleCompatibility')} />
        <RatingInput label="Noise compatibility" value={form.noiseCompatibility} onChange={set('noiseCompatibility')} />

        <div className="space-y-2">
          <label className="label">Would you choose these roommates again?</label>
          <div className="flex gap-3">
            {[true, false].map((v) => (
              <button key={String(v)} type="button"
                onClick={() => set('wouldChooseAgain')(v)}
                className={cn('flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all',
                  form.wouldChooseAgain === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}>
                {v ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="label">Did you experience any conflicts?</label>
          <div className="flex gap-3">
            {[true, false].map((v) => (
              <button key={String(v)} type="button"
                onClick={() => set('conflictExperienced')(v)}
                className={cn('flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all',
                  form.conflictExperienced === v
                    ? v ? 'bg-red-600 text-white border-red-600' : 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}>
                {v ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Comments (optional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Share your experience..."
            value={form.comment}
            onChange={(e) => set('comment')(e.target.value)}
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </DashboardLayout>
  );
}
