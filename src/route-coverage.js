export function pathSegmentsWithinRadius(path, center, radius) {
  if (!Array.isArray(path) || !center || !Number.isFinite(radius) || radius < 0) return [];
  const segments = [];
  for (let index = 1; index < path.length; index++) {
    const [ax, ay] = path[index - 1], [bx, by] = path[index];
    const dx = bx - ax, dy = by - ay, lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) continue;
    const projected = ((center.x - ax) * dx + (center.y - ay) * dy) / lengthSquared;
    const nearestX = ax + dx * projected, nearestY = ay + dy * projected;
    const perpendicularSquared = (center.x - nearestX) ** 2 + (center.y - nearestY) ** 2;
    if (perpendicularSquared > radius * radius) continue;
    const halfSpan = Math.sqrt(Math.max(0, radius * radius - perpendicularSquared) / lengthSquared);
    const from = Math.max(0, projected - halfSpan), to = Math.min(1, projected + halfSpan);
    if (to <= from) continue;
    segments.push({ x1:ax + dx * from, y1:ay + dy * from, x2:ax + dx * to, y2:ay + dy * to });
  }
  return segments;
}

export function pathCoveragePercent(path, center, radius) {
  if (!Array.isArray(path) || path.length < 2) return 0;
  const total = path.slice(1).reduce((sum, point, index) => sum + Math.hypot(point[0] - path[index][0], point[1] - path[index][1]), 0);
  if (!total) return 0;
  const covered = pathSegmentsWithinRadius(path, center, radius).reduce((sum, segment) => sum + Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1), 0);
  return Math.round(Math.min(1, covered / total) * 100);
}

export function combinedPathCoveragePercent(path, circles) {
  if (!Array.isArray(path) || path.length < 2 || !Array.isArray(circles) || !circles.length) return 0;
  let total = 0, covered = 0;
  for (let index = 1; index < path.length; index++) {
    const [ax, ay] = path[index - 1], [bx, by] = path[index];
    const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
    if (!length) continue;
    total += length;
    const lengthSquared = length * length, intervals = [];
    for (const circle of circles) {
      const { center, radius } = circle || {};
      if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(radius) || radius < 0) continue;
      const projection = ((center.x - ax) * dx + (center.y - ay) * dy) / lengthSquared;
      const nearestX = ax + dx * projection, nearestY = ay + dy * projection;
      const distanceSquared = (center.x - nearestX) ** 2 + (center.y - nearestY) ** 2;
      if (distanceSquared > radius * radius) continue;
      const halfSpan = Math.sqrt(Math.max(0, radius * radius - distanceSquared) / lengthSquared);
      const from = Math.max(0, projection - halfSpan), to = Math.min(1, projection + halfSpan);
      if (to > from) intervals.push([from, to]);
    }
    intervals.sort((a, b) => a[0] - b[0]);
    let from = null, to = null;
    for (const interval of intervals) {
      if (from === null) { [from, to] = interval; continue; }
      if (interval[0] <= to) to = Math.max(to, interval[1]);
      else { covered += (to - from) * length; [from, to] = interval; }
    }
    if (from !== null) covered += (to - from) * length;
  }
  return total ? Math.round(Math.min(1, covered / total) * 100) : 0;
}
