export function renderRunHistory(container, entries, document, { onVerifyReplay = () => null, onCompare = () => null, onCreatePlayback = () => null, onRenderPlaybackFrame = () => {}, scheduler = globalThis } = {}) {
  container.replaceChildren();
  if (!entries.length) { const empty = document.createElement('p'); empty.className='wave-info'; empty.textContent='Finished gardens appear here on this device. Imported replay files do not count as verified scores.'; container.append(empty); return; }
  let selected = null;
  const pauseCallbacks = new Set();
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
    actions.append(verify);
    const playbackButton=document.createElement('button');playbackButton.type='button';playbackButton.textContent='Replay';playbackButton.disabled=!entry.actionLogComplete;playbackButton.setAttribute('aria-label',`Replay ${entry.mapName}, wave ${entry.wave}`);actions.append(playbackButton);
    const playback=document.createElement('section');playback.className='run-history-playback';playback.hidden=true;playback.setAttribute('aria-label',`Replay playback for ${entry.mapName}`);
    const controls=document.createElement('div');controls.className='run-history-actions';
    const battlefield=document.createElement('canvas');battlefield.className='run-history-battlefield';battlefield.width=900;battlefield.height=540;battlefield.setAttribute('role','img');battlefield.setAttribute('aria-label','Replay battlefield, paused at the beginning.');
    const speedLabel=document.createElement('label');speedLabel.textContent='Playback speed';const speed=document.createElement('select');speed.setAttribute('aria-label','Replay speed');
    for(const value of ['1','2','4']){const option=document.createElement('option');option.value=value;option.textContent=`${value}×`;speed.append(option);}speedLabel.append(speed);
    speed.value='1';
    const play=document.createElement('button');play.type='button';play.textContent='Play';play.disabled=true;
    const restart=document.createElement('button');restart.type='button';restart.textContent='Restart';restart.disabled=true;
    controls.append(speedLabel,play,restart);
    const progress=document.createElement('progress');progress.max=Math.max(1,entry.run?.simulationTick||1);progress.value=0;progress.setAttribute('aria-label','Replay progress');
    const playbackStatus=document.createElement('p');playbackStatus.className='run-history-status';playbackStatus.setAttribute('aria-live','off');
    const playbackAnnouncement=document.createElement('p');playbackAnnouncement.className='run-history-status';playbackAnnouncement.setAttribute('role','status');playbackAnnouncement.setAttribute('aria-live','polite');
    playback.append(battlefield,controls,progress,playbackStatus,playbackAnnouncement);card.append(actions,resultStatus,playback);container.append(card);
    let player=null,timer=null;
    const stop=()=>{const wasPlaying=timer!==null;if(wasPlaying){scheduler.clearInterval(timer);timer=null;}play.textContent='Play';if(wasPlaying)playbackAnnouncement.textContent='Playback paused because the Guide was closed.';};
    pauseCallbacks.add(stop);
    const showFrame=frame=>{
      const state=frame.state;
      progress.value=frame.tick;
      battlefield.setAttribute('aria-label',`Replay battlefield at tick ${frame.tick}: wave ${state?.wave||0}, ${state?.towers?.length||0} defenders and ${(state?.enemies?.length||0)+(state?.spawnQueue?.length||0)} pests remaining.`);
      onRenderPlaybackFrame(entry,state,battlefield);
      playbackStatus.textContent=`Tick ${frame.tick} / ${frame.totalTicks} · wave ${state?.wave||0} · ${state?.towers?.length||0} defenders · ${(state?.enemies?.length||0)+(state?.spawnQueue?.length||0)} pests remaining.`;
      if(frame.done){stop();play.disabled=true;playbackAnnouncement.textContent=`Playback finished. Use Verify replay to check the final state hash (${frame.result.hash}).`;} else playbackAnnouncement.textContent='';
    };
    const advance=()=>{try{const frame=player.advance(Math.max(1,Math.round(15*Number(speed.value))));showFrame(frame);}catch(error){stop();play.disabled=true;playbackAnnouncement.textContent=`Replay stopped: ${error.message}`;}};
    playbackButton.addEventListener('click',()=>{
      try{player=onCreatePlayback(entry);if(!player){playbackAnnouncement.textContent='Replay playback is unavailable for this run.';return;}
        playback.hidden=false;progress.max=Math.max(1,player.totalTicks);play.disabled=false;restart.disabled=false;playbackButton.focus?.();
        playbackStatus.textContent=`Ready · tick 0 / ${player.totalTicks}. Choose a speed and press Play.`;playbackAnnouncement.textContent='Replay player ready, paused at the beginning.';
      }catch(error){playback.hidden=false;playbackAnnouncement.textContent=`Replay could not start: ${error.message}`;}
    });
    play.addEventListener('click',()=>{if(!player||player.done)return;if(timer!==null){stop();playbackAnnouncement.textContent=`Playback paused at tick ${player.tick}.`;return;}play.textContent='Pause';playbackAnnouncement.textContent=`Playback running at ${speed.value} times speed.`;timer=scheduler.setInterval(advance,250);});
    restart.addEventListener('click',()=>{stop();if(!player)return;player=player.restart();progress.value=0;play.disabled=false;battlefield.setAttribute('aria-label','Replay battlefield, restarted and paused at the beginning.');onRenderPlaybackFrame(entry,null,battlefield);playbackStatus.textContent=`Ready · tick 0 / ${player.totalTicks}. Choose a speed and press Play.`;playbackAnnouncement.textContent='Replay restarted and paused at the beginning.';});
  }
  return {pauseAll(){for(const pause of pauseCallbacks)pause();}};
}
