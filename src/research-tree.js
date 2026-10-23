import { CAMPAIGN_MISSIONS } from './campaign.js';

export const RESEARCH_POINT_CAP = 12;
export const RESEARCH_PATHS = Object.freeze([
  { id:'trailcraft', name:'Trailcraft', summary:'Trade firing pace for coverage and weather-wise shots.' },
  { id:'fieldstudy', name:'Field Study', summary:'Strengthen control effects while giving up a little attack tempo.' },
  { id:'stewardship', name:'Stewardship', summary:'Choose between harvest, support reach, trap coverage, or a riskier start.' }
]);

export const RESEARCH_NODES = Object.freeze([
  { id:'sprout-survey', path:'trailcraft', tier:1, name:'Surveying Seeds', description:'Sprout Slinger range +10%; attack interval +8%.', effect:{ type:'sprout', rangeMultiplier:1.10, rate:1.08 } },
  { id:'thorn-overlook', path:'trailcraft', tier:2, name:'Thorn Overlook', description:'Thorn Beacon range +10%; attack interval +10%.', effect:{ type:'thorn', rangeMultiplier:1.10, rate:1.10 } },
  { id:'kite-tailwind', path:'trailcraft', tier:3, name:'Measured Tailwind', description:'Kite Keeper range +9%; attack interval +10%.', effect:{ type:'gust', rangeMultiplier:1.09, rate:1.10 } },
  { id:'ember-bellows', path:'trailcraft', tier:4, name:'Ember Bellows', description:'Ember burn lasts +0.25s; attack interval +10%.', effect:{ type:'ember', burn:0.25, rate:1.10 } },
  { id:'dew-deepening', path:'fieldstudy', tier:1, name:'Deepening Dew', description:'Dew Bell slow lasts +0.25s; attack interval +9%.', effect:{ type:'dew', slow:0.25, rate:1.09 } },
  { id:'puff-canopy', path:'fieldstudy', tier:2, name:'Canopy Bursts', description:'Puff Pod splash radius +10; attack interval +10%.', effect:{ type:'puff', splash:10, rate:1.10 } },
  { id:'briar-tangle', path:'fieldstudy', tier:3, name:'Long Tangle', description:'Briar poison lasts +0.35s; attack interval +12%.', effect:{ type:'briar', poison:0.35, rate:1.12 } },
  { id:'thorn-fracture', path:'fieldstudy', tier:4, name:'Fracture Study', description:'Thorn Beacon armor break +1; range −8%.', effect:{ type:'thorn', armorBreak:1, rangeMultiplier:0.92 } },
  { id:'sunflower-yield', path:'stewardship', tier:1, name:'Rich Loam', description:'Sunflower earns +4 petals per clear; Golden Seeds link radius −10%.', effect:{ type:'sunflower', income:4, allyLinkRadius:0.90 } },
  { id:'beacon-network', path:'stewardship', tier:2, name:'Beacon Network', description:'Pollen Beacon reaches +16 units farther; its attack-speed buff is slightly weaker (−9% instead of −12%).', effect:{ type:'pollenBeacon', rangeBonus:16, buffMultiplier:0.91 } },
  { id:'compost-lattice', path:'stewardship', tier:3, name:'Compost Lattice', description:'Compost Trap reaches +12 units farther, but can trigger one fewer time per run.', effect:{ type:'compostTrap', rangeBonus:12, triggerLimit:-1 } },
  { id:'seed-reserve', path:'stewardship', tier:4, name:'Risky Seed Reserve', description:'Start with +14 petals and −1 life.', effect:{ type:'start', cash:14, lives:-1 } }
]);

const NODES_BY_ID = new Map(RESEARCH_NODES.map(node=>[node.id,node]));
const PATHS_BY_ID = new Map(RESEARCH_PATHS.map(path=>[path.id,path]));
const PATH_NODES = new Map(RESEARCH_PATHS.map(path=>[path.id,RESEARCH_NODES.filter(node=>node.path===path.id)]));
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function earnedResearchPoints(profile={}) {
  const completed=new Set(profile.completedMissions||[]);
  const chapters=new Set(CAMPAIGN_MISSIONS.filter(mission=>completed.has(mission.id)).map(mission=>mission.chapter));
  const completeChapters=[...chapters].filter(chapter=>CAMPAIGN_MISSIONS.filter(mission=>mission.chapter===chapter).every(mission=>completed.has(mission.id))).length;
  let masteryStars=0;
  for(const byDifficulty of Object.values(profile.missionMastery||{}))for(const record of Object.values(byDifficulty||{}))
    masteryStars+=['completion','objective','efficiency'].filter(tier=>record?.[tier]===true).length;
  return Math.min(RESEARCH_POINT_CAP,completeChapters+Math.floor(masteryStars/3));
}

export function normalizeResearchState(value, pointLimit=RESEARCH_POINT_CAP) {
  const source=isRecord(value)?value:{},points=Math.max(0,Math.min(RESEARCH_POINT_CAP,Math.floor(pointLimit)));
  const rawUnlocked=Array.isArray(source.unlocked)?source.unlocked:[];
  const unlocked=[];
  for(const path of RESEARCH_PATHS)for(const node of PATH_NODES.get(path.id)){
    if(unlocked.length>=points)break;
    if(!rawUnlocked.includes(node.id))break;
    unlocked.push(node.id);
  }
  const loadout={};
  if(isRecord(source.loadout))for(const path of RESEARCH_PATHS){
    const id=source.loadout[path.id];
    if(NODES_BY_ID.get(id)?.path===path.id&&unlocked.includes(id))loadout[path.id]=id;
  }
  return {unlocked,loadout};
}

export function purchaseResearchNode(state,nodeId,pointLimit) {
  const node=NODES_BY_ID.get(nodeId);
  if(!node||!PATHS_BY_ID.has(node.path))return {ok:false,reason:'Unknown research node.',state};
  const next=normalizeResearchState(state,pointLimit),pathNodes=PATH_NODES.get(node.path),index=pathNodes.indexOf(node);
  if(next.unlocked.includes(nodeId))return {ok:true,state:{...next,loadout:{...next.loadout,[node.path]:nodeId}},changed:true};
  if(next.unlocked.length>=pointLimit)return {ok:false,reason:'Earn another research point from a chapter clear or mastery milestones.',state:next};
  if(index>0&&!next.unlocked.includes(pathNodes[index-1].id))return {ok:false,reason:`Research ${pathNodes[index-1].name} first.`,state:next};
  next.unlocked.push(nodeId);next.loadout[node.path]=nodeId;
  return {ok:true,state:next,changed:true};
}

export function selectResearchNode(state,nodeId,pointLimit) {
  const next=normalizeResearchState(state,pointLimit),node=NODES_BY_ID.get(nodeId);
  if(!node||!next.unlocked.includes(nodeId))return {ok:false,reason:'Research this node before equipping it.',state:next};
  next.loadout[node.path]=nodeId;
  return {ok:true,state:next,changed:true};
}

export function clearResearchLoadout(state,pointLimit) {
  return { unlocked:[], loadout:{} };
}

export function researchLoadoutIds(state) {
  const normalized=normalizeResearchState(state,RESEARCH_POINT_CAP);
  return RESEARCH_PATHS.map(path=>normalized.loadout[path.id]).filter(Boolean);
}

export function validResearchLoadout(value) {
  if(!Array.isArray(value)||value.length>RESEARCH_PATHS.length||new Set(value).size!==value.length)return false;
  const paths=new Set();
  for(const id of value){const node=NODES_BY_ID.get(id);if(!node||paths.has(node.path))return false;paths.add(node.path);}
  return true;
}

export function applyResearchToTowerStats(stats,tower,researchIds=[]) {
  if(!stats||!tower)return stats;
  for(const id of researchIds){
    const node=NODES_BY_ID.get(id),effect=node?.effect;
    if(!effect||effect.type!==tower.type)continue;
    if(effect.rangeMultiplier!==undefined)stats.range*=effect.rangeMultiplier;
    if(effect.rangeBonus!==undefined)stats.range+=effect.rangeBonus;
    if(effect.rate!==undefined)stats.rate*=effect.rate;
    for(const key of ['burn','slow','poison','splash','armorBreak','income'])if(effect[key]!==undefined)stats[key]=(stats[key]||0)+effect[key];
    if(effect.allyLinkRadius!==undefined)stats.allyLinkRadius*=effect.allyLinkRadius;
    if(effect.buffMultiplier!==undefined)stats.buffMultiplier=effect.buffMultiplier;
  }
  return stats;
}

export function researchStartingAdjustment(researchIds=[]) {
  const effect=RESEARCH_NODES.find(node=>node.id==='seed-reserve'&&researchIds.includes(node.id))?.effect;
  return {cash:effect?.cash||0,lives:effect?.lives||0};
}
