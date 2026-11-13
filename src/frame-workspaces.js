import { advancePlantingParticle, plantingSettleExpired } from './planting-effects.js';

// Compact the simulation-owned array without replacing it or allocating a
// filtered copy on every fixed step. Preserve the existing prune-before-decay
// order so a particle that expires during this step is removed next step.
export function advanceCosmeticParticlesInPlace(particles, dt) {
  let retained = 0;
  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index];
    if (!particle.wallClock && !(particle.life > 0)) continue;
    if (!particle.wallClock) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= .95;
      particle.vy *= .95;
    }
    particles[retained++] = particle;
  }
  particles.length = retained;
  return particles;
}

// The input and returned arrays are borrowed workspaces. The input is compacted
// in place; render-only planting samples reuse the output array until next draw.
export function prepareRenderParticleFrame(particles, renderParticles, now) {
  let retained = 0;
  for (let index = 0; index < particles.length; index++) {
    const particle = particles[index];
    if (particle.wallClock && plantingSettleExpired(now, particle.startedAt)) continue;
    particles[retained++] = particle;
  }
  particles.length = retained;
  renderParticles.length = retained;
  for (let index = 0; index < retained; index++) {
    const particle = particles[index];
    renderParticles[index] = particle.wallClock ? advancePlantingParticle(particle, now) : particle;
  }
  return renderParticles;
}

export function refreshLiveEnemyIds(enemies, liveIds) {
  liveIds.clear();
  for (let index = 0; index < enemies.length; index++) liveIds.add(enemies[index].id);
  return liveIds;
}
