import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Home, AlertCircle, ShieldCheck, Mail, ArrowLeft, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function Field({ label, field, type = 'text', placeholder, autoComplete, value, onChange, onBlur, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children || (
        <input
          type={type}
          name={field}
          autoComplete={autoComplete || 'off'}
          className={`input ${error ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
      )}
      {error && <p className="text-xs text-red-600 mt-1 font-medium leading-snug">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'verified'
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    studentId: '', department: '', year: '1', gender: 'MALE', phone: '',
  });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');
  const [checkingStudentId, setCheckingStudentId] = useState(false);
  
  // OTP Expiry timer (5 minutes = 300 seconds)
  const [otpExpiry, setOtpExpiry] = useState(300);
  
  // Resend cooldown timer (60 seconds)
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const otpInputsRef = useRef([]);

  const { sendRegisterOtp, verifyRegisterOtp, resendRegisterOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // 5-minute OTP expiration timer
  useEffect(() => {
    let timer;
    if (step === 'otp' && otpExpiry > 0) {
      timer = setInterval(() => {
        setOtpExpiry(prev => {
          if (prev <= 1) {
            setGlobalError('OTP has expired. Please request a new OTP.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpExpiry]);

  // 60-second Resend cooldown timer
  useEffect(() => {
    let timer;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const set = (field) => (e) => {
    const val = e.target.value;
    setForm(p => ({ ...p, [field]: val }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Real-time check when student leaves the Register Number field
  const handleStudentIdBlur = async () => {
    const val = form.studentId.trim();
    if (!val) return;

    try {
      setCheckingStudentId(true);
      const api = (await import('../lib/api')).default;
      const { data } = await api.get(`/auth/check-student-id?studentId=${encodeURIComponent(val)}`);
      if (data.exists) {
        setErrors(prev => ({
          ...prev,
          studentId: data.message || `Registration number "${val}" already exists in the database.`,
        }));
      } else {
        setErrors(prev => {
          const next = { ...prev };
          if (next.studentId?.includes('already exists')) {
            delete next.studentId;
          }
          return next;
        });
      }
    } catch {
      // Ignore network blur errors
    } finally {
      setCheckingStudentId(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email address';
    
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!form.studentId.trim()) {
      errs.studentId = 'Register number / Student ID is required';
    } else if (form.studentId.trim().length !== 10) {
      errs.studentId = 'Register number must be exactly 10 characters (e.g. 26B95A0001)';
    }
    if (!form.department.trim()) errs.department = 'Department is required';
    return errs;
  };

  // Format seconds into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Request OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setGlobalSuccess('');
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const data = await sendRegisterOtp({
        ...form,
        year: parseInt(form.year),
      });

      setStep('otp');
      setOtpExpiry(300); // 5 minutes
      setResendCooldown(60); // 60 seconds
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setGlobalSuccess(data.message || 'OTP sent successfully.');
      toast({
        type: 'success',
        title: 'OTP Sent',
        description: data.message || `A 6-digit verification code has been sent to ${form.email}`,
      });
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send OTP. Please check your details.';
      const field = err.response?.data?.field;

      if (field === 'studentId' || /register|student id/i.test(msg)) {
        setErrors(prev => ({ ...prev, studentId: msg }));
      } else if (field === 'email' || /email/i.test(msg)) {
        setErrors(prev => ({ ...prev, email: msg }));
      }

      setGlobalError(msg);
      toast({ type: 'error', title: 'Registration Error', description: msg });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input changes
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpDigits];
    newOtp[index] = value.slice(-1);
    setOtpDigits(newOtp);
    setGlobalError('');

    // Auto-focus next input if a digit was entered
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtpDigits(digits);
      otpInputsRef.current[5]?.focus();
    }
  };

  // Step 3: Verify OTP & complete registration
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length < 6) {
      setGlobalError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (otpExpiry <= 0) {
      setGlobalError('OTP has expired. Please request a new one.');
      return;
    }

    setLoading(true);
    setGlobalError('');

    try {
      await verifyRegisterOtp(form.email, enteredOtp);
      setStep('verified');
      toast({
        type: 'success',
        title: '✓ Email verified',
        description: 'Your account is ready! Redirecting to setup...',
      });
      setTimeout(() => {
        navigate('/student/questionnaire');
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid OTP. Please check and try again.';
      setGlobalError(msg);
      toast({ type: 'error', title: 'Verification Failed', description: msg });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setGlobalError('');
    setGlobalSuccess('');
    try {
      const data = await resendRegisterOtp(form.email);
      setOtpExpiry(300); // Reset to 5 minutes
      setResendCooldown(60); // Reset cooldown
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setGlobalSuccess(data.message || 'OTP sent successfully.');
      toast({
        type: 'success',
        title: 'OTP Resent',
        description: `A new 6-digit verification code was sent to ${form.email}`,
      });
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not resend OTP. Please wait before requesting another.';
      setGlobalError(msg);
      toast({ type: 'error', title: 'Resend Failed', description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <Home className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">SRKR SMART HOSTEL</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {step === 'form' ? 'Create your account' : step === 'otp' ? 'Verify your email address' : 'Registration Complete'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 'form' ? (
              <>Already registered? <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link></>
            ) : step === 'otp' ? (
              <span>Step 2: Enter the 6-digit OTP sent to your email</span>
            ) : (
              <span className="text-emerald-600 font-medium">✓ Email verified successfully</span>
            )}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleSendOtp}
              className="card p-6 space-y-4"
              autoComplete="off"
            >
              {globalError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{globalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" field="firstName" placeholder="First" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
                <Field label="Last name" field="lastName" placeholder="Last" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
              </div>

              <Field label="Email address" field="email" type="email" placeholder="your@email.com" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Password" field="password" type="password" placeholder="Min 8 characters" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
                <Field label="Confirm password" field="confirmPassword" type="password" placeholder="Repeat password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Register Number / Student ID"
                  field="studentId"
                  placeholder="e.g. 24B95A0501"
                  autoComplete="off"
                  value={form.studentId}
                  onChange={set('studentId')}
                  onBlur={handleStudentIdBlur}
                  error={errors.studentId}
                />
                <Field
                  label="Phone (optional)"
                  field="phone"
                  type="tel"
                  placeholder="+91 XXXXX"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  error={errors.phone}
                />
              </div>

              <Field label="Department" field="department" placeholder="e.g. Computer Science" autoComplete="off" value={form.department} onChange={set('department')} error={errors.department} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Year</label>
                  <select className="input" value={form.year} onChange={set('year')}>
                    {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
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

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex items-center gap-2">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Send OTP & Register
                  </>
                )}
              </button>
            </motion.form>
          ) : step === 'otp' ? (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="card p-6 space-y-5"
            >
              {/* Email notice badge */}
              <div className="p-4 bg-brand-50/70 rounded-2xl border border-brand-100 flex items-start gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-800 uppercase tracking-wider">Email OTP Verification</p>
                  <p className="text-xs text-brand-900 mt-0.5 font-medium">
                    We sent a 6-digit OTP code to <span className="font-bold underline">{form.email}</span>.
                  </p>
                </div>
              </div>

              {globalSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{globalSuccess}</span>
                </div>
              )}

              {globalError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{globalError}</span>
                </div>
              )}

              {/* 6-Digit OTP Inputs */}
              <div>
                <label className="label text-center mb-3">Enter OTP</label>
                <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => otpInputsRef.current[idx] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all bg-white text-slate-900 shadow-xs"
                    />
                  ))}
                </div>
              </div>

              {/* OTP Expiry countdown badge */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  OTP expires in:{' '}
                  <strong className={otpExpiry < 60 ? 'text-red-600 font-mono font-bold' : 'text-slate-800 font-mono font-semibold'}>
                    {formatTime(otpExpiry)}
                  </strong>
                </span>
              </div>

              {/* Submit Verification Button */}
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading || otpDigits.join('').length < 6 || otpExpiry <= 0}
                className="btn-primary w-full justify-center flex items-center gap-2 py-3"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying OTP...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Verify OTP
                  </>
                )}
              </button>

              {/* Resend OTP and Edit Details */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setGlobalError('');
                    setGlobalSuccess('');
                  }}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Edit Details
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Didn't receive it?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend || loading}
                    className={`inline-flex items-center gap-1.5 font-semibold transition-colors ${
                      canResend ? 'text-brand-600 hover:text-brand-700 cursor-pointer' : 'text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {canResend ? 'Resend OTP' : `Resend in ${resendCooldown}s`}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="verified"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">✓ Email verified</h2>
              <p className="text-sm text-slate-500">
                Your account has been created and verified successfully. Redirecting you to complete your roommate questionnaire...
              </p>
              <div className="flex justify-center pt-2">
                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
