export const DEFAULT_DIFFICULTY = 'standard';

export const DIFFICULTIES = Object.freeze({
  story: Object.freeze({ label: 'Story', cashDelta: 40, livesDelta: 5, pressure: 0.85, spawnRate: 1.15 }),
  standard: Object.freeze({ label: 'Standard', cashDelta: 0, livesDelta: 0, pressure: 1, spawnRate: 1 }),
  veteran: Object.freeze({ label: 'Veteran', cashDelta: -35, livesDelta: -4, pressure: 1.15, spawnRate: 0.92 })
});

export const CHALLENGE_RULES = Object.freeze({
  shortReach: Object.freeze({ label: 'Short Reach', description: 'Tower range −22%' }),
  noSunflowers: Object.freeze({ label: 'No Sunflowers', description: 'Sunflower defenders are unavailable' }),
  swiftPests: Object.freeze({ label: 'Swift Pests', description: 'Pests arrive faster' }),
  seedRecovery: Object.freeze({ label: 'Seed Recovery', description: 'Marked ground pests take a cache seed halfway, turn back to the entry, and drop it when defeated; the seed returns after 1.2 seconds' })
});

const EXCLUSIONS = Object.freeze([
  ['noSunflowers', 'thrifty'],
  ['shortReach', 'fog']
]);

export function normalizeChallengeRules(rules, challenge = 'classic') {
  if (!Array.isArray(rules) || rules.length > Object.keys(CHALLENGE_RULES).length) return null;
  if (rules.some(rule => typeof rule !== 'string' || !Object.hasOwn(CHALLENGE_RULES, rule)) || new Set(rules).size !== rules.length) return null;
  if (EXCLUSIONS.some(([rule, mode]) => challenge === mode && rules.includes(rule))) return null;
  return [...rules].sort();
}

export function difficultyFor(id, challenge = 'classic') {
  const selected = DIFFICULTIES[id];
  if (!selected) return null;
  return selected;
}

export function tuneSpawnGroup(group, { difficulty = DEFAULT_DIFFICULTY, challengeRules = [] } = {}) {
  const preset = DIFFICULTIES[difficulty] || DIFFICULTIES[DEFAULT_DIFFICULTY];
  const swift = challengeRules.includes('swiftPests') ? 0.78 : 1;
  // Difficulty pressure scales escort groups, while authored boss counts stay fixed.
  const count = group.type === 'boss' ? group.count : Math.max(1, Math.ceil(group.count * preset.pressure));
  return { ...group, count, interval:Math.max(0.1,group.interval*preset.spawnRate*swift) };
}

export function adjustedSpawnGroups(groups, options = {}) {
  return groups.flatMap(group => {
    const tuned=tuneSpawnGroup(group,options);
    return Array.from({ length:tuned.count }, () => ({ type:tuned.type, interval:tuned.interval, lane:tuned.lane, telegraph:tuned.telegraph }));
  });
}
