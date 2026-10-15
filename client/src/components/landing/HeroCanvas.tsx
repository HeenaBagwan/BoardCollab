import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface SimulatedCursor {
  name: string;
  color: string; // sticky note color
  x: number;
  y: number;
  isDrawing: boolean;
}

export const HeroCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [visitorStrokes, setVisitorStrokes] = useState<Point[][]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });

  // 3 Simulated Collaborators positioned in open margins
  const [collaborators, setCollaborators] = useState<SimulatedCursor[]>([
    {
      name: 'Maya',
      color: '#FFE98A', // butter
      x: 100,
      y: 180,
      isDrawing: false
    },
    {
      name: 'Liam',
      color: '#FFC7A8', // peach
      x: 1000,
      y: 220,
      isDrawing: false
    },
    {
      name: 'Elena',
      color: '#BFE3FF', // sky
      x: 950,
      y: 480,
      isDrawing: false
    }
  ]);

  // Static sticky note card on the canvas (placed in right margin on desktop)
  const [stickyNotePos, setStickyNotePos] = useState({ x: 920, y: 190 });

  // Resize canvas according to device pixel ratio
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      setContainerSize({ width: rect.width, height: rect.height });

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scripted animation loops for the 3 collaborators around margins
  useEffect(() => {
    let animationFrameId: number;
    const startTime = Date.now();

    const loop = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const w = containerSize.width;
      const h = containerSize.height;

      // On desktop:
      // Maya: orbits top-left around (w * 0.12, 170)
      const mayaCenterX = Math.max(70, w * 0.11);
      const mayaCenterY = Math.min(220, h * 0.28);
      const mayaT = elapsed * 0.7;
      const mayaX = mayaCenterX + Math.sin(mayaT) * 45;
      const mayaY = mayaCenterY + Math.cos(mayaT) * 30;

      // Liam: orbits top-right around (w * 0.88, 220)
      const liamCenterX = Math.min(w - 180, w * 0.86);
      const liamCenterY = Math.min(240, h * 0.32);
      const liamT = elapsed * 0.5;
      const liamX = liamCenterX + Math.cos(liamT) * 35;
      const liamY = liamCenterY + Math.sin(liamT * 1.4) * 25;

      // Elena: orbits bottom-right around (w * 0.85, 480)
      const elenaCenterX = Math.min(w - 200, w * 0.84);
      const elenaCenterY = Math.min(h - 140, h * 0.72);
      const elenaT = elapsed * 0.8;
      const elenaX = elenaCenterX + Math.sin(elenaT) * 50;
      const elenaY = elenaCenterY + Math.cos(elenaT) * 35;

      setCollaborators((prev) => [
        {
          ...prev[0],
          x: prev[0].x + (mayaX - prev[0].x) * 0.1,
          y: prev[0].y + (mayaY - prev[0].y) * 0.1,
          isDrawing: true
        },
        {
          ...prev[1],
          x: prev[1].x + (liamX - prev[1].x) * 0.08,
          y: prev[1].y + (liamY - prev[1].y) * 0.08,
          isDrawing: false
        },
        {
          ...prev[2],
          x: prev[2].x + (elenaX - prev[2].x) * 0.09,
          y: prev[2].y + (elenaY - prev[2].y) * 0.09,
          isDrawing: true
        }
      ]);

      // Move sticky note alongside Liam
      setStickyNotePos({
        x: liamCenterX - 70 + Math.cos(liamT) * 20,
        y: liamCenterY - 40 + Math.sin(liamT * 1.4) * 15
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [containerSize]);

  // Redraw the canvas on state updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    const isDark = document.documentElement.classList.contains('dark');
    const sketchColor = isDark ? 'rgba(247, 245, 240, 0.45)' : 'rgba(17, 17, 16, 0.45)';
    const inkColor = isDark ? '#F7F5F0' : '#111110';

    // Only draw collaborator sketches if there's enough room (desktop/tablet)
    if (w > 768) {
      // 1. Draw Maya's simulated wireframe box in left margin
      ctx.save();
      ctx.strokeStyle = sketchColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(30, 120, 150, 95);
      ctx.setLineDash([]);
      ctx.font = '11px "Geist Mono", monospace';
      ctx.fillStyle = sketchColor;
      ctx.fillText('wireframe / nav', 42, 142);
      ctx.restore();

      // 2. Draw Elena's simulated sketched connector arrow in bottom right
      ctx.save();
      ctx.strokeStyle = sketchColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const arrowStartX = Math.min(w - 240, w * 0.78);
      const arrowStartY = Math.min(h - 180, h * 0.65);
      ctx.moveTo(arrowStartX, arrowStartY);
      ctx.quadraticCurveTo(arrowStartX + 60, arrowStartY + 40, arrowStartX + 120, arrowStartY + 70);
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(arrowStartX + 110, arrowStartY + 58);
      ctx.lineTo(arrowStartX + 120, arrowStartY + 70);
      ctx.lineTo(arrowStartX + 104, arrowStartY + 72);
      ctx.stroke();

      ctx.font = '11px "Geist Mono", monospace';
      ctx.fillStyle = sketchColor;
      ctx.fillText('CRDT branch', arrowStartX + 10, arrowStartY + 30);
      ctx.restore();
    }

    // 3. Draw visitor freehand strokes in crisp ink
    ctx.save();
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    visitorStrokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
    ctx.restore();
  }, [visitorStrokes, collaborators, containerSize]);

  // Visitor Drawing Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    setIsDrawing(true);
    currentStrokeRef.current = [pt];
    setVisitorStrokes((prev) => [...prev, [pt]]);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    currentStrokeRef.current.push(pt);
    setVisitorStrokes((prev) => {
      const next = [...prev];
      next[next.length - 1] = [...currentStrokeRef.current];
      return next;
    });
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    currentStrokeRef.current = [];
  }, []);

  // Clear visitor sketch
  const handleClear = () => {
    setVisitorStrokes([]);
  };

  const isDesktop = containerSize.width >= 768;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden select-none pointer-events-auto"
      style={{ touchAction: 'none' }}
    >
      {/* Interactive HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* Simulated Sticky Note (Dragged by Liam) - Shown on Desktop only */}
      {isDesktop && (
        <div
          className="absolute z-10 p-3 rounded-sm shadow-md transition-shadow pointer-events-none border border-black/15 will-change-transform"
          style={{
            transform: `translate3d(${stickyNotePos.x}px, ${stickyNotePos.y}px, 0) rotate(2deg)`,
            backgroundColor: '#FFE98A', // butter sticky
            width: '150px',
            color: '#111110',
            boxShadow: '3px 3.5px 0px rgba(17, 17, 16, 0.2)'
          }}
        >
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-black/10">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-black/60">
              Note #14
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-black/25" />
          </div>
          <div className="font-sans font-medium text-xs leading-snug">
            &rarr; User joins room<br />
            &rarr; Sub-100ms sync<br />
            &rarr; Zero jitter
          </div>
        </div>
      )}

      {/* Simulated Collaborators - Visible on Desktop/Tablet */}
      {isDesktop && (
        <>
          {/* Maya */}
          <div
            className="absolute z-20 pointer-events-none transition-transform will-change-transform"
            style={{
              transform: `translate3d(${collaborators[0].x}px, ${collaborators[0].y}px, 0)`
            }}
          >
            <svg
              className="w-3.5 h-3.5 drop-shadow-sm"
              viewBox="0 0 24 24"
              fill="#FFE98A"
              stroke="#111110"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
            </svg>
            <div
              className="mt-0.5 ml-2.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-black/20 shadow-sm whitespace-nowrap"
              style={{
                backgroundColor: collaborators[0].color,
                color: '#111110'
              }}
            >
              Maya <span className="opacity-60 text-[9px]">drawing</span>
            </div>
          </div>

          {/* Liam */}
          <div
            className="absolute z-20 pointer-events-none transition-transform will-change-transform"
            style={{
              transform: `translate3d(${collaborators[1].x}px, ${collaborators[1].y}px, 0)`
            }}
          >
            <svg
              className="w-3.5 h-3.5 drop-shadow-sm"
              viewBox="0 0 24 24"
              fill="#FFC7A8"
              stroke="#111110"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
            </svg>
            <div
              className="mt-0.5 ml-2.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-black/20 shadow-sm whitespace-nowrap"
              style={{
                backgroundColor: collaborators[1].color,
                color: '#111110'
              }}
            >
              Liam <span className="opacity-60 text-[9px]">moving</span>
            </div>
          </div>

          {/* Elena */}
          <div
            className="absolute z-20 pointer-events-none transition-transform will-change-transform"
            style={{
              transform: `translate3d(${collaborators[2].x}px, ${collaborators[2].y}px, 0)`
            }}
          >
            <svg
              className="w-3.5 h-3.5 drop-shadow-sm"
              viewBox="0 0 24 24"
              fill="#BFE3FF"
              stroke="#111110"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
            </svg>
            <div
              className="mt-0.5 ml-2.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-black/20 shadow-sm whitespace-nowrap"
              style={{
                backgroundColor: collaborators[2].color,
                color: '#111110'
              }}
            >
              Elena <span className="opacity-60 text-[9px]">sketching</span>
            </div>
          </div>
        </>
      )}

      {/* Interactive Helper Cue for Visitor */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-ink-muted bg-paper-card border border-border-paper shadow-paper-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-accent border border-ink/40 animate-pulse" />
          Click & drag to sketch anywhere
        </span>
        {visitorStrokes.length > 0 && (
          <button
            onClick={handleClear}
            className="px-2.5 py-1 rounded text-xs font-mono text-ink-muted hover:text-ink bg-paper-card hover:bg-paper-muted border border-border-paper shadow-paper-sm transition-colors cursor-pointer"
          >
            Clear ink
          </button>
        )}
      </div>
    </div>
  );
};

export default HeroCanvas;
