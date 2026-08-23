import { cn, getCompatibilityBg, getCompatibilityLabel } from '../lib/utils';

export function CompatibilityBadge({ score, showLabel = true, size = 'sm' }) {
  if (score === null || score === undefined) return null;

  const { label } = getCompatibilityLabel(score);
  const colorClass = getCompatibilityBg(score);

  const sizes = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const display = score === -1 ? 'Conflict' : `${score.toFixed(1)}%`;

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full font-medium', sizes[size], colorClass)}>
      <span>{display}</span>
      {showLabel && score !== -1 && (
        <span className="opacity-70">· {label}</span>
      )}
    </span>
  );
}

export function CompatibilityBar({ score, label, className }) {
  if (score === null || score === undefined) return null;
  const pct = Math.max(0, Math.min(100, score));

  const barColor =
    pct >= 90 ? 'bg-emerald-500' :
    pct >= 75 ? 'bg-blue-500' :
    pct >= 60 ? 'bg-brand-500' :
    pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">{label}</span>
          <span className="text-slate-500">{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CompatibilityBreakdown({ score, size = 'default' }) {
  if (!score || score.score === -1) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <span>⚠ Hard conflict — cannot share room</span>
      </div>
    );
  }

  const categories = [
    { label: 'Lifestyle', value: score.lifestyleScore, weight: '25%' },
    { label: 'Study', value: score.studyScore, weight: '25%' },
    { label: 'Cleanliness', value: score.cleanlinessScore, weight: '20%' },
    { label: 'Social', value: score.socialScore, weight: '15%' },
    { label: 'Boundaries', value: score.boundaryScore, weight: '15%' },
  ];

  return (
    <div className="space-y-3">
      {categories.map(({ label, value, weight }) =>
        value != null ? (
          <CompatibilityBar key={label} score={value} label={`${label} (${weight})`} />
        ) : null
      )}
      {score.explanation && (
        <div className="pt-2 space-y-1">
          {score.explanation.strengths?.slice(0, 3).map((s, i) => (
            <p key={i} className="text-xs text-emerald-700 flex items-center gap-1.5">
              <span>✓</span> {s}
            </p>
          ))}
          {score.explanation.differences?.slice(0, 2).map((d, i) => (
            <p key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
              <span>⚠</span> {d}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
