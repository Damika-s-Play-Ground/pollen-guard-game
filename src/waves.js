import { AIR_ROUTE_SCHEDULE_VERSION } from './air-routes.js';
import { adjustedSpawnGroups, tuneSpawnGroup } from './challenge-rules.js';
import { ENDLESS_CHOICES, ENDLESS_ENEMY_CAP, ENDLESS_MIN_SPAWN_INTERVAL, ENDLESS_THREAT_BUDGET, isEndlessChoice } from './endless-mode.js';

export const AUTHORED_WAVES = [
  { groups: [{ type: 'mite', count: 10, interval: 0.56 }], cue: 'Fragile mites arrive in a steady line.' },
  { groups: [{ type: 'mite', count: 8, interval: 0.52 }, { type: 'zip', count: 3, interval: 0.38 }], cue: 'Fast zip mites test your coverage.' },
  { groups: [{ type: 'mite', count: 10, interval: 0.5 }, { type: 'zip', count: 4, interval: 0.36 }], cue: 'A faster group follows the first line.' },
  { groups: [{ type: 'mite', count: 8, interval: 0.5 }, { type: 'armored', count: 2, interval: 0.8 }, { type: 'zip', count: 3, interval: 0.36 }], cue: 'Armored beetles reward focused damage.' },
  { groups: [{ type: 'mite', count: 10, interval: 0.48 }, { type: 'boss', count: 1, interval: 1 }, { type: 'zip', count: 4, interval: 0.34 }], cue: 'Bramble beetle sighting.' },
  { groups: [{ type: 'mite', count: 10, interval: 0.48 }, { type: 'flyer', count: 3, interval: 0.7 }], cue: 'Sky gnats fly over ground blockers.' },
  { groups: [{ type: 'mite', count: 8, interval: 0.48 }, { type: 'zip', count: 6, interval: 0.34 }, { type: 'shield', count: 3, interval: 0.72 }], cue: 'Shield bugs bring a second defensive layer.' },
  { groups: [{ type: 'mite', count: 10, interval: 0.46 }, { type: 'armored', count: 4, interval: 0.68 }, { type: 'splitter', count: 2, interval: 0.74 }], cue: 'Splitters create two smaller mites when defeated.' },
  { groups: [{ type: 'zip', count: 8, interval: 0.32 }, { type: 'flyer', count: 4, interval: 0.62 }], cue: 'A quick mixed wave pressures long lanes.' },
  { groups: [{ type: 'mite', count: 10, interval: 0.44 }, { type: 'shield', count: 4, interval: 0.68 }, { type: 'armored', count: 3, interval: 0.65 }, { type: 'boss', count: 1, interval: 1 }], cue: 'Boss protected by a mixed escort.' },
  { groups: [{ type: 'splitter', count: 4, interval: 0.68 }, { type: 'flyer', count: 5, interval: 0.58 }], cue: 'Splitters and flyers reward flexible coverage.' },
  { groups: [{ type: 'armored', count: 6, interval: 0.62 }, { type: 'zip', count: 8, interval: 0.3 }, { type: 'shield', count: 4, interval: 0.66 }], cue: 'Sustained pressure tests damage and control.' },
  { groups: [{ type: 'boss', count: 1, interval: 1 }, { type: 'flyer', count: 6, interval: 0.54 }, { type: 'splitter', count: 3, interval: 0.66 }], cue: 'A bramble beetle leads an airborne swarm.' },
  { groups: [{ type: 'zip', count: 8, interval: 0.29 }, { type: 'splitter', count: 6, interval: 0.6 }, { type: 'armored', count: 5, interval: 0.58 }], cue: 'Fast pests screen a heavy ground group.' },
  { groups: [{ type: 'boss', count: 1, interval: 1 }, { type: 'armored', count: 6, interval: 0.55 }, { type: 'flyer', count: 6, interval: 0.5 }, { type: 'zip', count: 8, interval: 0.28 }], cue: 'Final defense: boss, armor, air and speed.' }
];

export const ENEMY_TYPES = ['mite', 'zip', 'armored', 'shield', 'splitter', 'flyer', 'boss', 'healer', 'carrier', 'burrower'];
export const LEGACY_WAVE_SCHEDULE_VERSION = 0;
export const PRE_BOSS_WAVE_SCHEDULE_VERSION = 1;
export const PRE_TACTICAL_ENEMY_SCHEDULE_VERSION = 2;
export const PRE_SHIELD_CARRIER_SCHEDULE_VERSION = 3;
export const PRE_BURROWER_SCHEDULE_VERSION = 4;
export const PRE_MIXED_TACTICAL_SCHEDULE_VERSION = 5;
export const PRE_AIR_ROUTE_SCHEDULE_VERSION = 6;
export const MIXED_ROLE_SCHEDULE_VERSION = 6;
export const PRE_RIDGE_BALANCE_SCHEDULE_VERSION = AIR_ROUTE_SCHEDULE_VERSION;
export const WAVE_SCHEDULE_VERSION = PRE_RIDGE_BALANCE_SCHEDULE_VERSION + 1;

const threatWeights = { mite: 1, zip: 1.3, armored: 3, shield: 2.5, splitter: 2.4, flyer: 2.2, boss: 18, healer:3, carrier:4, burrower:2.3 };
const enemyBounties = { mite: 2, zip: 3, armored: 6, shield: 5, splitter: 5, flyer: 6, crumb: 1, boss: 35, healer:5, carrier:6, burrower:5 };
for (const wave of AUTHORED_WAVES) {
  wave.groups = wave.groups.map(group => ({ ...group, lane: group.type === 'flyer' ? 'air' : 'ground', telegraph: wave.cue }));
  wave.budget = wave.groups.reduce((sum, group) => sum + threatWeights[group.type] * group.count, 0);
}

function authoredCampaign(specialWaves) {
  const schedules = AUTHORED_WAVES.map(wave => ({ cue:wave.cue, budget:wave.budget, groups:wave.groups.map(group=>({...group})) }));
  for (const [number, authored] of Object.entries(specialWaves)) {
    const groups = authored.groups.map(group=>({
      ...group, lane:group.type==='flyer'?'air':'ground', telegraph:authored.cue
    }));
    schedules[Number(number)-1] = {
      cue:authored.cue, groups,
      budget:groups.reduce((sum,group)=>sum+(threatWeights[group.type]||0)*group.count,0)
    };
  }
  return schedules;
}

export const CAMPAIGN_WAVES = Object.freeze({
  meadow: AUTHORED_WAVES,
  creek: authoredCampaign({
    1:{cue:'A light line of moss mites follows the creek bends.',groups:[{type:'mite',count:8,interval:.5}]},
    2:{cue:'Fast zip mites test the creekside coverage.',groups:[{type:'zip',count:4,interval:.32}]},
    3:{cue:'Armored beetles arrive alone; plan focused damage.',groups:[{type:'armored',count:2,interval:.72}]},
    4:{cue:'A long mixed line tests creekside coverage.',groups:[{type:'mite',count:8,interval:.46},{type:'armored',count:2,interval:.72},{type:'zip',count:4,interval:.32}]},
    6:{cue:'Sky gnats skim over the creek while mites hold the trail.',groups:[{type:'flyer',count:4,interval:.58},{type:'mite',count:8,interval:.44}]},
    8:{cue:'Shield bugs advance behind a fast screen.',groups:[{type:'zip',count:5,interval:.31},{type:'shield',count:3,interval:.62},{type:'mite',count:6,interval:.44}]},
    10:{cue:'A Bramble boss presses through a shielded creek escort.',groups:[{type:'boss',count:1,interval:1},{type:'shield',count:4,interval:.62},{type:'flyer',count:4,interval:.54}]},
    12:{cue:'Splitters and sky gnats attack both coverage lanes.',groups:[{type:'splitter',count:4,interval:.58},{type:'flyer',count:6,interval:.5},{type:'armored',count:3,interval:.55}]},
    15:{cue:'Final creek defense: boss, armor, air and a fast screen.',groups:[{type:'boss',count:1,interval:1},{type:'armored',count:5,interval:.52},{type:'flyer',count:7,interval:.46},{type:'zip',count:9,interval:.26}]}
  }),
  ridge: authoredCampaign({
    1:{cue:'Fast zip mites scout the narrow ridge trail.',groups:[{type:'zip',count:4,interval:.3}]},
    2:{cue:'Sky gnats test air coverage above the ridge.',groups:[{type:'flyer',count:3,interval:.52}]},
    3:{cue:'Armored beetles arrive alone; plan focused damage.',groups:[{type:'armored',count:2,interval:.66}]},
    4:{cue:'Splitters arrive alone and divide when defeated.',groups:[{type:'splitter',count:2,interval:.62}]},
    6:{cue:'Shield bugs arrive alone with an extra defense layer.',groups:[{type:'shield',count:3,interval:.58}]},
    5:{cue:'A Bramble boss leads a heavy ridge escort.',groups:[{type:'boss',count:1,interval:1},{type:'armored',count:4,interval:.54},{type:'flyer',count:4,interval:.5}]},
    8:{cue:'Zip mites screen splitters and shield bugs.',groups:[{type:'zip',count:8,interval:.28},{type:'splitter',count:4,interval:.56},{type:'shield',count:4,interval:.6}]},
    10:{cue:'Two Bramble bosses split a mixed ridge attack.',groups:[{type:'boss',count:2,interval:.85},{type:'flyer',count:5,interval:.48},{type:'armored',count:4,interval:.5}]},
    13:{cue:'The ridge narrows under a boss and fast air pressure.',groups:[{type:'boss',count:1,interval:.9},{type:'zip',count:10,interval:.24},{type:'flyer',count:7,interval:.42},{type:'splitter',count:4,interval:.54}]},
    15:{cue:'Final ridge defense: bosses, splitters and relentless air.',groups:[{type:'boss',count:2,interval:.8},{type:'splitter',count:6,interval:.5},{type:'armored',count:5,interval:.48},{type:'flyer',count:8,interval:.4},{type:'zip',count:10,interval:.23}]}
  }),
  'meadow-crossing': authoredCampaign({
    3:{cue:'A shield bug anchors the far crossing.',groups:[{type:'shield',count:2,interval:.65},{type:'mite',count:8,interval:.43}]},
    7:{cue:'Fast mites split across the crossing.',groups:[{type:'zip',count:8,interval:.29},{type:'splitter',count:3,interval:.58}]},
    15:{cue:'The crossing closes under a Bramble Matriarch and air escort.',groups:[{type:'boss',count:1,interval:1},{type:'flyer',count:7,interval:.45},{type:'armored',count:5,interval:.5},{type:'zip',count:8,interval:.24}]}
  }),
  'meadow-orchard': authoredCampaign({
    4:{cue:'Orchard splitters divide among the narrow turns.',groups:[{type:'splitter',count:4,interval:.55},{type:'mite',count:8,interval:.42}]},
    9:{cue:'Moss Tenders protect an armored orchard group.',groups:[{type:'healer',count:2,interval:.72},{type:'armored',count:4,interval:.56},{type:'mite',count:8,interval:.4}]},
    15:{cue:'Orchard finale: Matriarch, splitters, armor and sky gnats.',groups:[{type:'boss',count:1,interval:1},{type:'splitter',count:6,interval:.48},{type:'armored',count:5,interval:.46},{type:'flyer',count:7,interval:.42}]}
  }),
  'creek-ford': authoredCampaign({
    2:{cue:'Zip mites race the ford before the first armor arrives.',groups:[{type:'zip',count:6,interval:.29}]},
    7:{cue:'Shield bugs and armored beetles contest the ford.',groups:[{type:'shield',count:4,interval:.56},{type:'armored',count:3,interval:.52}]},
    15:{cue:'The Tideglass Warden anchors a flood of armored pests.',groups:[{type:'boss',count:1,interval:1},{type:'carrier',count:2,interval:.75},{type:'armored',count:7,interval:.44},{type:'flyer',count:6,interval:.4}]}
  }),
  'creek-floodplain': authoredCampaign({
    5:{cue:'A split ground and air group sweeps the floodplain.',groups:[{type:'flyer',count:5,interval:.48},{type:'mite',count:10,interval:.4}]},
    10:{cue:'Sky gnats screen a shielded ground advance.',groups:[{type:'zip',count:7,interval:.3},{type:'flyer',count:6,interval:.44},{type:'shield',count:3,interval:.55}]},
    15:{cue:'Floodplain finale: Warden, splitters and sky gnats.',groups:[{type:'boss',count:1,interval:1},{type:'splitter',count:5,interval:.48},{type:'flyer',count:8,interval:.39}]}
  }),
  'ridge-switchback': authoredCampaign({
    3:{cue:'Flyers and zip mites enter together at the switchback.',groups:[{type:'flyer',count:4,interval:.48},{type:'zip',count:6,interval:.28}]},
    8:{cue:'Zip mites race ahead of a shielded switchback escort.',groups:[{type:'zip',count:5,interval:.3},{type:'shield',count:4,interval:.56},{type:'mite',count:8,interval:.4}]},
    15:{cue:'Thornswitch finale: Colossus, shield bugs and fast air.',groups:[{type:'boss',count:1,interval:1},{type:'shield',count:5,interval:.55},{type:'flyer',count:8,interval:.38},{type:'zip',count:10,interval:.23}]}
  }),
  'ridge-summit': authoredCampaign({
    6:{cue:'Sky gnats screen a group of armored beetles.',groups:[{type:'flyer',count:4,interval:.48},{type:'armored',count:5,interval:.5}]},
    11:{cue:'Fast runners and shield bugs press the narrow summit trail.',groups:[{type:'shield',count:4,interval:.56},{type:'zip',count:8,interval:.28}]},
    15:{cue:'Summit finale: two Colossi lead armored and airborne escorts.',groups:[{type:'boss',count:2,interval:.8},{type:'armored',count:5,interval:.5},{type:'flyer',count:8,interval:.38}]}
  })
});

function tacticalSchedules(schedules) {
  return Object.fromEntries(Object.entries(schedules).map(([mapId, waves]) => {
    const updated = waves.map(wave => ({ ...wave, groups:wave.groups.map(group=>({...group})) }));
    updated[8] = {
      cue:'Moss Tenders prepare a healing pulse. Focus the tender or break up its nearby group.', budget:18,
      groups:[
        { type:'healer', count:2, interval:.7, lane:'ground', telegraph:'Moss Tender · healing pulse' },
        { type:'mite', count:12, interval:.42, lane:'ground', telegraph:'Moss Tender · healing pulse' }
      ]
    };
    return [mapId, updated];
  }));
}

export const TACTICAL_CAMPAIGN_WAVES = Object.freeze(tacticalSchedules(CAMPAIGN_WAVES));

function carrierSchedules(schedules) {
  return Object.fromEntries(Object.entries(schedules).map(([mapId, waves]) => {
    const updated = waves.map(wave => ({ ...wave, groups:wave.groups.map(group=>({...group})) }));
    updated[10] = {
      cue:'Shield carriers warn before reinforcing nearby escorts. Focus them or use area damage.', budget:18,
      groups:[
        { type:'carrier', count:2, interval:.8, lane:'ground', telegraph:'Shield carrier · ward pulse' },
        { type:'mite', count:10, interval:.44, lane:'ground', telegraph:'Shield carrier · ward pulse' }
      ]
    };
    return [mapId, updated];
  }));
}

export const CARRIER_CAMPAIGN_WAVES = Object.freeze(carrierSchedules(TACTICAL_CAMPAIGN_WAVES));

function burrowerSchedules(schedules) {
  return Object.fromEntries(Object.entries(schedules).map(([mapId, waves]) => {
    const updated = waves.map(wave => ({ ...wave, groups:wave.groups.map(group=>({...group})) }));
    const wave = updated[12], replaceable = wave.groups.find(group => group.type === 'zip') ||
      wave.groups.find(group => group.type === 'splitter') || wave.groups.find(group => group.type === 'flyer');
    if (replaceable) replaceable.count = Math.max(0, replaceable.count - 2);
    wave.groups = wave.groups.filter(group => group.count > 0);
    wave.groups.push({ type:'burrower', count:2, interval:.82, lane:'ground', telegraph:'Burrower · dirt plume before dive' });
    wave.cue = 'Burrowers dive beneath the trail and surge ahead. Catch them while surfaced or time area damage for their warning.';
    wave.budget = wave.groups.reduce((sum, group) => sum + (threatWeights[group.type] || 0) * group.count, 0);
    for (const group of wave.groups) if (group.type !== 'burrower') group.telegraph = wave.cue;
    return [mapId, updated];
  }));
}

export const BURROWER_CAMPAIGN_WAVES = Object.freeze(burrowerSchedules(CARRIER_CAMPAIGN_WAVES));

function mixedRoleSchedules(schedules) {
  return Object.fromEntries(Object.entries(schedules).map(([mapId, waves]) => {
    const updated = waves.map(wave => ({ ...wave, groups:wave.groups.map(group=>({...group})) }));
    const wave = updated[13], zip = wave.groups.find(group => group.type === 'zip');
    if (zip) zip.count = Math.max(1, zip.count - 7);
    wave.groups = wave.groups.filter(group => group.count > 0);
    wave.groups.unshift(
      { type:'healer', count:1, interval:.45, lane:'ground', telegraph:'Tactical escort · break the support chain' },
      { type:'carrier', count:1, interval:.45, lane:'ground', telegraph:'Tactical escort · break the support chain' },
      { type:'burrower', count:1, interval:.45, lane:'ground', telegraph:'Tactical escort · break the support chain' }
    );
    wave.cue = 'A mixed tactical escort links healing, shielding and burrow windows. Set Support priority to break the healers and carriers first.';
    wave.budget = wave.groups.reduce((sum, group) => sum + (threatWeights[group.type] || 0) * group.count, 0);
    for (const group of wave.groups) group.telegraph = wave.cue;
    return [mapId, updated];
  }));
}

export const MIXED_ROLE_CAMPAIGN_WAVES = Object.freeze(mixedRoleSchedules(BURROWER_CAMPAIGN_WAVES));

function airRouteSchedules(schedules) {
  return Object.fromEntries(Object.entries(schedules).map(([mapId, authored]) => {
    const updated = authored.map(wave => ({ ...wave, groups:wave.groups.map(group=>({...group})) }));
    const introduction = updated.find(wave => wave.groups.some(group => group.type === 'flyer'));
    if (introduction) {
      introduction.cue = 'Sky gnats enter the cyan sky route. Place a Kite Keeper or Thorn Beacon before launch; other defenders cannot hit air.';
      introduction.groups = introduction.groups.map(group => ({ ...group, telegraph:introduction.cue }));
    }
    return [mapId, updated];
  }));
}

export const AIR_ROUTE_CAMPAIGN_WAVES = Object.freeze(airRouteSchedules(MIXED_ROLE_CAMPAIGN_WAVES));

function replaceAuthoredWave(schedule, waveNumber, cue, groups) {
  const copy=schedule.map(wave=>({...wave,groups:wave.groups.map(group=>({...group}))}));
  const authoredGroups=groups.map(group=>({ ...group, lane:group.type==='flyer'?'air':'ground', telegraph:cue }));
  copy[waveNumber-1]={cue,groups:authoredGroups,budget:authoredGroups.reduce((sum,group)=>sum+(threatWeights[group.type]||0)*group.count,0)};
  return copy;
}

const ridgeApproachBalanced=replaceAuthoredWave(
  replaceAuthoredWave(
    replaceAuthoredWave(AIR_ROUTE_CAMPAIGN_WAVES.ridge,10,'A Bramble boss leads a mixed ridge escort.',[
      {type:'boss',count:1,interval:.85},{type:'flyer',count:2,interval:.48},{type:'armored',count:1,interval:.5}
    ]),13,'The ridge narrows under a boss and a fast air escort.',[
      {type:'boss',count:1,interval:.9},{type:'zip',count:6,interval:.24},{type:'flyer',count:4,interval:.42},{type:'splitter',count:2,interval:.54}
    ]),15,'Final ridge defense: a Colossus leads splitters and a relentless air escort.',[
      {type:'boss',count:1,interval:.8},{type:'splitter',count:3,interval:.5},{type:'armored',count:4,interval:.48},{type:'flyer',count:5,interval:.4},{type:'zip',count:6,interval:.23}
    ]);
const ridgeSummitBalanced=replaceAuthoredWave(AIR_ROUTE_CAMPAIGN_WAVES['ridge-summit'],15,
  'Summit finale: the Colossus leads an armored and airborne escort.',[
    {type:'boss',count:1,interval:.8},{type:'armored',count:4,interval:.5},{type:'flyer',count:7,interval:.38}
  ]);
export const BALANCED_CAMPAIGN_WAVES=Object.freeze({
  ...AIR_ROUTE_CAMPAIGN_WAVES,
  ridge:ridgeApproachBalanced,
  'ridge-summit':ridgeSummitBalanced
});

const customWaveSchedules=new Map();
export function registerCustomWaveSchedules(mapId,schedules){
  if(typeof mapId!=='string'||!/^custom-[a-z][a-z0-9-]{1,31}$/.test(mapId)||!Array.isArray(schedules)||schedules.length!==15)return false;
  customWaveSchedules.set(mapId,schedules.map(wave=>({cue:wave.cue,groups:wave.groups.map(group=>({...group}))})));return true;
}

export function waveSchedulesForMap(mapId = 'meadow', version = WAVE_SCHEDULE_VERSION) {
  if(customWaveSchedules.has(mapId))return customWaveSchedules.get(mapId);
  if (version === LEGACY_WAVE_SCHEDULE_VERSION) return AUTHORED_WAVES;
  const schedules = version >= WAVE_SCHEDULE_VERSION ? BALANCED_CAMPAIGN_WAVES :
    version >= AIR_ROUTE_SCHEDULE_VERSION ? AIR_ROUTE_CAMPAIGN_WAVES :
    version >= MIXED_ROLE_SCHEDULE_VERSION ? MIXED_ROLE_CAMPAIGN_WAVES :
      version >= PRE_MIXED_TACTICAL_SCHEDULE_VERSION ? BURROWER_CAMPAIGN_WAVES :
      version >= PRE_BURROWER_SCHEDULE_VERSION ? CARRIER_CAMPAIGN_WAVES :
      version > PRE_TACTICAL_ENEMY_SCHEDULE_VERSION ? TACTICAL_CAMPAIGN_WAVES : CAMPAIGN_WAVES;
  return schedules[mapId] || schedules.meadow;
}

export function calculateWaveBudget(queue) {
  return queue.reduce((sum, spawn) => sum + (threatWeights[typeof spawn === 'string' ? spawn : spawn.type] || 0), 0);
}

export function summarizeWave(waveNumber, schedules = AUTHORED_WAVES, options = {}) {
  if (!Number.isInteger(waveNumber) || waveNumber < 1 || !Array.isArray(schedules) || schedules.length === 0) return null;
  const cycle = Math.floor((waveNumber - 1) / schedules.length);
  const schedule = schedules[(waveNumber - 1) % schedules.length];
  if (!schedule?.groups?.length) return null;
  const queue = buildWaveQueue(waveNumber, schedules, options);
  const seedCarrierIndex=queue.findIndex(spawn=>spawn.seedCarrier);
  const groups = schedule.groups.map(group => tuneSpawnGroup({ ...group, count: options.endless?Math.min(group.count+cycle,28):group.count + cycle }, options));
  if(options.endless&&isEndlessChoice(options.endlessModifier)){
    const modifier=ENDLESS_CHOICES[options.endlessModifier];groups.push({type:modifier.type,count:modifier.count,interval:modifier.interval,lane:modifier.lane,telegraph:modifier.telegraph});
  }
  if(options.endless&&waveNumber%5===0&&!groups.some(group=>group.type==='boss'))groups.push({type:'boss',count:1,interval:.8,lane:'ground',telegraph:'Periodic boss · a bramble beetle leads this wave'});
  if(seedCarrierIndex>=0){
    const carrierGroup=groups.find(group=>group.lane==='ground'&&group.type!=='boss');
    if(carrierGroup)carrierGroup.seedCarrierCount=1;
  }
  const spawnSpan = queue.slice(0, -1).reduce((seconds, spawn) => seconds + spawn.interval, 0);
  const bounty = queue.reduce((total, spawn) => total + (enemyBounties[spawn.type] || 0) + (spawn.type === 'splitter' ? 2 : 0), 0);
  return {
    wave: waveNumber, groups, total: queue.length, budget: calculateWaveBudget(queue),
    spawnSpan, bounty, clearBonus: 12 + waveNumber * 2,
    cue:`${seedCarrierIndex>=0?`${schedule.cue} A marked seed thief turns back to the entry with one cache seed.`:schedule.cue}${options.endless&&options.endlessModifier&&ENDLESS_CHOICES[options.endlessModifier]?` ${ENDLESS_CHOICES[options.endlessModifier].description}`:''}${options.endless&&waveNumber%5===0?' Periodic boss warning: a Bramble boss joins this wave.':''}`
  };
}

export function upcomingWaves(startWave, count = 3, limit = Infinity, schedules = AUTHORED_WAVES, options = {}) {
  if (!Number.isInteger(startWave) || startWave < 1 || !Number.isInteger(count) || count < 0) return [];
  const waves = [];
  for (let wave = startWave; wave < startWave + count && wave <= limit; wave++) {
    const summary = summarizeWave(wave, schedules, options);
    if (summary) waves.push(summary);
  }
  return waves;
}

export function validateWaveSchedules(schedules = AUTHORED_WAVES, enemyTypes = ENEMY_TYPES) {
  if (!Array.isArray(schedules) || schedules.length !== 15) return { valid: false, reason: 'Expected 15 authored waves.' };
  const allowed = new Set(enemyTypes);
  for (let waveIndex = 0; waveIndex < schedules.length; waveIndex++) {
    const schedule=schedules[waveIndex], groups = schedule?.groups;
    if (typeof schedule?.cue !== 'string' || !schedule.cue.trim()) return { valid:false, reason:`Wave ${waveIndex+1} has no encounter cue.` };
    if (!Array.isArray(groups) || groups.length === 0) return { valid: false, reason: `Wave ${waveIndex + 1} has no spawn groups.` };
    for (const group of groups) {
      if (!group || !allowed.has(group.type) || !Number.isInteger(group.count) || group.count < 1 || !Number.isFinite(group.interval) || group.interval < 0.1 || group.interval > 5) {
        return { valid: false, reason: `Wave ${waveIndex + 1} has an invalid spawn group.` };
      }
      if (!['ground', 'air'].includes(group.lane) || typeof group.telegraph !== 'string' || !group.telegraph.trim()) return { valid: false, reason: `Wave ${waveIndex + 1} is missing its lane or telegraph.` };
    }
    const expectedBudget=groups.reduce((sum,group)=>sum+threatWeights[group.type]*group.count,0);
    if (!Number.isFinite(schedule.budget) || Math.abs(schedule.budget-expectedBudget)>1e-9) return { valid:false, reason:`Wave ${waveIndex+1} threat budget does not match its spawn groups.` };
  }
  return { valid: true, reason: '' };
}

export function buildWaveQueue(waveNumber, schedules = AUTHORED_WAVES, options = {}) {
  if (!Number.isInteger(waveNumber) || waveNumber < 1 || !Array.isArray(schedules) || schedules.length === 0) return [];
  const cycle = Math.floor((waveNumber - 1) / schedules.length);
  const schedule = schedules[(waveNumber - 1) % schedules.length];
  const groups = schedule.groups.map(group => ({ ...group, count:options.endless?Math.min(group.count+cycle,28):group.count + cycle }));
  const queue=adjustedSpawnGroups(groups, options);
  if(options.endless){
    if(isEndlessChoice(options.endlessModifier)){
      const modifier=ENDLESS_CHOICES[options.endlessModifier];
      for(let index=0;index<modifier.count;index++)queue.push({type:modifier.type,interval:modifier.interval,lane:modifier.lane,telegraph:modifier.telegraph});
    }
    // A boss appears at every five-wave checkpoint, even when an authored cycle
    // would otherwise omit one. Existing bosses are not duplicated.
    const bossCheckpoint=waveNumber%5===0;
    let checkpointBoss=bossCheckpoint?queue.find(spawn=>spawn.type==='boss'):null;
    const ordinary=bossCheckpoint?queue.filter(spawn=>spawn.type!=='boss'):queue;
    if(bossCheckpoint&&!checkpointBoss)checkpointBoss={type:'boss',interval:.8,lane:'ground',telegraph:'Periodic boss · a bramble beetle leads this wave'};
    const budgetLimit=bossCheckpoint?ENDLESS_THREAT_BUDGET-threatWeights.boss:ENDLESS_THREAT_BUDGET;
    let budget=0;
    const bounded=[];
    for(const spawn of ordinary){
      const type=typeof spawn==='string'?spawn:spawn.type;
      const threat=threatWeights[type]||0;
      if(bounded.length>=ENDLESS_ENEMY_CAP-(bossCheckpoint?1:0)||budget+threat>budgetLimit)continue;
      budget+=threat;
      bounded.push(typeof spawn==='string'?spawn:{...spawn,interval:Math.max(ENDLESS_MIN_SPAWN_INTERVAL,spawn.interval)});
    }
    if(checkpointBoss)bounded.push({...checkpointBoss,interval:Math.max(ENDLESS_MIN_SPAWN_INTERVAL,checkpointBoss.interval)});
    return bounded;
  }
  if(options.challengeRules?.includes('seedRecovery')&&[3,7,11].includes(waveNumber)){
    const index=queue.findIndex(spawn=>spawn.lane==='ground'&&spawn.type!=='boss');
    if(index>=0)queue[index]={...queue[index],seedCarrier:true,telegraph:'Seed thief · steals a cache seed and returns to the entry'};
  }
  return queue;
}

