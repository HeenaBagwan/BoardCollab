import React from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setStageScale, resetView } from '../store/canvasSlice';

export const ZoomControls: React.FC = () => {
  const dispatch = useAppDispatch();
  const scale = useAppSelector((state) => state.canvas.stageScale);

  const zoomPercent = Math.round(scale * 100);

  const handleZoomIn = () => {
    dispatch(setStageScale(scale * 1.2));
  };

  const handleZoomOut = () => {
    dispatch(setStageScale(scale / 1.2));
  };

  const handleReset = () => {
    dispatch(resetView());
  };

  return (
    <div className="fixed bottom-6 left-6 z-30 flex items-center gap-1 p-1 rounded-lg bg-paper-card border border-ink shadow-[2.5px_3px_0px_#111110]">
      <button
        onClick={handleZoomOut}
        title="Zoom Out (Wheel Down)"
        className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-paper-muted transition-colors cursor-pointer"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={handleReset}
        title="Reset Zoom to 100% (Ctrl+0)"
        className="px-2 py-1 text-xs font-mono font-bold text-ink rounded-md hover:bg-paper-muted transition-colors min-w-[52px] text-center cursor-pointer"
      >
        {zoomPercent}%
      </button>

      <button
        onClick={handleZoomIn}
        title="Zoom In (Wheel Up)"
        className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-paper-muted transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-border-paper mx-0.5" />

      <button
        onClick={handleReset}
        title="Reset Canvas View"
        className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-paper-muted transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ZoomControls;
