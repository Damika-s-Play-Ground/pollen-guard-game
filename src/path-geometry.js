export function calculatePathLength(path) {
  if (!Array.isArray(path) || path.length < 2) return 0;
  return path.slice(1).reduce((sum, point, index) => sum + Math.hypot(point[0] - path[index][0], point[1] - path[index][1]), 0);
}

export function createPathSampler(path) {
  if (!Array.isArray(path) || path.length < 2) return () => ({ x: 850, y: 360 });
  const segments = [];
  for (let index = 1; index < path.length; index++) {
    const [x1, y1] = path[index - 1], [x2, y2] = path[index];
    segments.push({ x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1) });
  }
  const endpoint = path.at(-1);
  return distance => {
    if (!Number.isFinite(distance)) return { x: 850, y: 360 };
    let remaining = distance;
    for (const segment of segments) {
      const { x1, y1, x2, y2, length } = segment;
      if (length === 0) continue;
      if (remaining <= length) {
        const ratio = remaining / length;
        return { x: x1 + (x2 - x1) * ratio, y: y1 + (y2 - y1) * ratio };
      }
      remaining -= length;
    }
    return { x: endpoint[0], y: endpoint[1] };
  };
}

export function pointOnPath(path, distance) {
  if (!Array.isArray(path) || path.length < 2 || !Number.isFinite(distance)) return { x: 850, y: 360 };
  for (let index = 1; index < path.length; index++) {
    const [x1, y1] = path[index - 1], [x2, y2] = path[index];
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length === 0) continue;
    if (distance <= length) {
      const ratio = distance / length;
      return { x: x1 + (x2 - x1) * ratio, y: y1 + (y2 - y1) * ratio };
    }
    distance -= length;
  }
  const [x, y] = path.at(-1);
  return { x, y };
}

export function distanceToPath(x, y, path) {
  if (!Array.isArray(path) || path.length < 2) return Infinity;
  let best = Infinity;
  for (let index = 1; index < path.length; index++) {
    const [ax, ay] = path[index - 1], [bx, by] = path[index];
    const dx = bx - ax, dy = by - ay, lengthSquared = dx * dx + dy * dy;
    const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
    best = Math.min(best, Math.hypot(x - (ax + dx * ratio), y - (ay + dy * ratio)));
  }
  return best;
}
