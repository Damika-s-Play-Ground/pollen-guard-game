import { replayRecordedRun } from './game-actions.js';

export const RUN_HISTORY_STORAGE_KEY = 'pollen-guard.history.v1';
export const RUN_HISTORY_VERSION = 1;
export const RUN_HISTORY_LIMIT = 20;
export const RUN_HISTORY_MAX_BYTES = 3_500_000;

function isRecord(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function validEntry(entry) {
  return isRecord(entry) && typeof entry.id === 'string' && entry.id.length <= 100 &&
    typeof entry.recordedAt === 'string' && Number.isFinite(Date.parse(entry.recordedAt)) &&
    typeof entry.mapId === 'string' && typeof entry.mapName === 'string' && entry.mapName.length <= 100 &&
    typeof entry.challenge === 'string' && typeof entry.difficulty === 'string' && Array.isArray(entry.rules) && entry.rules.every(rule=>typeof rule==='string'&&rule.length<=64) &&
    Number.isSafeInteger(entry.wave) && entry.wave >= 0 && Number.isSafeInteger(entry.popped) && entry.popped >= 0 &&
    Number.isSafeInteger(entry.lives) && entry.lives >= 0 && Number.isSafeInteger(entry.version) && entry.version > 0 &&
    Number.isSafeInteger(entry.leaks)&&entry.leaks>=0&&Array.isArray(entry.towers)&&entry.towers.every(tower=>isRecord(tower)&&typeof tower.type==='string'&&Number.isSafeInteger(tower.level)&&tower.level>=1&&tower.level<=3&&(tower.branch===null||Number.isSafeInteger(tower.branch)))&&
    typeof entry.actionLogComplete==='boolean'&&Number.isSafeInteger(entry.actionCount)&&entry.actionCount>=0&&typeof entry.stateHash==='string'&&
    (entry.milestones===undefined||Array.isArray(entry.milestones)&&entry.milestones.every(value=>typeof value==='string'&&value.length<=100))&&
    ['won','lost'].includes(entry.outcome) && (entry.run === null || isRecord(entry.run));
}

export function normalizeRunHistory(value) {
  if (!isRecord(value) || value.version !== RUN_HISTORY_VERSION || !Array.isArray(value.entries)) return { version: RUN_HISTORY_VERSION, entries: [] };
  const entries=value.entries.filter(validEntry).slice(0,RUN_HISTORY_LIMIT).map(entry=>({...entry,milestones:Array.isArray(entry.milestones)?entry.milestones.filter(value=>typeof value==='string'&&value.length<=100):[]}));
  while(entries.length&&JSON.stringify({version:RUN_HISTORY_VERSION,entries}).length>RUN_HISTORY_MAX_BYTES)entries.pop();
  return { version: RUN_HISTORY_VERSION, entries };
}

export function recordCompletedRun(historyValue, run, { mapName, outcome, leaks = 0, milestones = [], recordedAt = new Date().toISOString() } = {}) {
  const history = normalizeRunHistory(historyValue);
  if (!isRecord(run) || !['won','lost'].includes(outcome) || typeof mapName !== 'string' || mapName.length > 100 ||
    !Number.isSafeInteger(leaks) || leaks < 0 || !Array.isArray(milestones) || milestones.some(value=>typeof value!=='string'||value.length>100) || !Number.isFinite(Date.parse(recordedAt))) return history;
  const id = `${recordedAt}:${run.stateHash || 'unhashed'}`.slice(0, 100);
  const rules = Array.isArray(run.challengeRules) ? [...run.challengeRules].sort() : [];
  const entry = { id, recordedAt, mapId: run.selectedMap, mapName, challenge: run.challenge, difficulty: run.difficulty || 'standard',
    rules, gateRoute: run.gateRoute || 'default', outcome, wave: run.wave, popped: run.popped, lives: run.lives, leaks, milestones:[...new Set(milestones)],
    version: run.version, terrainRulesVersion: run.terrainRulesVersion || 0, waveScheduleVersion: run.waveScheduleVersion || 0,
    stateHash: typeof run.stateHash === 'string' ? run.stateHash : '', actionLogComplete: run.actionLogComplete === true,
    actionCount: Array.isArray(run.actionLog) ? run.actionLog.length : 0,
    towers: Array.isArray(run.towers) ? run.towers.map(tower => ({ type: tower.type, level: tower.level, branch: tower.branch ?? null })) : [],
    run: JSON.parse(JSON.stringify(run)) };
  const entries = [entry, ...history.entries.filter(old => old.id !== id)].slice(0, RUN_HISTORY_LIMIT);
  let next = { version: RUN_HISTORY_VERSION, entries };
  while (entries.length > 1 && JSON.stringify(next).length > RUN_HISTORY_MAX_BYTES) { entries.pop(); next = { version: RUN_HISTORY_VERSION, entries: [...entries] }; }
  if (JSON.stringify(next).length > RUN_HISTORY_MAX_BYTES||!validEntry(entry)) return history;
  return next;
}

export function compareRunCompatibility(a, b) {
  if (!validEntry(a) || !validEntry(b)) return { compatible: false, reason: 'Run summary is incomplete.' };
  const same = a.mapId === b.mapId && a.challenge === b.challenge && a.difficulty === b.difficulty &&
    JSON.stringify(a.rules) === JSON.stringify(b.rules) && a.version === b.version &&
    a.terrainRulesVersion === b.terrainRulesVersion && a.waveScheduleVersion === b.waveScheduleVersion;
  return same ? { compatible: true } : { compatible: false, reason: 'Runs use different maps, rules, or simulation versions.' };
}

export function compareRunSummaries(a, b) {
  const compatibility=compareRunCompatibility(a,b);
  if(!compatibility.compatible)return compatibility;
  const first=new Set(a.milestones||[]),second=new Set(b.milestones||[]);
  return {compatible:true,firstOnly:[...first].filter(id=>!second.has(id)).sort(),secondOnly:[...second].filter(id=>!first.has(id)).sort()};
}

export function verifyRecordedReplay(entry, context) {
  if (!validEntry(entry) || !entry.actionLogComplete || !entry.run?.actionLogComplete) return { verified: false, reason: 'This run has no complete deterministic action log.' };
  try {
    const result = replayRecordedRun(entry.run, context);
    return result.hash === entry.stateHash ? { verified: true, hash: result.hash, run: result.run } : { verified: false, reason: 'Replay result differs from the recorded final state.', hash: result.hash };
  } catch (error) {
    return { verified: false, reason: `Replay is incompatible with this version: ${error.message}` };
  }
}
