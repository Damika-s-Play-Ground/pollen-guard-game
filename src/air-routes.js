import { calculatePathLength, createPathSampler } from './path-geometry.js';

export const AIR_ROUTE_SCHEDULE_VERSION = 7;

export function createEnemyRouteGeometry(map, waveScheduleVersion) {
  const groundPath = map.path;
  const airPath = map.airPath || groundPath;
  const groundLength = calculatePathLength(groundPath);
  const airLength = calculatePathLength(airPath);
  const groundPosition = createPathSampler(groundPath);
  const airPosition = createPathSampler(airPath);
  const usesAirRoute = enemy => Boolean(enemy?.flying && waveScheduleVersion >= AIR_ROUTE_SCHEDULE_VERSION);
  return {
    pathFor: enemy => usesAirRoute(enemy) ? airPath : groundPath,
    pathLengthFor: enemy => usesAirRoute(enemy) ? airLength : groundLength,
    positionOf: enemy => (usesAirRoute(enemy) ? airPosition : groundPosition)(enemy.progress)
  };
}

export function createRoutePathLengthResolver(activeGeometry, fallbackPathLength) {
  return enemy => activeGeometry
    ? activeGeometry.pathLengthFor(enemy)
    : typeof fallbackPathLength === 'function' ? fallbackPathLength(enemy) : fallbackPathLength;
}
