import { advanceFixedSteps, renderAlphaForClock } from './game-core.js';

export function shouldRenderBattleFrame({initialFramePending=false,running=false,terminal=false,wallClockEffects=false}={}) {
  return initialFramePending||running||terminal||wallClockEffects;
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
