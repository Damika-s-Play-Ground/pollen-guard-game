import { advanceFixedSteps, renderAlphaForClock } from './game-core.js';

export function shouldRenderBattleFrame({initialFramePending=false,running=false,terminalFramePending=false,wallClockEffects=false}={}) {
  return initialFramePending||running||terminalFramePending||wallClockEffects;
}

export function createTerminalRenderGate() {
  let terminalFrameRendered = false;
  return {
    shouldRender(terminal) {
      if (!terminal) {
        terminalFrameRendered = false;
        return false;
      }
      return !terminalFrameRendered;
    },
    markRendered(terminal) {
      if (terminal) terminalFrameRendered = true;
    }
  };
}

export function shouldContinueBattleLoop({visible=true,paused=false,running=false,intermission=0,wallClockEffects=false}={}) {
  if (!visible) return false;
  if (wallClockEffects) return true;
  return !paused && (running || (Number.isFinite(intermission) && intermission > 0));
}

export function createGameLoop({ requestFrame, clock, getFrameOptions, simulateStep, render, shouldRender = () => true, shouldContinue = () => true }) {
  let running = false;
  let framePending = false;
  let inFrame = false;

  function scheduleFrame() {
    if (!running || framePending) return;
    framePending = true;
    requestFrame(frame);
  }

  function frame(now) {
    framePending = false;
    if (!running) return;
    inFrame = true;
    try {
      const { paused = false, speed = 1 } = getFrameOptions();
      advanceFixedSteps(clock, now, { paused, speed }, simulateStep);
      const alpha=renderAlphaForClock(clock, paused);
      if(shouldRender({now,paused,speed,alpha}))render(alpha);
    } finally {
      inFrame = false;
      if (running && shouldContinue()) scheduleFrame();
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      scheduleFrame();
    },
    wake({ visible = true } = {}) {
      if (!running || inFrame || !visible) return false;
      scheduleFrame();
      return framePending;
    },
    stop() {
      running = false;
    },
    get running() {
      return running;
    }
  };
}
