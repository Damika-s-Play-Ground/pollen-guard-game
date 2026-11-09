export function deriveInteractionMode({ selectedType=null, selectedTower=null, placementCandidate=null, aimedSpellId=null, guardianMoveActive=false, abilityPreview=null, selectionChooserOpen=false }={}) {
  if(guardianMoveActive)return 'guardian-move';
  if(aimedSpellId)return 'spell-aim';
  if(abilityPreview)return 'ability-preview';
  if(placementCandidate&&selectedType)return 'placement-preview';
  if(selectedType)return 'build';
  if(selectionChooserOpen)return 'inspect-chooser';
  if(selectedTower)return 'inspect';
  return 'idle';
}

export function transitionBattleInteraction(state={}, action, value=null) {
  const next={...state};
  if(action==='build')return {...next,selectedType:value,selectedTower:null,placementCandidate:null,abilityPreview:null,aimedSpellId:null,spellTargetStart:null};
  if(action==='inspect')return {...next,selectedType:null,selectedTower:value,placementCandidate:null,abilityPreview:null,aimedSpellId:null,spellTargetStart:null};
  if(action==='cancel')return {...next,selectedType:null,selectedTower:null,placementCandidate:null,abilityPreview:null,aimedSpellId:null,spellTargetStart:null};
  if(action==='preview')return {...next,placementCandidate:value};
  return next;
}

export function cancelInteractionCommand(mode) {
  if(mode==='idle')return null;
  if(mode==='guardian-move')return 'cancel-guardian-move';
  return 'cancel-interaction';
}
