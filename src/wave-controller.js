import { createAutoStartCountdown } from './auto-start.js';

export const WAVE_TRANSITION_PHASES = Object.freeze([
  'planning', 'running', 'countdown', 'held', 'modal', 'hidden', 'terminal'
]);

export function waveTransitionPhase(context = {}) {
  if (context.gameOver === true) return 'terminal';
  if (context.hidden === true) return 'hidden';
  if (context.modalOpen === true || context.tutorialActive === true) return 'modal';
  if (context.paused === true || context.held === true || context.mandatoryChoice === true) return 'held';
  if (context.running === true) return 'running';
  if (context.enabled === true && Number.isSafeInteger(context.wave) && context.wave > 0 &&
      Number.isFinite(context.intermission) && context.intermission >= 0) return 'countdown';
  return 'planning';
}

export function createWaveTransitionController({ getContext = () => ({}), schedule, cancel, now, delayMs, onLaunch, onCountdown } = {}) {
  let phase = 'planning';
  const countdown = createAutoStartCountdown({ schedule, cancel, now, delayMs, onLaunch, onCountdown });
  function sync(key = null) {
    const context = getContext();
    phase = waveTransitionPhase(context);
    countdown.update({
      eligible: phase === 'countdown',
      key,
      ...(Number.isSafeInteger(context.preparationSeconds)?{delayMs:context.preparationSeconds*1000}:{}),
      validate: () => waveTransitionPhase(getContext()) === 'countdown'
    });
    return phase;
  }
  function cancelCountdown() {
    phase = 'planning';
    countdown.cancel();
  }
  return { sync, cancel: cancelCountdown, get phase() { return phase; } };
}
