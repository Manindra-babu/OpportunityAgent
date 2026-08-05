import React, { useState } from 'react';
import { Mail, User, Lock, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signup } from '../api/client';

export default function AuthModal({ onLogin, onSignup, onSuccessAuth }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const handleDirectSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');
    setLoading(true);

    try {
      const res = await signup({
        email,
        password,
        full_name: fullName || 'Candidate'
      });

      if (onSuccessAuth) {
        await onSuccessAuth(res.user);
      } else if (onSignup) {
        await onSignup(res.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Account creation failed. Check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin({ email, password });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
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
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-xs text-zinc-500">
            {isSignup ? 'Enter your details below to register' : 'BYOK Multi-Agent Opportunity Discovery Platform'}
          </p>
        </div>

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

        {/* LOGIN FORM */}
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
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2"
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
        ) : (
          /* SIGNUP FORM (Name, Email, Password) */
          <form onSubmit={handleDirectSignup} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700">Username / Full Name</label>
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
                  type="password"
                  required
                  placeholder="•••••••• (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2"
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
        )}

        {/* Toggle Signup/Login */}
        <div className="text-center pt-2 border-t border-zinc-100">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
              setSuccessInfo('');
            }}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
          </button>
        </div>

      </div>
    </div>
  );
}
