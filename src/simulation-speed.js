export const GAME_SPEEDS = Object.freeze([1, 1.5, 2, 2.5]);
export const DEFAULT_GAME_SPEED = GAME_SPEEDS[0];
export const LEGACY_GAME_SPEED = 1.7;

export function normalizeGameSpeed(value) {
  if (value === LEGACY_GAME_SPEED) return 2;
  return GAME_SPEEDS.includes(value) ? value : DEFAULT_GAME_SPEED;
}

export function toggleGameSpeed(currentSpeed) {
  const current=normalizeGameSpeed(currentSpeed),index=GAME_SPEEDS.indexOf(current);
  return GAME_SPEEDS[(index+1)%GAME_SPEEDS.length];
}
