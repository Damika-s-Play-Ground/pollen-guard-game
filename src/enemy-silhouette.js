const PROFILES=Object.freeze({
  zip:Object.freeze({scale:.95,gaitRate:14,gaitAmplitude:3.4,floatAmplitude:0}),
  armored:Object.freeze({scale:1.12,gaitRate:3.5,gaitAmplitude:10,floatAmplitude:0}),
  flyer:Object.freeze({scale:1.08,gaitRate:8,gaitAmplitude:3.8,floatAmplitude:0}),
  healer:Object.freeze({scale:1.08,gaitRate:5,gaitAmplitude:1,floatAmplitude:4}),
  boss:Object.freeze({scale:1.22,gaitRate:3,gaitAmplitude:.45,floatAmplitude:0})
});
const DEFAULT_PROFILE=Object.freeze({scale:1,gaitRate:7,gaitAmplitude:2,floatAmplitude:0});

export function enemySilhouetteProfile(enemy) {
  if(enemy?.boss)return PROFILES.boss;
  if(enemy?.flying||enemy?.type==='flyer')return PROFILES.flyer;
  return PROFILES[enemy?.type]||DEFAULT_PROFILE;
}

export function enemySilhouetteMetrics(enemy,time=0) {
  const profile=enemySilhouetteProfile(enemy);
  const phase=Number.isFinite(time)?time*profile.gaitRate+(Number.isFinite(enemy?.id)?enemy.id*.73:0):0;
  const radius=(Number.isFinite(enemy?.radius)?enemy.radius:0)*profile.scale;
  const footprintScale=enemy?.flying||enemy?.type==='flyer'?1.45:enemy?.type==='zip'?1.3:1;
  return {
    radius,
    overlapRadius:radius*footprintScale,
    gait:Math.sin(phase)*profile.gaitAmplitude,
    float:Math.sin(Number.isFinite(time)?time*3+(Number.isFinite(enemy?.id)?enemy.id*.73:0):0)*profile.floatAmplitude
  };
}

export function largestEnemySilhouetteRadius(enemies) {
  return Math.max(0,...enemies.map(enemy=>enemySilhouetteMetrics(enemy).overlapRadius));
}
