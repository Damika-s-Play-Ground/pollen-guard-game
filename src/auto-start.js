export const AUTO_START_DELAY_MS = 5_000;

export function autoStartIsEligible({ enabled, wave, running, paused, hidden, gameOver, intermission, mandatoryChoice, held, modalOpen = false, tutorialActive = false } = {}) {
  return enabled === true && Number.isSafeInteger(wave) && wave > 0 && running !== true && paused !== true && hidden !== true &&
    gameOver !== true && modalOpen !== true && tutorialActive !== true && mandatoryChoice !== true && held !== true &&
    Number.isFinite(intermission) && intermission >= 0;
}

export function createAutoStartCountdown({ schedule = setTimeout, cancel = clearTimeout, now = Date.now, delayMs = AUTO_START_DELAY_MS, onLaunch = () => {}, onCountdown = () => {} } = {}) {
  let timeoutId = null, tickId = null, deadline = 0, runKey = null, stillEligible = () => false, activeDelayMs=delayMs;
  const clear = () => {
    if (timeoutId !== null) cancel(timeoutId);
    if (tickId !== null) cancel(tickId);
    timeoutId = null;
    tickId = null;
    deadline = 0;
  };
  const stop = () => { clear(); runKey = null; onCountdown(null); };
  const updateCountdown = () => {
    if (timeoutId === null) return;
    const seconds = Math.max(0, Math.ceil((deadline - now()) / 1000));
    onCountdown(seconds);
    if (seconds > 0) tickId = schedule(updateCountdown, Math.min(250, Math.max(1, deadline - now())));
    else tickId = null;
  };
  const update = ({ eligible, key, validate = () => eligible, delayMs:requestedDelayMs=activeDelayMs } = {}) => {
    if(Number.isFinite(requestedDelayMs)&&requestedDelayMs>0&&requestedDelayMs!==activeDelayMs){activeDelayMs=requestedDelayMs;clear();runKey=null;}
    if (!eligible) { stop(); return false; }
    if (timeoutId !== null && runKey === key) { stillEligible = validate; return true; }
    clear();
    runKey = key;
    stillEligible = validate;
    deadline = now() + activeDelayMs;
    onCountdown(Math.ceil(activeDelayMs / 1000));
    tickId = schedule(updateCountdown, 250);
    timeoutId = schedule(() => {
      clear();
      runKey = null;
      if (stillEligible()) onLaunch();
      onCountdown(null);
    }, activeDelayMs);
    return true;
  };
  return { update, cancel: stop };
}
