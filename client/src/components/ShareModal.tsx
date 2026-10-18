import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Eye, Clock, Link2 } from 'lucide-react';
import api from '../lib/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName?: string;
  roomCode?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  roomCode
}) => {
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [expiresInHours, setExpiresInHours] = useState<number | null>(24);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerateInvite = async () => {
    setIsLoading(true);
    try {
      const res = await api.post(`/rooms/${roomId}/invites`, {
        role,
        expiresInHours
      });
      const link = `${window.location.origin}/board/${roomId}?invite=${res.data.inviteCode}&role=${role}`;
      setGeneratedLink(link);
    } catch {
      // Fallback: direct invite URL with role parameter
      const link = `${window.location.origin}/board/${roomId}?role=${role}`;
      setGeneratedLink(link);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs font-mono">
      <div className="w-full max-w-md p-5 rounded-xl bg-paper-card border border-ink shadow-[5px_6px_0px_#111110] flex flex-col gap-4 animate-fade-in text-ink">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-paper pb-2.5">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-ink" />
            <span className="font-bold text-sm">Share Board</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-muted cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Room Code Quick Share */}
        {roomCode && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-paper-muted border border-border-paper text-xs">
            <div>
              <span className="text-[10px] text-ink-muted block uppercase">Room Code</span>
              <strong className="text-sm font-bold tracking-widest">{roomCode}</strong>
            </div>
            <button
              onClick={() => handleCopy(roomCode)}
              className="btn-paper-outline px-2.5 py-1 text-xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {/* Role Selector */}
        <div className="flex flex-col gap-1.5 text-xs">
          <span className="font-bold text-ink-muted uppercase text-[10px] tracking-wider">Access Role</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRole('editor')}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                role === 'editor'
                  ? 'bg-accent text-ink border-ink shadow-[2px_2px_0px_#111110]'
                  : 'bg-paper text-ink-muted border-border-paper hover:text-ink hover:border-ink'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Editor</span>
              </div>
              <span className="text-[10px] opacity-80">Can draw, edit, move and collaborate</span>
            </button>

            <button
              onClick={() => setRole('viewer')}
              className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                role === 'viewer'
                  ? 'bg-accent text-ink border-ink shadow-[2px_2px_0px_#111110]'
                  : 'bg-paper text-ink-muted border-border-paper hover:text-ink hover:border-ink'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Eye className="w-3.5 h-3.5" />
                <span>Viewer</span>
              </div>
              <span className="text-[10px] opacity-80">Read-only view with reactions & chat</span>
            </button>
          </div>
        </div>

        {/* Expiration Selector */}
        <div className="flex flex-col gap-1.5 text-xs">
          <span className="font-bold text-ink-muted uppercase text-[10px] tracking-wider">Link Expiry</span>
          <div className="flex items-center gap-2">
            {[
              { label: '24 Hours', val: 24 },
              { label: '7 Days', val: 168 },
              { label: 'Never', val: null }
            ].map((exp) => (
              <button
                key={String(exp.val)}
                onClick={() => setExpiresInHours(exp.val)}
                className={`flex-1 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
                  expiresInHours === exp.val
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper-muted text-ink-muted border-border-paper hover:text-ink hover:border-ink'
                }`}
              >
                {exp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate / Copy Button */}
        {!generatedLink ? (
          <button
            onClick={handleGenerateInvite}
            disabled={isLoading}
            className="btn-paper-accent w-full py-2.5 rounded-lg text-xs font-bold cursor-pointer"
          >
            {isLoading ? 'Generating Link...' : 'Create Role Invite Link'}
          </button>
        ) : (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[10px] text-ink-muted">Sharable Link Generated:</span>
            <div className="flex items-center gap-1.5">
              <input
                readOnly
                value={generatedLink}
                className="flex-1 bg-paper px-2.5 py-1.5 rounded-md border border-border-paper text-xs text-ink truncate focus:outline-none"
              />
              <button
                onClick={() => handleCopy(generatedLink)}
                className="btn-paper-primary px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
