import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowRight, Users, Zap, BarChart3, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

const features = [
  { icon: Users, title: 'Smart Matching', desc: 'Algorithm-based compatibility scoring across 7 preference categories.' },
  { icon: Zap, title: 'Instant Results', desc: 'Run the matching algorithm and get optimized room allocations in seconds.' },
  { icon: BarChart3, title: 'Explainable Scores', desc: 'Every compatibility score comes with a detailed category breakdown.' },
  { icon: CheckCircle, title: 'Admin Control', desc: 'Admins can review, adjust, and confirm allocations before students are notified.' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const redirects = { STUDENT: '/student/dashboard', ADMIN: '/admin/dashboard', MANAGEMENT: '/management/dashboard' };
      navigate(redirects[user.role] || '/login');
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 h-16 flex items-center px-6 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">SRKR SMART HOSTEL</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-primary text-sm">Sign in to Portal</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full mb-8 border border-brand-100">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            SRKR Smart Hostel Roommate Matching
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            Find roommates who<br />
            <span className="text-brand-600">actually match you</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            SRKR SMART HOSTEL uses a weighted compatibility algorithm to match students based on sleep schedules,
            study habits, cleanliness, and more — eliminating roommate conflicts before they start.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/login" className="btn-primary btn-lg">
              Sign In to Hostel Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="card p-5"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                <Icon className="w-4.5 h-4.5 text-brand-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5 text-sm">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Algorithm callout */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">How the algorithm works</h2>
            <p className="text-slate-500 text-sm">Fully deterministic, explainable, and reproducible</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Lifestyle', pct: '25%' },
              { label: 'Study', pct: '25%' },
              { label: 'Cleanliness', pct: '20%' },
              { label: 'Social', pct: '15%' },
              { label: 'Boundaries', pct: '15%' },
            ].map(({ label, pct }) => (
              <div key={label} className="card p-4 text-center">
                <div className="text-2xl font-bold text-brand-600 mb-1">{pct}</div>
                <div className="text-xs text-slate-600 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        © 2025 SRKR SMART HOSTEL. Built for better hostel living.
      </footer>
    </div>
  );
}
