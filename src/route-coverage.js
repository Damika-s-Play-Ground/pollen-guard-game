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
