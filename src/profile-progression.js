const RUN_ACHIEVEMENTS = Object.freeze([
  { id: 'first-pop', isEarned: ({ popped }) => popped > 0 },
  { id: 'builder', isEarned: ({ towerCount }) => towerCount >= 8 },
  { id: 'guardian', isEarned: ({ wave }) => wave >= 15 }
]);

const MAP_UNLOCKS = Object.freeze([
  { id: 'creek', minWave: 4 },
  { id: 'ridge', minWave: 9 }
]);

export function buildBestWaveRecord(profile, { challenge, selectedMap, wave }) {
  const key = `${challenge}:${selectedMap}`;
  return { key, value: Math.max(profile?.bestWave?.[key] || 0, wave) };
}

export function buildRunProgressEvents(profile, { challenge, selectedMap, wave, popped, towerCount }) {
  const events = [];
  const earned = new Set(profile?.achievements || []);
  const unlockedMaps = new Set(profile?.unlockedMaps || []);
  const facts = { wave, popped, towerCount };

  for (const achievement of RUN_ACHIEVEMENTS) {
    if (!earned.has(achievement.id) && achievement.isEarned(facts)) events.push({ type: 'achievement', id: achievement.id });
  }
  for (const map of MAP_UNLOCKS) {
    if (wave >= map.minWave && !unlockedMaps.has(map.id)) events.push({ type: 'map', id: map.id });
  }

  events.push({ type: 'bestWave', ...buildBestWaveRecord(profile, { challenge, selectedMap, wave }) });
  return events;
}
