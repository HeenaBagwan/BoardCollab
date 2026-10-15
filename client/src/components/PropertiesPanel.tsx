import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store';
import { setStrokeColor, setStrokeWidth, setFillColor } from '../store/canvasSlice';

interface PropertiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f8fafc', // Light
  '#0f172a'  // Dark
];

const STROKE_WIDTHS = [2, 4, 8, 12];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const strokeColor = useAppSelector((state) => state.canvas.strokeColor);
  const strokeWidth = useAppSelector((state) => state.canvas.strokeWidth);
  const fillColor = useAppSelector((state) => state.canvas.fillColor);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 p-4 rounded-2xl glass-panel shadow-2xl border border-white/10 dark:border-white/10 backdrop-blur-2xl flex flex-col gap-3 min-w-[320px]"
        >
          {/* Stroke Color */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Stroke Color
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => dispatch(setStrokeColor(c))}
                  className={`w-6 h-6 rounded-full transition-transform border border-white/20 ${
                    strokeColor === c ? 'scale-125 ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => dispatch(setStrokeColor(e.target.value))}
                className="w-6 h-6 rounded-full border border-white/20 cursor-pointer bg-transparent p-0 overflow-hidden"
                title="Custom color"
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Stroke Width ({strokeWidth}px)
            </div>
            <div className="flex items-center gap-2">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => dispatch(setStrokeWidth(w))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center border transition-all ${
                    strokeWidth === w
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                      : 'bg-white/5 text-slate-400 border-transparent hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span
                    className="inline-block bg-current rounded-full"
                    style={{ width: `${w * 2}px`, height: `${w * 2}px` }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Fill Color */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Fill Mode
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch(setFillColor('transparent'))}
                className={`flex-1 py-1 px-2 text-xs rounded-lg border transition-all ${
                  fillColor === 'transparent'
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                    : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                }`}
              >
                None
              </button>
              <button
                onClick={() => dispatch(setFillColor(strokeColor))}
                className={`flex-1 py-1 px-2 text-xs rounded-lg border transition-all ${
                  fillColor === strokeColor
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                    : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                }`}
              >
                Solid
              </button>
              <button
                onClick={() => dispatch(setFillColor(`${strokeColor}33`))}
                className={`flex-1 py-1 px-2 text-xs rounded-lg border transition-all ${
                  fillColor.endsWith('33')
                    ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                    : 'bg-white/5 text-slate-400 border-transparent hover:text-white'
                }`}
              >
                20% Tint
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PropertiesPanel;
