import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { PageHeader, EmptyState, TableSkeleton } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { getInitials, formatDate } from '../../lib/utils';
import { Users, Search, CheckCircle, AlertCircle, Eye, ChevronLeft, ChevronRight, UserPlus, Sparkles } from 'lucide-react';
import api from '../../lib/api';
import { Modal } from '../../components/Modal';
import AddStudentModal from '../../components/AddStudentModal';
import BulkAddStudentsModal from '../../components/BulkAddStudentsModal';
import { cn } from '../../lib/utils';

const PAGE_SIZE = 20;

// ── Pagination bar ──────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, limit, onPage }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
      <p className="text-xs text-slate-500 order-2 sm:order-1">
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span> students
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 text-xs select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={cn(
                'min-w-[30px] h-[30px] rounded-lg text-xs font-medium transition-colors',
                p === page
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [students,   setStudents]   = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 0 });
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const { toast }  = useToast();
  const debounceRef = useRef(null);

  // status query param maps the UI filter label
  const statusParam = { all: '', complete: 'complete', incomplete: 'incomplete' };

  const fetchStudents = useCallback((targetPage, currentSearch, currentFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ page: targetPage, limit: PAGE_SIZE });
    if (currentSearch)                        params.set('search', currentSearch);
    if (statusParam[currentFilter])           params.set('status',  statusParam[currentFilter]);

    api.get(`/admin/students?${params}`)
      .then(({ data }) => {
        const flattened = (data.students || []).map(s => ({
          ...s,
          ...(s.profile || {}),
          preference: s.profile?.preference,
        }));
        setStudents(flattened);
        setPagination(
          data.pagination || { page: targetPage, limit: PAGE_SIZE, total: flattened.length, pages: 1 }
        );
      })
      .catch(() => toast({ type: 'error', title: 'Failed to load students' }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when page changes immediately; debounce search/filter changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchStudents(page, search, filter),
      search ? 300 : 0
    );
    return () => clearTimeout(debounceRef.current);
  }, [page, search, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 1 when search or filter changes
  const handleSearch = (value) => { setSearch(value); setPage(1); };
  const handleFilter = (value) => { setFilter(value);  setPage(1); };

  const handleStudentAdded = () => {
    fetchStudents(1, search, filter);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Students"
        description={
          pagination.total > 0
            ? `${pagination.total} registered student${pagination.total !== 1 ? 's' : ''}`
            : loading ? 'Loading…' : 'No registered students yet'
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="btn-secondary text-xs flex items-center gap-1.5 border-purple-200 hover:bg-purple-50 text-purple-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Bulk Add / Generate</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, ID, or department..."
            autoComplete="off"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {['all', 'complete', 'incomplete'].map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize',
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students found" description="Try adjusting your search or filters." />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Year</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {getInitials(s.firstName, s.lastName)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-slate-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.studentId || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.department || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{s.year ? `Y${s.year}` : '—'}</td>
                    <td className="px-4 py-3">
                      {s.preference?.isComplete ? (
                        <span className="badge badge-green flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" /> Complete
                        </span>
                      ) : (
                        <span className="badge badge-amber flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(s)}
                        className="btn-ghost btn-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <Pagination
            page={pagination.page}
            totalPages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            onPage={setPage}
          />
        </>
      )}

      {/* Detail modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Student Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xl">
                {getInitials(selected.firstName, selected.lastName)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-lg">{selected.firstName} {selected.lastName}</p>
                <p className="text-slate-500 text-sm">{selected.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Student ID', selected.studentId],
                ['Department', selected.department],
                ['Year', selected.year],
                ['Gender', selected.gender],
                ['Phone', selected.phone],
                ['Registered', formatDate(selected.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{k}</p>
                  <p className="font-medium text-slate-900 mt-0.5">{v || '—'}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-500 mb-2">Questionnaire</p>
              {selected.preference ? (
                <span className={`badge ${selected.preference.isComplete ? 'badge-green' : 'badge-amber'}`}>
                  {selected.preference.isComplete ? '✓ Completed' : '⏳ Pending'}
                </span>
              ) : (
                <span className="badge badge-slate">Not started</span>
              )}
            </div>

            {selected.preference?.hobbies?.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Interests & Hobbies</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.preference.hobbies.map((h, i) => (
                    <span key={i} className="inline-flex items-center text-xs px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 font-medium border border-brand-100">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Admin Student Enrollment Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleStudentAdded}
      />

      <BulkAddStudentsModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={handleStudentAdded}
      />
    </DashboardLayout>
  );
}
