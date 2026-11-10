export const PLANTING_SETTLE_SECONDS = .22;

export function plantingSettleExpired(now,plantedAt) {
  return Number.isFinite(now)&&Number.isFinite(plantedAt)&&now>=plantedAt+PLANTING_SETTLE_SECONDS;
}

export function plantingDustParticles(x,y,startedAt=0) {
  if(!Number.isFinite(x)||!Number.isFinite(y))return [];
  return Array.from({length:5},(_,index)=>{
    const angle=-Math.PI*.82+index*Math.PI*.16,speed=22+(index%3)*6;
    return {x,y,originX:x,originY:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-5,life:PLANTING_SETTLE_SECONDS,maxLife:PLANTING_SETTLE_SECONDS,startedAt,wallClock:true,r:1.6+(index%2)*.35,color:'#b89b62'};
  });
}

export function advancePlantingParticle(particle,now) {
  if(!particle?.wallClock||!Number.isFinite(now)||!Number.isFinite(particle.startedAt))return particle;
  const age=Math.max(0,Math.min(PLANTING_SETTLE_SECONDS,now-particle.startedAt));
  return {...particle,x:particle.originX+particle.vx*age,y:particle.originY+particle.vy*age,life:plantingSettleExpired(now,particle.startedAt)?0:PLANTING_SETTLE_SECONDS-age};
}
