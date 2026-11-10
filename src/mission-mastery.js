import { CAMPAIGN_MISSION_BY_ID, missionObjectiveMet } from './campaign.js';

export const MASTERY_DIFFICULTIES=Object.freeze(['story','standard','veteran']);
export const MASTERY_TIERS=Object.freeze(['completion','objective','efficiency']);

export function masteryChallengeText(mission) {
  if(!mission||!Number.isSafeInteger(mission.masteryMaxTowers))return '';
  return `Optional tactical medal: preserve the mission objective with ${mission.masteryMaxTowers} or fewer defenders.`;
}

export function buildMissionMasteryProgress(profile,{
  missionId,difficulty='standard',challenge='classic',challengeRules=[],guardianMode='none',won=false,lives=0,leaks=0,towerCount=0
}={}) {
  const mission=CAMPAIGN_MISSION_BY_ID[missionId];
  const previous=profile?.missionMastery?.[missionId]?.[difficulty]||{};
  const record={completion:previous.completion===true,objective:previous.objective===true,efficiency:previous.efficiency===true};
  const compatible=Boolean(mission&&(profile?.unlockedMissions||[]).includes(missionId)&&MASTERY_DIFFICULTIES.includes(difficulty)&&challenge==='classic'&&
    Array.isArray(challengeRules)&&challengeRules.length===0&&guardianMode==='none');
  if(!compatible)return {eligible:false,changed:false,record,reason:'Mastery records use Classic rules without extra challenge rules or a mission kit; difficulty is tracked separately.'};
  if(won===true){
    record.completion=true;
    const objectiveMet=missionObjectiveMet(mission,{lives,leaks});
    if(objectiveMet)record.objective=true;
    if(objectiveMet&&Number.isSafeInteger(towerCount)&&towerCount>=0&&towerCount<=mission.masteryMaxTowers)
      record.efficiency=true;
  }
  const changed=MASTERY_TIERS.some(tier=>record[tier]!== (previous[tier]===true));
  const mastery=changed?{
    ...(profile?.missionMastery||{}),
    [missionId]:{
      ...(profile?.missionMastery?.[missionId]||{}),
      [difficulty]:record
    }
  }:profile?.missionMastery||{};
  return {eligible:true,changed,record,mastery,reason:null};
}

export function missionMasteryResultText(result,{difficulty='standard',mission}={}) {
  if(!mission)return '';
  const label=MASTERY_DIFFICULTIES.includes(difficulty)?difficulty[0].toUpperCase()+difficulty.slice(1):'Standard';
  if(!result?.eligible)return `Mastery not recorded. ${result?.reason||'Choose a compatible campaign run.'}`;
  const record=result.record||{};
  const medal=record.efficiency?'earned':record.objective
    ?`available: clear with ${mission.masteryMaxTowers} or fewer defenders`
    :`not earned: preserve the mission objective and use ${mission.masteryMaxTowers} or fewer defenders`;
  return `${label} campaign · Clear ${record.completion?'earned':'not yet earned'} · Optional tactical medal ${medal}.`;
}
