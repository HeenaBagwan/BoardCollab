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
  const [isDark, setIsDark] = useState(false);

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
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    if (isCurrentlyDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-paper/90 backdrop-blur-md border-b border-border-paper px-4 md:px-8 flex items-center justify-between transition-colors">
      {/* Left: Brand or Back + Room Name */}
      <div className="flex items-center gap-3">
        {isBoard ? (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              title="Back to Dashboard"
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-paper-muted transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-ink max-w-[180px] md:max-w-xs truncate">
                {roomName || 'Untitled Board'}
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-paper-card border border-border-paper text-ink-muted">
                {visibility === 'private' ? (
                  <Lock className="w-3 h-3 text-amber-500" />
                ) : (
                  <Globe className="w-3 h-3 text-emerald-500" />
                )}
                <span className="capitalize hidden sm:inline">{visibility}</span>
              </span>
            </div>
          </>
        ) : (
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-sm bg-accent border-1.5 border-ink flex items-center justify-center font-serif text-ink font-bold text-lg shadow-[1.5px_1.5px_0px_#111110] group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] transition-transform">
              B
            </div>
            <span className="font-serif font-bold text-2xl tracking-tight text-ink">
              BoardCollab
            </span>
          </div>
        )}
      </div>

      {/* Center: Invite Code (if inside board) */}
      {isBoard && roomCode && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-paper-card border border-border-paper">
          <span className="text-[11px] text-ink-muted uppercase font-mono tracking-wider">
            CODE:
          </span>
          <span className="text-xs font-mono font-bold text-ink tracking-wider">
            {roomCode}
          </span>
          <button
            onClick={handleCopyCode}
            title="Copy Room Code"
            className="p-1 text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Right: Actions, Collaborators, Status, Profile */}
      <div className="flex items-center gap-3">
        {isBoard ? (
          <>
            {/* Connection Status Pill */}
            <div
              title={isOffline ? 'Offline - Reconnecting...' : 'Connected to Real-Time Hub'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-paper-card border border-border-paper"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOffline ? 'bg-amber-500 animate-ping' : 'bg-accent animate-pulse border border-ink/40'
                }`}
              />
              <span className="hidden md:inline text-ink-muted">
                {isOffline ? 'Offline' : 'Live Sync'}
              </span>
            </div>

            {/* Collaborator Avatars Stack */}
            <div className="hidden lg:flex items-center -space-x-1.5 overflow-hidden px-1">
              {collaborators.slice(0, 4).map((c) => (
                <div
                  key={c.socketId}
                  title={`${c.name}${c.isDrawing ? ' (Drawing)' : ''}`}
                  className="w-7 h-7 rounded-full border border-ink flex items-center justify-center text-[10px] font-bold text-ink shadow-sm relative"
                  style={{ backgroundColor: c.avatarColor || '#FFE98A' }}
                >
                  {c.name.charAt(0).toUpperCase()}
                  {c.isDrawing && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border border-ink" />
                  )}
                </div>
              ))}
              {collaborators.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-paper-card border border-ink flex items-center justify-center text-[10px] font-mono font-bold text-ink-muted">
                  +{collaborators.length - 4}
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="Export Whiteboard"
                className="btn-paper-outline px-2.5 py-1.5 text-xs font-mono"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {showExportMenu && (
                <div
                  onMouseLeave={() => setShowExportMenu(false)}
                  className="absolute right-0 mt-2 w-52 rounded-md bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] p-1.5 z-50 flex flex-col gap-0.5 font-mono text-xs"
                >
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportPng?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded text-ink hover:bg-paper-muted transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Instant PNG</span>
                    <span className="text-[10px] text-ink-subtle">Client</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportSvg?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded text-ink hover:bg-paper-muted transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Vector SVG</span>
                    <span className="text-[10px] text-ink-subtle">Scalable</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportServerPng?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded text-ink hover:bg-paper-muted transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>High-Res PNG</span>
                    <span className="text-[10px] text-accent-ink font-semibold">Server</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              title="Copy Board Link"
              className="btn-paper-accent px-3 py-1.5 text-xs font-mono"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </>
        ) : !user ? (
          <nav className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn-paper-primary px-3.5 py-1.5 text-xs font-medium cursor-pointer"
            >
              Try Canvas
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-sm text-xs font-mono text-ink-muted bg-paper-card border border-border-paper">
              Workspace
            </span>
          </nav>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Warm Light / Studio Charcoal"
          className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-paper-muted border border-transparent hover:border-border-paper transition-all cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4 text-ink-muted" />}
        </button>

        {/* User Profile / Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-ink border border-ink shadow-sm"
              style={{ backgroundColor: user.avatarColor || '#FFE98A' }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-md text-ink-muted hover:text-rose-600 hover:bg-paper-muted transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
