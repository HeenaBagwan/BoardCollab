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

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { rooms, isLoading, error } = useAppSelector((state) => state.room);
  const currentUser = useAppSelector((state) => state.auth.user);

  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // New Room Form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomVisibility, setNewRoomVisibility] = useState<'public' | 'private'>('public');

  // Join Room Form state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="min-h-screen bg-paper text-ink paper-grid paper-grain flex flex-col selection:bg-accent selection:text-ink">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        {/* Welcome Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif font-bold text-4xl sm:text-5xl text-ink tracking-tight">
              Workspaces & Boards
            </h1>
            <p className="text-sm font-sans text-ink-muted mt-2">
              Welcome back, <span className="text-ink font-semibold">{currentUser?.name}</span>. Jump back into an active session.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="btn-paper-outline px-4 py-2 text-xs font-mono flex items-center gap-2 cursor-pointer"
            >
              <Hash className="w-3.5 h-3.5 text-ink-muted" />
              <span>Join with Code</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-paper-accent px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Board</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
          <input
            type="text"
            placeholder="Search boards by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md bg-paper-card border border-border-paper text-ink placeholder:text-ink-subtle text-xs focus:outline-none focus:border-ink transition-all shadow-paper-sm font-mono"
          />
        </div>

        {/* Loading Skeleton */}
        {isLoading && rooms.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-md bg-paper-card border border-border-paper p-6 animate-pulse flex flex-col justify-between shadow-paper"
              >
                <div className="space-y-3">
                  <div className="h-4 w-20 bg-paper-muted rounded" />
                  <div className="h-6 w-3/4 bg-paper-muted rounded" />
                </div>
                <div className="h-24 bg-paper-muted rounded" />
                <div className="h-4 w-1/2 bg-paper-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredRooms.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center rounded-md bg-paper-card border border-border-paper p-8 shadow-paper">
            <div className="w-16 h-16 rounded-md bg-accent border border-ink text-ink flex items-center justify-center mb-4 shadow-[2px_2.5px_0px_#111110]">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-bold text-2xl text-ink">No whiteboards found</h3>
            <p className="text-ink-muted text-xs max-w-sm mt-1.5 mb-6 font-sans">
              Create your first infinite collaborative whiteboard or join an existing session using an invite code.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-paper-accent px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Board</span>
            </button>
          </div>
        )}

        {/* Room Cards Grid - Studio Paper Pinned Boards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <motion.div
              key={room.id}
              whileHover={{ y: -3 }}
              onMouseEnter={handlePrefetchBoard}
              onClick={() => navigate(`/board/${room.id}`)}
              className="bg-paper-card border border-border-paper p-5 rounded-md flex flex-col justify-between cursor-pointer hover:border-ink transition-all shadow-paper hover:shadow-[3.5px_4.5px_0px_#111110] group relative overflow-visible"
            >
              {/* Paper Tape Piece */}
              <div className="absolute -top-2.5 left-6 w-16 h-4 bg-[#FFE98A]/85 border border-black/10 rotate-[-1.5deg] shadow-xs pointer-events-none" />

              {/* Top Card Info */}
              <div>
                <div className="flex items-center justify-between mb-2.5 pt-1">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-medium bg-paper border border-border-paper text-ink-muted">
                    {room.visibility === 'private' ? (
                      <Lock className="w-3 h-3 text-amber-500" />
                    ) : (
                      <Globe className="w-3 h-3 text-emerald-600" />
                    )}
                    <span className="capitalize">{room.visibility}</span>
                  </span>

                  <span className="text-[11px] font-mono text-ink-subtle tracking-wider">
                    {room.roomCode}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-xl text-ink group-hover:text-ink transition-colors line-clamp-1">
                  {room.name}
                </h3>
              </div>

              {/* Simulated Live SVG Thumbnail Preview */}
              <div className="my-4 h-24 rounded-sm bg-paper border border-border-paper flex items-center justify-center p-3 overflow-hidden relative paper-grid">
                <svg className="w-full h-full opacity-80" viewBox="0 0 100 60">
                  <rect x="15" y="12" width="28" height="20" rx="2" fill="#FFE98A" stroke="#111110" strokeWidth="1.2" />
                  <circle cx="68" cy="28" r="14" fill="#BFE3FF" stroke="#111110" strokeWidth="1.2" />
                  <path d="M 22 44 Q 50 32 78 48" fill="none" stroke="#D4FF3A" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* Bottom Card Meta */}
              <div className="flex items-center justify-between border-t border-border-paper pt-3 text-xs font-mono text-ink-muted">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-ink-subtle" />
                    <span>{room.memberCount || 1}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-ink-subtle" />
                    <span>{room.elementCount || 0}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1 font-semibold text-ink group-hover:translate-x-1 transition-transform">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-md bg-paper-card border border-ink p-6 shadow-[4px_5px_0px_#111110] relative text-ink"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif font-bold text-2xl text-ink">
                  Create Collaborative Board
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded text-ink-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-ink-muted mb-1.5">
                    BOARD NAME
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Sprint Architecture Q4"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-paper border border-border-paper text-ink placeholder:text-ink-subtle text-sm focus:outline-none focus:border-ink transition-all shadow-paper-sm font-sans"
                  />
                </div>

                {/* Animated Visibility Toggle */}
                <div>
                  <label className="block text-xs font-mono font-medium text-ink-muted mb-1.5">
                    VISIBILITY
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-md bg-paper border border-border-paper">
                    <button
                      type="button"
                      onClick={() => setNewRoomVisibility('public')}
                      className={`py-2 px-3 rounded text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        newRoomVisibility === 'public'
                          ? 'bg-accent text-ink border border-ink shadow-[1.5px_2px_0px_#111110]'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRoomVisibility('private')}
                      className={`py-2 px-3 rounded text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        newRoomVisibility === 'private'
                          ? 'bg-accent text-ink border border-ink shadow-[1.5px_2px_0px_#111110]'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn-paper-outline flex-1 py-2.5 text-xs font-mono cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-paper-accent flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-ink" />
                    ) : (
                      <span>Launch Board</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Room by Code Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-md bg-paper-card border border-ink p-6 shadow-[4px_5px_0px_#111110] relative text-ink"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif font-bold text-2xl text-ink">
                  Join with Code
                </h3>
                <button
                  onClick={() => setIsJoinModalOpen(false)}
                  className="p-1 rounded text-ink-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {joinError && (
                <div className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-mono">
                  {joinError}
                </div>
              )}

              <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-ink-muted mb-1.5">
                    8-CHARACTER INVITE CODE
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8K4P9W2X"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={12}
                    className="w-full px-4 py-2.5 rounded-md bg-paper border border-border-paper text-ink placeholder:text-ink-subtle text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-ink transition-all text-center shadow-paper-sm"
                  />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(false)}
                    className="btn-paper-outline flex-1 py-2.5 text-xs font-mono cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-paper-accent flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-ink" />
                    ) : (
                      <span>Join Board</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
