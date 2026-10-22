import { createMeadowGuardian } from './meadow-guardian.js';

export function createMissionKitState({ challenge, guardianMode = 'none', path, width = 900, height = 540, modeDefinitions }) {
  const configuration = modeDefinitions[challenge];
  if (!configuration) throw new TypeError('Mission challenge is unknown.');
  return {
    lives: configuration.lives + (guardianMode === 'ward' ? 2 : 0),
    guardian: guardianMode === 'guardian' ? createMeadowGuardian(path, width, height) : null
  };
}
