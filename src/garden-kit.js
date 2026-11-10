import { RESEARCH_NODES, RESEARCH_PATHS, normalizeResearchState } from './research-tree.js';
import { RELICS, normalizeRelicState } from './relics.js';

const researchById=new Map(RESEARCH_NODES.map(node=>[node.id,node]));
const relicById=new Map(RELICS.map(relic=>[relic.id,relic]));

export function gardenKitRoleConflicts(researchLoadout=[],relicLoadout=[]){
  const conflicts=[],researchByRole=new Map();
  for(const id of researchLoadout){
    const node=researchById.get(id);if(!node?.effect?.type)continue;
    const existing=researchByRole.get(node.effect.type);
    if(existing)conflicts.push({kind:'research',role:node.effect.type,researchId:existing.id,researchName:existing.name,
      conflictingResearchId:node.id,conflictingResearchName:node.name});
    else researchByRole.set(node.effect.type,node);
  }
  conflicts.push(...relicLoadout.flatMap(id=>{
    const relic=relicById.get(id),node=researchByRole.get(relic?.type);
    return relic&&node?[{kind:'relic',role:relic.type,researchId:node.id,researchName:node.name,relicId:relic.id,relicName:relic.name}]:[];
  }));
  return conflicts;
}

export function reconcileGardenKitLoadouts(researchState,relicState,completedMissions=[],researchPoints){
  const research=normalizeResearchState(researchState,researchPoints);
  const relics=normalizeRelicState(relicState,completedMissions);
  const activeResearch=RESEARCH_PATHS.map(path=>research.loadout[path.id]).filter(Boolean);
  const duplicateResearch=gardenKitRoleConflicts(activeResearch,[]).filter(conflict=>conflict.kind==='research');
  const removedResearch=[...new Set(duplicateResearch.map(conflict=>conflict.conflictingResearchId))];
  for(const id of removedResearch){const node=researchById.get(id);if(node&&research.loadout[node.path]===id)delete research.loadout[node.path];}
  const conflicts=gardenKitRoleConflicts(RESEARCH_PATHS.map(path=>research.loadout[path.id]).filter(Boolean),relics.loadout);
  const removedRelics=new Set(conflicts.map(conflict=>conflict.relicId));
  return {research,relics:{...relics,loadout:relics.loadout.filter(id=>!removedRelics.has(id))},removedResearch,
    removedRelics:[...removedRelics]};
}

export function gardenKitConflictForResearch(nodeId,relicLoadout=[],researchLoadout=[]){
  const node=researchById.get(nodeId);
  if(!node)return null;
  const existingResearch=researchLoadout.map(id=>researchById.get(id)).find(existing=>existing&&existing.id!==nodeId&&existing.effect?.type===node.effect?.type);
  if(existingResearch)return {kind:'research',role:node.effect.type,researchId:existingResearch.id,researchName:existingResearch.name,
    conflictingResearchId:node.id,conflictingResearchName:node.name};
  const relic=relicLoadout.map(id=>relicById.get(id)).find(item=>item?.type===node.effect?.type);
  return relic?{kind:'relic',role:relic.type,researchId:node.id,researchName:node.name,relicId:relic.id,relicName:relic.name}:null;
}

export function gardenKitConflictForRelic(relicId,researchLoadout=[]){
  const relic=relicById.get(relicId);
  return relic?gardenKitRoleConflicts(researchLoadout,[relicId]).find(conflict=>conflict.kind==='relic')||null:null;
}
