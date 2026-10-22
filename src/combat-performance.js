const MAX_COUNT = 1_000_000_000;
const finiteCount = value => Number.isFinite(value) && value >= 0 && value <= MAX_COUNT;

export function createCombatPerformance(complete = true) {
  return { version: 1, complete, towers: {}, enemies: {}, leaks: { total: 0, byType: {}, uncovered: 0, covered: 0, uncoveredByType: {}, coveredByType: {} } };
}

export function normalizeCombatPerformance(value) {
  if (value === undefined) return createCombatPerformance(false);
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || typeof value.complete !== 'boolean' ||
      !value.towers || typeof value.towers !== 'object' || Array.isArray(value.towers) ||
      !value.enemies || typeof value.enemies !== 'object' || Array.isArray(value.enemies) ||
      !value.leaks || typeof value.leaks !== 'object' || !finiteCount(value.leaks.total) ||
      !finiteCount(value.leaks.uncovered) || !finiteCount(value.leaks.covered) ||
      !value.leaks.byType || typeof value.leaks.byType !== 'object' || Array.isArray(value.leaks.byType) ||
      !value.leaks.uncoveredByType || typeof value.leaks.uncoveredByType !== 'object' || Array.isArray(value.leaks.uncoveredByType) ||
      !value.leaks.coveredByType || typeof value.leaks.coveredByType !== 'object' || Array.isArray(value.leaks.coveredByType)) return null;
  for (const [id, tower] of Object.entries(value.towers)) {
    if (!/^[1-9]\d*$/.test(id) || !tower || typeof tower !== 'object' || typeof tower.type !== 'string' ||
        !['sprout','dew','puff','thorn','sunflower','gust','ember','briar','pollenBeacon','compostTrap','pollinatorRelay'].includes(tower.type) ||
        (tower.level !== undefined && (!Number.isInteger(tower.level) || tower.level < 1 || tower.level > 3)) ||
        !['damage','kills','income','slowSeconds','stunSeconds'].every(key => finiteCount(tower[key] ?? 0))) return null;
  }
  for (const [type, enemy] of Object.entries(value.enemies)) {
    if (!/^(mite|zip|armored|shield|splitter|flyer|crumb|boss|healer|carrier|burrower)$/.test(type) || !enemy || typeof enemy !== 'object' ||
        !['damage','defeated','leaked'].every(key => finiteCount(enemy[key] ?? 0))) return null;
  }
  for (const counts of [value.leaks.byType, value.leaks.uncoveredByType, value.leaks.coveredByType])
    for (const [type, count] of Object.entries(counts)) if (!/^(mite|zip|armored|shield|splitter|flyer|crumb|boss|healer|carrier|burrower)$/.test(type) || !finiteCount(count)) return null;
  if (value.leaks.covered + value.leaks.uncovered !== value.leaks.total) return null;
  const sum = counts => Object.values(counts).reduce((total, count) => total + count, 0);
  if (sum(value.leaks.byType) !== value.leaks.total || sum(value.leaks.uncoveredByType) !== value.leaks.uncovered ||
      sum(value.leaks.coveredByType) !== value.leaks.covered || [...new Set([...Object.keys(value.leaks.byType), ...Object.keys(value.leaks.uncoveredByType), ...Object.keys(value.leaks.coveredByType)])].some(type =>
        value.leaks.byType[type] !== (value.leaks.uncoveredByType[type] || 0) + (value.leaks.coveredByType[type] || 0))) return null;
  return structuredClone(value);
}

function towerRecord(performance, towerId, type) {
  if (!performance || !Number.isSafeInteger(towerId) || towerId < 1) return null;
  const key = String(towerId);
  performance.towers[key] ||= { type, damage: 0, kills: 0, income: 0, slowSeconds: 0, stunSeconds: 0 };
  return performance.towers[key];
}

function enemyRecord(performance, enemy) {
  if (!performance || !enemy?.type) return null;
  performance.enemies[enemy.type] ||= { damage: 0, defeated: 0, leaked: 0 };
  return performance.enemies[enemy.type];
}

export function recordCombatDamage(performance, towerId, towerType, enemy, result) {
  if (!performance) return;
  const amount = Math.max(0, Number(result?.dealt) || 0) + Math.max(0, Number(result?.absorbed) || 0);
  if (!amount) return;
  enemyRecord(performance, enemy).damage += amount;
  const tower = towerRecord(performance, towerId, towerType);
  if (tower) tower.damage += amount;
  if ((result.hp ?? enemy?.hp) <= 0 && tower) tower.kills++;
}

export function registerCombatTower(performance, tower) {
  const record = towerRecord(performance, tower?.id, tower?.type);
  if (record) record.level = tower.level;
}

export function recordCombatControl(performance, towerId, towerType, kind, seconds) {
  const tower = towerRecord(performance, towerId, towerType);
  if (tower && (kind === 'slow' || kind === 'stun')) tower[`${kind}Seconds`] += Math.max(0, seconds);
}

export function recordTowerIncome(performance, towerId, towerType, amount) {
  const tower = towerRecord(performance, towerId, towerType);
  if (tower) tower.income += Math.max(0, Number(amount) || 0);
}

export function recordEnemyDefeat(performance, enemy) {
  if (!performance) return;
  const record = enemyRecord(performance, enemy);
  if (record) record.defeated++;
}

export function recordEnemyLeak(performance, enemy, covered) {
  if (!performance) return;
  const record = enemyRecord(performance, enemy);
  if (!record) return;
  record.leaked++;
  performance.leaks.total++;
  performance.leaks.byType[enemy.type] = (performance.leaks.byType[enemy.type] || 0) + 1;
  performance.leaks[covered ? 'covered' : 'uncovered']++;
  const key = covered ? 'coveredByType' : 'uncoveredByType';
  performance.leaks[key][enemy.type] = (performance.leaks[key][enemy.type] || 0) + 1;
}

const ENEMY_NAMES = { mite:'Moss mite', zip:'Zip mite', armored:'Armored beetle', shield:'Shield bug', splitter:'Splitter', flyer:'Sky gnat', crumb:'Splitter crumb', boss:'Bramble boss', healer:'Moss Tender', carrier:'Shield Carrier', burrower:'Burrower' };
const TOWER_NAMES = { sprout:'Sprout Slinger', dew:'Dew Bell', puff:'Puff Pod', thorn:'Thorn Beacon', sunflower:'Sunflower', gust:'Kite Keeper', ember:'Ember Moth', briar:'Briar Patch', pollenBeacon:'Pollen Beacon', compostTrap:'Compost Trap', pollinatorRelay:'Pollinator Relay' };
const rounded = value => Math.round((Number(value) || 0) * 10) / 10;

export function buildRunDebrief(performance, { mapName, challengeLabel, won }) {
  const source = normalizeCombatPerformance(performance) || createCombatPerformance(false);
  const towers = Object.entries(source.towers).map(([id, tower]) => ({ id:Number(id), ...tower, name:TOWER_NAMES[tower.type] || tower.type }))
    .sort((a, b) => b.damage - a.damage || b.kills - a.kills || a.id - b.id);
  const enemies = Object.entries(source.enemies).map(([type, enemy]) => ({ type, name:ENEMY_NAMES[type] || type, ...enemy }))
    .sort((a, b) => b.leaked - a.leaked || b.damage - a.damage || a.name.localeCompare(b.name));
  const totalDamage = enemies.reduce((sum, enemy) => sum + enemy.damage, 0);
  const totalKills = enemies.reduce((sum, enemy) => sum + enemy.defeated, 0);
  let suggestion = 'No measured targeting gap was recorded, so the run data does not support a specific placement suggestion.';
  if (!source.complete) suggestion = 'Contribution history is incomplete for this run because it began before combat reporting was available.';
  else if (source.leaks.uncoveredByType.flyer) {
    const count = source.leaks.uncoveredByType.flyer;
    suggestion = `${count} Sky gnat${count === 1 ? '' : 's'} leaked while no eligible anti-air defender covered the goal. Add or move anti-air coverage toward the exit.`;
  } else if (source.leaks.uncovered) {
    suggestion = `${source.leaks.uncovered} leaked enem${source.leaks.uncovered === 1 ? 'y had' : 'ies had'} no eligible defender in range at the goal. Extend coverage toward the exit.`;
  } else if (source.leaks.total) {
    suggestion = `${source.leaks.total} enem${source.leaks.total === 1 ? 'y leaked' : 'ies leaked'} despite eligible goal coverage; the recorded events cannot identify a timing or targeting cause.`;
  }
  return { mapName, challengeLabel, won, complete:source.complete, towers, enemies, totalDamage:rounded(totalDamage), totalKills,
    totalLeaks:source.leaks.total, uncoveredLeaks:source.leaks.uncovered,
    towerDamage:rounded(towers.reduce((sum, tower) => sum + tower.damage, 0)), otherDamage:rounded(totalDamage - towers.reduce((sum, tower) => sum + tower.damage, 0)), suggestion };
}

