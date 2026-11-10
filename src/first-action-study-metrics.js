const MILESTONES=new Set(['placement','launch']);

export function createFirstActionStudyMetrics({now=()=>performance.now()}={}) {
  let readyAt=null;
  const milestones=new Map();

  function markReady() {
    if(readyAt===null){const time=now();if(Number.isFinite(time))readyAt=time;}
    return readyAt;
  }

  function record(milestone) {
    if(!MILESTONES.has(milestone)||readyAt===null||milestones.has(milestone))return false;
    const time=now();if(!Number.isFinite(time)||time<readyAt)return false;
    milestones.set(milestone,time-readyAt);return true;
  }

  function summary() {
    const placementMs=milestones.get('placement'),launchMs=milestones.get('launch');
    return {
      ready:readyAt!==null,
      placementMs:placementMs===undefined?null:Math.round(placementMs),
      placementWithin30s:placementMs===undefined?null:placementMs<=30000,
      launchMs:launchMs===undefined?null:Math.round(launchMs),
      launchWithin60s:launchMs===undefined?null:launchMs<=60000
    };
  }

  function clear(){readyAt=null;milestones.clear();}
  return {markReady,record,summary,clear};
}
