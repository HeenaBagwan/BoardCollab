import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAppDispatch } from '../store';
import { setAuth } from '../store/authSlice';
import api from '../lib/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { user, accessToken } = response.data;
      dispatch(setAuth({ user, accessToken }));
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Invalid email or password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink paper-grid paper-grain flex selection:bg-accent selection:text-ink">
      {/* Left Column: Studio Paper Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 lg:p-16 z-10">
        {/* Top: Logo & Register Link */}
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
            to="/register"
            className="text-xs font-mono text-ink-muted hover:text-ink transition-colors"
          >
            Create account &rarr;
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
              Welcome back.
            </h1>
            <p className="text-sm text-ink-muted mt-2">
              Sign in to your collaborative whiteboards.
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
                <label className="block text-xs font-mono font-medium text-ink-muted mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-md bg-paper-card border border-border-paper text-ink placeholder:text-ink-subtle text-sm focus:outline-none focus:border-ink transition-all shadow-paper-sm"
                  />
                </div>
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border-paper text-center">
              <span className="text-xs text-ink-muted">
                Don't have an account yet?{' '}
                <Link to="/register" className="font-semibold text-ink hover:underline">
                  Create one now
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
              Pinned Board / Product Roadmap
            </span>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </div>

          <div className="space-y-3 font-mono text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">&#10003;</span>
              <span className="text-ink">JWT rotation with breach detection</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">&#10003;</span>
              <span className="text-ink">Zero data loss with localStorage replay</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">&#10003;</span>
              <span className="text-ink">10,000+ elements at 60 FPS viewport culling</span>
            </div>
          </div>

          {/* Active Peers Counter */}
          <div className="mt-6 pt-4 border-t border-border-paper flex items-center justify-between">
            <div className="flex items-center -space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-[#FFE98A] border border-ink flex items-center justify-center text-[10px] font-bold text-ink">
                A
              </div>
              <div className="w-6 h-6 rounded-full bg-[#BDF2D0] border border-ink flex items-center justify-center text-[10px] font-bold text-ink">
                B
              </div>
            </div>
            <span className="text-[11px] font-mono text-ink-subtle">
              Ready to collaborate
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
