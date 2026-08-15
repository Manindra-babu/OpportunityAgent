import React, { useState } from 'react';
import { Mail, User, Lock, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { signup, requestOTP, verifyOTPAndSignup } from '../api/client';

export default function AuthModal({ onLogin, onSignup, onSuccessAuth }) {
  const [isSignup, setIsSignup] = useState(false);
  const [useOTP, setUseOTP] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // UI Toggles & States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const sanitizeEmail = (raw) => {
    return (raw || '').replace(/[\u200b-\u200d\ufeff\xa0]/g, '').trim().toLowerCase();
  };

  const resetFormState = () => {
    setError('');
    setSuccessInfo('');
    setPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setOtpSent(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await onLogin({ email: cleanEmail, password });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await signup({
        email: cleanEmail,
        password,
        full_name: fullName.trim() || 'Candidate'
      });

      if (onSuccessAuth) {
        await onSuccessAuth(res.user);
      } else if (onSignup) {
        await onSignup(res.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Account creation failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestOTP(cleanEmail);
      setOtpSent(true);
      setSuccessInfo(res.message || `6-digit verification code sent to ${cleanEmail}!`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    const cleanEmail = sanitizeEmail(email);
    const cleanOTP = otpCode.replace(/\D/g, '');

    if (!cleanOTP || cleanOTP.length !== 6) {
      setError('Please enter a valid 6-digit OTP verification code.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOTPAndSignup({
        email: cleanEmail,
        otp_code: cleanOTP,
        password,
        full_name: fullName.trim() || 'Candidate'
      });

      if (onSuccessAuth) {
        await onSuccessAuth(res.user);
      } else if (onSignup) {
        await onSignup(res.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl border border-zinc-200 p-8 max-w-md w-full shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-md">
            O
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {isSignup ? (useOTP ? 'Email OTP Registration' : 'Create Account') : 'Welcome Back'}
          </h1>
          <p className="text-xs text-zinc-500">
            {isSignup 
              ? 'Enter your candidate details to get started' 
              : 'BYOK Multi-Agent Opportunity Discovery Platform'}
          </p>
        </div>

        {/* Signup Mode Selector (Direct vs OTP) */}
        {isSignup && (
          <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setUseOTP(false);
                resetFormState();
              }}
              className={`flex-1 py-1.5 rounded-lg transition ${!useOTP ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              Quick Signup
            </button>
            <button
              type="button"
              onClick={() => {
                setUseOTP(true);
                resetFormState();
              }}
              className={`flex-1 py-1.5 rounded-lg transition ${useOTP ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              Email OTP Verification
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Info Alert */}
        {successInfo && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successInfo}</span>
            </div>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {!isSignup ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700">Email Address</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">Password</label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : !useOTP ? (
          /* 2. DIRECT SIGNUP FORM */
          <form onSubmit={handleDirectSignup} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700">Full Name / Candidate Name</label>
              <div className="relative mt-1">
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Alex Tech"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">Email Address</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">Password</label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="•••••••• (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">Confirm Password</label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* 3. EMAIL OTP SIGNUP FORM */
          <form onSubmit={otpSent ? handleVerifyOTP : handleRequestOTP} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700">Full Name / Candidate Name</label>
              <div className="relative mt-1">
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Alex Tech"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={otpSent}
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700">Email Address</label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={otpSent}
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-zinc-50"
                />
              </div>
            </div>

            {otpSent && (
              <>
                <div>
                  <label className="text-xs font-semibold text-zinc-700">6-Digit OTP Code</label>
                  <div className="relative mt-1">
                    <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-center tracking-widest font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700">Set Password</label>
                  <div className="relative mt-1">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="•••••••• (min 6 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700">Confirm Password</label>
                  <div className="relative mt-1">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : otpSent ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Verify OTP & Create Account
                </>
              ) : (
                <>
                  Send OTP Code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {otpSent && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={loading}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition"
                >
                  Didn't receive code? Resend OTP
                </button>
              </div>
            )}
          </form>
        )}

        {/* Toggle Signup/Login */}
        <div className="text-center pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              resetFormState();
            }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition cursor-pointer"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
          </button>
        </div>

      </div>
    </div>
  );
}
