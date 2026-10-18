import React from 'react';
import { motion } from 'framer-motion';
import {
  MousePointer2,
  Pen,
  Square,
  Circle,
  Type,
  Eraser,
  Zap,
  MessageSquare,
  History,
  Undo2,
  Redo2,
  Sliders,
  Trash2,
  Eye
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setTool } from '../store/canvasSlice';
import { ToolType } from '../types';

interface CanvasToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isOwner: boolean;
  onToggleProperties: () => void;
  isPropertiesOpen: boolean;
  onToggleReplay?: () => void;
  isReplayOpen?: boolean;
  userRole?: 'owner' | 'editor' | 'viewer';
}

interface ToolItem {
  type: ToolType;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
  isDrawTool?: boolean;
}

const TOOLS: ToolItem[] = [
  { type: 'select', label: 'Select & Move', shortcut: 'V', icon: MousePointer2 },
  { type: 'pen', label: 'Freehand Pen', shortcut: 'P', icon: Pen, isDrawTool: true },
  { type: 'rect', label: 'Rectangle', shortcut: 'R', icon: Square, isDrawTool: true },
  { type: 'circle', label: 'Circle', shortcut: 'C', icon: Circle, isDrawTool: true },
  { type: 'text', label: 'Text', shortcut: 'T', icon: Type, isDrawTool: true },
  { type: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser, isDrawTool: true },
  { type: 'laser', label: 'Laser', shortcut: 'L', icon: Zap },
  { type: 'comment', label: 'Comment', shortcut: 'C', icon: MessageSquare }
];

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  isOwner,
  onToggleProperties,
  isPropertiesOpen,
  onToggleReplay,
  isReplayOpen,
  userRole = 'editor'
}) => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector((state) => state.canvas.tool);
  const isViewer = userRole === 'viewer';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110]">
      {/* Viewer Mode Pill indicator */}
      {isViewer && (
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-butter border border-ink text-[10px] font-mono font-bold text-ink mr-0.5">
          <Eye className="w-3 h-3 text-ink" />
          <span>VIEW-ONLY</span>
        </div>
      )}

      {/* Tool Selector Buttons with layoutId pill */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.type;
          const isDisabled = isViewer && tool.isDrawTool;

          return (
            <button
              key={tool.type}
              disabled={isDisabled}
              onClick={() => dispatch(setTool(tool.type))}
              title={
                isDisabled
                  ? `${tool.label} (Disabled for Viewers)`
                  : `${tool.label} (${tool.shortcut})`
              }
              className={`relative px-2.5 sm:px-3 py-2 rounded-md flex items-center justify-center transition-colors group cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isActive ? 'text-ink font-bold' : 'text-ink-muted hover:text-ink hover:bg-paper-muted'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeToolPill"
                  className="absolute inset-0 bg-accent rounded-md border border-ink shadow-[1.5px_2px_0px_#111110]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-mono font-bold hidden lg:inline">{tool.label}</span>
              </span>
              <span className="sr-only">{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-[1px] h-6 bg-border-paper mx-1" />

      {/* Properties toggle */}
      {!isViewer && (
        <button
          onClick={onToggleProperties}
          title="Toggle Properties (Color & Stroke)"
          className={`p-2 rounded-md transition-all cursor-pointer ${
            isPropertiesOpen
              ? 'bg-accent/40 text-ink border border-ink shadow-[1px_1.5px_0px_#111110]'
              : 'text-ink-muted hover:text-ink hover:bg-paper-muted'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>
      )}

      {/* Time-Travel Replay button */}
      {onToggleReplay && (
        <button
          onClick={onToggleReplay}
          title="Time-Travel Replay Timeline"
          className={`p-2 rounded-md transition-all cursor-pointer ${
            isReplayOpen
              ? 'bg-accent text-ink border border-ink shadow-[1px_1.5px_0px_#111110]'
              : 'text-ink-muted hover:text-ink hover:bg-paper-muted'
          }`}
        >
          <History className="w-4 h-4" />
        </button>
      )}

      {/* Undo & Redo (editors/owners only) */}
      {!isViewer && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-paper-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-paper-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Owner Clear Canvas */}
      {isOwner && (
        <>
          <div className="w-[1px] h-6 bg-border-paper mx-1" />
          <button
            onClick={onClear}
            title="Clear Entire Canvas (Owner Only)"
            className="p-2 rounded-md text-rose-600 hover:text-rose-800 hover:bg-rose-100/60 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

export default CanvasToolbar;

