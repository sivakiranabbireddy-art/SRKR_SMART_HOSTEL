import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, LoadingSpinner, EmptyState, StatCard, ErrorState } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { Zap, CheckCircle, AlertTriangle, Clock, Play, RefreshCw } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { ConfirmModal } from '../../components/Modal';
import api from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const StatusBadge = ({ status }) => {
  const styles = {
    COMPLETED: 'badge-green',
    RUNNING: 'badge-blue',
    FAILED: 'badge-red',
    PENDING: 'badge-amber',
  };
  return <span className={`badge ${styles[status] || 'badge-slate'}`}>{status || 'UNKNOWN'}</span>;
};

export default function MatchingPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeRun, setActiveRun] = useState(null);
  const { toast } = useToast();

  const loadRuns = useCallback(() => {
    api.get('/admin/matching/runs')
      .then(({ data }) => {
        setError(null);
        const list = Array.isArray(data.runs) ? data.runs : [];
        setRuns(list);
        const inProgress = list.find(r => r && r.status === 'RUNNING');
        setActiveRun(inProgress || null);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load matching runs');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // Poll if there's an active run
  useEffect(() => {
    if (!activeRun) return;
    const t = setInterval(loadRuns, 3000);
    return () => clearInterval(t);
  }, [activeRun, loadRuns]);

  const handleRun = async () => {
    setConfirmOpen(false);
    setRunning(true);
    try {
      const { data } = await api.post('/admin/matching/run');
      toast({ type: 'success', title: 'Matching algorithm started!', description: 'Results will appear when complete.' });
      if (data?.run) {
        setRuns(prev => [data.run, ...prev.filter(r => r && r.id !== data.run.id)]);
        setActiveRun(data.run);
      }
      loadRuns();
    } catch (err) {
      toast({ type: 'error', title: 'Failed to start matching', description: err.response?.data?.error || 'Try again.' });
    } finally {
      setRunning(false);
    }
  };

  const handleConfirm = async (runId) => {
    try {
      await api.post(`/admin/matching/runs/${runId}/confirm`);
      toast({ type: 'success', title: 'Allocation confirmed!', description: 'Students have been assigned to rooms.' });
      loadRuns();
    } catch (err) {
      toast({ type: 'error', title: 'Confirmation failed', description: err.response?.data?.error });
    }
  };

  const latestCompleted = runs.find(r => r && r.status === 'COMPLETED');

  return (
    <DashboardLayout>
      <PageHeader
        title="Matching Algorithm"
        description="Run and manage roommate matching runs."
        actions={
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={running || !!activeRun}
            className="btn-primary disabled:opacity-50"
          >
            {running || activeRun ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running...</>
            ) : (
              <><Zap className="w-4 h-4" /> Run Matching</>
            )}
          </button>
        }
      />

      {/* Active run indicator */}
      <AnimatePresence>
        {activeRun && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Matching algorithm is running...</p>
              <p className="text-xs text-blue-700 mt-0.5">This may take a few seconds. Results will refresh automatically.</p>
            </div>
            <button onClick={loadRuns} className="ml-auto btn-ghost btn-sm text-blue-600">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latest completed results */}
      {latestCompleted && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Students Matched" value={latestCompleted.studentsAssigned ?? latestCompleted.totalStudents ?? '—'} icon={CheckCircle} color="green" />
          <StatCard title="Rooms Used" value={latestCompleted.totalRooms ?? '—'} icon={Zap} color="blue" />
          <StatCard
            title="Avg Compatibility"
            value={latestCompleted.avgCompatibility != null ? `${Number(latestCompleted.avgCompatibility).toFixed(1)}%` : '—'}
            icon={CheckCircle}
            color="amber"
          />
          <StatCard
            title="Unassigned"
            value={latestCompleted.studentsUnassigned ?? latestCompleted.unassignedCount ?? 0}
            icon={AlertTriangle}
            color={(latestCompleted.studentsUnassigned ?? latestCompleted.unassignedCount ?? 0) > 0 ? 'red' : 'green'}
          />
        </div>
      )}

      {/* Runs history / states */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={loadRuns} />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No matching runs yet"
          description="Click 'Run Matching' to start the algorithm and generate roommate allocations."
          action={
            <button onClick={() => setConfirmOpen(true)} className="btn-primary">
              <Play className="w-4 h-4" /> Start first run
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-medium text-slate-500">Matching History</div>
          <div className="divide-y divide-slate-100">
            {runs.filter(Boolean).map((run, idx) => {
              const runLabel = run.notes?.includes('Initial')
                ? 'Initial Allocation'
                : `Run #${runs.length - idx}`;
              return (
                <div key={run.id || idx} className="flex items-center gap-4 px-4 py-3.5">
                  <StatusBadge status={run.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {runLabel}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDateTime(run.createdAt)}
                      {run.avgCompatibility != null ? ` · Avg ${Number(run.avgCompatibility).toFixed(1)}%` : ''}
                      {run.totalStudents ? ` · ${run.totalStudents} students` : ''}
                    </p>
                    {run.notes && !run.notes.includes('Initial') && !run.notes.includes('confirmed') && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{run.notes}</p>
                    )}
                  </div>
                  {run.status === 'COMPLETED' && !run.isConfirmed && (
                    <button
                      onClick={() => handleConfirm(run.id)}
                      className="btn-primary btn-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Confirm Allocations
                    </button>
                  )}
                  {run.isConfirmed && (
                    <span className="badge badge-green">Confirmed</span>
                  )}
                  {run.status === 'FAILED' && (
                    <span className="badge badge-red flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Failed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRun}
        title="Run Matching Algorithm?"
        description="This will calculate compatibility scores for all students who have completed the questionnaire and generate optimal room allocations. The process is safe — allocations are not confirmed until you click 'Confirm'."
        confirmLabel="Run Algorithm"
        variant="primary"
        loading={running}
      />
    </DashboardLayout>
  );
}
