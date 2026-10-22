import { RUN_SAVE_VERSION, hashGameplayState, normalizeRunSave } from './game-core.js';

export const RUN_EXPORT_FORMAT = 'pollen-guard-run';
export const RUN_EXPORT_VERSION = 1;

export function serializeRunExport(run) {
  return JSON.stringify({ format: RUN_EXPORT_FORMAT, formatVersion: RUN_EXPORT_VERSION, run }, null, 2);
}

export function parseRunExport(raw, maps, modes) {
  let file;
  try { file = JSON.parse(raw); } catch { return { ok: false, reason: 'invalid-json' }; }
  if (!file || typeof file !== 'object' || Array.isArray(file) || file.format !== RUN_EXPORT_FORMAT) return { ok: false, reason: 'invalid-format' };
  if (!Number.isSafeInteger(file.formatVersion) || file.formatVersion < 1) return { ok: false, reason: 'invalid-format-version' };
  if (file.formatVersion > RUN_EXPORT_VERSION) return { ok: false, reason: 'future-format' };
  if (!file.run || typeof file.run !== 'object' || Array.isArray(file.run)) return { ok: false, reason: 'missing-run' };
  if (Number.isSafeInteger(file.run.version) && file.run.version > RUN_SAVE_VERSION) return { ok: false, reason: 'future-run' };
  const run = normalizeRunSave(file.run, maps, modes);
  if (!run) return { ok: false, reason: 'invalid-run' };
  const { stateHash, ...unhashed } = run;
  run.stateHash = hashGameplayState(unhashed);
  return { ok: true, run };
}
