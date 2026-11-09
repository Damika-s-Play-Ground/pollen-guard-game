import { RESEARCH_NODES, normalizeResearchState } from './research-tree.js';
import { RELICS, normalizeRelicState } from './relics.js';

const researchById=new Map(RESEARCH_NODES.map(node=>[node.id,node]));
const relicById=new Map(RELICS.map(relic=>[relic.id,relic]));

export function gardenKitRoleConflicts(researchLoadout=[],relicLoadout=[]){
  const researchByRole=new Map();
  for(const id of researchLoadout){const node=researchById.get(id);if(node?.effect?.type)researchByRole.set(node.effect.type,node);}
  return relicLoadout.flatMap(id=>{
    const relic=relicById.get(id),node=researchByRole.get(relic?.type);
    return relic&&node?[{role:relic.type,researchId:node.id,researchName:node.name,relicId:relic.id,relicName:relic.name}]:[];
  });
}

export function reconcileGardenKitLoadouts(researchState,relicState,completedMissions=[],researchPoints){
  const research=normalizeResearchState(researchState,researchPoints);
  const relics=normalizeRelicState(relicState,completedMissions);
  const conflicts=gardenKitRoleConflicts(Object.values(research.loadout),relics.loadout);
  const removedRelics=new Set(conflicts.map(conflict=>conflict.relicId));
  return {research,relics:{...relics,loadout:relics.loadout.filter(id=>!removedRelics.has(id))},removedRelics:[...removedRelics]};
}

export function gardenKitConflictForResearch(nodeId,relicLoadout=[]){
  const node=researchById.get(nodeId);
  return node?gardenKitRoleConflicts([nodeId],relicLoadout)[0]||null:null;
}

export function gardenKitConflictForRelic(relicId,researchLoadout=[]){
  const relic=relicById.get(relicId);
  return relic?gardenKitRoleConflicts(researchLoadout,[relicId])[0]||null:null;
}
