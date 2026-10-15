import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MousePointer2,
  Pen,
  Square,
  Circle,
  Type,
  Eraser,
  Download,
  Share2,
  Moon,
  Sun,
  RotateCcw,
  LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { setTool, resetView } from '../store/canvasSlice';
import { ToolType } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPng?: () => void;
  onExportSvg?: () => void;
  onExportServerPng?: () => void;
  onCopyLink?: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExportPng,
  onExportSvg,
  onExportServerPng,
  onCopyLink
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  const commands: CommandItem[] = [
    {
      id: 'tool-select',
      label: 'Select & Move Tool',
      category: 'Tools',
      icon: MousePointer2,
      shortcut: 'V',
      action: () => dispatch(setTool('select'))
    },
    {
      id: 'tool-pen',
      label: 'Freehand Pen Tool',
      category: 'Tools',
      icon: Pen,
      shortcut: 'P',
      action: () => dispatch(setTool('pen'))
    },
    {
      id: 'tool-rect',
      label: 'Rectangle Shape',
      category: 'Tools',
      icon: Square,
      shortcut: 'R',
      action: () => dispatch(setTool('rect'))
    },
    {
      id: 'tool-circle',
      label: 'Circle Shape',
      category: 'Tools',
      icon: Circle,
      shortcut: 'C',
      action: () => dispatch(setTool('circle'))
    },
    {
      id: 'tool-text',
      label: 'Text Element',
      category: 'Tools',
      icon: Type,
      shortcut: 'T',
      action: () => dispatch(setTool('text'))
    },
    {
      id: 'tool-eraser',
      label: 'Eraser Tool',
      category: 'Tools',
      icon: Eraser,
      shortcut: 'E',
      action: () => dispatch(setTool('eraser'))
    },
    {
      id: 'view-reset',
      label: 'Reset Zoom & Center View',
      category: 'View',
      icon: RotateCcw,
      shortcut: 'Ctrl+0',
      action: () => dispatch(resetView())
    },
    {
      id: 'export-png',
      label: 'Export Board as PNG (Instant Client)',
      category: 'Export',
      icon: Download,
      action: () => onExportPng?.()
    },
    {
      id: 'export-svg',
      label: 'Export Board as SVG Vector',
      category: 'Export',
      icon: Download,
      action: () => onExportSvg?.()
    },
    {
      id: 'export-server-png',
      label: 'Export Server High-Res PNG (node-canvas)',
      category: 'Export',
      icon: Download,
      action: () => onExportServerPng?.()
    },
    {
      id: 'share-link',
      label: 'Copy Room Invite Link',
      category: 'Share',
      icon: Share2,
      action: () => onCopyLink?.()
    },
    {
      id: 'toggle-theme',
      label: 'Toggle Dark / Light Theme',
      category: 'Preferences',
      icon: Moon,
      action: toggleTheme
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => navigate('/dashboard')
    }
  ];

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl rounded-2xl glass-panel border border-white/10 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Type a command or search tools (e.g., 'pen', 'export', 'theme')..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white/10 rounded">
                ESC
              </kbd>
            </div>

            {/* Command List */}
            <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No matching commands found
                </div>
              ) : (
                filtered.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium">{cmd.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-medium ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                          {cmd.category}
                        </span>
                        {cmd.shortcut && (
                          <kbd className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                          }`}>
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
