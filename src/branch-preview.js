const positive = value => Number.isFinite(value) ? value : 0;
const differs = (left,right,key) => positive(left?.[key]) !== positive(right?.[key]);

export function branchPreviewForStats(base, next) {
  const delta = key => positive(next?.[key]) - positive(base?.[key]);
  let kind='impact';
  if(delta('income')>0||delta('allyLinkRadius')>0)kind='income';
  else if(delta('splitTargets')>0)kind='split';
  else if(delta('splash')>0)kind='area';
  else if(next?.pierce&&!base?.pierce)kind='pierce';
  else if(['slow','stun','burn','poison'].some(key=>delta(key)>0)||['burnDamage','poisonDamage'].some(key=>delta(key)>0))kind='control';
  else if(delta('push')>0)kind='push';
  else if(delta('range')>0)kind='range';
  const statNames={impact:`${positive(next?.damage)} damage · ${(1/Math.max(.01,positive(next?.rate))).toFixed(1)} attacks/s`,split:`${Math.max(1,Math.floor(positive(next?.splitTargets)))} nearby target${positive(next?.splitTargets)===1?'':'s'} · ${positive(next?.splitDamage)} split damage`,area:`${positive(next?.splash)} map-unit blast`,pierce:'Pierces armor',control:[next?.slow>0&&`Slow ${next.slow.toFixed(1)}s`,next?.stun>0&&`Stun ${next.stun.toFixed(1)}s`,next?.burn>0&&`Burn ${next.burn.toFixed(1)}s`,next?.poison>0&&`Poison ${next.poison.toFixed(1)}s`].filter(Boolean).join(' · ')||`${positive(next?.damage)} damage / hit`,push:`Knockback · ${positive(next?.push).toFixed(1)} map units`,range:`${positive(next?.range)} map-unit reach`,income:next?.income>0?`+${next.income} petals / wave`:`Golden Seeds radius ${positive(next?.allyLinkRadius)} units`};
  return {
    kind,label:statNames[kind],targets:Math.max(1,Math.min(4,1+Math.floor(positive(next?.splitTargets)))),
    splash:positive(next?.splash),range:positive(next?.range),damage:positive(next?.damage),rate:positive(next?.rate),push:positive(next?.push),
    splitTargets:positive(next?.splitTargets),splitRadius:positive(next?.splitRadius),splitDamage:positive(next?.splitDamage),
    slow:positive(next?.slow),stun:positive(next?.stun),burn:positive(next?.burn),burnDamage:positive(next?.burnDamage),
    poison:positive(next?.poison),poisonDamage:positive(next?.poisonDamage),pierce:Boolean(next?.pierce),
    income:positive(next?.income),allyLinkRadius:positive(next?.allyLinkRadius)
  };
}

export function renderBranchPreview(document, preview, motion='full') {
  if(!preview)return null;
  const root=document.createElement('span');root.className='branch-demo';root.dataset.kind=preview.kind;root.dataset.motion=motion==='full'?'full':'static';root.setAttribute('aria-hidden','true');
  const source=document.createElement('i');source.className='branch-demo-source';root.append(source);
  if(preview.kind==='area'){
    const ring=document.createElement('i');ring.className='branch-demo-ring';
    const diameter=Math.max(12,Math.min(34,Math.sqrt(preview.splash)*3.2));ring.style.width=`${diameter}px`;ring.style.height=`${diameter}px`;root.append(ring);
  }
  if(preview.kind==='income'){
    const target=document.createElement('i');target.className='branch-demo-counter';root.append(target);
  }else{
    for(let index=0;index<preview.targets;index++){const target=document.createElement('i');target.className='branch-demo-target';target.dataset.index=String(index);root.append(target);}
  }
  if(preview.kind==='pierce'){const armor=document.createElement('i');armor.className='branch-demo-armor';root.append(armor);}
  if(preview.kind==='control'){const status=document.createElement('i');status.className='branch-demo-status';status.textContent=preview.stun>0?'✦':'◌';root.append(status);}
  if(preview.kind==='push'){const arrow=document.createElement('i');arrow.className='branch-demo-push';arrow.setAttribute('aria-hidden','true');arrow.style.transform=`scaleX(${Math.max(1,Math.min(1.8,preview.push/22))})`;root.append(arrow);}
  return root;
}
