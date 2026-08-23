import { useState } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export default function AddStudentModal({ isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    department: 'Computer Science',
    year: '1',
    gender: 'MALE',
    phone: '',
    password: 'Test@123',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [idChecking, setIdChecking] = useState(false);
  const [idAvailable, setIdAvailable] = useState(null);

  if (!isOpen) return null;

  const set = (field) => (e) => {
    const val = e.target.value;
    setForm(p => ({ ...p, [field]: val }));
    if (errors[field]) {
      setErrors(p => ({ ...p, [field]: '' }));
    }
    if (field === 'studentId') {
      setIdAvailable(null);
    }
  };

  // Auto-generate name-based email and register number helper
  const handleAutoSuggest = () => {
    if (!form.firstName && !form.lastName) return;
    const cleanF = (form.firstName || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanL = (form.lastName || '').trim().toLowerCase().replace(/\s+/g, '');
    const suggestedEmail = `${cleanF}.${cleanL || 'student'}@gmail.com`;

    const yrPrefixMap = { '1': '26', '2': '25', '3': '24', '4': '23' };
    const yr = yrPrefixMap[form.year] || '26';

    setForm(p => ({
      ...p,
      email: p.email || suggestedEmail,
      studentId: p.studentId || `${yr}B95A0121`,
    }));
  };

  const handleStudentIdBlur = async () => {
    const val = form.studentId.trim().toUpperCase();
    if (!val) return;

    if (val.length !== 10) {
      setErrors(p => ({ ...p, studentId: 'Register number must be exactly 10 characters (e.g. 26B95A0001)' }));
      setIdAvailable(false);
      return;
    }

    try {
      setIdChecking(true);
      const { data } = await api.get(`/auth/check-student-id?studentId=${encodeURIComponent(val)}`);
      if (data.exists) {
        setErrors(p => ({ ...p, studentId: data.message || `Register number "${val}" already exists.` }));
        setIdAvailable(false);
      } else {
        setIdAvailable(true);
        setErrors(p => {
          const next = { ...p };
          delete next.studentId;
          return next;
        });
      }
    } catch {
      // ignore
    } finally {
      setIdChecking(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email is required';

    const cleanId = form.studentId.trim().toUpperCase();
    if (!cleanId) {
      errs.studentId = 'Register number is required';
    } else if (cleanId.length !== 10) {
      errs.studentId = 'Register number must be exactly 10 characters (e.g. 26B95A0001)';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/admin/students', {
        ...form,
        studentId: form.studentId.trim().toUpperCase(),
        year: parseInt(form.year),
      });

      toast({
        type: 'success',
        title: 'Student Created',
        description: data.message || `Account for ${form.firstName} created successfully.`,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create student.';
      toast({ type: 'error', title: 'Error', description: msg });
      if (msg.toLowerCase().includes('register number') || msg.toLowerCase().includes('id')) {
        setErrors(p => ({ ...p, studentId: msg }));
      } else if (msg.toLowerCase().includes('email')) {
        setErrors(p => ({ ...p, email: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Enroll New Student</h3>
                <p className="text-xs text-slate-500">Create an approved student account in the database</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name *</label>
                <input
                  className={`input ${errors.firstName ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                  placeholder="e.g. Ramesh"
                  value={form.firstName}
                  onChange={set('firstName')}
                  onBlur={handleAutoSuggest}
                  required
                />
                {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input
                  className={`input ${errors.lastName ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                  placeholder="e.g. Varma"
                  value={form.lastName}
                  onChange={set('lastName')}
                  onBlur={handleAutoSuggest}
                  required
                />
                {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Email Address *</label>
                {(form.firstName || form.lastName) && !form.email && (
                  <button
                    type="button"
                    onClick={handleAutoSuggest}
                    className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-fill email
                  </button>
                )}
              </div>
              <input
                type="email"
                className={`input ${errors.email ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : ''}`}
                placeholder="ramesh.varma@gmail.com"
                value={form.email}
                onChange={set('email')}
                required
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            {/* Register Number & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Register Number (10 chars) *</label>
                <div className="relative">
                  <input
                    className={`input uppercase font-mono ${errors.studentId ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : idAvailable ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}`}
                    placeholder="26B95A0001"
                    maxLength={10}
                    value={form.studentId}
                    onChange={set('studentId')}
                    onBlur={handleStudentIdBlur}
                    required
                  />
                  {idChecking && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                  {!idChecking && idAvailable && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {errors.studentId && <p className="text-xs text-red-600 mt-1 leading-tight">{errors.studentId}</p>}
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={set('phone')}
                />
              </div>
            </div>

            {/* Department, Year, Gender */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Department</label>
                <select className="input text-xs" value={form.department} onChange={set('department')}>
                  <option value="Computer Science">CSE</option>
                  <option value="Information Tech">IT</option>
                  <option value="AI & Data Science">AI & DS</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="Mechanical">MECH</option>
                  <option value="Civil">CIVIL</option>
                </select>
              </div>

              <div>
                <label className="label">Year</label>
                <select className="input text-xs" value={form.year} onChange={set('year')}>
                  <option value="1">Year 1 (1st Yr)</option>
                  <option value="2">Year 2 (2nd Yr)</option>
                  <option value="3">Year 3 (3rd Yr)</option>
                  <option value="4">Year 4 (4th Yr)</option>
                </select>
              </div>

              <div>
                <label className="label">Gender</label>
                <select className="input text-xs" value={form.gender} onChange={set('gender')}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Initial Password */}
            <div>
              <label className="label">Initial Account Password</label>
              <input
                type="text"
                className="input font-mono text-xs"
                value={form.password}
                onChange={set('password')}
                placeholder="Test@123"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default is <span className="font-semibold text-slate-600">Test@123</span>. Student can change this after signing in.</p>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Enroll Student
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
