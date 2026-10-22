export const CAMPAIGN_MISSIONS = Object.freeze([
  { id:'meadow', mapId:'meadow', chapter:1, chapterName:'The Open Meadow', name:'First Bloom', objective:'Finish with at least 10 seeds.', brief:'A steady ground lane introduces placement, targeting, and an early armored test.', goal:Object.freeze({ minLives:10 }) },
  { id:'meadow-crossing', mapId:'meadow-crossing', chapter:1, chapterName:'The Open Meadow', name:'Dewbell Crossing', objective:'Keep leaks to four or fewer.', brief:'Two long crossings reward overlapping range and a planned anti-air post.', goal:Object.freeze({ maxLeaks:4 }) },
  { id:'meadow-orchard', mapId:'meadow-orchard', chapter:1, chapterName:'The Open Meadow', name:'Orchard Heart', objective:'Defeat the Matriarch with at least 8 seeds.', brief:'Splitters and a late boss escort converge through tight orchard turns.', goal:Object.freeze({ minLives:8 }), boss:true },
  { id:'creek', mapId:'creek', chapter:2, chapterName:'The Whispering Creek', name:'Creekside Watch', objective:'Finish with at least 10 seeds.', brief:'Fast pests and water-edge bends make the first creek crossing a range test.', goal:Object.freeze({ minLives:10 }) },
  { id:'creek-ford', mapId:'creek-ford', chapter:2, chapterName:'The Whispering Creek', name:'Willow Ford', objective:'Keep leaks to five or fewer.', brief:'Armored beetles and shield bugs arrive in staggered groups across the ford.', goal:Object.freeze({ maxLeaks:5 }) },
  { id:'creek-floodplain', mapId:'creek-floodplain', chapter:2, chapterName:'The Whispering Creek', name:'Floodplain Warden', objective:'Defeat the Warden with at least 8 seeds.', brief:'A split air-and-ground approach ends in a shield pulse and a sky-gnat escort.', goal:Object.freeze({ minLives:8 }), boss:true },
  { id:'ridge', mapId:'ridge', chapter:3, chapterName:'The Bramble Ridge', name:'Ridge Approach', objective:'Finish with at least 10 seeds.', brief:'Zip mites, flyers, and armor arrive early along a narrow switchback.', goal:Object.freeze({ minLives:10 }) },
  { id:'ridge-switchback', mapId:'ridge-switchback', chapter:3, chapterName:'The Bramble Ridge', name:'Thornswitch Pass', objective:'Keep leaks to four or fewer.', brief:'Burrowers and splitters pressure the sharp bends while flyers bypass ground control.', goal:Object.freeze({ maxLeaks:4 }) },
  { id:'ridge-summit', mapId:'ridge-summit', chapter:3, chapterName:'The Bramble Ridge', name:'Colossus Summit', objective:'Defeat the Colossus with at least 8 seeds.', brief:'A dense mixed-role escort leads two bosses into the final summit route.', goal:Object.freeze({ minLives:8 }), boss:true }
]);

export const CAMPAIGN_MISSION_BY_ID = Object.freeze(Object.fromEntries(CAMPAIGN_MISSIONS.map(mission => [mission.id, mission])));

export function campaignMissionUnlocked(profile, mission, index = CAMPAIGN_MISSIONS.indexOf(mission)) {
  if (index <= 0 || profile?.unlockedMissions?.includes(mission.id)) return true;
  const previous = CAMPAIGN_MISSIONS[index - 1];
  return Boolean(profile?.completedMissions?.includes(previous.id));
}

export function missionObjectiveMet(mission, { lives, leaks = 0 } = {}) {
  if (!mission || !Number.isFinite(lives) || !Number.isFinite(leaks)) return false;
  return (mission.goal.minLives === undefined || lives >= mission.goal.minLives) &&
    (mission.goal.maxLeaks === undefined || leaks <= mission.goal.maxLeaks);
}

export function buildMissionCompletion(profile, missionId, facts = {}) {
  const mission = CAMPAIGN_MISSION_BY_ID[missionId];
  if (!mission || facts.won !== true) return null;
  const alreadyUnlocked=new Set(profile?.unlockedMissions||['meadow']);
  if(!alreadyUnlocked.has(missionId))return null;
  const missionIndex=CAMPAIGN_MISSIONS.findIndex(item=>item.id===missionId);
  const completed = new Set(profile?.completedMissions || []);
  completed.add(missionId);
  const next = CAMPAIGN_MISSIONS[missionIndex+1];
  const unlocked = new Set(profile?.unlockedMissions || ['meadow']);
  if (next) unlocked.add(next.id);
  const unlockedMaps=new Set(profile?.unlockedMaps||['meadow']);
  if(next)unlockedMaps.add(next.mapId);
  return {
    unlockedMaps:[...unlockedMaps],
    completedMissions:[...completed],
    unlockedMissions:[...unlocked],
    missionRecords:{ ...(profile?.missionRecords || {}), [missionId]:{
      cleared:true, objectiveMet:missionObjectiveMet(mission, facts), lives:Math.max(0, Math.trunc(facts.lives || 0)),
      leaks:Math.max(0, Math.trunc(facts.leaks || 0))
    } }
  };
}
