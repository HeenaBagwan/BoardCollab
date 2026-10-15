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
    <div className="fixed bottom-6 left-6 z-30 flex items-center gap-1 p-1 rounded-xl glass-panel shadow-2xl border border-white/10 dark:border-white/10">
      <button
        onClick={handleZoomOut}
        title="Zoom Out (Wheel Down)"
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={handleReset}
        title="Reset Zoom to 100% (Ctrl+0)"
        className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white rounded-md hover:bg-white/5 transition-colors min-w-[50px] text-center"
      >
        {zoomPercent}%
      </button>

      <button
        onClick={handleZoomIn}
        title="Zoom In (Wheel Up)"
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

      <button
        onClick={handleReset}
        title="Reset Canvas View"
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ZoomControls;
