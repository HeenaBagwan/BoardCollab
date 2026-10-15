import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Loader2, AlertCircle, Check } from 'lucide-react';
import { useAppDispatch } from '../store';
import { setAuth } from '../store/authSlice';
import api from '../lib/api';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Password Strength Calculation (0 to 3)
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Too short', 'Basic', 'Good', 'Bulletproof'];
  const strengthColors = ['#E53E3E', '#ED8936', '#319795', '#D4FF3A'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password
      });

      const { user, accessToken } = response.data;
      dispatch(setAuth({ user, accessToken }));
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Failed to create account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink paper-grid paper-grain flex selection:bg-accent selection:text-ink">
      {/* Left Column: Studio Paper Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 z-10">
        {/* Top: Logo & Back Link */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-sm bg-accent border-1.5 border-ink flex items-center justify-center font-serif text-ink font-bold text-lg shadow-[2px_2px_0px_#111110] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-transform">
              B
            </div>
            <span className="font-serif font-bold text-2xl tracking-tight text-ink">
              BoardCollab
            </span>
          </div>

          <Link
            to="/login"
            className="text-xs font-mono text-ink-muted hover:text-ink transition-colors"
          >
            Sign in instead &rarr;
          </Link>
        </div>

        {/* Center: Main Form */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="font-serif text-3xl sm:text-4xl text-ink font-bold tracking-tight">
              Create your account.
            </h1>
            <p className="text-sm text-ink-muted mt-2">
              Start sketching with your team. Zero paywalls, sub-100ms sync.
            </p>

            {/* Error Notice with Shake */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
                transition={{ duration: 0.4 }}
                className="mt-6 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-mono font-medium text-ink-muted mb-1.5">
                  FULL NAME
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <input
                    type="text"
                    required
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-md bg-paper-card border border-border-paper text-ink placeholder:text-ink-subtle text-sm focus:outline-none focus:border-ink transition-all shadow-paper-sm"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-mono font-medium text-ink-muted mb-1.5">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <input
                    type="email"
                    required
                    placeholder="ada@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-md bg-paper-card border border-border-paper text-ink placeholder:text-ink-subtle text-sm focus:outline-none focus:border-ink transition-all shadow-paper-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono font-medium text-ink-muted">
                    PASSWORD
                  </label>
                  {password && (
                    <span
                      className="text-[11px] font-mono font-medium"
                      style={{ color: strengthColors[strength] }}
                    >
                      {strengthLabels[strength]}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-md bg-paper-card border border-border-paper text-ink placeholder:text-ink-subtle text-sm focus:outline-none focus:border-ink transition-all shadow-paper-sm"
                  />
                </div>

                {/* Hand-drawn Password Strength Underline */}
                {password && (
                  <div className="mt-2 h-1.5 w-full bg-paper-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(15, (strength / 3) * 100))}%`,
                        backgroundColor: strengthColors[strength]
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 btn-paper-accent w-full py-3 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-ink" />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border-paper text-center">
              <span className="text-xs text-ink-muted">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-ink hover:underline">
                  Sign In
                </Link>
              </span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Note */}
        <div className="text-xs font-mono text-ink-subtle">
          BoardCollab &copy; 2026 • Studio Paper Edition
        </div>
      </div>

      {/* Right Column: Live Looping Paper Board Animation (Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-paper-card border-l border-border-paper relative overflow-hidden flex-col items-center justify-center p-12">
        <div className="absolute inset-0 paper-grid opacity-70 pointer-events-none" />

        {/* Floating Paper Preview Card */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 max-w-md w-full bg-paper border border-ink p-6 rounded-md shadow-[4px_5px_0px_#111110]"
        >
          {/* Top Tape Strip */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-[#FFE98A]/80 border border-black/10 rotate-[-1.5deg] shadow-xs" />

          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-paper">
            <span className="font-mono text-xs font-semibold text-ink-muted uppercase">
              Sprint Kickoff / Architecture
            </span>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </div>

          <div className="space-y-3 font-mono text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">&#10003;</span>
              <span className="text-ink">LWW-CRDT Conflict-Free Engine</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">&#10003;</span>
              <span className="text-ink">Per-user isolated undo/redo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">&#10003;</span>
              <span className="text-ink">Sub-100ms multi-region sync</span>
            </div>
          </div>

          {/* Simulated Collaborator Cursors inside card */}
          <div className="mt-6 pt-4 border-t border-border-paper flex items-center justify-between">
            <div className="flex items-center -space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-[#FFE98A] border border-ink flex items-center justify-center text-[10px] font-bold text-ink">
                M
              </div>
              <div className="w-6 h-6 rounded-full bg-[#FFC7A8] border border-ink flex items-center justify-center text-[10px] font-bold text-ink">
                L
              </div>
              <div className="w-6 h-6 rounded-full bg-[#BFE3FF] border border-ink flex items-center justify-center text-[10px] font-bold text-ink">
                E
              </div>
            </div>
            <span className="text-[11px] font-mono text-ink-subtle">
              3 active peers
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
