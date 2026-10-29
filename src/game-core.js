import { BOSS_VARIANTS, validBossEncounter } from './boss-encounters.js';
import { combinationForPair } from './tower-combinations.js';
import { ACTION_LOG_VERSION, isValidActionLog, migrateActionLogV1 } from './action-log.js';
import { normalizeCombatPerformance } from './combat-performance.js';
import { DEFAULT_GAME_SPEED, GAME_SPEEDS, normalizeGameSpeed } from './simulation-speed.js';
import { LEGACY_WAVE_SCHEDULE_VERSION, PRE_BOSS_WAVE_SCHEDULE_VERSION, PRE_TACTICAL_ENEMY_SCHEDULE_VERSION, PRE_SHIELD_CARRIER_SCHEDULE_VERSION, PRE_BURROWER_SCHEDULE_VERSION, PRE_MIXED_TACTICAL_SCHEDULE_VERSION, PRE_AIR_ROUTE_SCHEDULE_VERSION, PRE_RIDGE_BALANCE_SCHEDULE_VERSION, WAVE_SCHEDULE_VERSION } from './waves.js';
import { validateGuardian } from './meadow-guardian.js';
import { DEFAULT_SPELL_LOADOUT, normalizeSpellLoadout, validSpellLoadout } from './spells.js';
import { DEFAULT_DIFFICULTY, difficultyFor, normalizeChallengeRules } from './challenge-rules.js';
import { defaultGateRoute, gateSwitchesForMap } from './gate-routes.js';
import { validSeedObjective } from './seed-objective.js';
import { applyResearchToTowerStats, validResearchLoadout } from './research-tree.js';
import { applyRelicsToTowerStats, validRelicLoadout } from './relics.js';
import { boardChallengeForRun, validChallengeId } from './challenge-board.js';
import { endlessChoiceDue, isEndlessChoice } from './endless-mode.js';

export const SIMULATION_STEP = 1 / 60;
export const RUN_SAVE_VERSION = 19;
const SUPPORT_STRUCTURE_SAVE_VERSION = 8;
const GUARDIAN_SAVE_VERSION = 9;
const TARGETED_SPELL_SAVE_VERSION = 10;
export const BASE_TOWER_LINK_RADIUS = 122;
const TERRAIN_ATTACKER_TYPES = new Set(['sprout','puff','thorn','gust','ember','briar']);
const MAX_FRAME_DELTA = 0.25;
const TOWER_TYPES = new Set(['sprout', 'dew', 'puff', 'thorn', 'sunflower', 'gust', 'ember', 'briar', 'pollenBeacon', 'compostTrap', 'pollinatorRelay']);
const SUPPORT_TOWER_TYPES = new Set(['pollenBeacon', 'compostTrap', 'pollinatorRelay']);
const ENEMY_TYPES = new Set(['mite', 'zip', 'armored', 'shield', 'splitter', 'flyer', 'crumb', 'boss', 'healer', 'carrier', 'burrower']);
const TARGET_MODES = new Set(['First', 'Last', 'Strongest', 'Weakest', 'Closest', 'Support']);

export function isUnsupportedRunVersion(value) {
  return Boolean(value && Number.isInteger(value.version) && value.version > RUN_SAVE_VERSION);
}

export function restoredRunMapId(run, maps) {
  return run && Object.hasOwn(maps, run.selectedMap) ? run.selectedMap : 'meadow';
}

export function interpolateNumber(previous, current, alpha) {
  if (!Number.isFinite(current)) return previous;
  if (!Number.isFinite(previous)) return current;
  const amount = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  return previous + (current - previous) * amount;
}

export function renderAlphaForClock(clock, paused = false) {
  if (paused || clock?.lastTime === null || !Number.isFinite(clock?.step) || clock.step <= 0) return 1;
  return Math.max(0, Math.min(1, clock.accumulator / clock.step));
}

export function canActivateTowerAbility({ running, enemyCount, gameOver, cooldownReady, usedThisWave = false }) {
  return Boolean(running && enemyCount > 0 && !gameOver && cooldownReady && !usedThisWave);
}

export function saleRefund(invested, baseCost) {
  const amount = Number.isFinite(invested) && invested >= 0 ? invested : baseCost;
  return Math.floor(amount * 0.68);
}

export function towerUpgradeCost(def, level, branch) {
  const branchCost = def?.branches?.[branch]?.[2];
  if (!Number.isFinite(branchCost) || level < 1 || level > 2) return 0;
  return branchCost + (level === 2 ? 65 : 0);
}

export function towerUpgradeQuote(tower, def) {
  const branch = tower.level === 1 ? tower.branchChoice : tower.branch;
  const cost = towerUpgradeCost(def, tower.level, branch);
  const investment = tower.invested || def.cost;
  const investedAfter = investment + cost;
  return { branch, cost, investment, investedAfter, refundAfter: saleRefund(investedAfter, def.cost) };
}

export function getEffectiveTowerStats(tower, { challenge = 'classic', challengeRules = [], linked = false, terrain = 'ground', researchLoadout = [], relicLoadout=[] } = {}, def) {
  const level = tower.level || 1, branch = tower.branch;
  const rangeBoost = level >= 2 && branch === 1
    ? (tower.type === 'thorn' ? (level >= 3 ? 1.5 : 1.35)
      : tower.type === 'gust' ? (level >= 3 ? 1.5 : 1.3) : 1)
    : 1;
  const range = (def.range || 0) * (challenge === 'fog' || challengeRules.includes('shortReach') ? 0.78 : 1) * rangeBoost;
  const twinBloom = tower.type === 'sprout' && branch === 0 && level >= 2;
  const splittingSeed = tower.type === 'sprout' && branch === 1 && level >= 2;
  const piercingPoint = tower.type === 'thorn' && branch === 0 && level >= 2;
  const rate = (def.rate || 0) * (twinBloom ? 0.68 * (level >= 3 ? 0.84 : 1) : 1) * (piercingPoint && level >= 3 ? 0.82 : 1) * (linked && tower.type === 'sprout' ? 0.88 : 1);
  const damage = (def.damage || 0) + (level >= 2 && branch === 1 && tower.type !== 'sprout' && tower.type !== 'dew' && tower.type !== 'puff' && tower.type !== 'thorn' && tower.type !== 'ember' ? 1 : 0) + (level >= 3 && tower.type !== 'sprout' && tower.type !== 'dew' && tower.type !== 'puff' && tower.type !== 'thorn' && tower.type !== 'ember' && tower.type !== 'briar' ? 1 : 0) + (tower.type === 'briar' && branch === 1 && level >= 3 ? 1 : 0);
  const terrainId=typeof terrain==='string'?terrain:terrain?.id||'ground';
  const stats={
    range,
    rate,
    damage: tower.type === 'sunflower' ? 0 : damage,
    splitTargets: splittingSeed ? (level >= 3 ? 3 : 2) : 0,
    splitRadius: splittingSeed ? (level >= 3 ? 62 : 48) : 0,
    splitDamage: splittingSeed ? (level >= 3 ? (def.damage || 0) : (def.damage || 0) * 0.8) : 0,
    splash: (def.splash || 0) + (tower.type === 'puff' && branch === 0 && level >= 2 ? 24 + (level >= 3 ? 24 : 0) : 0) + (tower.type === 'briar' && branch === 0 && level >= 2 ? 30 + (level >= 3 ? 20 : 0) : 0) + (tower.type === 'dew' && branch === 1 && level >= 2 ? 36 + (level >= 3 ? 16 : 0) : 0) + (tower.type === 'gust' && branch === 0 && level >= 3 ? 38 : 0),
    slow: (def.slow || 0) + (tower.type === 'dew' && branch === 0 && level >= 2 ? 1.5 + (level >= 3 ? 1.2 : 0) : 0) + (tower.type === 'dew' && branch === 1 && level >= 3 ? 0.3 : 0) + (tower.type === 'briar' && branch === 1 && level >= 2 ? 1.25 + (level >= 3 ? 0.5 : 0) : 0),
    stun: (def.stun || 0) + (tower.type === 'gust' && branch === 0 && level >= 2 ? 0.35 + (level >= 3 ? 0.25 : 0) : 0) + (tower.type === 'puff' && branch === 1 && level >= 2 ? 0.35 + (level >= 3 ? 0.5 : 0) : 0),
    push: (def.push || 0) * (tower.type === 'gust' && branch === 1 && level >= 2 ? (level >= 3 ? 2.5 : 1.8) : 1),
    poison: (def.poison || 0) + (tower.type === 'briar' && branch === 0 && level >= 2 ? 1.3 + (level >= 3 ? 0.7 : 0) : 0),
    poisonDamage: 1,
    burn: (def.burn || 0) + (tower.type === 'ember' && branch === 0 && level >= 2 ? 0.6 + (level >= 3 ? 0.5 : 0) : 0) + (tower.type === 'ember' && branch === 1 && level >= 2 ? 1.8 + (level >= 3 ? 1 : 0) : 0),
    burnDamage: tower.type === 'ember' && branch === 0 && level >= 2 ? (level >= 3 ? 3 : 2) : 1,
    pierce: piercingPoint,
    armorBreak: tower.type === 'thorn' && branch === 1 && level >= 3 ? 2 : (def.breakArmor || 0),
    income: def.income ? def.income + (tower.type === 'sunflower' && branch === 0 && level >= 2 ? 18 : 0) + (tower.type === 'sunflower' && branch === 0 && level >= 3 ? 20 : 0) : 0,
    allyLinkRadius: tower.type === 'sunflower' && branch === 1 && level >= 3 ? 225
      : tower.type === 'sunflower' && branch === 1 && level >= 2 ? 190
        : tower.type === 'sunflower' ? BASE_TOWER_LINK_RADIUS : 0
  };
  if(tower.type==='pollenBeacon')stats.buffMultiplier=def.buffMultiplier||1;
  if(terrainId==='fertile'){
    if(tower.type==='sunflower')stats.income+=3;
    else if(TERRAIN_ATTACKER_TYPES.has(tower.type))stats.rate*=.92;
  }else if(terrainId==='waterEdge'){
    if(tower.type==='dew'||tower.type==='briar')stats.slow*=1.15;
    if(tower.type==='briar')stats.poison*=1.15;
  }else if(terrainId==='elevated'&&TERRAIN_ATTACKER_TYPES.has(tower.type))stats.range*=1.12;
  applyResearchToTowerStats(stats,tower,researchLoadout);
  return applyRelicsToTowerStats(stats,tower,relicLoadout);
}

export function towersAreLinked(a, b, towerDefinitions, allTowers = [], researchLoadout = [],relicLoadout=[]) {
  const combination = combinationForPair(a, b);
  if (!combination) return false;
  const first = a.type === combination.towerTypes[0] ? a : b;
  const second = a.type === combination.towerTypes[1] ? a : b;
  const firstDefinition = towerDefinitions[first.type];
  if (!firstDefinition || !Number.isFinite(first.x) || !Number.isFinite(first.y) ||
      !Number.isFinite(second.x) || !Number.isFinite(second.y)) return false;
  const stats = getEffectiveTowerStats(first, {researchLoadout,relicLoadout}, firstDefinition);
  let radius = combination.id === 'golden-seeds'
    ? stats.allyLinkRadius || BASE_TOWER_LINK_RADIUS
    : Math.min(stats.range || combination.radius, combination.radius);
  if (combination.id === 'windcarved-thorns' && combination.relayRadius) {
    const relaySupportsPair = allTowers.some(relay => relay.type === 'pollinatorRelay' && relay !== a && relay !== b &&
      Math.hypot(relay.x - a.x, relay.y - a.y) <= combination.relayRange &&
      Math.hypot(relay.x - b.x, relay.y - b.y) <= combination.relayRange);
    if (relaySupportsPair) radius = combination.relayRadius;
  }
  return Math.hypot(first.x - second.x, first.y - second.y) < radius;
}

export function formatMapUnits(value) {
  return `${Number(value.toPrecision(12))} map units`;
}

export function describeTowerStatChanges(before, after) {
  const definitions = [
    ['damage', 'Damage/hit', value => String(value)],
    ['splitTargets', 'Nearby split targets', value => String(value)],
    ['splitDamage', 'Split damage', value => String(value)],
    ['splitRadius', 'Split reach', formatMapUnits],
    ['rate', 'Attacks/s', value => (value > 0 ? 1 / value : 0).toFixed(2)],
    ['range', 'Range', formatMapUnits],
    ['splash', 'Splash radius', formatMapUnits],
    ['slow', 'Slow', value => `${value.toFixed(2)}s`],
    ['stun', 'Stun', value => `${value.toFixed(2)}s`],
    ['push', 'Push distance', formatMapUnits],
    ['poison', 'Poison duration', value => `${value.toFixed(2)}s`],
    ['burn', 'Burn duration', value => `${value.toFixed(2)}s`],
    ['burnDamage', 'Burn damage/tick', value => String(value)],
    ['armorBreak', 'Armor-break duration', value => `${value.toFixed(2)}s`],
    ['income', 'Income/wave', value => String(value)],
    ['allyLinkRadius', 'Golden Seeds radius', value => `${value} map units`],
    ['pierce', 'Armor pierce', value => value ? 'Yes' : 'No']
  ];
  return definitions.filter(([key]) => before[key] !== after[key])
    .map(([key, label, format]) => `${label}: ${format(before[key] ?? 0)} → ${format(after[key] ?? 0)}`);
}

export class FixedStepClock {
  constructor(step = SIMULATION_STEP) {
    this.step = step;
    this.accumulator = 0;
    this.lastTime = null;
  }

  reset(now = null) {
    this.accumulator = 0;
    this.lastTime = now;
  }

  advance(now, { paused = false, speed = DEFAULT_GAME_SPEED } = {}) {
    if (paused) {
      this.reset();
      return 0;
    }
    if (!Number.isFinite(now)) {
      this.reset();
      return 0;
    }
    if (this.lastTime === null) {
      this.lastTime = now;
      return 0;
    }
    const elapsed = Math.max(0, Math.min(MAX_FRAME_DELTA, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.accumulator += elapsed * Math.max(0, Number(speed) || 0);
    const steps = Math.floor((this.accumulator + 1e-10) / this.step);
    this.accumulator -= steps * this.step;
    return steps;
  }
}

export function advanceFixedSteps(clock, now, options, simulate) {
  const steps = clock.advance(now, options);
  for (let tick = 0; tick < steps; tick++) simulate(clock.step);
  return steps;
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value).filter(key => value[key] !== undefined).sort();
    return `{${entries.map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashGameplayState(state) {
  const serialized = stableSerialize(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index++) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function validEntityList(value, maxLength, validate) {
  return value === undefined || (Array.isArray(value) && value.length <= maxLength && value.every(validate));
}

function finiteField(entity, key, min, max, optional = true) {
  return optional && entity[key] === undefined || Number.isFinite(entity[key]) && entity[key] >= min && entity[key] <= max;
}

function validId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function validTower(tower) {
  const supportType = SUPPORT_TOWER_TYPES.has(tower?.type);
  const trapStateValid = tower?.type === 'compostTrap'
    ? Array.isArray(tower.compostTriggeredIds) && tower.compostTriggeredIds.length <= 3 &&
      tower.compostTriggeredIds.every(validId) && new Set(tower.compostTriggeredIds).size === tower.compostTriggeredIds.length
    : !Object.hasOwn(tower || {}, 'compostTriggeredIds');
  return tower && typeof tower === 'object' && !Array.isArray(tower) && (tower.id === undefined || validId(tower.id)) &&
    TOWER_TYPES.has(tower.type) && finiteField(tower, 'x', -2000, 2000, false) && finiteField(tower, 'y', -2000, 2000, false) &&
    finiteField(tower, 'level', 1, 3, false) && Number.isInteger(tower.level) &&
    (tower.level === 1
      ? tower.branch === undefined || tower.branch === null || Number.isInteger(tower.branch) && tower.branch >= 0 && tower.branch <= 1
      : Number.isInteger(tower.branch) && tower.branch >= 0 && tower.branch <= 1) &&
    finiteField(tower, 'cooldown', 0, 3600) && finiteField(tower, 'abilityReadyAt', 0, 1e9) && finiteField(tower, 'abilityUsedWave', -1, 100000) &&
    finiteField(tower, 'invested', 0, 1e7) && TARGET_MODES.has(tower.targetMode ?? 'First') &&
    (tower.branchChoice === undefined || tower.branchChoice === null || Number.isInteger(tower.branchChoice) && tower.branchChoice >= 0 && tower.branchChoice <= 1) &&
    trapStateValid && (!supportType || tower.level === 1 && tower.branch == null && tower.branchChoice == null);
}

function validEnemy(enemy) {
  if (!enemy || typeof enemy !== 'object' || Array.isArray(enemy) || (enemy.id !== undefined && !validId(enemy.id)) || !ENEMY_TYPES.has(enemy.type)) return false;
  for (const [key, min, max, required] of [
    ['progress', 0, 1e8, true], ['hp', 0, 1e9, true], ['maxHp', 0, 1e9, true], ['shield', 0, 1e9, false],
    ['speed', 0, 1e6, true], ['radius', 0, 1000, true], ['reward', 0, 1e7, true], ['armor', 0, 1e7, false],
    ['slow', 0, 1e6, false], ['stun', 0, 1e6, false], ['push', 0, 1e6, false], ['burn', 0, 1e6, false],
    ['burnTick', 0, 1e6, false], ['burnDamage', 0, 1e7, false], ['poison', 0, 1e6, false],
    ['poisonTick', 0, 1e6, false], ['poisonDamage', 0, 1e7, false], ['armorBreak', 0, 1e6, false], ['supportFlash', 0, .45, false], ['wardFlash', 0, .45, false]
  ]) if (!finiteField(enemy, key, min, max, !required)) return false;
  for (const key of ['slowSourceTowerId','stunSourceTowerId','burnSourceTowerId','poisonSourceTowerId']) if (enemy[key] !== undefined && !validId(enemy[key])) return false;
  for (const key of ['slowSourceTowerType','stunSourceTowerType','burnSourceTowerType','poisonSourceTowerType']) if (enemy[key] !== undefined && !TOWER_TYPES.has(enemy[key])) return false;
  const bossFieldsValid = ['bossPhase', 'bossTelegraphTimer', 'bossRushTimer'].every(key =>
    enemy[key] === undefined || Number.isFinite(enemy[key]) && enemy[key] >= 0 && enemy[key] <= 3600) &&
    (enemy.bossPhase === undefined || Number.isInteger(enemy.bossPhase) && enemy.bossPhase <= 2) &&
    (enemy.bossVariant === undefined || Object.hasOwn(BOSS_VARIANTS, enemy.bossVariant)) &&
    (enemy.bossName === undefined || Object.values(BOSS_VARIANTS).some(variant=>variant.name===enemy.bossName)) &&
    (enemy.bossTelegraph === undefined || typeof enemy.bossTelegraph === 'string' && enemy.bossTelegraph.length <= 120) &&
    (enemy.bossPendingPhase === undefined || [1, 2].includes(enemy.bossPendingPhase)) &&
    (enemy.type === 'boss' || !['bossVariant', 'bossName', 'bossPhase', 'bossTelegraph', 'bossTelegraphTimer', 'bossRushTimer', 'bossPendingPhase'].some(key => Object.hasOwn(enemy, key)));
  const healerFieldsValid = enemy.type === 'healer'
    ? Number.isInteger(enemy.healerCharges) && enemy.healerCharges >= 0 && enemy.healerCharges <= 3 &&
      finiteField(enemy, 'healerCooldown', 0, 2.6, false) && finiteField(enemy, 'healerTelegraphTimer', 0, .75, false) &&
      !(enemy.healerCooldown > 0 && enemy.healerTelegraphTimer > 0) &&
      (enemy.healerCharges > 0 || enemy.healerCooldown === 0 && enemy.healerTelegraphTimer === 0)
    : !['healerCharges', 'healerCooldown', 'healerTelegraphTimer'].some(key => Object.hasOwn(enemy, key));
  const carrierFieldsValid = enemy.type === 'carrier'
    ? Number.isInteger(enemy.carrierCharges) && enemy.carrierCharges >= 0 && enemy.carrierCharges <= 2 &&
      finiteField(enemy, 'carrierCooldown', 0, 2.8, false) && finiteField(enemy, 'carrierTelegraphTimer', 0, .75, false) &&
      !(enemy.carrierCooldown > 0 && enemy.carrierTelegraphTimer > 0) &&
      (enemy.carrierCharges > 0 || enemy.carrierCooldown === 0 && enemy.carrierTelegraphTimer === 0)
    : !['carrierCharges', 'carrierCooldown', 'carrierTelegraphTimer'].some(key => Object.hasOwn(enemy, key));
  const seedCarrierFieldsValid = enemy.seedCarrier === undefined
    ? !['returning','carryingSeedId'].some(key=>Object.hasOwn(enemy,key))
    : enemy.seedCarrier===true && !enemy.boss && !enemy.flying && typeof enemy.returning==='boolean' &&
      (enemy.carryingSeedId===null||Number.isInteger(enemy.carryingSeedId)&&enemy.carryingSeedId>=1&&enemy.carryingSeedId<=9) &&
      (enemy.returning===(enemy.carryingSeedId!==null));
  const burrowerFieldsValid = enemy.type === 'burrower'
    ? finiteField(enemy, 'burrowCooldown', 0, 2.5, false) && finiteField(enemy, 'burrowTelegraphTimer', 0, .5, false) &&
      finiteField(enemy, 'burrowTimer', 0, .85, false) && !(enemy.burrowTelegraphTimer > 0 && enemy.burrowTimer > 0) &&
      !(enemy.burrowCooldown > 0 && (enemy.burrowTelegraphTimer > 0 || enemy.burrowTimer > 0))
    : !['burrowCooldown', 'burrowTelegraphTimer', 'burrowTimer'].some(key => Object.hasOwn(enemy, key));
  return bossFieldsValid && healerFieldsValid && carrierFieldsValid && seedCarrierFieldsValid && burrowerFieldsValid && enemy.hp > 0 && enemy.maxHp > 0 && Array.isArray(enemy.statusImmunities ?? []) &&
    (enemy.statusImmunities ?? []).every(name => typeof name === 'string') &&
    ['flying', 'boss', 'compostTrapTriggered'].every(key => enemy[key] === undefined || typeof enemy[key] === 'boolean') &&
    (enemy.resistances === undefined || (enemy.resistances && typeof enemy.resistances === 'object' && !Array.isArray(enemy.resistances) && Object.values(enemy.resistances).every(v => Number.isFinite(v) && v >= 0 && v <= 100))) &&
    (enemy.statusResistances === undefined || (enemy.statusResistances && typeof enemy.statusResistances === 'object' && !Array.isArray(enemy.statusResistances) && Object.values(enemy.statusResistances).every(v => Number.isFinite(v) && v >= 0 && v <= 100)));
}

function validShot(shot) {
  return shot && typeof shot === 'object' && !Array.isArray(shot) && validId(shot.id) && validId(shot.targetId) &&
    (shot.sourceTowerId === undefined || validId(shot.sourceTowerId)) && (shot.sourceTowerType === undefined || TOWER_TYPES.has(shot.sourceTowerType)) &&
    finiteField(shot, 'x', -2000, 2000, false) && finiteField(shot, 'y', -2000, 2000, false) &&
    finiteField(shot, 'r', 0.1, 100, false) && typeof shot.color === 'string' && /^#[\da-f]{6}$/i.test(shot.color) &&
    finiteField(shot, 'damage', 0, 1e7, false) && finiteField(shot, 'speed', 0, 1e7, false) &&
    finiteField(shot, 'splash', 0, 1e6) && finiteField(shot, 'splitTargets', 0, 16) && Number.isInteger(shot.splitTargets ?? 0) &&
    finiteField(shot, 'splitRadius', 0, 1e6) && finiteField(shot, 'splitDamage', 0, 1e7) &&
    finiteField(shot, 'slow', 0, 1e6) && finiteField(shot, 'stun', 0, 1e6) &&
    finiteField(shot, 'push', 0, 1e6) && finiteField(shot, 'burn', 0, 1e6) && finiteField(shot, 'poison', 0, 1e6) &&
    finiteField(shot, 'armorBreak', 0, 1e6) && finiteField(shot, 'burnDamage', 0, 1e7) && finiteField(shot, 'poisonDamage', 0, 1e7) &&
    ['canHitAir', 'pierce', 'splitProjectile'].every(key => shot[key] === undefined || typeof shot[key] === 'boolean') &&
    (shot.channel === undefined || ['physical', 'heat', 'toxin'].includes(shot.channel));
}

function validSpawn(item) {
  return typeof item === 'string' ? ENEMY_TYPES.has(item) : Boolean(item && typeof item === 'object' && !Array.isArray(item) && ENEMY_TYPES.has(item.type) &&
    finiteField(item, 'interval', 0, 60, false) && (item.lane === undefined || typeof item.lane === 'string') &&
    (item.telegraph === undefined || typeof item.telegraph === 'string') &&
    (item.seedCarrier===undefined||item.seedCarrier===true&&item.type!=='boss'&&item.lane!=='air'));
}

export function assignRunEntityIds(run) {
  const savedIds = [...(run.towers || []), ...(run.enemies || []), ...(run.shots || [])]
    .map(entity => entity.id).filter(validId);
  let nextId = Math.max(Number.isSafeInteger(run.nextEntityId) && run.nextEntityId > 0 ? run.nextEntityId : 1,
    Math.max(0, ...savedIds) + 1);
  const assign = entities => (entities || []).map(entity => entity.id === undefined ? { ...entity, id: nextId++ } : entity);
  run.towers = assign(run.towers);
  run.enemies = assign(run.enemies);
  run.shots = assign(run.shots);
  run.nextEntityId = nextId;
  return run;
}

export function normalizeRunSave(value, maps, modes) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.version !== undefined && ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, RUN_SAVE_VERSION].includes(value.version)) return null;
  const sourceVersion = value.version ?? 0;
  const finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  const selectedMap = value.selectedMap === undefined ? 'meadow' : value.selectedMap;
  const gateRoute=sourceVersion>=13?value.gateRoute:defaultGateRoute(maps[selectedMap]);
  const gateSwitchesRemaining=sourceVersion>=13?value.gateSwitchesRemaining:gateSwitchesForMap(maps[selectedMap]);
  const gateFieldsValid=sourceVersion>=13
    ? typeof gateRoute==='string' && (gateSwitchesForMap(maps[selectedMap])
      ? Object.hasOwn(maps[selectedMap]?.gateRoutes??{},gateRoute)
      : gateRoute==='default' && gateSwitchesRemaining===0) && Number.isInteger(gateSwitchesRemaining) && gateSwitchesRemaining>=0 && gateSwitchesRemaining<=2
    : !Object.hasOwn(value,'gateRoute')&&!Object.hasOwn(value,'gateSwitchesRemaining');
  const terrainRulesVersion=value.terrainRulesVersion;
  const challenge = value.challenge === undefined ? 'classic' : value.challenge;
  const difficulty=sourceVersion>=12?(value.difficulty??DEFAULT_DIFFICULTY):DEFAULT_DIFFICULTY;
  const challengeRules=sourceVersion>=12?(value.challengeRules??[]):[];
  const normalizedRules=normalizeChallengeRules(challengeRules,challenge);
  const seedRecoveryEnabled=Boolean(normalizedRules?.includes('seedRecovery'));
  const researchLoadout=sourceVersion>=15?value.researchLoadout:[];
  const relicLoadout=sourceVersion>=16?value.relicLoadout:[];
  const challengeBoardId=sourceVersion>=17?value.challengeBoardId:null;
  const endlessModifier=sourceVersion>=18?value.endlessModifier:null;
  const endlessChoiceWave=sourceVersion>=18?value.endlessChoiceWave:0;
  const economyRulesVersion=sourceVersion>=19?value.economyRulesVersion:0;
  const seedObjective=value.seedObjective;
  const seedObjectiveFieldsValid=sourceVersion>=14
    ? Object.hasOwn(value,'seedObjective')&&(seedRecoveryEnabled?validSeedObjective(seedObjective):seedObjective===null)
    : !Object.hasOwn(value,'seedObjective')&&!seedRecoveryEnabled;
  const guardianMode = value.guardianMode ?? 'none';
  const guardianFieldsValid = sourceVersion >= GUARDIAN_SAVE_VERSION
    ? Object.hasOwn(value, 'guardianMode') && Object.hasOwn(value, 'guardian') && ['none', 'guardian', 'ward'].includes(guardianMode) &&
      (guardianMode === 'guardian' ? validateGuardian(value.guardian, maps[selectedMap]?.path, 900, 540) : value.guardian == null)
    : !Object.hasOwn(value, 'guardianMode') && !Object.hasOwn(value, 'guardian');
  const spellLoadout = sourceVersion >= TARGETED_SPELL_SAVE_VERSION ? value.spellLoadout : DEFAULT_SPELL_LOADOUT;
  const rejuvenationField = value.rejuvenationField ?? null;
  const rejuvenationFieldValid = sourceVersion >= TARGETED_SPELL_SAVE_VERSION
    ? (rejuvenationField === null || rejuvenationField && typeof rejuvenationField === 'object' && !Array.isArray(rejuvenationField) &&
      Object.keys(rejuvenationField).sort().join(',') === 'duration,x,y' && Number.isFinite(rejuvenationField.x) && rejuvenationField.x>=0 && rejuvenationField.x<=900 &&
      Number.isFinite(rejuvenationField.y) && rejuvenationField.y>=0 && rejuvenationField.y<=540 && Number.isFinite(rejuvenationField.duration) && rejuvenationField.duration>0 && rejuvenationField.duration<=6)
    : !Object.hasOwn(value,'spellLoadout') && !Object.hasOwn(value,'rejuvenationField');
  const waveScheduleVersion = value.waveScheduleVersion === undefined
    ? (value.version >= 8 ? PRE_RIDGE_BALANCE_SCHEDULE_VERSION : value.version === 7 ? PRE_TACTICAL_ENEMY_SCHEDULE_VERSION : value.version === 6 ? PRE_BOSS_WAVE_SCHEDULE_VERSION : LEGACY_WAVE_SCHEDULE_VERSION)
    : value.waveScheduleVersion;
  const optionalFinite = (key, min, max) => value[key] === undefined || finite(value[key], min, max);
  if ((value.selectedMap !== undefined && (typeof value.selectedMap !== 'string' || !Object.hasOwn(maps, value.selectedMap))) || !gateFieldsValid || !guardianFieldsValid ||
      (sourceVersion >= TARGETED_SPELL_SAVE_VERSION && Object.hasOwn(value,'spellLoadout') && !validSpellLoadout(spellLoadout)) || !rejuvenationFieldValid ||
      (value.challenge !== undefined && (typeof value.challenge !== 'string' || !Object.hasOwn(modes, value.challenge))) ||
      !difficultyFor(difficulty,challenge) || !normalizedRules || !seedObjectiveFieldsValid ||
      (sourceVersion>=15?(!Object.hasOwn(value,'researchLoadout')||!validResearchLoadout(researchLoadout)||researchLoadout.length>0&&(challenge!=='classic'||difficulty!=='standard'||normalizedRules.length>0)):Object.hasOwn(value,'researchLoadout')) ||
      (sourceVersion>=16?(!Object.hasOwn(value,'relicLoadout')||!validRelicLoadout(relicLoadout)||relicLoadout.length>0&&(challenge!=='classic'||difficulty!=='standard'||normalizedRules.length>0)):Object.hasOwn(value,'relicLoadout')) ||
      (sourceVersion>=17?(!Object.hasOwn(value,'challengeBoardId')||challengeBoardId!==null&&(!validChallengeId(challengeBoardId)||!boardChallengeForRun({id:challengeBoardId,mode:challenge,difficulty,rules:normalizedRules,mapId:selectedMap,spellLoadout,guardianMode,researchLoadout,relicLoadout}))):Object.hasOwn(value,'challengeBoardId')) ||
      (sourceVersion>=18?(!Object.hasOwn(value,'endlessModifier')||!Object.hasOwn(value,'endlessChoiceWave')||!Number.isSafeInteger(endlessChoiceWave)||endlessChoiceWave<0||endlessChoiceWave>(Number.isSafeInteger(value.wave)?value.wave:-1)||endlessChoiceWave>0&&!endlessChoiceDue(endlessChoiceWave)||endlessModifier!==null&&!isEndlessChoice(endlessModifier)||endlessModifier!==null&&endlessChoiceWave===0||endlessModifier===null&&endlessChoiceWave>0||challenge!=='endless'&&(endlessModifier!==null||endlessChoiceWave!==0)):Object.hasOwn(value,'endlessModifier')||Object.hasOwn(value,'endlessChoiceWave')) ||
      (sourceVersion>=19?(!Object.hasOwn(value,'economyRulesVersion')||![0,1].includes(economyRulesVersion)):Object.hasOwn(value,'economyRulesVersion')) ||
      !optionalFinite('bloomCharge', 0, 100) || !optionalFinite('spawnClock', 0, 60) ||
      !optionalFinite('intermission', 0, 3600) || !optionalFinite('gameTime', 0, 1e9) ||
      (value.speed !== undefined && !GAME_SPEEDS.includes(value.speed)) ||
      (sourceVersion>=11 && (!Object.hasOwn(value,'terrainRulesVersion') || ![0,1].includes(terrainRulesVersion))) ||
      (sourceVersion<11 && terrainRulesVersion!==undefined && ![0,1].includes(terrainRulesVersion)) ||
      ![LEGACY_WAVE_SCHEDULE_VERSION, PRE_BOSS_WAVE_SCHEDULE_VERSION, PRE_TACTICAL_ENEMY_SCHEDULE_VERSION, PRE_SHIELD_CARRIER_SCHEDULE_VERSION, PRE_BURROWER_SCHEDULE_VERSION, PRE_MIXED_TACTICAL_SCHEDULE_VERSION, PRE_AIR_ROUTE_SCHEDULE_VERSION, PRE_RIDGE_BALANCE_SCHEDULE_VERSION, WAVE_SCHEDULE_VERSION].includes(waveScheduleVersion) ||
      ['running', 'paused'].some(key => value[key] !== undefined && typeof value[key] !== 'boolean')) return null;
  if (!finite(value.cash, 0, 1_000_000) || !finite(value.lives, 0, 100_000) ||
      !finite(value.wave, 0, 100_000) || !finite(value.popped, 0, 10_000_000)) return null;
  if (!validEntityList(value.towers, 500, validTower) || !validEntityList(value.enemies, 10_000, validEnemy) ||
      !validEntityList(value.shots, 10_000, validShot) || !validEntityList(value.spawnQueue, 10_000, validSpawn)) return null;
  if (sourceVersion < SUPPORT_STRUCTURE_SAVE_VERSION && (value.towers || []).some(tower => SUPPORT_TOWER_TYPES.has(tower.type))) return null;
  if ((value.enemies || []).some(enemy => !validBossEncounter(enemy, waveScheduleVersion, selectedMap) ||
      enemy.type === 'healer' && waveScheduleVersion < PRE_SHIELD_CARRIER_SCHEDULE_VERSION || enemy.type === 'carrier' && waveScheduleVersion < PRE_BURROWER_SCHEDULE_VERSION || enemy.type === 'burrower' && waveScheduleVersion < PRE_MIXED_TACTICAL_SCHEDULE_VERSION) ||
      (value.spawnQueue || []).some(item => {
        const type = typeof item === 'string' ? item : item.type;
        return type === 'healer' && waveScheduleVersion < PRE_SHIELD_CARRIER_SCHEDULE_VERSION || type === 'carrier' && waveScheduleVersion < PRE_BURROWER_SCHEDULE_VERSION || type === 'burrower' && waveScheduleVersion < PRE_MIXED_TACTICAL_SCHEDULE_VERSION;
      })) return null;
  if(seedRecoveryEnabled&&sourceVersion>=14){
    const marked=(value.enemies||[]).filter(enemy=>enemy.seedCarrier);
    if(marked.some(enemy=>enemy.carryingSeedId!==null&&!seedObjective.seeds.some(seed=>seed.id===enemy.carryingSeedId&&seed.state==='carried'&&seed.carrierId===enemy.id)))return null;
    for(const seed of seedObjective.seeds){
      const carriers=marked.filter(enemy=>enemy.carryingSeedId===seed.id);
      if(seed.state==='carried'&&(carriers.length!==1||carriers[0].id!==seed.carrierId)||seed.state!=='carried'&&carriers.length) return null;
    }
    if((value.spawnQueue||[]).some(item=>typeof item==='object'&&item.seedCarrier)&&!seedRecoveryEnabled)return null;
  }else if((value.enemies||[]).some(enemy=>enemy.seedCarrier)||(value.spawnQueue||[]).some(item=>typeof item==='object'&&item.seedCarrier))return null;
  const combatPerformance = normalizeCombatPerformance(value.combatPerformance);
  if (!combatPerformance) return null;
  let actionLog = value.actionLog ?? [];
  let actionLogVersion = value.actionLogVersion ?? ACTION_LOG_VERSION;
  if (actionLogVersion === 1) {
    actionLog = migrateActionLogV1(actionLog);
    if (!actionLog) return null;
    actionLogVersion = ACTION_LOG_VERSION;
  }
  const simulationTick = value.simulationTick ?? Math.round((value.gameTime ?? 0) / SIMULATION_STEP);
  if (!isValidActionLog(actionLog) || actionLogVersion !== ACTION_LOG_VERSION ||
      sourceVersion < SUPPORT_STRUCTURE_SAVE_VERSION && actionLog.some(action => action.type === 'placeTower' && SUPPORT_TOWER_TYPES.has(action.payload.towerType)) ||
      sourceVersion < GUARDIAN_SAVE_VERSION && actionLog.some(action => ['moveGuardian', 'guardianPulse'].includes(action.type)) ||
      sourceVersion < TARGETED_SPELL_SAVE_VERSION && actionLog.some(action => action.type === 'aimedSpell') ||
      sourceVersion < 13 && actionLog.some(action => action.type === 'switchGate') ||
      guardianMode !== 'guardian' && actionLog.some(action => ['moveGuardian', 'guardianPulse'].includes(action.type)) ||
      sourceVersion < SUPPORT_STRUCTURE_SAVE_VERSION && Object.values(combatPerformance.towers).some(tower => SUPPORT_TOWER_TYPES.has(tower.type)) ||
      (value.runSeed !== undefined && (!Number.isSafeInteger(value.runSeed) || value.runSeed < 0 || value.runSeed > 0xffff_ffff)) ||
      (value.seedVersion !== undefined && value.seedVersion !== 1) ||
      (value.actionLogComplete !== undefined && typeof value.actionLogComplete !== 'boolean') ||
      !Number.isSafeInteger(simulationTick) || simulationTick < 0 || simulationTick > 1e9 ||
      (actionLog.length && actionLog.at(-1).tick > simulationTick)) return null;
  const entities = [...(value.towers || []), ...(value.enemies || []), ...(value.shots || [])];
  const ids = entities.map(entity => entity.id).filter(id => id !== undefined);
  if (new Set(ids).size !== ids.length || (value.shots || []).some(shot => !(value.enemies || []).some(enemy => enemy.id === shot.targetId)) ||
      (value.nextEntityId !== undefined && (!Number.isSafeInteger(value.nextEntityId) || value.nextEntityId < Math.max(0, ...ids) + 1))) return null;
  if (value.stateHash !== undefined) {
    const unhashed = { ...value };
    delete unhashed.stateHash;
    if (typeof value.stateHash !== 'string' || value.stateHash !== hashGameplayState(unhashed)) return null;
  }
  const normalized = {
    ...value,
    version: RUN_SAVE_VERSION,
    terrainRulesVersion: sourceVersion>=11 ? terrainRulesVersion : 0,
    combatPerformance,
    seedVersion: 1,
    runSeed: value.runSeed ?? 0,
    actionLogVersion,
    actionLog,
    actionLogComplete: value.actionLogComplete ?? false,
    simulationTick,
    selectedMap,
    gateRoute,
    gateSwitchesRemaining,
    waveScheduleVersion,
    challenge,
    difficulty,
    challengeRules:normalizedRules,
    seedObjective:sourceVersion>=14?seedObjective:null,
    researchLoadout:sourceVersion>=15?[...researchLoadout]:[],
    relicLoadout:sourceVersion>=16?[...relicLoadout]:[],
    challengeBoardId:sourceVersion>=17?challengeBoardId:null,
    endlessModifier:sourceVersion>=18?endlessModifier:null,
    endlessChoiceWave:sourceVersion>=18?endlessChoiceWave:0,
    economyRulesVersion,
    cash: Math.floor(value.cash),
    lives: Math.floor(value.lives),
    wave: Math.floor(value.wave),
    popped: Math.floor(value.popped),
    bloomCharge: finite(value.bloomCharge ?? 0, 0, 100) ? value.bloomCharge ?? 0 : 0,
    towers: Array.isArray(value.towers) ? value.towers : [],
    enemies: Array.isArray(value.enemies) ? value.enemies : [],
    shots: Array.isArray(value.shots) ? value.shots : [],
    spawnQueue: Array.isArray(value.spawnQueue) ? value.spawnQueue : [],
    spawnClock: finite(value.spawnClock ?? 0, 0, 60) ? value.spawnClock ?? 0 : 0,
    running: Boolean(value.running),
    paused: Boolean(value.paused),
    intermission: finite(value.intermission ?? 0, 0, 3600) ? value.intermission ?? 0 : 0,
    speed: normalizeGameSpeed(value.speed),
    gameTime: finite(value.gameTime ?? 0, 0, 1e9) ? value.gameTime ?? 0 : 0
  };
  normalized.guardianMode = guardianMode;
  normalized.guardian = guardianMode === 'guardian' ? { ...value.guardian } : null;
  normalized.spellLoadout = normalizeSpellLoadout(spellLoadout);
  normalized.rejuvenationField = rejuvenationField ? { ...rejuvenationField } : null;
  delete normalized.stateHash;
  normalized.stateHash = hashGameplayState(normalized);
  return normalized;
}
