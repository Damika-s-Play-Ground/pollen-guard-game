export function renderRunHistory(container, entries, document, { onVerifyReplay = () => null, onCompare = () => null } = {}) {
  container.replaceChildren();
  if (!entries.length) { const empty = document.createElement('p'); empty.className='wave-info'; empty.textContent='Finished gardens appear here on this device. Imported replay files do not count as verified scores.'; container.append(empty); return; }
  let selected = null;
  const compareStatus = document.createElement('p'); compareStatus.className='run-history-status'; compareStatus.setAttribute('role','status'); compareStatus.setAttribute('aria-live','polite'); container.append(compareStatus);
  for (const entry of entries) {
    const card=document.createElement('article');card.className='run-history-card';
    const heading=document.createElement('h4');heading.textContent=`${entry.mapName} · ${entry.outcome==='won'?'Victory':'Defeat'} · wave ${entry.wave}`;card.append(heading);
    const towerSummary=entry.towers.map(tower=>{const name=tower.type.replace(/([a-z])([A-Z])/g,'$1 $2');return `${name[0]?.toUpperCase()||''}${name.slice(1)} L${tower.level}${Number.isInteger(tower.branch)?` path ${tower.branch+1}`:''}`;}).join(', ')||'no defenders',milestones=entry.milestones||[];
    const detail=document.createElement('p');detail.textContent=`${new Date(entry.recordedAt).toLocaleString()} · ${entry.challenge} / ${entry.difficulty}${entry.rules.length?` · ${entry.rules.join(' + ')}`:''} · ${entry.popped} defeated · ${entry.leaks} leaks · ${entry.towers.length} defenders (${towerSummary}) · ${milestones.length} milestones · v${entry.version}`;card.append(detail);
    const actions=document.createElement('div');actions.className='run-history-actions';
    const compare=document.createElement('button');compare.type='button';compare.textContent='Select to compare';compare.setAttribute('aria-pressed','false');
    compare.addEventListener('click',()=>{
      if(!selected){selected=entry;compare.textContent='Selected';compare.setAttribute('aria-pressed','true');compareStatus.textContent='Choose another compatible run to compare.';return;}
      if(selected.id===entry.id){selected=null;compare.textContent='Select to compare';compare.setAttribute('aria-pressed','false');compareStatus.textContent='Comparison selection cleared.';return;}
      const result=onCompare(selected,entry);compareStatus.textContent=result?.compatible
        ? `${selected.mapName} · ${selected.challenge}/${selected.difficulty}: wave ${selected.wave} vs ${entry.wave}; ${selected.leaks} vs ${entry.leaks} leaks; ${selected.popped} vs ${entry.popped} defeated; ${selected.towers.length} vs ${entry.towers.length} defenders; ${result.firstOnly?.length||0} vs ${result.secondOnly?.length||0} milestones differ.${result.firstOnly?.length?` First run only: ${result.firstOnly.join(', ')}.`:''}${result.secondOnly?.length?` Second run only: ${result.secondOnly.join(', ')}.`:''}`
        : (result?.reason||'These runs cannot be compared.');
      selected=null;for(const button of container.querySelectorAll('[aria-pressed="true"]')){button.setAttribute('aria-pressed','false');button.textContent='Select to compare';}
    });actions.append(compare);
    const verify=document.createElement('button');verify.type='button';verify.textContent='Verify replay';verify.disabled=!entry.actionLogComplete;
    const resultStatus=document.createElement('span');resultStatus.className='run-history-status';resultStatus.setAttribute('role','status');resultStatus.setAttribute('aria-live','polite');
    verify.addEventListener('click',async()=>{verify.disabled=true;resultStatus.textContent='Checking saved actions against the recorded final hash…';try{const result=await onVerifyReplay(entry);resultStatus.textContent=result?.verified?`Verified on this build · ${result.hash}. Imported files are never awarded a verified score.`:(result?.reason||'Replay could not be verified.');}catch(error){resultStatus.textContent=`Replay check failed: ${error.message}`;}finally{verify.disabled=false;}});
    actions.append(verify);card.append(actions,resultStatus);container.append(card);
  }
}
