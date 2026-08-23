import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, ErrorState } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { MessageSquare, Star } from 'lucide-react';
import { formatDate, getInitials } from '../../lib/utils';
import api from '../../lib/api';

const StarDisplay = ({ value }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(v => (
      <Star key={v} className={`w-3.5 h-3.5 ${v <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
    ))}
  </div>
);

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const loadFeedback = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/admin/feedback')
      .then(({ data }) => {
        const list = Array.isArray(data.feedbacks)
          ? data.feedbacks
          : Array.isArray(data.feedback)
          ? data.feedback
          : [];
        setFeedback(list);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load feedback');
        toast({ type: 'error', title: 'Failed to load feedback' });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Student Feedback"
        description={
          feedback.length > 0
            ? `${feedback.length} feedback submission${feedback.length !== 1 ? 's' : ''}`
            : 'Review feedback from students about room allocations and roommates.'
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={loadFeedback} />
      ) : feedback.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback available"
          description="Feedback will appear here once students submit their room satisfaction surveys."
        />
      ) : (
        <div className="grid gap-4">
          {feedback.filter(Boolean).map((fb) => {
            const student = fb.studentProfile;
            return (
              <div key={fb.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {getInitials(student?.firstName, student?.lastName)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {student?.firstName} {student?.lastName}
                        {student?.studentId && (
                          <span className="text-xs text-slate-400 ml-1.5 font-normal">({student.studentId})</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Room {fb.roomAllocation?.room?.number || '—'} · {formatDate(fb.createdAt)}
                      </p>
                    </div>
                  </div>
                  <StarDisplay value={fb.overallSatisfaction} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {[
                    ['Cleanliness', fb.cleanlinessScore],
                    ['Study', fb.studyCompatibility],
                    ['Lifestyle', fb.lifestyleCompatibility],
                    ['Noise', fb.noiseCompatibility],
                  ].map(([label, val]) => val != null ? (
                    <div key={label} className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-500">{label}</p>
                      <StarDisplay value={val} />
                    </div>
                  ) : null)}
                </div>

                <div className="flex gap-4 text-xs text-slate-600">
                  {fb.wouldChooseAgain !== null && fb.wouldChooseAgain !== undefined && (
                    <span>Would choose again: <span className={`font-medium ${fb.wouldChooseAgain ? 'text-emerald-600' : 'text-red-500'}`}>{fb.wouldChooseAgain ? 'Yes' : 'No'}</span></span>
                  )}
                  {fb.conflictExperienced !== null && fb.conflictExperienced !== undefined && (
                    <span>Had conflicts: <span className={`font-medium ${fb.conflictExperienced ? 'text-red-500' : 'text-emerald-600'}`}>{fb.conflictExperienced ? 'Yes' : 'No'}</span></span>
                  )}
                </div>

                {fb.comment && (
                  <p className="text-sm text-slate-600 mt-3 p-3 bg-slate-50 rounded-xl border-l-2 border-slate-200 italic">
                    "{fb.comment}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
