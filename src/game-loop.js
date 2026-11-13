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

export function createGameLoop({ requestFrame, clock, getFrameOptions, simulateStep, render, shouldRender = () => true }) {
  let running = false;

  function frame(now) {
    if (!running) return;
    requestFrame(frame);
    const { paused = false, speed = 1 } = getFrameOptions();
    advanceFixedSteps(clock, now, { paused, speed }, simulateStep);
    const alpha=renderAlphaForClock(clock, paused);
    if(shouldRender({now,paused,speed,alpha}))render(alpha);
  }

  return {
    start() {
      if (running) return;
      running = true;
      requestFrame(frame);
    },
    stop() {
      running = false;
    },
    get running() {
      return running;
    }
  };
}
