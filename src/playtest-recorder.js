export const PLAYTEST_RECORDING_KEY='pollen-guard-playtest-recording-v1';
export const PLAYTEST_EVENTS_KEY='pollen-guard-playtest-events-v1';
export const PLAYTEST_SCHEMA_VERSION=1;
export const PLAYTEST_EVENT_LIMIT=2000;
const allowed=new Set(['placeTower','upgradeTower','startWave','pause','resume','reset','quit']);

export function createPlaytestRecorder(storage,{now=()=>Date.now(),enabled=false}={}){
  const startedAt=now();
  function read(){try{const value=JSON.parse(storage.getItem(PLAYTEST_EVENTS_KEY)||'[]');return Array.isArray(value)?value.filter(event=>event&&allowed.has(event.type)&&typeof event.at==='string'&&Number.isFinite(Date.parse(event.at))&&Number.isFinite(event.elapsedMs)):[];}catch{return[];}}
  function isEnabled(){try{return storage.getItem(PLAYTEST_RECORDING_KEY)==='true';}catch{return enabled;}}
  function setEnabled(value){try{if(value)storage.setItem(PLAYTEST_RECORDING_KEY,'true');else storage.removeItem(PLAYTEST_RECORDING_KEY);return true;}catch{return false;}}
  return {
    enabled:isEnabled,
    setEnabled,
    record(type){if(!isEnabled()||!allowed.has(type))return false;const at=now(),events=read();if(events.length>=PLAYTEST_EVENT_LIMIT)return false;events.push({type,at:new Date(at).toISOString(),elapsedMs:Math.max(0,at-startedAt)});try{storage.setItem(PLAYTEST_EVENTS_KEY,JSON.stringify(events));return true;}catch{return false;}},
    inspect(){return read().map(event=>({...event}));},
    clear(){try{storage.removeItem(PLAYTEST_EVENTS_KEY);return true;}catch{return false;}},
    export(){return {schemaVersion:PLAYTEST_SCHEMA_VERSION,events:read()};}
  };
}
