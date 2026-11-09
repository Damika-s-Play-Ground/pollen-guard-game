const SUPPORT_NODE_IDS = Object.freeze(['mapNote','placementHint','placementConfirm','selectionChooser']);

export function mountBattleSupport({document}) {
  const support=document.getElementById('battleSupport');
  if(!support)return null;
  for(const id of SUPPORT_NODE_IDS){
    const node=document.getElementById(id);
    if(node&&node.parentElement!==support)support.append(node);
  }
  const dock=document.getElementById('mapFooter');
  const context=document.getElementById('selectedContext');
  const abilityDock=document.getElementById('abilityDock');
  if(dock&&context&&abilityDock&&context.parentElement!==dock)dock.insertBefore(context,abilityDock);
  return support;
}
