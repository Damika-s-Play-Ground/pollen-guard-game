export const SEED_RECOVERY_RULE = 'seedRecovery';
export const SEED_OBJECTIVE_SIZE = 3;
export const SEED_DROP_RECOVERY_SECONDS = 1.2;

export function createSeedObjective(total = SEED_OBJECTIVE_SIZE) {
  return {
    total,
    seeds:Array.from({length:total},(_,index)=>({id:index+1,state:'available',carrierId:null,x:null,y:null,recoveryTimer:0}))
  };
}

export function seedObjectiveTally(objective) {
  const counts={available:0,carried:0,dropped:0,recovered:0,escaped:0};
  for(const seed of objective?.seeds??[])if(Object.hasOwn(counts,seed.state))counts[seed.state]++;
  return {...counts,total:objective?.total??0,safe:counts.available+counts.recovered};
}

export function claimSeedForCarrier(objective, carrierId) {
  if(!objective||!Number.isSafeInteger(carrierId)||carrierId<=0)return null;
  const seed=objective.seeds.find(item=>item.state==='available');
  if(!seed)return null;
  Object.assign(seed,{state:'carried',carrierId,x:null,y:null,recoveryTimer:0});
  return seed.id;
}

export function dropCarriedSeed(objective, seedId, carrierId, point) {
  const seed=objective?.seeds.find(item=>item.id===seedId&&item.state==='carried'&&item.carrierId===carrierId);
  if(!seed||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return false;
  Object.assign(seed,{state:'dropped',carrierId:null,x:point.x,y:point.y,recoveryTimer:SEED_DROP_RECOVERY_SECONDS});
  return true;
}

export function escapeCarriedSeed(objective, seedId, carrierId) {
  const seed=objective?.seeds.find(item=>item.id===seedId&&item.state==='carried'&&item.carrierId===carrierId);
  if(!seed)return false;
  Object.assign(seed,{state:'escaped',carrierId:null,x:null,y:null,recoveryTimer:0});
  return true;
}

export function advanceDroppedSeeds(objective, dt) {
  if(!objective||!Number.isFinite(dt)||dt<=0)return;
  for(const seed of objective.seeds)if(seed.state==='dropped'){
    seed.recoveryTimer=Math.max(0,seed.recoveryTimer-dt);
    if(seed.recoveryTimer===0)Object.assign(seed,{state:'recovered',x:null,y:null});
  }
}

export function validSeedObjective(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isInteger(value.total)||value.total<1||value.total>9||
    Object.keys(value).sort().join(',')!=='seeds,total'||!Array.isArray(value.seeds)||value.seeds.length!==value.total)return false;
  const ids=new Set();
  for(const seed of value.seeds){
    if(!seed||typeof seed!=='object'||Array.isArray(seed)||Object.keys(seed).sort().join(',')!=='carrierId,id,recoveryTimer,state,x,y'||!Number.isInteger(seed.id)||seed.id<1||seed.id>value.total||ids.has(seed.id)||
      !['available','carried','dropped','recovered','escaped'].includes(seed.state)||
      !Number.isFinite(seed.recoveryTimer)||seed.recoveryTimer<0||seed.recoveryTimer>SEED_DROP_RECOVERY_SECONDS)return false;
    ids.add(seed.id);
    if(seed.state==='carried'){
      if(!Number.isSafeInteger(seed.carrierId)||seed.carrierId<=0||seed.x!==null||seed.y!==null||seed.recoveryTimer!==0)return false;
    }else if(seed.state==='dropped'){
      if(seed.carrierId!==null||!Number.isFinite(seed.x)||!Number.isFinite(seed.y)||seed.recoveryTimer<=0)return false;
    }else if(seed.carrierId!==null||seed.x!==null||seed.y!==null||seed.recoveryTimer!==0)return false;
  }
  return true;
}
