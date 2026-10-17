import React from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { selectActiveElements, setStagePos } from '../store/canvasSlice';

interface MinimapProps {
  stagePos: { x: number; y: number };
  stageScale: number;
}

export const Minimap: React.FC<MinimapProps> = ({ stagePos, stageScale }) => {
  const dispatch = useAppDispatch();
  const elements = useAppSelector(selectActiveElements);

  const MAP_WIDTH = 160;
  const MAP_HEIGHT = 100;
  const BOUNDS = 2000; // Conceptual world coordinate bounds (-2000 to +2000)

  // Map world coordinate [-BOUNDS, +BOUNDS] to minimap pixel space [0, MAP_WIDTH]
  const toMiniX = (x: number) => ((x + BOUNDS) / (BOUNDS * 2)) * MAP_WIDTH;
  const toMiniY = (y: number) => ((y + BOUNDS) / (BOUNDS * 2)) * MAP_HEIGHT;

  // Viewport box in minimap
  const viewWidth = (window.innerWidth / stageScale / (BOUNDS * 2)) * MAP_WIDTH;
  const viewHeight = (window.innerHeight / stageScale / (BOUNDS * 2)) * MAP_HEIGHT;
  const viewX = toMiniX(-stagePos.x / stageScale);
  const viewY = toMiniY(-stagePos.y / stageScale);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap pixel to world coordinate
    const targetWorldX = (clickX / MAP_WIDTH) * (BOUNDS * 2) - BOUNDS;
    const targetWorldY = (clickY / MAP_HEIGHT) * (BOUNDS * 2) - BOUNDS;

    // Center screen on target
    const newStageX = -targetWorldX * stageScale + window.innerWidth / 2;
    const newStageY = -targetWorldY * stageScale + window.innerHeight / 2;

    dispatch(setStagePos({ x: newStageX, y: newStageY }));
  };

  return (
    <div
      onClick={handleMinimapClick}
      title="Click to jump canvas position"
      className="hidden md:block fixed bottom-6 right-6 z-30 rounded-lg bg-paper-card border border-ink p-1.5 shadow-[3px_3px_0px_#111110] cursor-crosshair overflow-hidden group"
      style={{ width: `${MAP_WIDTH + 14}px`, height: `${MAP_HEIGHT + 14}px` }}
    >
      <div className="relative w-full h-full bg-paper-muted rounded overflow-hidden border border-border-paper paper-grid">
        {/* Simplified element markers */}
        {elements.slice(0, 100).map((el) => {
          const x = Number(el.props.x || el.props.points?.[0] || 0);
          const y = Number(el.props.y || el.props.points?.[1] || 0);
          const mx = toMiniX(x);
          const my = toMiniY(y);

          if (mx < 0 || mx > MAP_WIDTH || my < 0 || my > MAP_HEIGHT) return null;

          return (
            <div
              key={el.id}
              className="absolute w-1.5 h-1.5 rounded-sm bg-ink/75 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${mx}px`, top: `${my}px` }}
            />
          );
        })}

        {/* Current visible viewport highlight box */}
        <div
          className="absolute border-1.5 border-ink bg-accent/30 rounded-xs pointer-events-none transition-all duration-75 shadow-sm"
          style={{
            left: `${Math.max(0, viewX)}px`,
            top: `${Math.max(0, viewY)}px`,
            width: `${Math.min(MAP_WIDTH, viewWidth)}px`,
            height: `${Math.min(MAP_HEIGHT, viewHeight)}px`
          }}
        />

        {/* Studio Paper tiny corner badge */}
        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider text-ink-muted bg-paper-card/90 border border-border-paper select-none">
          NAV
        </span>
      </div>
    </div>
  );
};

export default Minimap;
