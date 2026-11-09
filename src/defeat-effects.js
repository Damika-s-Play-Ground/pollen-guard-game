const RESPONSE = Object.freeze({
  standard:Object.freeze({ mark:'kill', markRadius:4, motes:4, speed:38, moteRadius:1.8, life:.28 }),
  armored:Object.freeze({ mark:'armoredKill', markRadius:6, motes:7, speed:48, moteRadius:2.2, life:.34 }),
  boss:Object.freeze({ mark:'bossKill', markRadius:10, motes:10, speed:62, moteRadius:2.8, life:.42 })
});

export function defeatResponseParticles(enemy,x,y) {
  if(!enemy||!Number.isFinite(x)||!Number.isFinite(y))return [];
  const response=enemy.boss?RESPONSE.boss:enemy.type==='armored'?RESPONSE.armored:RESPONSE.standard;
  const particles=[{x,y,vx:0,vy:0,life:.16,maxLife:.16,r:response.markRadius,color:enemy.color,impactKind:response.mark}];
  for(let index=0;index<response.motes;index++){
    const angle=-Math.PI/2+index*Math.PI*2/response.motes,speed=response.speed*(.82+(index%3)*.09);
    particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-8,life:response.life,maxLife:response.life,r:response.moteRadius+(index%2)*.45,color:enemy.color});
  }
  return particles;
}
