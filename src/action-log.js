import { isSpellTargetValid } from './spells.js';
import { isEndlessChoice } from './endless-mode.js';

export const ACTION_LOG_VERSION = 2;
export const MAX_RUN_ACTIONS = 20_000;

const TOWER_TYPES = new Set(['sprout', 'dew', 'puff', 'thorn', 'sunflower', 'gust', 'ember', 'briar', 'pollenBeacon', 'compostTrap', 'pollinatorRelay']);
const TARGET_MODES = new Set(['First', 'Last', 'Strongest', 'Weakest', 'Closest', 'Support']);
const ACTION_TYPES = new Set(['placeTower', 'startWave', 'chooseEndlessModifier', 'chooseBranch', 'upgradeTower', 'setTarget', 'sellTower', 'towerAbility', 'bloom', 'snare', 'aimedSpell', 'moveGuardian', 'guardianPulse', 'switchGate']);

function validId(value) { return Number.isSafeInteger(value) && value > 0; }
function hasKeys(payload, keys) { return Object.keys(payload).length === keys.length && keys.every(key => Object.hasOwn(payload, key)); }
function validPayload(type, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  switch (type) {
    case 'placeTower': return hasKeys(payload, ['towerId', 'towerType', 'x', 'y']) && validId(payload.towerId) && TOWER_TYPES.has(payload.towerType) && Number.isFinite(payload.x) && payload.x >= 0 && payload.x <= 1000 && Number.isFinite(payload.y) && payload.y >= 0 && payload.y <= 600;
    case 'startWave': return hasKeys(payload, ['wave', 'early', 'bonus']) && Number.isSafeInteger(payload.wave) && payload.wave > 0 && payload.wave <= 100_000 && typeof payload.early === 'boolean' && Number.isSafeInteger(payload.bonus) && payload.bonus >= 0 && payload.bonus <= 3600;
    case 'chooseEndlessModifier': return hasKeys(payload,['modifierId'])&&isEndlessChoice(payload.modifierId);
    case 'chooseBranch': return hasKeys(payload, ['towerId', 'branch']) && validId(payload.towerId) && Number.isInteger(payload.branch) && payload.branch >= 0 && payload.branch <= 1;
    case 'upgradeTower': return hasKeys(payload, ['towerId', 'level', 'branch']) && validId(payload.towerId) && Number.isInteger(payload.level) && payload.level >= 2 && payload.level <= 3 && Number.isInteger(payload.branch) && payload.branch >= 0 && payload.branch <= 1;
    case 'setTarget': return hasKeys(payload, ['towerId', 'mode']) && validId(payload.towerId) && TARGET_MODES.has(payload.mode);
    case 'sellTower': return hasKeys(payload, ['towerId', 'refund']) && validId(payload.towerId) && Number.isSafeInteger(payload.refund) && payload.refund >= 0;
    case 'towerAbility': return hasKeys(payload, ['towerId']) && validId(payload.towerId);
    case 'moveGuardian': return hasKeys(payload, ['x', 'y']) && Number.isFinite(payload.x) && payload.x >= 0 && payload.x <= 900 && Number.isFinite(payload.y) && payload.y >= 0 && payload.y <= 540;
    case 'guardianPulse': return Object.keys(payload).length === 0;
    case 'switchGate': return hasKeys(payload, ['routeId']) && typeof payload.routeId === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(payload.routeId);
    case 'bloom': case 'snare': return Object.keys(payload).length === 0;
    case 'aimedSpell': return hasKeys(payload,['spellId','x','y','endX','endY']) && ['rootTrap','lineGust','rejuvenation'].includes(payload.spellId) &&
      Number.isFinite(payload.endX) && Number.isFinite(payload.endY) &&
      (payload.spellId==='lineGust' || payload.endX===payload.x && payload.endY===payload.y) && isSpellTargetValid(payload.spellId,payload,900,540);
    default: return false;
  }
}

export function isValidActionLog(actions) {
  if (!Array.isArray(actions) || actions.length > MAX_RUN_ACTIONS) return false;
  let priorTick = 0;
  for (const action of actions) {
    if (!action || typeof action !== 'object' || Array.isArray(action) || !Number.isSafeInteger(action.tick) || action.tick < 0 || action.tick > 1e9 || action.tick < priorTick ||
        !ACTION_TYPES.has(action.type) || !validPayload(action.type, action.payload)) return false;
    priorTick = action.tick;
  }
  return true;
}

export function appendTickAction(actions, tick, type, payload = {}) {
  if (!isValidActionLog(actions) || actions.length >= MAX_RUN_ACTIONS || !Number.isSafeInteger(tick) || tick < 0 || tick > 1e9 ||
      !ACTION_TYPES.has(type) || !validPayload(type, payload) || (actions.length && tick < actions.at(-1).tick)) return null;
  actions.push({ tick, type, payload: { ...payload } });
  return actions;
}

export class TickActionCursor {
  constructor(actions) {
    if (!isValidActionLog(actions)) throw new TypeError('Invalid tick action log');
    this.actions = actions.map(action => ({ tick: action.tick, type: action.type, payload: { ...action.payload } }));
    this.index = 0;
    this.lastTick = -1;
  }

  apply(tick, dispatch) {
    if (!Number.isSafeInteger(tick) || tick !== this.lastTick + 1 || typeof dispatch !== 'function') throw new TypeError('Action replay ticks must be applied sequentially');
    this.lastTick = tick;
    while (this.index < this.actions.length && this.actions[this.index].tick === tick) dispatch(this.actions[this.index++]);
    if (this.index < this.actions.length && this.actions[this.index].tick < tick) throw new Error('Action replay skipped a recorded tick');
  }
}

export function migrateActionLogV1(actions) {
  if (!Array.isArray(actions) || actions.some(action => !action || !Number.isSafeInteger(action.tick) || action.tick < 1)) return null;
  const migrated = actions.map(action => ({ ...action, tick: action.tick - 1, payload: { ...action.payload } }));
  return isValidActionLog(migrated) ? migrated : null;
}

export function createRunSeed() {
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else values[0] = (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) >>> 0;
  return values[0] || 1;
}
