// Reward-rule revisions are separate from wave schedules so historical action
// logs keep their original launch bonus while new runs use a fixed reward budget.
export const LEGACY_WAVE_REWARD_RULES_VERSION = 1;
export const WAVE_REWARD_RULES_VERSION = 2;

export function waveLaunchBonus({ rewardRulesVersion = LEGACY_WAVE_REWARD_RULES_VERSION, early = false, intermission = 0 } = {}) {
  if (rewardRulesVersion >= WAVE_REWARD_RULES_VERSION) return 0;
  return early && intermission > 0 ? Math.max(1, Math.ceil(intermission)) : 0;
}

export function waveClearBonus(waveNumber, rewardRulesVersion = LEGACY_WAVE_REWARD_RULES_VERSION) {
  if (!Number.isSafeInteger(waveNumber) || waveNumber < 1) throw new RangeError('Wave number must be a positive integer.');
  // The old 12-second early-call bonus averaged six petals. New rules move
  // that midpoint into a fixed clear reward after the first wave.
  return 12 + waveNumber * 2 + (rewardRulesVersion >= WAVE_REWARD_RULES_VERSION && waveNumber > 1 ? 6 : 0);
}
