import React from 'react';
import { motion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';
import { useAppSelector } from '../store';

interface LiveCursorsProps {
  stagePos: { x: number; y: number };
  stageScale: number;
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({ stagePos, stageScale }) => {
  const remotePresences = useAppSelector((state) => state.canvas.remotePresences);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  const presences = Object.values(remotePresences).filter(
    (p) => p.cursor && p.userId !== currentUserId
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {presences.map((p) => {
        if (!p.cursor) return null;

        // Convert canvas world coordinates to screen pixel coordinates
        const screenX = p.cursor.x * stageScale + stagePos.x;
        const screenY = p.cursor.y * stageScale + stagePos.y;

        return (
          <motion.div
            key={p.socketId}
            className="absolute top-0 left-0 flex items-start gap-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: screenX,
              y: screenY
            }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 400,
              mass: 0.2
            }}
          >
            {/* Cursor Arrow */}
            <MousePointer2
              className="w-4 h-4 -rotate-45 filter drop-shadow-[1px_1px_0px_#111110]"
              style={{ color: '#111110', fill: p.avatarColor || '#FFE98A' }}
            />

            {/* User Name Tag */}
            <div
              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-ink border border-ink shadow-[1.5px_2px_0px_#111110] flex items-center gap-1.5 whitespace-nowrap"
              style={{ backgroundColor: p.avatarColor || '#FFE98A' }}
            >
              <span>{p.name}</span>
              {p.isDrawing && (
                <span className="w-1.5 h-1.5 rounded-full bg-ink animate-ping" />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default LiveCursors;
