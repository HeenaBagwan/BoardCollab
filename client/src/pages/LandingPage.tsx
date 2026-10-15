import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Pencil } from 'lucide-react';
import Navbar from '../components/Navbar';
import HeroCanvas from '../components/landing/HeroCanvas';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper text-ink paper-grid paper-grain flex flex-col selection:bg-accent selection:text-ink relative overflow-hidden">
      <Navbar />

      {/* Main Hero Container */}
      <main className="relative pt-24 pb-20 md:pt-32 md:pb-28 px-4 md:px-8 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center items-center">
        {/* Interactive Drawing Canvas & Simulated Collaborators Background */}
        <HeroCanvas />

        {/* Foreground Content (pointer-events-none on wrapper so canvas underneath can receive drawing events) */}
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center pointer-events-none mt-6 md:mt-10">
          
          {/* Live Counter (Human, Specific) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper-card border border-border-paper shadow-paper-sm text-xs font-mono text-ink-muted mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-accent border border-ink/40 animate-pulse" />
            <span className="text-ink font-semibold">28 people</span> drawing right now
            <span className="text-ink-subtle hidden sm:inline">• sub-100ms CRDT sync</span>
          </motion.div>

          {/* Huge Editorial Headline with Hand-Circled Word */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-[6.5rem] tracking-tight leading-[0.96] text-ink max-w-4xl"
          >
            A whiteboard for teams who{' '}
            <span className="relative inline-block px-2 text-ink">
              actually
              {/* Hand-drawn organic SVG scribble circling 'actually' */}
              <svg
                className="absolute -inset-x-3 -inset-y-2.5 w-[calc(100%+24px)] h-[calc(100%+20px)] pointer-events-none overflow-visible z-[-1]"
                viewBox="0 0 170 65"
                fill="none"
              >
                <path
                  d="M 16 34 C 12 14, 85 4, 142 12 C 165 16, 168 44, 134 54 C 88 65, 18 58, 10 38 C 5 24, 32 14, 76 12"
                  stroke="var(--color-accent)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-scribble"
                />
              </svg>
            </span>{' '}
            finish ideas.
          </motion.h1>

          {/* Subtitle: Short, human, specific, slightly witty */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-6 text-base sm:text-lg md:text-xl text-ink-muted max-w-2xl font-normal leading-relaxed"
          >
            Sub-100ms sync without the enterprise bloat. Infinite virtual canvas, property-level LWW-CRDT conflict resolution, per-user undo, and zero meetings to figure out what your teammate is pointing at.
          </motion.p>

          {/* CTA Group with tactile buttons (pointer-events-auto so they can be clicked) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-9 flex flex-col sm:flex-row items-center gap-3.5 pointer-events-auto relative"
          >
            <button
              onClick={() => navigate('/register')}
              className="btn-paper-accent px-6 py-3.5 text-base flex items-center gap-2 group cursor-pointer"
            >
              <span>Open a blank board</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => navigate('/login')}
              className="btn-paper-outline px-5 py-3.5 text-base cursor-pointer"
            >
              Sign in with room code
            </button>

            {/* Hand-drawn SVG doodle arrow + annotation note */}
            <div className="hidden lg:flex items-center gap-1.5 absolute -right-48 top-2 text-ink-muted pointer-events-none">
              <svg width="42" height="26" viewBox="0 0 42 26" fill="none" className="rotate-12">
                <path
                  d="M 2 20 Q 22 2, 38 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 32 6 L 38 12 L 30 15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span className="font-mono text-xs tracking-tight text-ink-subtle">
                no card • instant link
              </span>
            </div>
          </motion.div>

          {/* Interactive Cue Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-12 flex items-center gap-2 text-xs font-mono text-ink-subtle pointer-events-auto"
          >
            <Pencil className="w-3.5 h-3.5 text-ink-muted" />
            <span>The background is a live paper canvas. Sketch on it with your mouse or finger.</span>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
