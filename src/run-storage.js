import { isUnsupportedRunVersion, normalizeRunSave } from './game-core.js';

function parseStoredRun(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function isValidStoredRun(raw, maps, modes) {
  return Boolean(normalizeRunSave(parseStoredRun(raw), maps, modes));
}

export function clearRunBackupAfterReset(storage, primaryKey, backupKey) {
  let primary, backup;
  try {
    primary = parseStoredRun(storage.getItem(primaryKey));
    backup = parseStoredRun(storage.getItem(backupKey));
  } catch {
    return { cleared: false, reason: 'read-failed' };
  }
  if (isUnsupportedRunVersion(primary) || isUnsupportedRunVersion(backup)) {
    return { cleared: false, reason: 'future-version' };
  }
  try {
    storage.removeItem(backupKey);
    return { cleared: true };
  } catch {
    return { cleared: false, reason: 'remove-failed' };
  }
}

export function selectRecoverableRun(primaryRaw, backupRaw, maps, modes) {
  const primary = parseStoredRun(primaryRaw);
  if (isUnsupportedRunVersion(primary)) return { run: null, source: 'future', raw: primary };
  const primaryRun = normalizeRunSave(primary, maps, modes);
  if (primaryRun) return { run: primaryRun, source: 'primary', raw: primary };

  const backup = parseStoredRun(backupRaw);
  if (isUnsupportedRunVersion(backup)) return { run: null, source: 'future-backup', raw: backup };
  const backupRun = normalizeRunSave(backup, maps, modes);
  if (backupRun) return { run: backupRun, source: 'backup', raw: backup };
  return { run: null, source: 'none', raw: primary };
}

export function runHasGameplayProgress(run) {
  if (!run || typeof run !== 'object') return false;
  return Boolean(run.wave>0||run.towers?.length||run.enemies?.length||run.shots?.length||run.spawnQueue?.length||run.actionLog?.length||run.popped>0);
}

export function writeRunWithBackup(storage, primaryKey, backupKey, nextRaw, maps, modes) {
  const nextRun = parseStoredRun(nextRaw);
  if (isUnsupportedRunVersion(nextRun)) return { saved: false, reason: 'future-next' };
  if (!normalizeRunSave(nextRun, maps, modes)) return { saved: false, reason: 'invalid-next' };

  let primaryRaw;
  try {
    primaryRaw = storage.getItem(primaryKey);
  } catch {
    return { saved: false, reason: 'read-failed' };
  }
  const primary = parseStoredRun(primaryRaw);
  if (isUnsupportedRunVersion(primary)) return { saved: false, reason: 'future-primary' };

  let backupUpdated = false;
  if (isValidStoredRun(primaryRaw, maps, modes)) {
    try {
      const backup = parseStoredRun(storage.getItem(backupKey));
      if (isUnsupportedRunVersion(backup)) return { saved: false, reason: 'future-backup', preservedPrimary: true };
      storage.setItem(backupKey, primaryRaw);
      backupUpdated = true;
    } catch {
      return { saved: false, reason: 'backup-write-failed', preservedPrimary: true };
    }
  }
  try {
    storage.setItem(primaryKey, nextRaw);
    return { saved: true, backupUpdated };
  } catch {
    return { saved: false, reason: 'primary-write-failed', preservedPrimary: isValidStoredRun(primaryRaw, maps, modes) || backupUpdated, backupUpdated };
  }
}
