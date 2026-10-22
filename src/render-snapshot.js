import { interpolateNumber } from './game-core.js';
import { createPathSampler } from './path-geometry.js';

function captureRenderSnapshot(enemies, shots) {
  const snapshot = new Map();
  for (const enemy of enemies) snapshot.set(`enemy:${enemy.id}`, { progress: enemy.progress, hp: enemy.hp, shield: enemy.shield });
  for (const shot of shots) snapshot.set(`shot:${shot.id}`, { x: shot.x, y: shot.y });
  return snapshot;
}

export function createRenderSnapshots() {
  let previous = new Map();
  let current = new Map();
  const enemyHitFlashes = new Map();
  const pathSamplers = new WeakMap();

  return {
    beginStep() { previous = current; },
    capture(enemies, shots) {
      current = captureRenderSnapshot(enemies, shots);
    },
    updateHitFlashes(enemies, dt) {
      for (const enemy of enemies) {
        const key = `enemy:${enemy.id}`, before = previous.get(key), after = current.get(key);
        if (before && after && (after.hp < before.hp || after.shield < before.shield)) enemyHitFlashes.set(enemy.id, .12);
        else if (enemyHitFlashes.has(enemy.id)) {
          const remaining = enemyHitFlashes.get(enemy.id) - dt;
          if (remaining > 0) enemyHitFlashes.set(enemy.id, remaining);
          else enemyHitFlashes.delete(enemy.id);
        }
      }
      for (const id of enemyHitFlashes.keys()) if (!enemies.some(enemy => enemy.id === id)) enemyHitFlashes.delete(id);
    },
    reset(enemies, shots) {
      current = captureRenderSnapshot(enemies, shots);
      previous = current;
      enemyHitFlashes.clear();
    },
    enemyPosition(enemy, path, alpha) {
      const enemyPath = typeof path === 'function' ? path(enemy) : path;
      if (!pathSamplers.has(enemyPath)) pathSamplers.set(enemyPath,createPathSampler(enemyPath));
      const samplePath=pathSamplers.get(enemyPath);
      const key = `enemy:${enemy.id}`, before = previous.get(key), after = current.get(key);
      return samplePath(before && after ? interpolateNumber(before.progress, after.progress, alpha) : enemy.progress);
    },
    shotPosition(shot, alpha) {
      const key = `shot:${shot.id}`, before = previous.get(key), after = current.get(key);
      return before && after ? {
        x: interpolateNumber(before.x, after.x, alpha),
        y: interpolateNumber(before.y, after.y, alpha)
      } : { x: shot.x, y: shot.y };
    },
    hitFlash(enemyId) { return enemyHitFlashes.get(enemyId) || 0; }
  };
}
