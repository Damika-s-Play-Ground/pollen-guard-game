const TRACKED_ACTIONS=new Set(['placeTower','upgradeTower','chooseBranch','startWave']);
const TRACKED_CUES=new Set(['first-action','mission-brief','wave-preview','threat-strip','counter-hint']);
const MAX_EVENTS=2000;

export function createLearningTransferStudyMetrics({now=()=>performance.now()}={}) {
  const startedAt=now(),readyAtByMap=new Map(),events=[];
  let droppedEvents=0;

  function append(kind,mapId,details={}) {
    if(typeof mapId!=='string'||!mapId||!readyAtByMap.has(mapId))return false;
    if(events.length>=MAX_EVENTS){droppedEvents++;return false;}
    const time=now();if(!Number.isFinite(time)||!Number.isFinite(startedAt)||time<startedAt){droppedEvents++;return false;}
    const readyAt=readyAtByMap.get(mapId);
    events.push({kind,mapId,atMs:Math.round(time-startedAt),sinceMapReadyMs:readyAt===undefined?null:Math.round(time-readyAt),...details});
    return true;
  }

  function markMapReady(mapId) {
    if(typeof mapId!=='string'||!mapId||readyAtByMap.has(mapId))return false;
    const time=now();if(!Number.isFinite(time)||time<startedAt)return false;
    readyAtByMap.set(mapId,time);
    return append('map-ready',mapId);
  }

  function recordAction({mapId,wave,action,towerType=null,level=null,branch=null,x=null,y=null}={}) {
    if(!TRACKED_ACTIONS.has(action))return false;
    const details={action};
    if(Number.isInteger(wave)&&wave>=0)details.wave=wave;
    if(typeof towerType==='string'&&towerType)details.towerType=towerType;
    if(Number.isInteger(level)&&level>=1)details.level=level;
    if(Number.isInteger(branch)&&branch>=0)details.branch=branch;
    if(Number.isFinite(x))details.x=Math.round(x*100)/100;
    if(Number.isFinite(y))details.y=Math.round(y*100)/100;
    return append('player-action',mapId,details);
  }

  function recordCueExposure(mapId,cue) {
    if(!TRACKED_CUES.has(cue))return false;
    if(events.some(event=>event.kind==='cue-exposure'&&event.mapId===mapId&&event.cue===cue))return false;
    return append('cue-exposure',mapId,{cue});
  }

  function recordOutcome({mapId,won,retired=false,wave,lives,leaks}={}) {
    if(typeof won!=='boolean')return false;
    const details={won,retired:Boolean(retired)};
    if(Number.isInteger(wave)&&wave>=0)details.wave=wave;
    if(Number.isFinite(lives))details.lives=Math.max(0,Math.trunc(lives));
    if(Number.isFinite(leaks))details.leaks=Math.max(0,Math.trunc(leaks));
    return append('mission-outcome',mapId,details);
  }

  function recordUnlock(fromMapId,unlockedMapId) {
    if(typeof unlockedMapId!=='string'||!unlockedMapId)return false;
    return append('map-unlock',fromMapId,{unlockedMapId});
  }

  function summary() {
    return {enabled:true,storage:'in-memory only; no profile or network writes',eventCount:events.length,droppedEvents,events:events.map(event=>({...event}))};
  }

  return {markMapReady,recordAction,recordCueExposure,recordOutcome,recordUnlock,summary};
}
