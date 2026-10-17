import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store';
import { setStrokeColor, setStrokeWidth, setFillColor } from '../store/canvasSlice';

interface PropertiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#111110', // Deep Ink
  '#D4FF3A', // Acid Lime
  '#FFE98A', // Butter
  '#FFC7A8', // Peach
  '#BFE3FF', // Sky
  '#BDF2D0', // Mint
  '#E05A47', // Terracotta
  '#7C3AED', // Deep Violet
  '#FAF8F4', // Pure Paper
  '#575653'  // Muted Ink
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
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 p-4 rounded-lg bg-paper-card shadow-[4px_5px_0px_#111110] border border-ink flex flex-col gap-3.5 min-w-[320px]"
        >
          {/* Stroke Color */}
          <div>
            <div className="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-2">
              Stroke Color
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => dispatch(setStrokeColor(c))}
                  className={`w-6 h-6 rounded-full transition-transform border border-ink/40 cursor-pointer ${
                    strokeColor === c ? 'scale-125 ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => dispatch(setStrokeColor(e.target.value))}
                className="w-6 h-6 rounded-full border border-ink/40 cursor-pointer bg-transparent p-0 overflow-hidden"
                title="Custom color"
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <div className="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-2">
              Stroke Width ({strokeWidth}px)
            </div>
            <div className="flex items-center gap-2">
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => dispatch(setStrokeWidth(w))}
                  className={`flex-1 py-1.5 rounded text-xs font-mono font-bold flex items-center justify-center border transition-all cursor-pointer ${
                    strokeWidth === w
                      ? 'bg-accent text-ink border-ink shadow-[1.5px_1.5px_0px_#111110]'
                      : 'bg-paper-muted text-ink-muted border-border-paper hover:text-ink hover:border-ink'
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
            <div className="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider mb-2">
              Fill Mode
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch(setFillColor('transparent'))}
                className={`flex-1 py-1.5 px-2 text-xs font-mono font-semibold rounded border transition-all cursor-pointer ${
                  fillColor === 'transparent'
                    ? 'bg-accent text-ink border-ink shadow-[1.5px_1.5px_0px_#111110]'
                    : 'bg-paper-muted text-ink-muted border-border-paper hover:text-ink hover:border-ink'
                }`}
              >
                None
              </button>
              <button
                onClick={() => dispatch(setFillColor(strokeColor))}
                className={`flex-1 py-1.5 px-2 text-xs font-mono font-semibold rounded border transition-all cursor-pointer ${
                  fillColor === strokeColor
                    ? 'bg-accent text-ink border-ink shadow-[1.5px_1.5px_0px_#111110]'
                    : 'bg-paper-muted text-ink-muted border-border-paper hover:text-ink hover:border-ink'
                }`}
              >
                Solid
              </button>
              <button
                onClick={() => dispatch(setFillColor(`${strokeColor}33`))}
                className={`flex-1 py-1.5 px-2 text-xs font-mono font-semibold rounded border transition-all cursor-pointer ${
                  fillColor.endsWith('33')
                    ? 'bg-accent text-ink border-ink shadow-[1.5px_1.5px_0px_#111110]'
                    : 'bg-paper-muted text-ink-muted border-border-paper hover:text-ink hover:border-ink'
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
