export function placementPreviewRange(type,point,{challenge,challengeRules=[],researchLoadout=[],relicLoadout=[],terrainAt,towersDef,getEffectiveTowerStats}={}){
  const definition=towersDef?.[type];
  if(!definition||!point||typeof getEffectiveTowerStats!=='function')return 0;
  const stats=getEffectiveTowerStats({type,level:1},{challenge,challengeRules,linked:false,terrain:terrainAt?.(point),researchLoadout,relicLoadout},definition);
  return Number.isFinite(stats?.range)?stats.range:0;
}
