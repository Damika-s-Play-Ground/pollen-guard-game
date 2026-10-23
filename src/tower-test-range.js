import { maps, modes, towersDef } from './game-data.js';
import { createEnemy, stepCombat } from './combat-simulation.js';
import { createCombatPerformance, registerCombatTower } from './combat-performance.js';
import { difficultyFor } from './challenge-rules.js';
import { createEnemyRouteGeometry } from './air-routes.js';
import { WAVE_SCHEDULE_VERSION } from './waves.js';
import { getEffectiveTowerStats, SIMULATION_STEP } from './game-core.js';
import { terrainZoneAt } from './terrain.js';
import { validateTowerPlacement } from './game-actions.js';
import { pointOnPath } from './path-geometry.js';

export const TOWER_TEST_MAX_SECONDS = 20;
export const TOWER_TEST_MAX_TICKS = Math.floor(TOWER_TEST_MAX_SECONDS / SIMULATION_STEP);

const TESTABLE_TOWERS = Object.freeze(Object.keys(towersDef).filter(type => !towersDef[type].supportStructure && !towersDef[type].income));
const TESTABLE_ENEMIES = Object.freeze(['mite','zip','armored','shield','flyer','healer','carrier','burrower']);

export function towerTestRangeChoices() { return { towers: [...TESTABLE_TOWERS], enemies: [...TESTABLE_ENEMIES] }; }

export function findTowerTestPlacements(types, mapId='meadow', path=null) {
  const map=maps[mapId],activePath=path||map?.path;
  if(!map||!activePath||!Array.isArray(types)||types.length<1||types.length>4||types.some(type=>!TESTABLE_TOWERS.includes(type)))return null;
  const candidates=[];
  for(let y=24;y<=516;y+=8)for(let x=24;x<=876;x+=8)candidates.push({x,y});
  const preferred={meadow:{x:180,y:140}}[mapId];
  const sampleTarget=pointOnPath(activePath,70);
  candidates.sort((a,b)=>Math.hypot(a.x-sampleTarget.x,a.y-sampleTarget.y)-Math.hypot(b.x-sampleTarget.x,b.y-sampleTarget.y));
  if(preferred){let index=candidates.findIndex(point=>point.x===preferred.x&&point.y===preferred.y);if(index<0){candidates.unshift(preferred);index=0;}else if(index>0)candidates.unshift(...candidates.splice(index,1));}
  const placements=[];
  for(const type of types){
    const point=candidates.find(candidate=>!validateTowerPlacement({challenge:'classic',challengeRules:[],cash:1_000_000,towers:placements.map((spot,index)=>({type:types[index],...spot}))},type,candidate,{path:activePath,width:900,height:540,map}));
    if(!point)return null;
    placements.push(point);
  }
  return placements;
}

export function runTowerTestRange({ towerType='sprout', towerLevel=1, branch=0, defenders=null, enemyType='mite', armor=0, shield=0, mapId='meadow', path=null, challenge='classic', difficulty='standard', challengeRules=[], researchLoadout=[], relicLoadout=[], maxTicks=TOWER_TEST_MAX_TICKS } = {}) {
  const map=maps[mapId],towerDef=towersDef[towerType],enemyAllowed=TESTABLE_ENEMIES.includes(enemyType);
  const activePath=path||map?.path;
  const defaults=defenders===null?findTowerTestPlacements([towerType],mapId,activePath):null;
  const roster=defenders===null&&defaults?[{type:towerType,level:towerLevel,branch,x:defaults[0].x,y:defaults[0].y}]:defenders;
  if(!map||!towerDef||!TESTABLE_TOWERS.includes(towerType)||!Number.isSafeInteger(towerLevel)||towerLevel<1||towerLevel>3||!Number.isInteger(branch)||branch<0||branch>1||!Array.isArray(roster)||roster.length<1||roster.length>4||roster.some((entry,index)=>!entry||!TESTABLE_TOWERS.includes(entry.type)||!Number.isSafeInteger(entry.level)||entry.level<1||entry.level>3||!Number.isInteger(entry.branch)||entry.branch<0||entry.branch>1||!Number.isSafeInteger(entry.x)||!Number.isSafeInteger(entry.y)||entry.x<0||entry.x>900||entry.y<0||entry.y>540||roster.findIndex(other=>other.x===entry.x&&other.y===entry.y)!==index)||!enemyAllowed||!Number.isFinite(armor)||armor<0||armor>20||!Number.isFinite(shield)||shield<0||shield>40||!Number.isSafeInteger(maxTicks)||maxTicks<1||maxTicks>TOWER_TEST_MAX_TICKS)
    return {ok:false,reason:'Choose a supported defender, pest and bounded armor/shield setup.'};
  const placementState={challenge,challengeRules,cash:1_000_000,towers:[]};
  for(const entry of roster){const error=validateTowerPlacement(placementState,entry.type,{x:entry.x,y:entry.y},{path:activePath,width:900,height:540,map});if(error)return {ok:false,reason:`Practice defender placement is invalid: ${error}`};placementState.towers.push({type:entry.type,x:entry.x,y:entry.y});}
  const routeGeometry=createEnemyRouteGeometry({...map,path:activePath},WAVE_SCHEDULE_VERSION),difficultyPreset=difficultyFor(difficulty,challenge);
  if(!modes[challenge]||!difficultyPreset)return {ok:false,reason:'The selected practice rules are invalid.'};
  const performance=createCombatPerformance(),practiceTowers=roster.map((entry,index)=>{const def=towersDef[entry.type];return{id:index+1,type:entry.type,level:entry.level,branch:entry.level>=2?entry.branch:null,branchChoice:entry.level===1?entry.branch:null,x:entry.x,y:entry.y,cooldown:0,targetMode:'First',abilityReadyAt:0,abilityUsedWave:-1,invested:def.cost};});
  const enemy=createEnemy(enemyType,1,2,enemyType==='flyer'?'air':'ground');enemy.progress=70;enemy.armor=armor;enemy.shield=shield;enemy.maxShield=shield;
  const state={selectedMap:mapId,challenge,difficulty,challengeRules,terrainRulesVersion:1,waveScheduleVersion:8,researchLoadout:[...researchLoadout],relicLoadout:[...relicLoadout],running:true,gameOver:false,paused:false,
    simulationTick:0,gameTime:0,cash:modes[challenge].cash+difficultyPreset.cashDelta,lives:modes[challenge].lives,popped:0,wave:1,bloomCharge:0,towers:practiceTowers,enemies:[enemy],shots:[],spawnQueue:[],spawnClock:0,
    nextEntityId:practiceTowers.length+2,intermission:0,speed:1,performance,combatPerformance:performance,rejuvenationField:null,seedObjective:null};
  for(const tower of practiceTowers)registerCombatTower(performance,tower);
  const initialHealth=enemy.hp+enemy.shield;let terminalEnemy=null;
  for(let tick=0;tick<maxTicks&&state.enemies.length;tick++){
    state.gameTime+=SIMULATION_STEP;
    stepCombat(state,SIMULATION_STEP,{pathLength:routeGeometry.pathLengthFor,positionOf:routeGeometry.positionOf,
      onDefeat:resolved=>{terminalEnemy=resolved;},onLeak:resolved=>{terminalEnemy=resolved;}});
    state.simulationTick++;
  }
  const damage=practiceTowers.reduce((sum,tower)=>sum+(Number(performance.towers?.[tower.id]?.damage)||0),0);
  const finalEnemy=state.enemies[0]||terminalEnemy;
  return {ok:true,practiceOnly:true,mapId,challenge,difficulty,towerType,towerLevel,branch,enemyType,armor,shield,initialHealth:Math.round(initialHealth*100)/100,
    damage:Math.round(damage*100)/100,remainingHp:Math.max(0,Math.round(((finalEnemy?.hp||0)+(finalEnemy?.shield||0))*100)/100),
    defeated:state.popped>0,leaked:state.lives<modes[challenge].lives,simulatedSeconds:Math.round(state.simulationTick*SIMULATION_STEP*100)/100,
    attackStats:getEffectiveTowerStats(practiceTowers[0],{challenge,challengeRules,terrain:terrainZoneAt(mapId,practiceTowers[0]),linked:false,researchLoadout,relicLoadout},towersDef[practiceTowers[0].type]),
    defenderBreakdown:practiceTowers.map(tower=>({type:tower.type,level:tower.level,damage:Number(performance.towers?.[tower.id]?.damage)||0})),events:finalEnemy};
}
