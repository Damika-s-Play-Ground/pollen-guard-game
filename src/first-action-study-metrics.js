const MILESTONES=new Set(['selection','placement','launch']);

export function createFirstActionStudyMetrics({now=()=>performance.now()}={}) {
  let readyAt=null;
  const milestones=new Map();
  const invalidPlacementTimes=[];

  function markReady() {
    if(readyAt===null){const time=now();if(Number.isFinite(time))readyAt=time;}
    return readyAt;
  }

  function record(milestone) {
    if(!MILESTONES.has(milestone)||readyAt===null||milestones.has(milestone))return false;
    const time=now();if(!Number.isFinite(time)||time<readyAt)return false;
    milestones.set(milestone,time-readyAt);return true;
  }

  function recordInvalidPlacement() {
    if(readyAt===null)return false;
    const time=now();if(!Number.isFinite(time)||time<readyAt)return false;
    invalidPlacementTimes.push(time-readyAt);return true;
  }

  function summary() {
    const selectionMs=milestones.get('selection');
    const placementMs=milestones.get('placement'),launchMs=milestones.get('launch');
    return {
      ready:readyAt!==null,
      invalidPlacementMs:invalidPlacementTimes.map(Math.round),
      selectionMs:selectionMs===undefined?null:Math.round(selectionMs),
      placementMs:placementMs===undefined?null:Math.round(placementMs),
      placementWithin30s:placementMs===undefined?null:placementMs<=30000,
      launchMs:launchMs===undefined?null:Math.round(launchMs),
      launchWithin60s:launchMs===undefined?null:launchMs<=60000
    };
  }

  function clear(){readyAt=null;milestones.clear();invalidPlacementTimes.length=0;}
  return {markReady,record,recordInvalidPlacement,summary,clear};
}
