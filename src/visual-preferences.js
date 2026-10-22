export function shouldEmitParticles({ animation, flashes }) {
  return animation === 'full' && flashes === true;
}
