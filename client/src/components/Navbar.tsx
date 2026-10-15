import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Copy,
  Check,
  Download,
  Share2,
  Moon,
  Sun,
  LogOut,
  Sparkles,
  Lock,
  Globe
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { logoutUser } from '../store/authSlice';
import api from '../lib/api';

interface NavbarProps {
  roomName?: string;
  roomCode?: string;
  visibility?: 'public' | 'private';
  onExportPng?: () => void;
  onExportSvg?: () => void;
  onExportServerPng?: () => void;
  isBoard?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomName,
  roomCode,
  visibility = 'public',
  onExportPng,
  onExportSvg,
  onExportServerPng,
  isBoard = false
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isOffline = useAppSelector((state) => state.canvas.isOffline);
  const remotePresences = useAppSelector((state) => state.canvas.remotePresences);

  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const collaborators = Object.values(remotePresences);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    dispatch(logoutUser());
    navigate('/login');
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(!isDark);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 glass-panel border-b border-white/10 dark:border-white/10 px-4 flex items-center justify-between">
      {/* Left: Brand or Back + Room Name */}
      <div className="flex items-center gap-3">
        {isBoard ? (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              title="Back to Dashboard"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white max-w-[180px] md:max-w-xs truncate">
                {roomName || 'Untitled Board'}
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                {visibility === 'private' ? (
                  <Lock className="w-3 h-3 text-amber-400" />
                ) : (
                  <Globe className="w-3 h-3 text-emerald-400" />
                )}
                <span className="capitalize hidden sm:inline">{visibility}</span>
              </span>
            </div>
          </>
        ) : (
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              BoardCollab
            </span>
          </div>
        )}
      </div>

      {/* Center: Invite Code (if inside board) */}
      {isBoard && roomCode && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">
            CODE:
          </span>
          <span className="text-xs font-mono font-bold text-brand-300 tracking-wider">
            {roomCode}
          </span>
          <button
            onClick={handleCopyCode}
            title="Copy Room Code"
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Right: Actions, Collaborators, Status, Profile */}
      <div className="flex items-center gap-2">
        {isBoard && (
          <>
            {/* Connection Status Pill */}
            <div
              title={isOffline ? 'Offline - Reconnecting...' : 'Connected to Real-Time Hub'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOffline ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="hidden md:inline text-slate-300">
                {isOffline ? 'Offline' : 'Live Sync'}
              </span>
            </div>

            {/* Collaborator Avatars Stack */}
            <div className="hidden lg:flex items-center -space-x-2 overflow-hidden px-1">
              {collaborators.slice(0, 4).map((c) => (
                <div
                  key={c.socketId}
                  title={`${c.name}${c.isDrawing ? ' (Drawing)' : ''}`}
                  className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-md relative"
                  style={{ backgroundColor: c.avatarColor || '#6366f1' }}
                >
                  {c.name.charAt(0).toUpperCase()}
                  {c.isDrawing && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
                  )}
                </div>
              ))}
              {collaborators.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-300">
                  +{collaborators.length - 4}
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="Export Whiteboard"
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {showExportMenu && (
                <div
                  onMouseLeave={() => setShowExportMenu(false)}
                  className="absolute right-0 mt-2 w-56 rounded-2xl glass-dropdown border border-white/10 shadow-2xl p-1.5 z-50 flex flex-col gap-0.5"
                >
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportPng?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    <span>Instant PNG (Client)</span>
                    <span className="text-[10px] text-brand-400">Fast</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportSvg?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    <span>Vector SVG</span>
                    <span className="text-[10px] text-purple-400">Scalable</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportServerPng?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition-colors flex items-center justify-between"
                  >
                    <span>High-Res PNG (Server)</span>
                    <span className="text-[10px] text-emerald-400">node-canvas</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              title="Copy Board Link"
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 flex items-center gap-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>

        {/* User Profile / Logout */}
        {user ? (
          <div className="flex items-center gap-2 pl-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
              style={{ backgroundColor: user.avatarColor || '#6366f1' }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-md transition-all"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};

export default Navbar;
