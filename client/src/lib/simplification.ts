/**
 * Ramer-Douglas-Peucker (RDP) Path Simplification Algorithm
 * Reduces the number of points in a curve while preserving its visual fidelity.
 */

interface Point {
  x: number;
  y: number;
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
function getPerpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);

  if (mag === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }

  const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);

  if (u < 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }
  if (u > 1) {
    return Math.hypot(point.x - lineEnd.x, point.y - lineEnd.y);
  }

  const ix = lineStart.x + u * dx;
  const iy = lineStart.y + u * dy;

  return Math.hypot(point.x - ix, point.y - iy);
}

/**
 * Recursive RDP algorithm
 */
function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = getPerpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const firstHalf = rdp(points.slice(0, index + 1), epsilon);
    const secondHalf = rdp(points.slice(index), epsilon);
    return firstHalf.slice(0, -1).concat(secondHalf);
  }

  return [points[0], points[end]];
}

/**
 * Simplify a flat points array: [x0, y0, x1, y1, ...]
 * @param flatPoints - Array of alternating x and y coordinates
 * @param epsilon - Distance tolerance (default: 1.5)
 * @returns Simplified flat array of numbers
 */
export function simplifyPoints(flatPoints: number[], epsilon: number = 1.5): number[] {
  if (flatPoints.length <= 4) return flatPoints;

  const points: Point[] = [];
  for (let i = 0; i < flatPoints.length; i += 2) {
    points.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }

  const simplified = rdp(points, epsilon);

  const result: number[] = [];
  for (const pt of simplified) {
    result.push(Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10);
  }

  return result;
}
