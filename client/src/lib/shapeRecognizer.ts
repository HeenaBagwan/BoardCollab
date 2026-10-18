/**
 * $1 Unistroke Recognizer for 2D Geometric Shapes
 * Pure TypeScript implementation without heavy ML dependencies.
 * Recognizes Circle, Rectangle, Triangle, Line, and Arrow.
 */

export interface Point {
  x: number;
  y: number;
}

export interface RecognitionResult {
  shape: 'circle' | 'rect' | 'triangle' | 'line' | 'arrow';
  name: string;
  score: number; // 0 to 1
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
}

const NUM_POINTS = 64;
const SQUARE_SIZE = 250.0;
const ORIGIN: Point = { x: 0, y: 0 };

function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

function pathLength(points: Point[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i]);
  }
  return d;
}

function resample(points: Point[], n: number): Point[] {
  const I = pathLength(points) / (n - 1);
  let D = 0;
  const newPoints: Point[] = [points[0]];
  const pts = [...points];

  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (D + d >= I) {
      const qx = pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x);
      const qy = pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y);
      const q = { x: qx, y: qy };
      newPoints.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else {
      D += d;
    }
  }

  while (newPoints.length < n) {
    newPoints.push(points[points.length - 1]);
  }

  return newPoints;
}

function centroid(points: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

function rotateBy(points: Point[], radians: number): Point[] {
  const c = centroid(points);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return points.map((p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return {
      x: dx * cos - dy * sin + c.x,
      y: dx * sin + dy * cos + c.y
    };
  });
}

function boundingBox(points: Point[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return { minX, minY, maxX, maxY, width, height, centerX: minX + width / 2, centerY: minY + height / 2 };
}

function scaleTo(points: Point[], size: number): Point[] {
  const box = boundingBox(points);
  return points.map((p) => ({
    x: p.x * (size / box.width),
    y: p.y * (size / box.height)
  }));
}

function translateTo(points: Point[], pt: Point): Point[] {
  const c = centroid(points);
  return points.map((p) => ({
    x: p.x + pt.x - c.x,
    y: p.y + pt.y - c.y
  }));
}

function pathDistance(pts1: Point[], pts2: Point[]): number {
  let d = 0;
  for (let i = 0; i < pts1.length; i++) {
    d += distance(pts1[i], pts2[i]);
  }
  return d / pts1.length;
}

// Generate canonical template points
function makeCircleTemplate(clockwise = true): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const angle = (clockwise ? 1 : -1) * (i / NUM_POINTS) * 2 * Math.PI;
    pts.push({
      x: Math.cos(angle) * 100,
      y: Math.sin(angle) * 100
    });
  }
  return pts;
}

function makeRectTemplate(): Point[] {
  const pts: Point[] = [];
  const side = NUM_POINTS / 4;
  // Top
  for (let i = 0; i < side; i++) pts.push({ x: -100 + (200 * i) / side, y: -100 });
  // Right
  for (let i = 0; i < side; i++) pts.push({ x: 100, y: -100 + (200 * i) / side });
  // Bottom
  for (let i = 0; i < side; i++) pts.push({ x: 100 - (200 * i) / side, y: 100 });
  // Left
  for (let i = 0; i < side; i++) pts.push({ x: -100, y: 100 - (200 * i) / side });
  return pts;
}

function makeTriangleTemplate(): Point[] {
  const pts: Point[] = [];
  const side = Math.floor(NUM_POINTS / 3);
  // Apex to bottom-right
  for (let i = 0; i < side; i++) pts.push({ x: (100 * i) / side, y: -100 + (200 * i) / side });
  // Bottom-right to bottom-left
  for (let i = 0; i < side; i++) pts.push({ x: 100 - (200 * i) / side, y: 100 });
  // Bottom-left to apex
  const rem = NUM_POINTS - pts.length;
  for (let i = 0; i < rem; i++) pts.push({ x: -100 + (100 * i) / rem, y: 100 - (200 * i) / rem });
  return pts;
}

function makeLineTemplate(): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    pts.push({ x: -100 + (200 * i) / (NUM_POINTS - 1), y: 0 });
  }
  return pts;
}

function makeArrowTemplate(): Point[] {
  const pts: Point[] = [];
  // Stem (70% points)
  const stemCount = Math.floor(NUM_POINTS * 0.7);
  for (let i = 0; i < stemCount; i++) {
    pts.push({ x: -100 + (180 * i) / stemCount, y: 0 });
  }
  // Head upper
  const headCount = Math.floor((NUM_POINTS - stemCount) / 2);
  for (let i = 0; i < headCount; i++) {
    pts.push({ x: 80 - (30 * i) / headCount, y: - (30 * i) / headCount });
  }
  // Head lower
  const rem = NUM_POINTS - pts.length;
  for (let i = 0; i < rem; i++) {
    pts.push({ x: 50 + (30 * i) / rem, y: (30 * i) / rem });
  }
  return pts;
}

interface Template {
  name: string;
  shape: 'circle' | 'rect' | 'triangle' | 'line' | 'arrow';
  points: Point[];
}

function normalize(pts: Point[]): Point[] {
  const res = resample(pts, NUM_POINTS);
  const scaled = scaleTo(res, SQUARE_SIZE);
  return translateTo(scaled, ORIGIN);
}

const TEMPLATES: Template[] = [
  { name: 'Circle', shape: 'circle', points: normalize(makeCircleTemplate(true)) },
  { name: 'Circle', shape: 'circle', points: normalize(makeCircleTemplate(false)) },
  { name: 'Rectangle', shape: 'rect', points: normalize(makeRectTemplate()) },
  { name: 'Triangle', shape: 'triangle', points: normalize(makeTriangleTemplate()) },
  { name: 'Line', shape: 'line', points: normalize(makeLineTemplate()) },
  { name: 'Arrow', shape: 'arrow', points: normalize(makeArrowTemplate()) }
];

/**
 * Recognize a raw array of coordinate points [x1, y1, x2, y2, ...]
 */
export function recognizeStroke(flatPoints: number[]): RecognitionResult | null {
  if (flatPoints.length < 12) return null; // Too short to recognize reliably

  const rawPoints: Point[] = [];
  for (let i = 0; i < flatPoints.length; i += 2) {
    rawPoints.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }

  const origBounds = boundingBox(rawPoints);
  const normalizedCandidate = normalize(rawPoints);

  let bestDistance = Infinity;
  let bestTemplate: Template | null = null;

  for (const template of TEMPLATES) {
    const d = pathDistance(normalizedCandidate, template.points);
    if (d < bestDistance) {
      bestDistance = d;
      bestTemplate = template;
    }
  }

  if (!bestTemplate) return null;

  // 1 - bestDistance / half diagonal of bounding box
  const score = Math.max(0, 1 - bestDistance / (0.5 * Math.SQRT2 * SQUARE_SIZE));

  return {
    shape: bestTemplate.shape,
    name: bestTemplate.name,
    score: Math.min(1, Math.round(score * 100) / 100),
    bounds: origBounds
  };
}
