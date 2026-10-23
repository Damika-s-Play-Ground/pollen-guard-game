import { masteryChallengeText } from './mission-mastery.js';
import { earnedResearchPoints, RESEARCH_NODES, RESEARCH_PATHS, normalizeResearchState } from './research-tree.js';
import { RELICS, RELIC_REWARDS, normalizeRelicState, RELIC_LOADOUT_SIZE } from './relics.js';
import { CAMPAIGN_MISSIONS } from './campaign.js';
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

export function renderCampaignMap({ document, root, missions, profile, selectedMap, difficulty='standard' }) {
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
      const mastery=profile.missionMastery?.[mission.id]?.[difficulty]||{};
      const masteryLine=document.createElement('p');masteryLine.className='mission-mastery';
      const tierCount=['completion','objective','efficiency'].filter(tier=>mastery[tier]===true).length;
      const optional=mastery.efficiency===true?'earned':mastery.objective===true
        ?`available · ${mission.masteryMaxTowers} or fewer defenders`
        :`locked until objective · ${mission.masteryMaxTowers} or fewer defenders`;
      masteryLine.textContent=`${difficulty[0].toUpperCase()+difficulty.slice(1)} mastery ${tierCount}/3 · Clear ${mastery.completion?'earned':'open'} · Objective ${mastery.objective?'earned':'open'} · Optional efficiency ${optional}.`;
      const challenge=document.createElement('p');challenge.className='mission-mastery-challenge';challenge.textContent=masteryChallengeText(mission);
      card.append(button,detail,masteryLine,challenge);group.append(card);
    }
    root.append(group);
  }
  const count=document.createElement('p');count.className='campaign-progress';count.textContent=`${completed.size} of ${missions.length} missions cleared`;
  root.prepend(count);
}

export function renderResearchTree({ document, root, profile, canRespec=true }) {
  const points=earnedResearchPoints(profile),state=normalizeResearchState(profile.research,points);
  root.replaceChildren();
  const status=document.createElement('p');status.className='research-summary';
  status.textContent=`Research · ${state.unlocked.length} of ${points} points spent · ${Math.max(0,points-state.unlocked.length)} available. Earn 1 for each cleared chapter and 1 for every 3 mastery medals.`;
  root.append(status);
  if(!canRespec){const note=document.createElement('p');note.className='research-lock';note.textContent='Research changes are available between missions. Finish or restart this garden before changing its research loadout.';root.append(note);}
  for(const path of RESEARCH_PATHS){
    const group=document.createElement('section');group.className='research-path';
    const heading=document.createElement('h4');heading.textContent=path.name;
    const description=document.createElement('p');description.textContent=path.summary;group.append(heading,description);
    for(const node of RESEARCH_NODES.filter(item=>item.path===path.id)){
      const unlocked=state.unlocked.includes(node.id),active=state.loadout[path.id]===node.id;
      const prior=RESEARCH_NODES.find(item=>item.path===path.id&&item.tier===node.tier-1);
      const available=unlocked||(!prior||state.unlocked.includes(prior.id))&&state.unlocked.length<points;
      const card=document.createElement('article');card.className=`research-node${active?' equipped':''}${unlocked?' researched':''}`;
      const title=document.createElement('h5');title.textContent=`${node.tier}. ${node.name}`;
      const copy=document.createElement('p');copy.id=`research-description-${node.id}`;copy.textContent=node.description;
      const button=document.createElement('button');button.type='button';button.dataset.researchNode=node.id;
      button.disabled=!canRespec||!available;
      button.textContent=active?'Equipped':unlocked?'Equip':available?'Research · 1 point':prior?`Locked · research ${prior.name}`:'Locked · earn a point';
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',`${active?'Equipped':unlocked?'Equip':'Research'} ${node.name}`);
      button.setAttribute('aria-describedby',copy.id);
      card.append(title,copy,button);group.append(card);
    }
    root.append(group);
  }
  const respec=document.createElement('button');respec.type='button';respec.dataset.researchRespec='true';respec.disabled=!canRespec||state.unlocked.length===0;respec.textContent='Reset research · refund points';
  root.append(respec);
  return {points,state};
}

export function renderRelicLoadout({document,root,profile,canRefit=true}){
  const state=normalizeRelicState(profile.relics,profile.completedMissions||[]);
  root.replaceChildren();
  const summary=document.createElement('p');summary.className='relic-summary';
  summary.textContent=`Relics · ${state.loadout.length}/${RELIC_LOADOUT_SIZE} equipped. Clear campaign missions for fixed, deterministic rewards; no random drops.`;
  root.append(summary);
  const slot=document.createElement('p');slot.className='relic-slots';
  slot.textContent=`Loadout slots: ${state.loadout.map(id=>RELICS.find(item=>item.id===id)?.name||id).join(' + ')||'empty'}${state.loadout.length<2?' · one slot open'.repeat(2-state.loadout.length):''}`;
  root.append(slot);
  if(!canRefit){const note=document.createElement('p');note.className='relic-lock';note.textContent='Relics can be refit between missions. Resume or explicitly restart a saved garden before changing the loadout.';root.append(note);}
  const unlocked=new Set(state.unlocked);
  for(const relic of RELICS){
    const owned=unlocked.has(relic.id),equipped=state.loadout.includes(relic.id);
    const blockedBy=state.loadout.filter(id=>relic.incompatible.includes(id)||RELICS.find(item=>item.id===id)?.incompatible.includes(relic.id));
    const conflict=blockedBy[0];
    const full=state.loadout.length>=RELIC_LOADOUT_SIZE&&!equipped;
    const card=document.createElement('article');card.className=`relic-card${equipped?' equipped':''}${owned?' unlocked':''}`;
    const title=document.createElement('h4');title.textContent=relic.name;
    const detail=document.createElement('p');detail.textContent=`${relic.description}${relic.incompatible.length?` Field-kit incompatibility: ${relic.incompatible.map(id=>RELICS.find(item=>item.id===id)?.name||id).join(', ')} cannot be equipped alongside it.`:''}`;
    const reward=document.createElement('small');
    const rewardMission=RELIC_REWARDS.find(item=>item.relicId===relic.id);
    const missionName=CAMPAIGN_MISSIONS.find(item=>item.id===rewardMission?.missionId)?.name||'campaign clear';
    reward.textContent=owned?'Unlocked':`Unlock: clear ${missionName}`;
    const button=document.createElement('button');button.type='button';button.dataset.relic=relic.id;
    button.disabled=!canRefit||!owned||Boolean(conflict)||full&&!equipped;
    button.textContent=equipped?'Unequip':conflict?`Incompatible with ${RELICS.find(item=>item.id===conflict)?.name||'equipped relic'}`:full?'Unequip a relic first':owned?'Equip relic':'Locked';
    button.setAttribute('aria-pressed',String(equipped));
    button.setAttribute('aria-label',`${equipped?'Unequip':'Equip'} ${relic.name}`);
    button.setAttribute('aria-describedby',`relic-description-${relic.id}`);detail.id=`relic-description-${relic.id}`;
    card.append(title,detail,reward,button);root.append(card);
  }
  return {state};
}
