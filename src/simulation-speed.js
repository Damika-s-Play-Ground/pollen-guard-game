export const GAME_SPEEDS = Object.freeze([1, 2]);
export const DEFAULT_GAME_SPEED = GAME_SPEEDS[0];
export const LEGACY_GAME_SPEED = 1.7;

export function normalizeGameSpeed(value) {
  if (value === LEGACY_GAME_SPEED) return 2;
  return GAME_SPEEDS.includes(value) ? value : DEFAULT_GAME_SPEED;
}

export function toggleGameSpeed(currentSpeed) {
  return normalizeGameSpeed(currentSpeed) === GAME_SPEEDS[0] ? GAME_SPEEDS[1] : GAME_SPEEDS[0];
}
