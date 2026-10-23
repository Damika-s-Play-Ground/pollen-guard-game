import { difficultyFor, normalizeChallengeRules } from './challenge-rules.js';

export const CHALLENGE_BOARD_VERSION = 1;
export const MAX_CHALLENGE_BESTS = 180;

const MODES = ['classic', 'sudden', 'thrifty', 'fog'];
const DIFFICULTIES = ['story', 'standard', 'veteran'];
const RULE_SETS = [[], ['swiftPests'], ['shortReach'], ['seedRecovery'], ['noSunflowers'], ['swiftPests', 'seedRecovery']];
export const CHALLENGE_SPELL_LOADOUT = Object.freeze(['bloom', 'snare', 'rootTrap']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  return hash >>> 0;
}

function utcDateParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('Challenge date must be a valid UTC date.');
  return { date, day: date.toISOString().slice(0, 10) };
}

export function challengePeriod(cadence, value = new Date()) {
  const { date, day } = utcDateParts(value);
  if (cadence === 'daily') return day;
  if (cadence !== 'weekly') throw new TypeError('Challenge cadence must be daily or weekly.');
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function randomFor(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function validChallengeId(value) {
  return typeof value === 'string' && /^v1-(daily|weekly)-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/.test(value);
}

export function generateBoardChallenge(cadence, value = new Date(), version = CHALLENGE_BOARD_VERSION) {
  if (version !== CHALLENGE_BOARD_VERSION) throw new TypeError('This challenge board version is not supported.');
  const period = challengePeriod(cadence, value);
  const seed = fnv1a(`pollen-guard:challenge-board:v${version}:${cadence}:${period}`);
  const random = randomFor(seed);
  let mode = MODES[Math.floor(random() * MODES.length)];
  let difficulty = DIFFICULTIES[Math.floor(random() * DIFFICULTIES.length)];
  let rules = [...RULE_SETS[Math.floor(random() * RULE_SETS.length)]];
  // Keep every authored rotation valid under the same production rule normalizer.
  if (!normalizeChallengeRules(rules, mode) || !difficultyFor(difficulty, mode)) {
    mode = 'classic'; rules = ['swiftPests'];
  }
  const seedHex = seed.toString(16).padStart(8, '0');
  return Object.freeze({ version, cadence, period, seed: seedHex, id: `v${version}-${cadence}-${period}-${seedHex}`, mapId:'meadow', mode, difficulty, rules:normalizeChallengeRules(rules,mode), spellLoadout:[...CHALLENGE_SPELL_LOADOUT] });
}

export function boardChallengeForRun({ id, mode, difficulty, rules, mapId, spellLoadout, guardianMode='none', researchLoadout=[], relicLoadout=[] }) {
  if (!validChallengeId(id) || mapId !== 'meadow' || guardianMode !== 'none' || researchLoadout.length !== 0 || relicLoadout.length !== 0) return null;
  const [, cadence, period] = id.match(/^v1-(daily|weekly)-(\d{4}-\d{2}-\d{2})-[0-9a-f]{8}$/) ?? [];
  if (!cadence) return null;
  try {
    const generated = generateBoardChallenge(cadence, `${period}T12:00:00Z`);
    const normalizedRules = normalizeChallengeRules(rules, mode);
    return generated.id === id && generated.mode === mode && generated.difficulty === difficulty && normalizedRules &&
      JSON.stringify(generated.rules) === JSON.stringify(normalizedRules) && JSON.stringify(generated.spellLoadout) === JSON.stringify(spellLoadout) ? generated : null;
  } catch { return null; }
}

function canonicalChallenge(challenge) {
  return JSON.stringify({ version: challenge.version, cadence: challenge.cadence, period: challenge.period, seed: challenge.seed,
    id: challenge.id, mapId:challenge.mapId, mode: challenge.mode, difficulty: challenge.difficulty, rules: challenge.rules, spellLoadout:challenge.spellLoadout });
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]{1,1200}$/.test(text)) return null;
  try {
    const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - text.length % 4) % 4));
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
  } catch { return null; }
}

export function exportChallengeCode(challenge) {
  if (!isValidBoardChallenge(challenge)) throw new TypeError('Challenge descriptor is invalid.');
  const payload = canonicalChallenge(challenge);
  const checksum = fnv1a(payload).toString(16).padStart(8, '0');
  return `PGC1-${toBase64Url(JSON.stringify({ challenge: JSON.parse(payload), checksum }))}`;
}

export function isValidBoardChallenge(value) {
  if (!isObject(value) || value.version !== CHALLENGE_BOARD_VERSION || !['daily', 'weekly'].includes(value.cadence) ||
      typeof value.period !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.period) || !validChallengeId(value.id) || value.mapId !== 'meadow' ||
      !/^[0-9a-f]{8}$/.test(value.seed) || !MODES.includes(value.mode) || !DIFFICULTIES.includes(value.difficulty) ||
      !Array.isArray(value.rules) || !normalizeChallengeRules(value.rules, value.mode) || !difficultyFor(value.difficulty, value.mode) ||
      JSON.stringify(value.spellLoadout) !== JSON.stringify(CHALLENGE_SPELL_LOADOUT)) return false;
  const [, prefix, cadence, period, seed] = value.id.match(/^(v1)-(daily|weekly)-(\d{4}-\d{2}-\d{2})-([0-9a-f]{8})$/) ?? [];
  if (prefix !== 'v1' || cadence !== value.cadence || period !== value.period || seed !== value.seed ||
      value.cadence === 'weekly' && new Date(`${value.period}T00:00:00Z`).getUTCDay() !== 1) return false;
  try { return challengePeriod(value.cadence, `${value.period}T12:00:00Z`) === value.period; }
  catch { return false; }
}

export function importChallengeCode(code) {
  if (typeof code !== 'string' || !code.startsWith('PGC1-')) return { ok: false, reason: 'Use a PGC1 challenge code.' };
  const decoded = fromBase64Url(code.slice(5));
  let payload;
  try { payload = decoded ? JSON.parse(decoded) : null; } catch { payload = null; }
  const challenge = payload?.challenge;
  if (!isObject(payload) || !isValidBoardChallenge(challenge)) return { ok: false, reason: 'That challenge code is invalid or unsupported.' };
  const canonical = canonicalChallenge(challenge);
  if (payload.checksum !== fnv1a(canonical).toString(16).padStart(8, '0') || exportChallengeCode(challenge) !== code) {
    return { ok: false, reason: 'That challenge code failed its integrity check.' };
  }
  const generated = generateBoardChallenge(challenge.cadence, `${challenge.period}T12:00:00Z`, challenge.version);
  if (canonicalChallenge(generated) !== canonical) return { ok: false, reason: 'The challenge does not match its published board date.' };
  return { ok: true, challenge: generated };
}

export function normalizeChallengeBests(value) {
  if (!isObject(value)) return {};
  const valid = [];
  for (const [id, record] of Object.entries(value)) {
    if (!validChallengeId(id) || !isObject(record) || !Number.isSafeInteger(record.wave) || record.wave < 0 || record.wave > 100000 ||
        !Number.isSafeInteger(record.popped) || record.popped < 0 || record.popped > 10000000 ||
        !Number.isSafeInteger(record.lives) || record.lives < 0 || record.lives > 100000 || typeof record.won !== 'boolean') continue;
    const [, cadence, period] = id.match(/^v1-(daily|weekly)-(\d{4}-\d{2}-\d{2})-[0-9a-f]{8}$/);
    try {
      if (challengePeriod(cadence, `${period}T12:00:00Z`) !== period) continue;
      if (cadence === 'weekly' && new Date(`${period}T00:00:00Z`).getUTCDay() !== 1) continue;
    } catch { continue; }
    valid.push([id, { won: record.won, wave: record.wave, popped: record.popped, lives: record.lives }]);
  }
  valid.sort(([left], [right]) => {
    const leftDate = left.match(/^v1-(?:daily|weekly)-(\d{4}-\d{2}-\d{2})-/)?.[1] ?? '';
    const rightDate = right.match(/^v1-(?:daily|weekly)-(\d{4}-\d{2}-\d{2})-/)?.[1] ?? '';
    return leftDate.localeCompare(rightDate) || left.localeCompare(right);
  });
  return Object.fromEntries(valid.slice(-MAX_CHALLENGE_BESTS));
}

export function recordChallengeBest(bests, challengeId, record) {
  if (!validChallengeId(challengeId)) return normalizeChallengeBests(bests);
  const current = normalizeChallengeBests(bests)[challengeId];
  const candidate = normalizeChallengeBests({ [challengeId]: record })[challengeId];
  if (!candidate) return normalizeChallengeBests(bests);
  const score = item => [Number(item.won), item.wave, item.lives, item.popped];
  if (current) {
    const a = score(candidate), b = score(current);
    for (let index = 0; index < a.length; index++) {
      if (a[index] !== b[index]) { if (a[index] < b[index]) return normalizeChallengeBests(bests); break; }
    }
  }
  return normalizeChallengeBests({ ...normalizeChallengeBests(bests), [challengeId]: candidate });
}
