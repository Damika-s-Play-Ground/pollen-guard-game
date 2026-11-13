export function shouldShowImpactFlash({ animation, flashes }) {
  return animation === 'full' && flashes === true;
}

export function shouldEmitParticles(settings) {
  return shouldShowImpactFlash(settings);
}

export function shouldShakeBoard({ animation, shake }) {
  return shake === true && animation !== 'off';
}
