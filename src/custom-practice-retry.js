export function snapshotCustomPracticeCheckpoint(run, maps) {
  if (!run || !Number.isInteger(run.wave) || run.wave < 1 || !maps[run.selectedMap]?.customMap) return null;
  return JSON.parse(JSON.stringify(run));
}

export function canRetryCustomPracticeCheckpoint(checkpoint, { maps, mapId, failedWave }) {
  return Boolean(checkpoint && Number.isInteger(checkpoint.wave) && checkpoint.wave >= 1 &&
    checkpoint.wave < failedWave && checkpoint.selectedMap === mapId && maps[mapId]?.customMap);
}

export function customPracticeRetryCopy(checkpoint) {
  const wave=Number.isInteger(checkpoint?.wave)&&checkpoint.wave>=1?checkpoint.wave:null;
  return wave===null
    ? {button:'Retry from last clear · Practice only',note:'Custom-map play does not award campaign progression or canonical scores.'}
    : {button:`Retry after wave ${wave} · Practice only`,note:`Custom-map practice does not award campaign progression or canonical scores. Retry restores the exact state after wave ${wave}.`};
}
