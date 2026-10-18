import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  userId: string;
  userName?: string;
}

export interface PeerCursorChat {
  userId: string;
  socketId: string;
  text: string;
  x: number;
  y: number;
  timestamp: number;
}

interface ReactionsLayerProps {
  stagePos: { x: number; y: number };
  stageScale: number;
  reactions: FloatingReaction[];
  peerChats: Record<string, PeerCursorChat>;
  myCursorChat: { isOpen: boolean; text: string; x: number; y: number } | null;
  onMyCursorChatChange: (text: string) => void;
  onMyCursorChatClose: () => void;
  onEmitReaction: (emoji: string) => void;
}

export const EMOJI_PRESETS = ['👍', '❤️', '🔥', '🎉', '🚀', '💡', '👀'];

export const ReactionsLayer: React.FC<ReactionsLayerProps> = ({
  stagePos,
  stageScale,
  reactions,
  peerChats,
  myCursorChat,
  onMyCursorChatChange,
  onMyCursorChatClose,
  onEmitReaction
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Close cursor chat on Escape or Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (myCursorChat?.isOpen) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          onMyCursorChatClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [myCursorChat?.isOpen, onMyCursorChatClose]);

  return (
    <div className="pointer-events-none absolute inset-0 z-35 overflow-hidden">
      {/* 1. Rising Animated Floating Emoji Reactions with User Names */}
      <AnimatePresence>
        {reactions.map((r) => {
          const screenX = r.x * stageScale + stagePos.x;
          const screenY = r.y * stageScale + stagePos.y;

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 1, scale: 0.6, x: screenX, y: screenY }}
              animate={{
                opacity: 0,
                scale: 1.25,
                y: screenY - 110,
                x: screenX + (Math.sin(Number(r.id.slice(-2)) || 0) * 30)
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.7, ease: 'easeOut' }}
              className="absolute flex items-center gap-1.5 select-none pointer-events-none"
            >
              <span className="text-2xl filter drop-shadow-[1px_2px_0px_#111110]">{r.emoji}</span>
              {r.userName && (
                <span className="px-1.5 py-0.5 rounded bg-paper-card border border-ink text-[10px] font-mono font-bold text-ink shadow-[1px_1px_0px_#111110] whitespace-nowrap">
                  {r.userName}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 2. Peer Cursor Chat Bubbles Floating Beside Collaborator Cursors */}
      <AnimatePresence>
        {Object.values(peerChats).map((chat) => {
          if (!chat.text || Date.now() - chat.timestamp > 4500) return null;
          const screenX = chat.x * stageScale + stagePos.x;
          const screenY = chat.y * stageScale + stagePos.y;

          return (
            <motion.div
              key={chat.socketId}
              initial={{ opacity: 0, scale: 0.8, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute pointer-events-none px-2.5 py-1 rounded-lg bg-paper-card border border-ink text-ink font-mono text-xs font-semibold shadow-[2px_3px_0px_#111110] max-w-[200px] break-words whitespace-normal"
              style={{
                left: `${screenX + 18}px`,
                top: `${screenY - 12}px`
              }}
            >
              <span>{chat.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 3. My Active Cursor Chat Input (When '/' was pressed) */}
      {myCursorChat?.isOpen && (
        <div
          className="pointer-events-auto absolute z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] font-mono text-xs animate-fade-in"
          style={{
            left: `${Math.min(window.innerWidth - 240, Math.max(10, myCursorChat.x * stageScale + stagePos.x + 15))}px`,
            top: `${Math.min(window.innerHeight - 80, Math.max(10, myCursorChat.y * stageScale + stagePos.y - 15))}px`
          }}
        >
          <span className="text-ink-muted text-[11px]">/</span>
          <input
            autoFocus
            type="text"
            placeholder="Type message..."
            value={myCursorChat.text}
            onChange={(e) => onMyCursorChatChange(e.target.value)}
            className="w-40 bg-transparent text-ink placeholder-ink-subtle focus:outline-none"
            maxLength={80}
          />
          <span className="text-[9px] text-ink-subtle hidden sm:inline">↵ send</span>
        </div>
      )}

      {/* 4. Quick Floating Reaction Launcher Button on Bottom Bar */}
      <div className="pointer-events-auto fixed bottom-24 right-6 z-40 flex flex-col items-end gap-1.5 font-mono">
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="flex items-center gap-1 p-1 rounded-lg bg-paper-card border border-ink shadow-[3px_3px_0px_#111110]"
          >
            {EMOJI_PRESETS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onEmitReaction(emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-1.5 text-base hover:scale-125 transition-transform cursor-pointer"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}

        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="React / Cursor Chat (or press '/')"
          className="px-2.5 py-1.5 rounded-md bg-paper-card border border-ink shadow-[2px_2.5px_0px_#111110] text-xs font-semibold text-ink hover:bg-paper-muted cursor-pointer transition-transform active:translate-y-[1px]"
        >
          <span>😄 React</span>
        </button>
      </div>
    </div>
  );
};

export default ReactionsLayer;
