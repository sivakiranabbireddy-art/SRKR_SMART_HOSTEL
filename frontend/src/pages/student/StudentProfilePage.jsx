import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, LoadingSpinner } from '../../components/ui';
import { getInitials } from '../../lib/utils';
import { Hash, Phone, Mail, GraduationCap, Building, User, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';

export default function StudentProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch live profile from backend on mount
    refreshUser();
    api.get('/students/me/profile')
      .then(({ data }) => {
        setProfileData(data);
        setForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          department: data.department || '',
          year: data.year || 1,
          gender: data.gender || 'MALE',
        });
      })
      .catch(() => {
        if (user?.profile) {
          setForm({
            firstName: user.profile.firstName || '',
            lastName: user.profile.lastName || '',
            phone: user.profile.phone || '',
            department: user.profile.department || '',
            year: user.profile.year || 1,
            gender: user.profile.gender || 'MALE',
          });
        }
      });
  }, []);

  useEffect(() => {
    if (user?.profile && !form) {
      setForm({
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        phone: user.profile.phone || '',
        department: user.profile.department || '',
        year: user.profile.year || 1,
        gender: user.profile.gender || 'MALE',
      });
    }
  }, [user]);

  if (!form) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/students/me/profile', { ...form, year: parseInt(form.year) });
      setProfileData(data);
      await refreshUser();
      toast({ type: 'success', title: 'Profile updated!' });
    } catch (err) {
      toast({ type: 'error', title: 'Update failed', description: err.response?.data?.error });
    } finally {
      setSaving(false);
    }
  };

  const profile = profileData || user?.profile;

  return (
    <DashboardLayout>
      <PageHeader title="My Profile" description="Manage your personal information and student credentials." />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar & Identification card */}
        <div className="card p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold mx-auto shadow-sm">
            {getInitials(profile?.firstName, profile?.lastName)}
          </div>
          <div>
            <p className="font-bold text-lg text-slate-900">{profile?.firstName} {profile?.lastName}</p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {user?.email}
            </p>
          </div>

          {/* Register Number Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Hash className="w-3.5 h-3.5 text-brand-600" /> Register Number
            </span>
            <p className="text-base font-bold font-mono text-brand-700 tracking-wide">
              {profile?.studentId || 'Not Assigned'}
            </p>
          </div>

          {/* Phone Number Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Phone Number
            </span>
            <p className="text-sm font-semibold text-slate-800">
              {profile?.phone || form.phone || 'Not Provided'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 px-2">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Year {profile?.year || 1}
            </span>
            <span className="flex items-center gap-1 font-medium text-brand-600">
              <Building className="w-3.5 h-3.5 text-brand-500" /> {profile?.department || 'Department'}
            </span>
          </div>
        </div>

        {/* Edit form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6 space-y-4" autoComplete="off">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="section-title mb-0">Personal Information</h2>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verified Student Profile
              </span>
            </div>

            {/* Readonly Register Number Field */}
            <div>
              <label className="label flex items-center justify-between">
                <span>Register Number (Student ID)</span>
                <span className="text-[11px] text-slate-400 font-normal">System assigned</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="input pl-9 bg-slate-50 text-slate-700 font-mono font-medium cursor-not-allowed border-slate-200"
                  value={profile?.studentId || ''}
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input type="text" name="firstName" autoComplete="given-name" className="input" value={form.firstName} onChange={set('firstName')} required />
              </div>
              <div>
                <label className="label">Last name</label>
                <input type="text" name="lastName" autoComplete="family-name" className="input" value={form.lastName} onChange={set('lastName')} required />
              </div>
            </div>

            <div>
              <label className="label flex items-center justify-between">
                <span>Phone Number</span>
                <span className="text-[11px] text-slate-400 font-normal">For roommate coordination</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  className="input pl-9"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="label">Department</label>
              <input type="text" name="department" autoComplete="off" className="input" value={form.department} onChange={set('department')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Year</label>
                <select className="input" value={form.year} onChange={set('year')}>
                  {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input" value={form.gender} onChange={set('gender')}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving changes...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
