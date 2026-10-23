import { maps } from './game-data.js';
import { AUTHORED_WAVES, ENEMY_TYPES } from './waves.js';
import { distanceToPath } from './path-geometry.js';

export const CUSTOM_MAP_STORAGE_KEY='pollen-guard.maps.v1';
export const CUSTOM_MAP_FORMAT='pollen-guard-map';
export const CUSTOM_MAP_VERSION=1;
export const CUSTOM_MAP_LIMIT=20;
const ENEMIES=new Set(ENEMY_TYPES);
const safeCopy=value=>JSON.parse(JSON.stringify(value));

export function createMapEditorTemplate(){
  return {id:'my-garden',name:'My Garden',width:900,height:540,route:safeCopy(maps.meadow.path),
    buildZones:[{x:145,y:280,width:44,height:44},{x:680,y:72,width:44,height:44}],
    objective:{type:'protect-seed-pod',minLives:5,brief:'Keep at least 5 seeds through all 15 waves.'},
    waves:AUTHORED_WAVES.map(wave=>({cue:wave.cue,groups:wave.groups.map(group=>({type:group.type,count:group.count,interval:group.interval}))}))};
}

function segmentsCross(a,b,c,d){
  const orient=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
  return o1*o2<0&&o3*o4<0;
}
function routeIsSimple(route){
  for(let i=0;i<route.length-1;i++)for(let j=i+2;j<route.length-1;j++){
    if(i===0&&j===route.length-2)continue;
    if(segmentsCross(route[i],route[i+1],route[j],route[j+1]))return false;
  }
  return true;
}
function validZone(zone,route){
  if(!zone||!Number.isFinite(zone.x)||!Number.isFinite(zone.y)||!Number.isFinite(zone.width)||!Number.isFinite(zone.height)||
    zone.width<44||zone.height<44||zone.width>300||zone.height>220||zone.x<12||zone.y<12||zone.x+zone.width>888||zone.y+zone.height>528)return false;
  const center={x:zone.x+zone.width/2,y:zone.y+zone.height/2},halfDiagonal=Math.hypot(zone.width,zone.height)/2;
  return distanceToPath(center.x,center.y,route)>=halfDiagonal+30;
}
export function validateCustomMap(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {valid:false,reason:'Map data must be a JSON object.'};
  const map=value;
  if(typeof map.id!=='string'||!/^[a-z][a-z0-9-]{1,31}$/.test(map.id)||typeof map.name!=='string'||map.name.trim().length<3||map.name.length>48)return {valid:false,reason:'Use a short map name and a lowercase id (2–32 letters, numbers or hyphens).'};
  if(map.width!==900||map.height!==540)return {valid:false,reason:'Maps must use the supported 900 by 540 playfield.'};
  if(!Array.isArray(map.route)||map.route.length<4||map.route.length>20||map.route.some(point=>!Array.isArray(point)||point.length!==2||point.some(value=>!Number.isSafeInteger(value))||point[0]<24||point[0]>876||point[1]<24||point[1]>516))return {valid:false,reason:'Route needs 4–20 whole-number points inside the playfield.'};
  if(map.route[0][0]>90||map.route.at(-1)[0]<810)return {valid:false,reason:'Route must enter from the left edge and exit at the right edge.'};
  for(let i=1;i<map.route.length;i++)if(Math.hypot(map.route[i][0]-map.route[i-1][0],map.route[i][1]-map.route[i-1][1])<40)return {valid:false,reason:'Route segments must be at least 40 units long.'};
  const length=map.route.slice(1).reduce((sum,point,index)=>sum+Math.hypot(point[0]-map.route[index][0],point[1]-map.route[index][1]),0);
  if(length<500||length>2200||!routeIsSimple(map.route))return {valid:false,reason:'Route must be a simple trail between 500 and 2,200 units long.'};
  if(!Array.isArray(map.buildZones)||map.buildZones.length<1||map.buildZones.length>12||map.buildZones.some(zone=>!validZone(zone,map.route)))return {valid:false,reason:'Add 1–12 clear build zones at least 30 units away from the trail.'};
  for(let i=0;i<map.buildZones.length;i++)for(let j=i+1;j<map.buildZones.length;j++){
    const a=map.buildZones[i],b=map.buildZones[j];if(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y)return {valid:false,reason:'Build zones cannot overlap.'};
  }
  if(!map.objective||map.objective.type!=='protect-seed-pod'||!Number.isSafeInteger(map.objective.minLives)||map.objective.minLives<1||map.objective.minLives>20||typeof map.objective.brief!=='string'||map.objective.brief.length>140)return {valid:false,reason:'Choose the supported seed-pod objective with a target of 1–20 seeds.'};
  if(!Array.isArray(map.waves)||map.waves.length!==15)return {valid:false,reason:'A playable map must author exactly 15 waves.'};
  for(const [index,wave] of map.waves.entries()){
    if(!wave||typeof wave.cue!=='string'||wave.cue.trim().length<4||wave.cue.length>140||!Array.isArray(wave.groups)||wave.groups.length<1||wave.groups.length>6)return {valid:false,reason:`Wave ${index+1} needs a short warning and 1–6 enemy groups.`};
    let count=0;
    for(const group of wave.groups){if(!group||!ENEMIES.has(group.type)||!Number.isSafeInteger(group.count)||group.count<1||group.count>35||!Number.isFinite(group.interval)||group.interval<.2||group.interval>2.5)return {valid:false,reason:`Wave ${index+1} has an invalid enemy reference, count or interval.`};count+=group.count;}
    if(count>100)return {valid:false,reason:`Wave ${index+1} exceeds the 100-enemy safety limit.`};
  }
  return {valid:true,map:{id:map.id,name:map.name.trim(),width:900,height:540,route:safeCopy(map.route),buildZones:safeCopy(map.buildZones),objective:{type:'protect-seed-pod',minLives:map.objective.minLives,brief:map.objective.brief},waves:safeCopy(map.waves)}};
}

function checksum(value){let hash=0x811c9dc5;for(const char of value){hash^=char.charCodeAt(0);hash=Math.imul(hash,0x01000193);}return(hash>>>0).toString(16).padStart(8,'0');}
export function exportCustomMap(value){
  const checked=validateCustomMap(value);if(!checked.valid)return {ok:false,reason:checked.reason};
  const body={format:CUSTOM_MAP_FORMAT,version:CUSTOM_MAP_VERSION,map:checked.map};const canonical=JSON.stringify(body);
  return {ok:true,text:JSON.stringify({...body,checksum:checksum(canonical)},null,2)};
}
export function importCustomMap(raw){
  let file;try{file=JSON.parse(raw);}catch{return {ok:false,reason:'Map file is not valid JSON.'};}
  if(!file||typeof file!=='object'||file.format!==CUSTOM_MAP_FORMAT)return {ok:false,reason:'This file is not a Pollen Guard map.'};
  if(file.version!==CUSTOM_MAP_VERSION)return {ok:false,reason:'This map version is not supported by this build.'};
  const body={format:file.format,version:file.version,map:file.map};if(typeof file.checksum!=='string'||checksum(JSON.stringify(body))!==file.checksum)return {ok:false,reason:'Map checksum does not match its contents.'};
  const checked=validateCustomMap(file.map);return checked.valid?{ok:true,map:checked.map}:{ok:false,reason:checked.reason};
}
export function normalizeCustomMapCollection(value){
  if(!value||typeof value!=='object'||value.version!==CUSTOM_MAP_VERSION||!Array.isArray(value.maps))return {version:CUSTOM_MAP_VERSION,maps:[]};
  const maps=[];for(const raw of value.maps){const checked=validateCustomMap(raw);if(checked.valid&&!maps.some(map=>map.id===checked.map.id))maps.push(checked.map);if(maps.length===CUSTOM_MAP_LIMIT)break;}
  return {version:CUSTOM_MAP_VERSION,maps};
}
export function addCustomMapToCollection(collectionValue,mapValue){
  const collection=normalizeCustomMapCollection(collectionValue),checked=validateCustomMap(mapValue);
  if(!checked.valid)return {ok:false,reason:checked.reason,collection};
  if(collection.maps.some(existing=>existing.id===checked.map.id))return {ok:false,reason:'That map ID is already saved. Change the ID to create a versioned copy so saved runs keep their original route.',collection};
  if(collection.maps.length>=CUSTOM_MAP_LIMIT)return {ok:false,reason:`Keep at most ${CUSTOM_MAP_LIMIT} local maps. Existing maps are retained because saved runs may reference them.`,collection};
  return {ok:true,collection:{version:CUSTOM_MAP_VERSION,maps:[...collection.maps,checked.map]}};
}
export function customMapToRuntimeMap(value){
  const checked=validateCustomMap(value);if(!checked.valid)return null;const map=checked.map;
  return {id:`custom-${map.id}`,name:map.name,biome:'custom',unlockAt:0,background:'#9bc780',patch:'#b2d894',trail:'#efd99e',edge:'#d5b876',path:safeCopy(map.route),airPath:safeCopy(map.route),buildZones:safeCopy(map.buildZones),customObjective:safeCopy(map.objective),customMap:true,customMapId:map.id};
}
export function customMapWaveSchedules(value){
  const checked=validateCustomMap(value);if(!checked.valid)return null;
  return checked.map.waves.map((wave,index)=>({cue:wave.cue,budget:wave.groups.reduce((sum,group)=>sum+group.count,0),groups:wave.groups.map(group=>({...group,lane:group.type==='flyer'?'air':'ground',telegraph:wave.cue}))}));
}
export function createMapEditorState(map=createMapEditorTemplate()) {return {map:safeCopy(map),undo:[],redo:[]};}
export function updateMapEditor(state,map) {const checked=validateCustomMap({...state.map,...map});if(!checked.valid)return {state,error:checked.reason};return {state:{map:checked.map,undo:[...state.undo,state.map].slice(-100),redo:[]},error:''};}
export function undoMapEditor(state){if(!state.undo.length)return state;const previous=state.undo.at(-1);return {map:previous,undo:state.undo.slice(0,-1),redo:[state.map,...state.redo].slice(0,100)};}
export function redoMapEditor(state){if(!state.redo.length)return state;const next=state.redo[0];return {map:next,undo:[...state.undo,state.map].slice(-100),redo:state.redo.slice(1)};}
