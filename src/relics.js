export const RELIC_LOADOUT_SIZE = 2;

export const RELICS = Object.freeze([
  { id:'amber-lens', name:'Amber Lens', type:'sprout', description:'Sprout Slinger range +8%; attack interval +10%.', incompatible:['thorn-seal'], effect:{rangeMultiplier:1.08,rateMultiplier:1.10} },
  { id:'dewdrop-phial', name:'Dewdrop Phial', type:'dew', description:'Dew Bell slow lasts +0.3s; attack interval +8%.', incompatible:['ember-jar'], effect:{slow:0.3,rateMultiplier:1.08} },
  { id:'bursting-husk', name:'Bursting Husk', type:'puff', description:'Puff Pod splash radius +12; attack interval +10%.', incompatible:[], effect:{splash:12,rateMultiplier:1.10} },
  { id:'thorn-seal', name:'Thorn Seal', type:'thorn', description:'Thorn Beacon armor break +1; range −6%.', incompatible:['amber-lens'], effect:{armorBreak:1,rangeMultiplier:0.94} },
  { id:'sunmark-kernel', name:'Sunmark Kernel', type:'sunflower', description:'Sunflower earns +5 petals per clear; Golden Seeds link radius −8%.', incompatible:['windglass'], effect:{income:5,allyLinkRadiusMultiplier:0.92} },
  { id:'windglass', name:'Windglass', type:'gust', description:'Kite Keeper push strength +20%; attack interval +10%.', incompatible:['sunmark-kernel'], effect:{pushMultiplier:1.20,rateMultiplier:1.10} },
  { id:'ember-jar', name:'Ember Jar', type:'ember', description:'Ember burn lasts +0.4s; attack interval +10%.', incompatible:['dewdrop-phial'], effect:{burn:0.4,rateMultiplier:1.10} },
  { id:'briar-loop', name:'Briar Loop', type:'briar', description:'Briar poison lasts +0.4s; range −5%.', incompatible:[], effect:{poison:0.4,rangeMultiplier:0.95} },
  { id:'beacon-bell', name:'Beacon Bell', type:'pollenBeacon', description:'Pollen Beacon reaches +10 units farther; its interval buff is weaker (−10% instead of −12%).', incompatible:[], effect:{rangeBonus:10,buffMultiplier:0.90} }
]);

export const RELIC_REWARDS = Object.freeze([
  {missionId:'meadow',relicId:'amber-lens'},
  {missionId:'meadow-crossing',relicId:'dewdrop-phial'},
  {missionId:'meadow-orchard',relicId:'bursting-husk'},
  {missionId:'creek',relicId:'thorn-seal'},
  {missionId:'creek-ford',relicId:'sunmark-kernel'},
  {missionId:'creek-floodplain',relicId:'windglass'},
  {missionId:'ridge',relicId:'ember-jar'},
  {missionId:'ridge-switchback',relicId:'briar-loop'},
  {missionId:'ridge-summit',relicId:'beacon-bell'}
]);

const RELIC_BY_ID=new Map(RELICS.map(relic=>[relic.id,relic]));
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

export function unlockedRelicIds(completedMissions=[]){
  const completed=new Set(Array.isArray(completedMissions)?completedMissions:[]);
  return RELIC_REWARDS.filter(reward=>completed.has(reward.missionId)).map(reward=>reward.relicId);
}

export function validRelicLoadout(value){
  if(!Array.isArray(value)||value.length>RELIC_LOADOUT_SIZE||new Set(value).size!==value.length)return false;
  const relics=value.map(id=>RELIC_BY_ID.get(id));
  return relics.every(Boolean)&&!relics.some((relic,index)=>relics.slice(index+1).some(other=>relic.incompatible.includes(other.id)||other.incompatible.includes(relic.id)));
}

export function relicPairConflict(firstId,secondId){
  const first=RELIC_BY_ID.get(firstId),second=RELIC_BY_ID.get(secondId);
  return Boolean(first&&second&&(first.incompatible.includes(second.id)||second.incompatible.includes(first.id)));
}

export function normalizeRelicState(value,completedMissions=[]){
  const source=isRecord(value)?value:{},unlocked=unlockedRelicIds(completedMissions),allowed=new Set(unlocked),loadout=[];
  for(const id of Array.isArray(source.loadout)?source.loadout:[]){
    if(!allowed.has(id)||loadout.length>=RELIC_LOADOUT_SIZE||loadout.includes(id)||loadout.some(other=>relicPairConflict(other,id)))continue;
    loadout.push(id);
  }
  return {unlocked,loadout};
}

export function equipRelic(state,relicId,completedMissions=[]){
  const next=normalizeRelicState(state,completedMissions),relic=RELIC_BY_ID.get(relicId);
  if(!relic||!next.unlocked.includes(relicId))return {ok:false,reason:'Clear the relic\'s campaign mission to unlock it.',state:next};
  if(next.loadout.includes(relicId))return {ok:true,changed:false,state:next};
  const conflict=next.loadout.find(id=>relicPairConflict(id,relicId));
  if(conflict){const other=RELIC_BY_ID.get(conflict);return {ok:false,reason:`${relic.name} cannot share a loadout with ${other.name}; both use the same field kit.`,state:next};}
  if(next.loadout.length>=RELIC_LOADOUT_SIZE)return {ok:false,reason:'Unequip a relic first; only two relic slots are available.',state:next};
  next.loadout.push(relicId);
  return {ok:true,changed:true,state:next};
}

export function unequipRelic(state,relicId,completedMissions=[]){
  const next=normalizeRelicState(state,completedMissions),before=next.loadout.length;
  next.loadout=next.loadout.filter(id=>id!==relicId);
  return {ok:true,changed:next.loadout.length!==before,state:next};
}

export function relicLoadoutIds(state){
  if(!state||!Array.isArray(state.unlocked)||!validRelicLoadout(state.loadout))return [];
  return state.loadout.filter(id=>state.unlocked.includes(id));
}

export function applyRelicsToTowerStats(stats,tower,relicIds=[]){
  if(!stats||!tower)return stats;
  for(const id of relicIds){
    const relic=RELIC_BY_ID.get(id),effect=relic?.effect;
    if(!effect||relic.type!==tower.type)continue;
    if(effect.rangeMultiplier!==undefined)stats.range*=effect.rangeMultiplier;
    if(effect.rangeBonus!==undefined)stats.range+=effect.rangeBonus;
    if(effect.rateMultiplier!==undefined)stats.rate*=effect.rateMultiplier;
    for(const key of ['slow','splash','armorBreak','income','burn','poison'])if(effect[key]!==undefined)stats[key]=(stats[key]||0)+effect[key];
    if(effect.pushMultiplier!==undefined)stats.push*=effect.pushMultiplier;
    if(effect.allyLinkRadiusMultiplier!==undefined)stats.allyLinkRadius*=effect.allyLinkRadiusMultiplier;
    if(effect.buffMultiplier!==undefined)stats.buffMultiplier=effect.buffMultiplier;
  }
  return stats;
}
