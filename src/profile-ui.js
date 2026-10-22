export const ACHIEVEMENT_DEFINITIONS = [
  ['first-pop','First bloom','Scatter your first mite.'],
  ['builder','Master gardener','Place eight defenders in one run.'],
  ['bloom','Blooming power','Use Bloom pulse.'],
  ['boss','Beetle buster','Defeat a bramble boss.'],
  ['guardian','Meadow guardian','Clear wave 15.']
];

export function renderAchievements({ document, root, count, recordInfo, definitions, profile }) {
  const unlocked = new Set(profile.achievements);
  root.replaceChildren();
  for (const [id, name, description] of definitions) {
    const card = document.createElement('div');
    card.className = `achievement ${unlocked.has(id) ? 'unlocked' : ''}`;
    card.title = description;
    card.textContent = `${unlocked.has(id) ? '✦' : '◇'} ${name}`;
    root.append(card);
  }
  count.textContent = `${unlocked.size} / ${definitions.length}`;
  const records = profile.bestWave || {};
  recordInfo.textContent = `Personal best: wave ${Math.max(0, ...Object.values(records))} · ${Object.keys(records).length} map/rule records`;
}

export function renderMapOptions({ document, select, maps, unlockedMaps, selectedMap, missions = [] }) {
  const unlocked = new Set(unlockedMaps);
  select.replaceChildren();
  for (const [id, map] of Object.entries(maps)) {
    const option = document.createElement('option');
    option.value = id;
    option.disabled = !unlocked.has(id);
    const missionIndex=missions.findIndex(mission=>mission.mapId===id);
    const priorMission=missionIndex>0?missions[missionIndex-1]:null;
    const campaignLock=priorMission&&!['creek','ridge'].includes(id);
    option.textContent = unlocked.has(id) ? map.name : campaignLock?`🔒 ${map.name} · clear ${priorMission.name}`:`🔒 ${map.name} · clear wave ${map.unlockAt}`;
    select.append(option);
  }
  select.value = selectedMap;
}

export function renderCampaignMap({ document, root, missions, profile, selectedMap }) {
  root.replaceChildren();
  const completed=new Set(profile.completedMissions||[]);
  for(let chapter=1;chapter<=3;chapter++){
    const group=document.createElement('section');group.className='campaign-chapter';
    const heading=document.createElement('h3');
    heading.textContent=missions.find(mission=>mission.chapter===chapter)?.chapterName||`Chapter ${chapter}`;
    group.append(heading);
    for(const mission of missions.filter(item=>item.chapter===chapter)){
      const card=document.createElement('article');card.className='campaign-mission';
      const button=document.createElement('button');button.type='button';button.className='campaign-mission-select';
      button.dataset.campaignMission=mission.mapId;
      const unlocked=(profile.unlockedMissions||[]).includes(mission.id)||mission.id==='meadow';
      button.disabled=!unlocked;
      if(mission.mapId===selectedMap)button.setAttribute('aria-current','true');
      const status=completed.has(mission.id)?(profile.missionRecords?.[mission.id]?.objectiveMet?'Cleared · objective met':'Cleared'):
        unlocked?'Available':`Locked · clear ${missions[missions.indexOf(mission)-1]?.name||'the previous mission'}`;
      button.textContent=`${completed.has(mission.id)?'✦ ':unlocked?'○ ':'🔒 '}${mission.name} · ${status}`;
      const detail=document.createElement('p');detail.textContent=`${mission.brief} Objective: ${mission.objective}`;
      card.append(button,detail);group.append(card);
    }
    root.append(group);
  }
  const count=document.createElement('p');count.className='campaign-progress';count.textContent=`${completed.size} of ${missions.length} missions cleared`;
  root.prepend(count);
}
