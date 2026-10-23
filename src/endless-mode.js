export const ENDLESS_CHOICES = Object.freeze({
  skyPatrol: Object.freeze({ label: 'Sky patrol', description: 'Add a pair of Sky gnats to each wave. Keep anti-air coverage ready.', type: 'flyer', count: 2, interval: 0.42, lane: 'air', telegraph: 'Sky patrol · airborne pests bypass ground blockers' }),
  ironEscort: Object.freeze({ label: 'Iron escort', description: 'Add an armored beetle to each wave. Bring focused damage or armor break.', type: 'armored', count: 1, interval: 0.5, lane: 'ground', telegraph: 'Iron escort · armored pest resists ordinary hits' }),
  burrowRush: Object.freeze({ label: 'Burrow rush', description: 'Add two burrowers to each wave. Area control and timed spells can catch them above ground.', type: 'burrower', count: 2, interval: 0.48, lane: 'ground', telegraph: 'Burrow rush · burrowers surface briefly to attack' })
});

export const ENDLESS_CHOICE_INTERVAL = 5;
export const ENDLESS_THREAT_BUDGET = 220;
export const ENDLESS_ENEMY_CAP = 160;
export const ENDLESS_MIN_SPAWN_INTERVAL = 0.14;

export function isEndlessChoice(value) {
  return typeof value === 'string' && Object.hasOwn(ENDLESS_CHOICES, value);
}

export function endlessChoiceDue(wave) {
  return Number.isSafeInteger(wave) && wave > 0 && wave % ENDLESS_CHOICE_INTERVAL === 0;
}

export function endlessChoiceRequired({ challenge, wave, endlessChoiceWave }) {
  return challenge === 'endless' && endlessChoiceDue(wave) && endlessChoiceWave !== wave;
}

