export function snapshotCustomPracticeCheckpoint(run, maps) {
  if (!run || !Number.isInteger(run.wave) || run.wave < 1 || !maps[run.selectedMap]?.customMap) return null;
  return JSON.parse(JSON.stringify(run));
}

export function canRetryCustomPracticeCheckpoint(checkpoint, { maps, mapId, failedWave }) {
  return Boolean(checkpoint && Number.isInteger(checkpoint.wave) && checkpoint.wave >= 1 &&
    checkpoint.wave < failedWave && checkpoint.selectedMap === mapId && maps[mapId]?.customMap);
}
