import { advanceFixedSteps, renderAlphaForClock } from './game-core.js';

export function createGameLoop({ requestFrame, clock, getFrameOptions, simulateStep, render }) {
  let running = false;

  function frame(now) {
    if (!running) return;
    requestFrame(frame);
    const { paused = false, speed = 1 } = getFrameOptions();
    advanceFixedSteps(clock, now, { paused, speed }, simulateStep);
    render(renderAlphaForClock(clock, paused));
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
