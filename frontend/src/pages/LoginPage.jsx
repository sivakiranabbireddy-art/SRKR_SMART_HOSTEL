import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Home, Eye, EyeOff, AlertCircle, ShieldCheck, Mail, ArrowLeft, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [form, setForm] = useState({ email: '', password: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // OTP Expiry timer (5 minutes = 300 seconds)
  const [otpExpiry, setOtpExpiry] = useState(300);
  
  // Resend cooldown timer (60 seconds)
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const otpInputsRef = useRef([]);

  const { sendLoginOtp, verifyLoginOtp, resendLoginOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // 5-minute OTP expiration timer
  useEffect(() => {
    let timer;
    if (step === 'otp' && otpExpiry > 0) {
      timer = setInterval(() => {
        setOtpExpiry(prev => {
          if (prev <= 1) {
            setErrorMsg('Verification code has expired. Please request a new code.');
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

  // Format seconds into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Submit Credentials & Request OTP
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = await sendLoginOtp(form.email.trim(), form.password);
      setStep('otp');
      setOtpExpiry(300); // 5 minutes
      setResendCooldown(60); // 60 seconds
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(data.message || `A 6-digit verification code has been sent to ${form.email}`);
      toast({
        type: 'success',
        title: 'Verification Code Sent',
        description: data.message || `Code sent to ${form.email}`,
      });
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials or failed to send OTP.';
      setErrorMsg(msg);
      toast({ type: 'error', title: 'Sign In Failed', description: msg });
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
    setErrorMsg('');

    // Auto-focus next input if a digit was entered
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every(d => d !== '') && index === 5) {
      handleVerifyOtpDirect(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      otpInputsRef.current[5]?.focus();
      handleVerifyOtpDirect(pastedData);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtpDirect = async (otpCode) => {
    const code = otpCode || otpDigits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const user = await verifyLoginOtp(form.email.trim(), code);
      toast({ type: 'success', title: 'Welcome back!', description: `Signed in as ${user.email}` });

      const redirects = {
        STUDENT: '/student/dashboard',
        ADMIN: '/admin/dashboard',
        MANAGEMENT: '/management/dashboard'
      };
      navigate(redirects[user.role] || '/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or expired verification code.';
      setErrorMsg(msg);
      toast({ type: 'error', title: 'Verification Failed', description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    handleVerifyOtpDirect();
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const data = await resendLoginOtp(form.email.trim());
      setOtpExpiry(300);
      setResendCooldown(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(data.message || `A new 6-digit verification code has been sent.`);
      toast({ type: 'success', title: 'Code Resent', description: 'A new code has been sent to your email.' });
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to resend code.';
      setErrorMsg(msg);
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
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
              <Home className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-slate-900">SRKR SMART HOSTEL</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {step === 'credentials' ? 'Sign in to your account' : 'Enter Verification Code'}
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            {step === 'credentials' ? (
              <span className="bg-slate-100 py-1 px-2.5 rounded-full inline-block border border-slate-200">
                Step 1: Enter email & password
              </span>
            ) : (
              <span className="text-brand-600 font-medium">
                Step 2: 2-Factor Email OTP verification
              </span>
            )}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'credentials' ? (
            <motion.form
              key="credentials"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleCredentialsSubmit}
              className="card p-6 space-y-4"
              autoComplete="on"
            >
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="input"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    className="input pr-10"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex items-center gap-2">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Verify & Send Login Code
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="card p-6 space-y-5"
            >
              {/* Back to credentials button */}
              <button
                type="button"
                onClick={() => { setStep('credentials'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Re-enter password or email
              </button>

              {/* Notice Banner */}
              <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-brand-900">Security Verification Code Sent</p>
                  <p className="text-brand-700 mt-0.5 break-all">
                    Code sent to <span className="font-bold">{form.email}</span>
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 6 Digit Inputs */}
              <form onSubmit={handleVerifySubmit} className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="label mb-0">6-Digit Verification Code</label>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Expires in: <strong className={otpExpiry < 60 ? 'text-red-500 font-bold' : 'text-slate-700'}>{formatTime(otpExpiry)}</strong>
                    </span>
                  </div>

                  <div className="flex justify-between gap-2" onPaste={handlePaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleKeyDown(idx, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50 focus:bg-white transition-all outline-none"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.some(d => d === '')}
                  className="btn-primary w-full justify-center flex items-center gap-2 py-2.5"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Verify Code & Sign In
                    </>
                  )}
                </button>
              </form>

              {/* Resend OTP Bar */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Didn't receive the code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                  className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                    canResend
                      ? 'text-brand-600 hover:text-brand-700 underline cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  {canResend ? 'Resend Code' : `Resend in ${resendCooldown}s`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
