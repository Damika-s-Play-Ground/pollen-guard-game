import { interpolateNumber } from './game-core.js';
import { createPathSampler } from './path-geometry.js';

function createSnapshotBuffer() {
  return { enemies:new Map(), shots:new Map(), enemyRecords:[], shotRecords:[] };
}

function captureRenderSnapshot(enemies, shots, buffer) {
  const enemySnapshots=buffer.enemies,shotSnapshots=buffer.shots;
  enemySnapshots.clear();
  shotSnapshots.clear();
  for(let index=0;index<enemies.length;index++){
    const enemy=enemies[index],record=buffer.enemyRecords[index]||(buffer.enemyRecords[index]={});
    record.progress=enemy.progress;record.hp=enemy.hp;record.shield=enemy.shield;
    enemySnapshots.set(enemy.id,record);
  }
  for(let index=0;index<shots.length;index++){
    const shot=shots[index],record=buffer.shotRecords[index]||(buffer.shotRecords[index]={});
    record.x=shot.x;record.y=shot.y;
    shotSnapshots.set(shot.id,record);
  }
}

export function createRenderSnapshots() {
  let previous=createSnapshotBuffer();
  let current=createSnapshotBuffer();
  const enemyHitFlashes = new Map();
  const pathSamplers = new WeakMap();

  return {
    beginStep() {
      const recycled=previous;
      previous=current;
      current=recycled;
      current.enemies.clear();
      current.shots.clear();
    },
    capture(enemies, shots) {
      captureRenderSnapshot(enemies,shots,current);
    },
    updateHitFlashes(enemies, dt) {
      for (const enemy of enemies) {
        const before=previous.enemies.get(enemy.id),after=current.enemies.get(enemy.id);
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
      captureRenderSnapshot(enemies,shots,previous);
      captureRenderSnapshot(enemies,shots,current);
      enemyHitFlashes.clear();
    },
    enemyPosition(enemy, path, alpha, output) {
      const enemyPath = typeof path === 'function' ? path(enemy) : path;
      if (!pathSamplers.has(enemyPath)) pathSamplers.set(enemyPath,createPathSampler(enemyPath));
      const samplePath=pathSamplers.get(enemyPath);
      const before=previous.enemies.get(enemy.id),after=current.enemies.get(enemy.id);
      return samplePath(before && after ? interpolateNumber(before.progress, after.progress, alpha) : enemy.progress,output);
    },
    shotPosition(shot, alpha, output) {
      const before=previous.shots.get(shot.id),after=current.shots.get(shot.id);
      const x=before&&after?interpolateNumber(before.x,after.x,alpha):shot.x;
      const y=before&&after?interpolateNumber(before.y,after.y,alpha):shot.y;
      if(output&&typeof output==='object'){
        output.x=x;
        output.y=y;
        return output;
      }
      return { x, y };
    },
    hitFlash(enemyId) { return enemyHitFlashes.get(enemyId) || 0; }
  };
}
