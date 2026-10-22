import { calculatePathLength } from './path-geometry.js';

export const GATE_SWITCHES_PER_RUN = 2;

export function gateRouteIds(map) {
  return map?.gateRoutes && typeof map.gateRoutes === 'object' ? Object.keys(map.gateRoutes) : [];
}

export function defaultGateRoute(map) {
  return gateRouteIds(map)[0] ?? 'default';
}

export function pathForGateRoute(map, routeId = defaultGateRoute(map)) {
  return map?.gateRoutes?.[routeId]?.path ?? map?.path ?? [];
}

export function gateSwitchesForMap(map) {
  return gateRouteIds(map).length > 1 ? GATE_SWITCHES_PER_RUN : 0;
}

export function summarizeGateRoute(route) {
  const path = route?.path ?? [];
  return { length: calculatePathLength(path), turns: Math.max(0, path.length - 2) };
}
