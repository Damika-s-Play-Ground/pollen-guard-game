import { maps, modes, towersDef } from './game-data.js';
import { createEnemy, stepCombat } from './combat-simulation.js';
import { createCombatPerformance, registerCombatTower } from './combat-performance.js';
import { difficultyFor } from './challenge-rules.js';
import { createPathSampler, calculatePathLength } from './path-geometry.js';
import { getEffectiveTowerStats, SIMULATION_STEP } from './game-core.js';
import { terrainZoneAt } from './terrain.js';

const TESTABLE_TOWERS = Object.freeze(Object.keys(towersDef).filter(type => !towersDef[type].supportStructure && !towersDef[type].income));
const TESTABLE_ENEMIES = Object.freeze(['mite','zip','armored','shield','flyer','healer','carrier','burrower']);

export function towerTestRangeChoices() { return { towers: [...TESTABLE_TOWERS], enemies: [...TESTABLE_ENEMIES] }; }

export function runTowerTestRange({ towerType='sprout', towerLevel=1, branch=0, defenders=null, enemyType='mite', armor=0, shield=0, mapId='meadow', challenge='classic', difficulty='standard', challengeRules=[], researchLoadout=[], relicLoadout=[], maxTicks=2400 } = {}) {
  const map=maps[mapId],towerDef=towersDef[towerType],enemyAllowed=TESTABLE_ENEMIES.includes(enemyType);
  const roster=defenders===null?[{type:towerType,level:towerLevel,branch,x:180,y:140}]:defenders;
  if(!map||!towerDef||!TESTABLE_TOWERS.includes(towerType)||!Number.isSafeInteger(towerLevel)||towerLevel<1||towerLevel>3||!Number.isInteger(branch)||branch<0||branch>1||!Array.isArray(roster)||roster.length<1||roster.length>4||roster.some((entry,index)=>!entry||!TESTABLE_TOWERS.includes(entry.type)||!Number.isSafeInteger(entry.level)||entry.level<1||entry.level>3||!Number.isInteger(entry.branch)||entry.branch<0||entry.branch>1||!Number.isSafeInteger(entry.x)||!Number.isSafeInteger(entry.y)||entry.x<0||entry.x>900||entry.y<0||entry.y>540||roster.findIndex(other=>other.x===entry.x&&other.y===entry.y)!==index)||!enemyAllowed||!Number.isFinite(armor)||armor<0||armor>20||!Number.isFinite(shield)||shield<0||shield>40||!Number.isSafeInteger(maxTicks)||maxTicks<1||maxTicks>12000)
    return {ok:false,reason:'Choose a supported defender, pest and bounded armor/shield setup.'};
  const path=map.path,pathLength=calculatePathLength(path),positionOf=createPathSampler(path),difficultyPreset=difficultyFor(difficulty,challenge);
  if(!modes[challenge]||!difficultyPreset)return {ok:false,reason:'The selected practice rules are invalid.'};
  const performance=createCombatPerformance(),practiceTowers=roster.map((entry,index)=>{const def=towersDef[entry.type];return{id:index+1,type:entry.type,level:entry.level,branch:entry.level>=2?entry.branch:null,branchChoice:entry.level===1?entry.branch:null,x:entry.x,y:entry.y,cooldown:0,targetMode:'First',abilityReadyAt:0,abilityUsedWave:-1,invested:def.cost};});
  const enemy=createEnemy(enemyType,1,2,enemyType==='flyer'?'air':'ground');enemy.progress=70;enemy.armor=armor;enemy.shield=shield;enemy.maxShield=shield;
  const state={selectedMap:mapId,challenge,difficulty,challengeRules,terrainRulesVersion:1,waveScheduleVersion:8,researchLoadout:[...researchLoadout],relicLoadout:[...relicLoadout],running:true,gameOver:false,paused:false,
    simulationTick:0,gameTime:0,cash:modes[challenge].cash+difficultyPreset.cashDelta,lives:modes[challenge].lives,popped:0,wave:1,bloomCharge:0,towers:practiceTowers,enemies:[enemy],shots:[],spawnQueue:[],spawnClock:0,
    nextEntityId:practiceTowers.length+2,intermission:0,speed:1,performance,combatPerformance:performance,rejuvenationField:null,seedObjective:null};
  for(const tower of practiceTowers)registerCombatTower(performance,tower);
  const initialHealth=enemy.hp+enemy.shield;
  for(let tick=0;tick<maxTicks&&state.enemies.length;tick++){
    state.gameTime+=SIMULATION_STEP;
    stepCombat(state,SIMULATION_STEP,{pathLength,positionOf:enemy=>positionOf(enemy.progress)});
    state.simulationTick++;
  }
  const damage=practiceTowers.reduce((sum,tower)=>sum+(Number(performance.towers?.[tower.id]?.damage)||0),0);
  return {ok:true,practiceOnly:true,mapId,challenge,difficulty,towerType,towerLevel,branch,enemyType,armor,shield,initialHealth:Math.round(initialHealth*100)/100,
    damage:Math.round(damage*100)/100,remainingHp:Math.max(0,Math.round(((state.enemies[0]?.hp||0)+(state.enemies[0]?.shield||0))*100)/100),
    defeated:state.enemies.length===0,leaked:state.lives<modes[challenge].lives,simulatedSeconds:Math.round(state.simulationTick*SIMULATION_STEP*100)/100,
    attackStats:getEffectiveTowerStats(practiceTowers[0],{challenge,challengeRules,terrain:terrainZoneAt(mapId,practiceTowers[0]),linked:false,researchLoadout,relicLoadout},towersDef[practiceTowers[0].type]),
    defenderBreakdown:practiceTowers.map(tower=>({type:tower.type,level:tower.level,damage:Number(performance.towers?.[tower.id]?.damage)||0})),events:state.enemies.length?state.enemies[0]:null};
}
