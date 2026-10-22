export const GAME_SPEEDS = Object.freeze([1, 1.7]);
export const DEFAULT_GAME_SPEED = GAME_SPEEDS[0];

export function normalizeGameSpeed(value) {
  return GAME_SPEEDS.includes(value) ? value : DEFAULT_GAME_SPEED;
}

export function toggleGameSpeed(currentSpeed) {
  return currentSpeed === GAME_SPEEDS[0] ? GAME_SPEEDS[1] : GAME_SPEEDS[0];
}
