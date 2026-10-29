export const AUTO_START_DELAY_MS = 5_000;

/** A wall-clock Auto-start timer. Eligibility is supplied by the game shell. */
export function createAutoStartController({ now = () => Date.now(), delayMs = AUTO_START_DELAY_MS } = {}) {
  let enabled = false;
  let eligible = false;
  let pending = false;
  let completedWave = null;
  let heldWave = null;
  let deadline = null;

  const snapshot = () => ({
    enabled,
    eligible,
    pending,
    held: completedWave !== null && heldWave === completedWave,
    remainingMs: deadline === null ? (pending ? delayMs : 0) : Math.max(0, deadline - now()),
    completedWave
  });

  return {
    snapshot,
    setEnabled(value) {
      const next = value === true;
      if (next !== enabled) heldWave = null;
      enabled = next;
      if (!enabled) {
        pending = false;
        completedWave = null;
        deadline = null;
      }
      return snapshot();
    },
    setEligible(value) {
      const next = value === true;
      if (next === eligible) return snapshot();
      eligible = next;
      if (!eligible) deadline = null;
      else if (pending) deadline = now() + delayMs;
      return snapshot();
    },
    afterWaveClear(wave) {
      if (!Number.isSafeInteger(wave) || wave < 1) return snapshot();
      if (heldWave !== wave) heldWave = null;
      completedWave = wave;
      pending = enabled && heldWave !== wave;
      deadline = pending && eligible ? now() + delayMs : null;
      return snapshot();
    },
    hold() {
      if (!pending || completedWave === null) return false;
      heldWave = completedWave;
      pending = false;
      deadline = null;
      return true;
    },
    manualLaunch() {
      pending = false;
      completedWave = null;
      heldWave = null;
      deadline = null;
      return snapshot();
    },
    tick(onLaunch) {
      if (!pending || !eligible || deadline === null || now() < deadline) return false;
      const wave = completedWave;
      pending = false;
      completedWave = null;
      deadline = null;
      onLaunch?.(wave);
      return true;
    }
  };
}
