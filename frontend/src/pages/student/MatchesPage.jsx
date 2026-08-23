import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { CompatibilityBadge, CompatibilityBreakdown } from '../../components/CompatibilityBadge';
import { getInitials } from '../../lib/utils';
import { Modal } from '../../components/Modal';
import { Star, ChevronDown } from 'lucide-react';
import api from '../../lib/api';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/students/me/matches').then(({ data }) => {
      setMatches(data.matches || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title="Roommate Matches"
        description="Students most compatible with you based on your preferences."
      />

      {matches.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No matches found"
          description="Complete your questionnaire and wait for the admin to run the matching algorithm."
        />
      ) : (
        <div className="grid gap-3">
          {matches.map(({ student, compatibility }, i) => (
            <div
              key={student.id}
              className="card p-4 flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-shadow"
              onClick={() => setSelected({ student, compatibility })}
            >
              <div className="text-sm font-bold text-slate-300 w-6 flex-shrink-0">#{i + 1}</div>
              <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                {getInitials(student.firstName, student.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{student.firstName} {student.lastName}</p>
                <p className="text-xs text-slate-500">{student.department} · Year {student.year} · {student.gender}</p>
              </div>
              <CompatibilityBadge score={compatibility.score} size="md" />
              <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.student.firstName} ${selected.student.lastName}` : ''}
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg">
                {getInitials(selected.student.firstName, selected.student.lastName)}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{selected.student.firstName} {selected.student.lastName}</p>
                <p className="text-sm text-slate-500">{selected.student.department} · Year {selected.student.year}</p>
              </div>
              <CompatibilityBadge score={selected.compatibility.score} size="md" className="ml-auto" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Compatibility Breakdown</p>
              <CompatibilityBreakdown score={selected.compatibility} />
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
