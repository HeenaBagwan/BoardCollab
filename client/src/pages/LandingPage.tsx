import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Users2,
  ShieldCheck,
  Download,
  ArrowRight,
  Layers,
  MousePointer2,
  Lock,
  History
} from 'lucide-react';
import Navbar from '../components/Navbar';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Simulated live fake cursors demo drawing on a mini canvas
  const [fakeCursorPosA, setFakeCursorPosA] = useState({ x: 80, y: 70 });
  const [fakeCursorPosB, setFakeCursorPosB] = useState({ x: 220, y: 140 });

  useEffect(() => {
    const interval = setInterval(() => {
      setFakeCursorPosA({
        x: 100 + Math.sin(Date.now() / 600) * 80,
        y: 80 + Math.cos(Date.now() / 600) * 40
      });
      setFakeCursorPosB({
        x: 240 + Math.cos(Date.now() / 800) * 70,
        y: 130 + Math.sin(Date.now() / 800) * 50
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen aurora-bg text-slate-100 flex flex-col selection:bg-brand-500/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-brand-500/30 text-brand-300 text-xs font-semibold mb-8 shadow-lg shadow-brand-500/10"
        >
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span>Real-Time LWW-CRDT Whiteboard Engine</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[1.08] max-w-4xl"
        >
          Think Together, <br />
          <span className="bg-gradient-to-r from-brand-400 via-accent-400 to-pink-500 bg-clip-text text-transparent">
            Without Limits.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl font-normal leading-relaxed"
        >
          Experience next-generation collaborative spatial canvas. Real-time sub-100ms sync,
          per-user undo/redo, deterministic conflict resolution, and infinite creative freedom.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 font-semibold text-white shadow-xl shadow-brand-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] glow-border"
          >
            <span>Start Collaborating Free</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-panel hover:bg-white/10 font-semibold text-slate-200 border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign In to Existing Board
          </button>
        </motion.div>

        {/* Live Animated Fake Cursors Mini-Board Interactive Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 w-full max-w-4xl h-72 md:h-96 rounded-3xl glass-panel border border-white/15 shadow-2xl relative overflow-hidden canvas-grid p-6 flex flex-col justify-between"
        >
          {/* Top Demo Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-slate-400 font-mono ml-2">Live Sync Simulation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-semibold">2 Collaborators Active</span>
            </div>
          </div>

          {/* Interactive Shapes in demo */}
          <div className="relative w-full h-full">
            <div className="absolute left-16 top-12 w-44 h-28 rounded-2xl border-2 border-brand-400 bg-brand-500/15 backdrop-blur-sm p-3 flex flex-col justify-between shadow-xl">
              <span className="text-xs font-bold text-brand-300">Architecture Board</span>
              <span className="text-[11px] text-slate-400">Microservice Hub</span>
            </div>

            <div className="absolute right-24 bottom-10 w-36 h-36 rounded-full border-2 border-pink-400 bg-pink-500/15 backdrop-blur-sm flex items-center justify-center shadow-xl">
              <span className="text-xs font-bold text-pink-300">Design System</span>
            </div>

            {/* Fake Cursor A (Alice) */}
            <div
              className="absolute pointer-events-none transition-transform duration-75 flex items-start gap-1 z-20"
              style={{
                transform: `translate(${fakeCursorPosA.x}px, ${fakeCursorPosA.y}px)`
              }}
            >
              <MousePointer2 className="w-4 h-4 text-emerald-400 fill-emerald-400 -rotate-45" />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white shadow-md">
                Alice (Drawing)
              </span>
            </div>

            {/* Fake Cursor B (Bob) */}
            <div
              className="absolute pointer-events-none transition-transform duration-75 flex items-start gap-1 z-20"
              style={{
                transform: `translate(${fakeCursorPosB.x}px, ${fakeCursorPosB.y}px)`
              }}
            >
              <MousePointer2 className="w-4 h-4 text-accent-400 fill-accent-400 -rotate-45" />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-500 text-white shadow-md">
                Bob
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Bento Grid Feature Section */}
      <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
            Engineered for Modern Product Teams
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
            Every layer designed for precision, reliability, and extreme collaborative throughput.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento Card 1: Sub-100ms Sync */}
          <div className="md:col-span-2 p-8 rounded-3xl glass-panel border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-2xl text-white mb-2">
                Sub-100ms Real-Time LWW-CRDT
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                Powered by Lamport logical clocks with property-level Last-Writer-Wins resolution.
                No rubber-banding, no synchronization drift. Strong Eventual Consistency (SEC) guaranteed.
              </p>
            </div>
          </div>

          {/* Bento Card 2: Per-User Undo */}
          <div className="p-8 rounded-3xl glass-panel border border-white/10 flex flex-col justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white mb-2">
                Isolated Per-User Undo
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Undo your own strokes without stepping on teammates' active edits.
              </p>
            </div>
          </div>

          {/* Bento Card 3: 10,000 Element Scale */}
          <div className="p-8 rounded-3xl glass-panel border border-white/10 flex flex-col justify-between">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-6">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white mb-2">
                10k Element Viewport Culling
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Render only what is on-screen. Fluid 60fps pan and zoom even on enterprise boards.
              </p>
            </div>
          </div>

          {/* Bento Card 4: Multi-Format Exports */}
          <div className="md:col-span-2 p-8 rounded-3xl glass-panel border border-white/10 flex flex-col justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-2xl text-white mb-2">
                Client & Server Rendering Exports
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                Export boards instantly in the browser as crisp PNGs and SVGs, or trigger server-side
                high-resolution PNG generation via native node-canvas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 py-8 text-center text-xs text-slate-500">
        BoardCollab &copy; 2026 — Futuristic Real-Time Whiteboard Architecture.
      </footer>
    </div>
  );
};

export default LandingPage;
