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
