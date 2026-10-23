import { hashGameplayState } from './game-core.js';

export function createRunSaveSnapshot(fields) {
  const { shots, ...runFields } = fields;
  const run = {
    ...runFields,
    ...(runFields.version >= 12 ? { difficulty:runFields.difficulty ?? 'standard', challengeRules:runFields.challengeRules ?? [] } : {}),
    ...(runFields.version >= 13 ? { gateRoute:runFields.gateRoute ?? 'default', gateSwitchesRemaining:runFields.gateSwitchesRemaining ?? 0 } : {}),
    ...(runFields.version >= 14 ? { seedObjective:runFields.seedObjective ?? null } : {}),
    ...(runFields.version >= 15 ? { researchLoadout:runFields.researchLoadout ?? [] } : {}),
    ...(runFields.version >= 16 ? { relicLoadout:runFields.relicLoadout ?? [] } : {}),
    shots: shots.map(({ target, ...shot }) => ({ ...shot, targetId: shot.targetId ?? target?.id }))
  };
  run.stateHash = hashGameplayState(run);
  return run;
}
