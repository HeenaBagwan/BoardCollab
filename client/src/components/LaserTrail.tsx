import React, { useEffect, useRef } from 'react';

export interface LaserPoint {
  x: number;
  y: number;
  color: string;
  time: number;
  userId: string;
}

interface LaserTrailProps {
  stagePos: { x: number; y: number };
  stageScale: number;
  points: LaserPoint[];
}

export const LaserTrail: React.FC<LaserTrailProps> = ({
  stagePos,
  stageScale,
  points
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePointsRef = useRef<LaserPoint[]>([]);

  // Update active points ref
  useEffect(() => {
    activePointsRef.current = points;
  }, [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const now = Date.now();
      const FADE_DURATION = 1000; // ms

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Group points by userId
      const userGroups = new Map<string, LaserPoint[]>();
      for (const pt of activePointsRef.current) {
        if (now - pt.time <= FADE_DURATION) {
          if (!userGroups.has(pt.userId)) userGroups.set(pt.userId, []);
          userGroups.get(pt.userId)!.push(pt);
        }
      }

      // Draw trails
      for (const [, pts] of userGroups.entries()) {
        if (pts.length < 2) continue;

        for (let i = 1; i < pts.length; i++) {
          const p1 = pts[i - 1];
          const p2 = pts[i];
          const age = now - p2.time;
          const alpha = Math.max(0, 1 - age / FADE_DURATION);

          const screenX1 = p1.x * stageScale + stagePos.x;
          const screenY1 = p1.y * stageScale + stagePos.y;
          const screenX2 = p2.x * stageScale + stagePos.x;
          const screenY2 = p2.y * stageScale + stagePos.y;

          ctx.beginPath();
          ctx.moveTo(screenX1, screenY1);
          ctx.lineTo(screenX2, screenY2);
          ctx.strokeStyle = p2.color || '#D4FF3A';
          ctx.globalAlpha = alpha;
          ctx.lineWidth = Math.max(2, 6 * alpha);
          ctx.lineCap = 'round';
          ctx.shadowColor = p2.color || '#D4FF3A';
          ctx.shadowBlur = 8 * alpha;
          ctx.stroke();
        }

        // Draw glowing head on latest point
        const latest = pts[pts.length - 1];
        if (latest) {
          const sx = latest.x * stageScale + stagePos.x;
          const sy = latest.y * stageScale + stagePos.y;
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0, Math.PI * 2);
          ctx.fillStyle = latest.color || '#D4FF3A';
          ctx.globalAlpha = 1;
          ctx.shadowColor = '#111110';
          ctx.shadowBlur = 10;
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [stagePos, stageScale]);

  return (
    <canvas
      ref={canvasRef}
      width={typeof window !== 'undefined' ? window.innerWidth : 1920}
      height={typeof window !== 'undefined' ? window.innerHeight : 1080}
      className="pointer-events-none absolute inset-0 z-30"
    />
  );
};

export default LaserTrail;
