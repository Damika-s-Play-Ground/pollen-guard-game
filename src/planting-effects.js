export const PLANTING_SETTLE_SECONDS = .22;

export function plantingSettleExpired(now,plantedAt) {
  return Number.isFinite(now)&&Number.isFinite(plantedAt)&&now-plantedAt>=PLANTING_SETTLE_SECONDS;
}

export function plantingDustParticles(x,y) {
  if(!Number.isFinite(x)||!Number.isFinite(y))return [];
  return Array.from({length:5},(_,index)=>{
    const angle=-Math.PI*.82+index*Math.PI*.16,speed=22+(index%3)*6;
    return {x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-5,life:PLANTING_SETTLE_SECONDS,maxLife:PLANTING_SETTLE_SECONDS,r:1.6+(index%2)*.35,color:'#b89b62'};
  });
}
