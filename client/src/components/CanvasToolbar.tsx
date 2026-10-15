import React from 'react';
import { motion } from 'framer-motion';
import {
  MousePointer2,
  Pen,
  Square,
  Circle,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Sliders,
  Trash2
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
}

interface ToolItem {
  type: ToolType;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  { type: 'select', label: 'Select & Move', shortcut: 'V', icon: MousePointer2 },
  { type: 'pen', label: 'Freehand Pen', shortcut: 'P', icon: Pen },
  { type: 'rect', label: 'Rectangle', shortcut: 'R', icon: Square },
  { type: 'circle', label: 'Circle', shortcut: 'C', icon: Circle },
  { type: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { type: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser }
];

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  isOwner,
  onToggleProperties,
  isPropertiesOpen
}) => {
  const dispatch = useAppDispatch();
  const activeTool = useAppSelector((state) => state.canvas.tool);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel shadow-2xl border border-white/10 dark:border-white/10 backdrop-blur-xl">
      {/* Tool Selector Buttons with layoutId pill */}
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.type;

          return (
            <button
              key={tool.type}
              onClick={() => dispatch(setTool(tool.type))}
              title={`${tool.label} (${tool.shortcut})`}
              className={`relative px-3.5 py-2.5 rounded-xl flex items-center justify-center transition-colors group ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeToolPill"
                  className="absolute inset-0 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/30"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-semibold hidden md:inline">{tool.label}</span>
              </span>
              <span className="sr-only">{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-[1px] h-6 bg-white/10 mx-1" />

      {/* Properties toggle */}
      <button
        onClick={onToggleProperties}
        title="Toggle Properties (Color & Stroke)"
        className={`p-2.5 rounded-xl transition-all ${
          isPropertiesOpen
            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Sliders className="w-4 h-4" />
      </button>

      {/* Undo & Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Owner Clear Canvas */}
      {isOwner && (
        <>
          <div className="w-[1px] h-6 bg-white/10 mx-1" />
          <button
            onClick={onClear}
            title="Clear Entire Canvas (Owner Only)"
            className="p-2.5 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

export default CanvasToolbar;
