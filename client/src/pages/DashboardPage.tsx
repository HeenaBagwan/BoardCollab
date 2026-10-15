import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Hash,
  Lock,
  Globe,
  Users,
  Layers,
  Search,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchRooms, createRoom, joinRoomByCode } from '../store/roomSlice';
import { Room } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { rooms, isLoading, error } = useAppSelector((state) => state.room);
  const currentUser = useAppSelector((state) => state.auth.user);

  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Create room modal fields
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomVisibility, setNewRoomVisibility] = useState<'public' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Join room modal field
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  // Section 8 requirement: Prefetch the Board page chunk on dashboard card hover
  const handlePrefetchBoard = () => {
    import('./BoardPage');
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await dispatch(
        createRoom({ name: newRoomName.trim(), visibility: newRoomVisibility })
      ).unwrap();
      setIsCreateModalOpen(false);
      setNewRoomName('');
      navigate(`/board/${result.id}`);
    } catch {}
    setIsSubmitting(false);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinError(null);
    setIsSubmitting(true);
    try {
      const res = await dispatch(joinRoomByCode(joinCode.trim())).unwrap();
      setIsJoinModalOpen(false);
      setJoinCode('');
      navigate(`/board/${res.roomId}`);
    } catch (err: any) {
      setJoinError(err || 'Failed to join room');
    }
    setIsSubmitting(false);
  };

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.roomCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-900 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        {/* Welcome Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
              Workspaces & Boards
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Welcome back, <span className="text-white font-semibold">{currentUser?.name}</span>. Jump back into an active session.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-4 py-2.5 rounded-xl glass-panel hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Hash className="w-4 h-4 text-brand-400" />
              <span>Join with Code</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Board</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search boards by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        {/* Loading Skeleton */}
        {isLoading && rooms.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-3xl glass-panel animate-pulse p-6 border border-white/5" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredRooms.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center rounded-xl bg-paper-card border border-border-paper p-8 shadow-paper">
            <div className="w-16 h-16 rounded-xl bg-accent/20 border border-ink text-ink flex items-center justify-center mb-4 shadow-[2px_2.5px_0px_#111110]">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-bold text-2xl text-ink">No whiteboards found</h3>
            <p className="text-ink-muted text-xs max-w-sm mt-1 mb-6">
              Create your first infinite collaborative whiteboard or join an existing session using an invite code.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Board</span>
            </button>
          </div>
        )}

        {/* Room Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <motion.div
              key={room.id}
              whileHover={{ y: -4 }}
              onMouseEnter={handlePrefetchBoard}
              onClick={() => navigate(`/board/${room.id}`)}
              className="rounded-3xl glass-panel border border-white/10 p-6 flex flex-col justify-between cursor-pointer hover:border-brand-500/40 transition-all shadow-xl group relative overflow-hidden"
            >
              {/* Top Card Info */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 border border-white/10 text-slate-300">
                    {room.visibility === 'private' ? (
                      <Lock className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Globe className="w-3 h-3 text-emerald-400" />
                    )}
                    <span className="capitalize">{room.visibility}</span>
                  </span>

                  <span className="text-[11px] font-mono text-slate-400">
                    {room.roomCode}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                  {room.name}
                </h3>
              </div>

              {/* Simulated Live SVG Thumbnail Preview */}
              <div className="my-4 h-24 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-center p-3 overflow-hidden relative canvas-grid">
                <svg className="w-full h-full opacity-60" viewBox="0 0 100 60">
                  <rect x="10" y="10" width="30" height="20" rx="4" fill="#6366f1" fillOpacity="0.3" stroke="#6366f1" strokeWidth="1.5" />
                  <circle cx="70" cy="30" r="15" fill="#a855f7" fillOpacity="0.3" stroke="#a855f7" strokeWidth="1.5" />
                  <path d="M 20 45 Q 50 35 80 50" fill="none" stroke="#ec4899" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Bottom Card Meta */}
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{room.memberCount || 1}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{room.elementCount || 0}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-semibold text-brand-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Create Room Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl glass-panel border border-white/10 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-xl text-white">
                  Create Collaborative Board
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Board Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Sprint Planning Q4"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-all"
                  />
                </div>

                {/* Animated Visibility Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setNewRoomVisibility('public')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        newRoomVisibility === 'public'
                          ? 'bg-brand-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRoomVisibility('private')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        newRoomVisibility === 'private'
                          ? 'bg-brand-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Create & Launch Board</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Room by Code Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl glass-panel border border-white/10 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-xl text-white">
                  Join via Invite Code
                </h3>
                <button
                  onClick={() => setIsJoinModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {joinError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {joinError}
                </div>
              )}

              <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    8-Character Invite Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8K4P9W2X"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={12}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-brand-500 transition-all text-center"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Join Workspace</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
