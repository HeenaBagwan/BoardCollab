import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  X,
  History,
  FastForward
} from 'lucide-react';
import api from '../lib/api';
import { CanvasElement } from '../types';

interface ReplayOp {
  id: string;
  clock: number;
  userId: string;
  opType: string;
  payload: any;
  createdAt: string;
}

interface ReplayScrubberProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  onApplySnapshot: (elements: CanvasElement[]) => void;
  collaborators: Record<string, { avatarColor?: string; name?: string }>;
}

export const ReplayScrubber: React.FC<ReplayScrubberProps> = ({
  roomId,
  isOpen,
  onClose,
  onApplySnapshot,
  collaborators
}) => {
  const [ops, setOps] = useState<ReplayOp[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const playTimerRef = useRef<any>(null);

  // Load operation log history from server
  useEffect(() => {
    if (!isOpen || !roomId) return;
    setIsLoading(true);

    api.get(`/rooms/${roomId}/history?limit=1500`)
      .then((res) => {
        const sortedOps = (res.data.ops || []).sort(
          (a: ReplayOp, b: ReplayOp) => a.clock - b.clock
        );
        setOps(sortedOps);
        setCurrentIndex(sortedOps.length);
      })
      .catch((err) => {
        console.warn('Failed to fetch history ops:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, roomId]);

  // Compute canvas elements up to currentIndex by sequentially applying ops in clock order
  const elementsAtCurrentIndex = useMemo(() => {
    const stateMap = new Map<string, CanvasElement>();

    const sliced = ops.slice(0, currentIndex);
    for (const opEntry of sliced) {
      const op = opEntry.payload;
      if (!op || !op.elementId) continue;

      if (op.type === 'add' && op.props) {
        stateMap.set(op.elementId, {
          id: op.elementId,
          roomId,
          type: op.elementType || 'rect',
          props: { ...op.props },
          propClocks: { default: op.clock },
          authorId: op.userId,
          isDeleted: false,
          deleteClock: null,
          createdAt: opEntry.createdAt,
          updatedAt: opEntry.createdAt
        });
      } else if (op.type === 'update' && op.patch) {
        const existing = stateMap.get(op.elementId);
        if (existing) {
          existing.props = { ...existing.props, ...op.patch };
          existing.updatedAt = opEntry.createdAt;
        }
      } else if (op.type === 'delete') {
        stateMap.delete(op.elementId);
      }
    }

    return Array.from(stateMap.values());
  }, [ops, currentIndex, roomId]);

  // Push snapshot to parent canvas
  useEffect(() => {
    if (isOpen) {
      onApplySnapshot(elementsAtCurrentIndex);
    }
  }, [elementsAtCurrentIndex, isOpen, onApplySnapshot]);

  // Handle Playback Interval
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(40, 400 / playbackSpeed);
      playTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= ops.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, ops.length, playbackSpeed]);

  if (!isOpen) return null;

  const currentOp = ops[currentIndex - 1];
  const totalOps = ops.length;
  const progressPercent = totalOps > 0 ? (currentIndex / totalOps) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setCurrentIndex(Number(e.target.value));
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1, 2, 4];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-4xl p-3.5 rounded-xl bg-paper-card border border-ink shadow-[4px_6px_0px_#111110] flex flex-col gap-2 font-mono select-none animate-fade-in">
      {/* Top row: Header, Clock & Close */}
      <div className="flex items-center justify-between text-xs pb-1 border-b border-border-paper">
        <div className="flex items-center gap-2 text-ink">
          <History className="w-4 h-4 text-ink" />
          <span className="font-bold tracking-tight">Time-Travel Replay (Read-Only)</span>
          {isLoading && <span className="text-[10px] text-ink-muted animate-pulse">Loading history...</span>}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-ink-muted">
            <span className="font-bold text-ink">Clock: #{currentOp ? currentOp.clock : 0}</span>
            <span className="mx-1">/</span>
            <span>Step {currentIndex} of {totalOps}</span>
          </div>
          <button
            onClick={onClose}
            title="Exit Replay Mode"
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-muted cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle row: Timeline Track with User-Colored Markers */}
      <div className="relative w-full py-1.5 flex items-center">
        {/* User Op Markers along timeline */}
        <div className="absolute inset-x-0 h-2 bg-paper-muted rounded border border-border-paper overflow-hidden flex pointer-events-none">
          {ops.map((op, idx) => {
            const col = collaborators[op.userId]?.avatarColor || '#111110';
            return (
              <div
                key={op.id || idx}
                style={{
                  width: `${100 / Math.max(1, totalOps)}%`,
                  backgroundColor: idx < currentIndex ? col : 'transparent'
                }}
                className="h-full border-r border-paper/40 opacity-80"
              />
            );
          })}
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min={0}
          max={totalOps}
          value={currentIndex}
          onChange={handleSeek}
          className="relative z-10 w-full h-3 appearance-none bg-transparent cursor-pointer focus:outline-none accent-accent"
        />
      </div>

      {/* Bottom row: Playback Controls */}
      <div className="flex items-center justify-between pt-1">
        {/* Left: Speed & Reset */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex(0);
            }}
            title="Rewind to Beginning"
            className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-paper-muted transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={cycleSpeed}
            title="Playback Speed"
            className="px-2 py-1 rounded text-[11px] font-bold text-ink bg-paper-muted border border-border-paper hover:bg-paper hover:border-ink transition-colors cursor-pointer"
          >
            {playbackSpeed}x
          </button>
        </div>

        {/* Center: Play/Pause, Step Back, Step Forward */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex((p) => Math.max(0, p - 1));
            }}
            disabled={currentIndex === 0}
            title="Step Backward (←)"
            className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-paper-muted disabled:opacity-30 cursor-pointer transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (currentIndex >= totalOps) setCurrentIndex(0);
              setIsPlaying(!isPlaying);
            }}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="btn-paper-accent p-2 rounded-lg cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-ink" /> : <Play className="w-4 h-4 text-ink fill-ink" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex((p) => Math.min(totalOps, p + 1));
            }}
            disabled={currentIndex >= totalOps}
            title="Step Forward (→)"
            className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-paper-muted disabled:opacity-30 cursor-pointer transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Op Details Pill */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-ink-muted">
          {currentOp ? (
            <span className="px-2 py-0.5 rounded bg-paper-muted border border-border-paper truncate max-w-[200px]">
              Op: <strong className="text-ink">{currentOp.opType}</strong> by {collaborators[currentOp.userId]?.name || 'Collaborator'}
            </span>
          ) : (
            <span>Initial State</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplayScrubber;
