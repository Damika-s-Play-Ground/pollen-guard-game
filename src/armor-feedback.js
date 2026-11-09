export function armorImpactFeedback(shot,result) {
  const enemy=result?.enemy;
  if(!enemy||enemy.armor<=0||enemy.hp<=0)return null;
  const bypass=shot?.channel==='heat'||shot?.channel==='toxin'||shot?.pierce===true||Number(shot?.armorBreak)>0||enemy.armorBreak>0;
  if(result.dealt<=0&&!bypass)return {kind:'blocked',label:'ARMOR HELD'};
  if(bypass&&result.dealt>0)return {kind:'bypassed',label:'ARMOR BYPASSED'};
  if(result.dealt>0)return {kind:'reduced',label:'ARMOR REDUCED HIT'};
  return null;
}

export function activeArmorFeedback(cue,now,duration=.8) {
  if(!cue||!Number.isFinite(cue.time)||!Number.isFinite(now)||!(duration>0))return null;
  const age=now-cue.time;
  if(age<0||age>=duration-1e-9)return null;
  return {...cue,alpha:Math.max(.25,1-age/duration)};
}
