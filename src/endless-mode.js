export const ENDLESS_CHOICES = Object.freeze({
  skyPatrol: Object.freeze({ label: 'Sky patrol', description: 'Add two Sky gnats to each wave. Each defeated gnat pays +6 petals; keep anti-air coverage ready.', type: 'flyer', count: 2, rewardBonus: 6, interval: 0.42, lane: 'air', telegraph: 'Sky patrol · airborne pests bypass ground blockers' }),
  ironEscort: Object.freeze({ label: 'Iron escort', description: 'Add an armored beetle to each wave. Defeating it pays +12 petals; bring focused damage or armor break.', type: 'armored', count: 1, rewardBonus: 12, interval: 0.5, lane: 'ground', telegraph: 'Iron escort · armored pest resists ordinary hits' }),
  burrowRush: Object.freeze({ label: 'Burrow rush', description: 'Add two burrowers to each wave. Each defeated burrower pays +5 petals; area control can catch them above ground.', type: 'burrower', count: 2, rewardBonus: 5, interval: 0.48, lane: 'ground', telegraph: 'Burrow rush · burrowers surface briefly to attack' })
});

export const ENDLESS_CHOICE_INTERVAL = 5;
export const ENDLESS_THREAT_BUDGET = 220;
export const ENDLESS_ENEMY_CAP = 160;
export const ENDLESS_MIN_SPAWN_INTERVAL = 0.14;
// Population and spawn-rate pressure are capped; enemy durability and speed
// continue to rise, so Endless offers recurring tactical choices, not novel waves forever.

export function isEndlessChoice(value) {
  return typeof value === 'string' && Object.hasOwn(ENDLESS_CHOICES, value);
}

export function endlessChoiceDue(wave) {
  return Number.isSafeInteger(wave) && wave > 0 && wave % ENDLESS_CHOICE_INTERVAL === 0;
}

export function endlessChoiceRequired({ challenge, wave, endlessChoiceWave }) {
  return challenge === 'endless' && endlessChoiceDue(wave) && endlessChoiceWave !== wave;
}

