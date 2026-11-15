const NS = 'http://www.w3.org/2000/svg';

export function mapIsAvailable(map, id, profile) {
  return Boolean(map?.expedition || map?.customMap || profile.unlockedMaps?.includes(id));
}

export function createMapPreview(document, map) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 900 540');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('map-route-preview');
  const background = document.createElementNS(NS, 'rect');
  background.setAttribute('width', '900'); background.setAttribute('height', '540');
  background.setAttribute('fill', map.background); svg.append(background);
  for (const [index, x, y] of [[0,170,100],[1,430,430],[2,740,95]]) {
    const patch = document.createElementNS(NS, 'ellipse');
    patch.setAttribute('cx', x); patch.setAttribute('cy', y);
    patch.setAttribute('rx', 100 + index * 14); patch.setAttribute('ry', 60);
    patch.setAttribute('fill', map.patch); svg.append(patch);
  }
  for (const [stroke, width] of [[map.edge,52],[map.trail,36]]) {
    const route = document.createElementNS(NS, 'polyline');
    route.setAttribute('points', map.path.map(point=>point.join(',')).join(' '));
    route.setAttribute('fill', 'none'); route.setAttribute('stroke', stroke);
    route.setAttribute('stroke-width', width); route.setAttribute('stroke-linecap', 'round');
    route.setAttribute('stroke-linejoin', 'round'); svg.append(route);
  }
  for (const [point, fill] of [[map.path[0],'#223d30'],[map.path.at(-1),'#f9e9aa']]) {
    const marker = document.createElementNS(NS,'circle');
    marker.setAttribute('cx',point[0]); marker.setAttribute('cy',point[1]);
    marker.setAttribute('r',20); marker.setAttribute('fill',fill); svg.append(marker);
  }
  return svg;
}

export function renderMapPicker({document, root, maps, profile, selectedMap, filter='all', missions=[]}) {
  root.replaceChildren();
  const entries=Object.entries(maps).sort(([aId,a],[bId,b])=>Number(bId===selectedMap)-Number(aId===selectedMap)||Number(mapIsAvailable(b,bId,profile))-Number(mapIsAvailable(a,aId,profile))||Number(Boolean(b.expedition))-Number(Boolean(a.expedition)));
  for (const [id,map] of entries) {
    const category=map.expedition?'expedition':map.customMap?'custom':'campaign';
    if (filter!=='all' && category!==filter) continue;
    const available=mapIsAvailable(map,id,profile), selected=id===selectedMap;
    const mission=missions.find(item=>item.mapId===id), prior=missions[missions.indexOf(mission)-1];
    const card=document.createElement('button'); card.type='button'; card.className='map-card';
    card.dataset.chooseMap=id; card.disabled=!available;
    card.setAttribute('aria-pressed',String(selected));
    const preview=createMapPreview(document,map);
    const info=document.createElement('span'); info.className='map-card-info';
    const title=document.createElement('strong'); title.textContent=map.name;
    const tag=document.createElement('span'); tag.className='map-card-tag';
    const best=profile.bestWave?.[`classic:${id}`]||0;
    tag.textContent=selected?'✓ Playing':!available?`🔒 ${['creek','ridge'].includes(id)?`Reach wave ${map.unlockAt}`:`Clear ${prior?.name||'the previous mission'}`}`:
      profile.completedMissions?.includes(id)?'✦ Cleared':best?`Best · wave ${best}`:map.expedition?'✧ Expedition · Play now':'Campaign';
    const feature=document.createElement('small'); feature.textContent=map.tagline||({meadow:'Open bends · room to grow',creek:'Winding water · split air route',ridge:'Sharp turns · heavy pressure'}[map.biome]||'Your custom route');
    info.append(title,feature,tag); card.append(preview,info); root.append(card);
  }
}

export function createGameShell({document,maps,missions,onDialogOpen,onSelectMap,onRequestCanvas}) {
  const byId=id=>document.getElementById(id);
  let profile={}, selectedMap='meadow', filter='all';
  const missionDialog=byId('missionDialog'), enemyDialog=byId('enemyDialog'), intelDialog=byId('intelDialog');
  const preparation=byId('missionPreparation');
  byId('missionDialogBody').append(preparation);
  const stats=byId('towerStats'),statDetails=document.createElement('details'),statSummary=document.createElement('summary');
  statDetails.className='inspector-stats';statSummary.textContent='Stats & effects';
  stats.before(statDetails);statDetails.append(statSummary,stats);
  const viewTools=byId('cameraZoomIn').parentElement,viewport=byId('game').parentElement;
  const viewToggle=document.createElement('button');viewToggle.type='button';viewToggle.id='viewToolsBtn';viewToggle.className='view-tools-toggle';
  viewToggle.setAttribute('aria-label','Battlefield zoom and pan controls');viewToggle.setAttribute('aria-expanded','false');viewToggle.textContent='⌕';
  viewport.append(viewToggle,viewTools);
  viewToggle.onclick=()=>{onRequestCanvas();const open=viewport.classList.toggle('view-tools-open');viewToggle.setAttribute('aria-expanded',String(open));};
  const resume=document.createElement('button');resume.id='resumeFromJournalBtn';resume.type='button';resume.className='primary';resume.textContent='Resume saved garden ↗';
  byId('guideDialog').querySelector('[data-journal-section="play"]').prepend(resume);
  resume.onclick=()=>{byId('guideDialog').close();byId('resumeBtn').click();};
  const syncResume=()=>{resume.hidden=byId('resumeBtn').disabled;};
  new MutationObserver(syncResume).observe(byId('resumeBtn'),{attributes:true,attributeFilter:['disabled']});syncResume();
  const support=byId('battleSupport');
  byId('mapFooter').prepend(support);
  const enemyGuide=byId('enemyGuide'); byId('enemyDialogBody').append(enemyGuide);
  // Reference tables remain available on request, never below the battlefield.
  for (const node of [...document.querySelectorAll('.layout .combat-matrix, .layout .wave-details, .layout .battle-summary-panel')]) byId('intelDialogBody').append(node);
  const show=(dialog,trigger)=>{
    byId('settingsPanel').open=false;
    dialog._returnFocus=trigger||document.activeElement;
    if (!dialog.open) dialog.showModal();
    onDialogOpen();
  };
  const restoreFocus=dialog=>{const target=dialog._returnFocus,owner=target?.closest?.('dialog');
    const usable=target?.isConnected&&!target.disabled&&(!owner||owner.open)&&!target.closest('[hidden]');
    (usable?target:byId('game')).focus({preventScroll:true});};
  const close=dialog=>dialog.close();
  for(const dialog of [missionDialog,enemyDialog,intelDialog]) {
    dialog.querySelector('[data-close-dialog]').addEventListener('click',()=>close(dialog));
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close(dialog);}});
    dialog.addEventListener('close',()=>restoreFocus(dialog));
  }
  function openMaps(trigger) {preparation.open=true;show(missionDialog,trigger);}
  byId('missionOpenBtn').onclick=event=>openMaps(event.currentTarget);
  byId('missionDoneBtn').onclick=()=>close(missionDialog);
  byId('mapPicker').addEventListener('click',event=>{
    const button=event.target.closest('[data-choose-map]');
    if(button&&!button.disabled){if(button.dataset.chooseMap===selectedMap)close(missionDialog);else onSelectMap(button.dataset.chooseMap);}
  });
  byId('mapPickerFilters').addEventListener('click',event=>{
    const button=event.target.closest('[data-map-filter]'); if(!button)return;
    filter=button.dataset.mapFilter;
    for(const item of byId('mapPickerFilters').children)item.setAttribute('aria-pressed',String(item===button));
    renderMaps();
  });
  function renderMaps(){renderMapPicker({document,root:byId('mapPicker'),maps,missions,profile,selectedMap,filter});}
  byId('battleIntelBtn').onclick=event=>{byId('waveDetails').open=true;show(intelDialog,event.currentTarget);};
  byId('quickSoundBtn').onclick=()=>{byId('soundBtn').click();syncSound();};
  const syncSound=()=>{
    const on=byId('soundBtn').getAttribute('aria-pressed')==='true',button=byId('quickSoundBtn');
    button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',on?'Mute sound':'Enable sound');button.textContent=on?'♫':'♪';
  };
  new MutationObserver(syncSound).observe(byId('soundBtn'),{attributes:true,attributeFilter:['aria-pressed']});syncSound();
  document.addEventListener('pointerdown',event=>{const settings=byId('settingsPanel');if(settings.open&&!settings.contains(event.target))settings.open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&byId('settingsPanel').open){byId('settingsPanel').open=false;byId('settingsPanel').querySelector('summary').focus();event.preventDefault();event.stopImmediatePropagation();}});
  return {
    openMaps,
    closeMaps(){if(missionDialog.open)close(missionDialog);},
    openEnemies(trigger){enemyGuide.open=true;show(enemyDialog,trigger);},
    closeEnemies(){close(enemyDialog);},
    openIntel(){show(intelDialog);},
    update({profile:nextProfile,selectedMap:nextMap,difficulty,mode}) {
      profile=nextProfile;selectedMap=nextMap;renderMaps();
      byId('activeMapName').textContent=maps[selectedMap]?.name||'Custom garden';
      byId('activeMapMode').textContent=`${maps[selectedMap]?.expedition?'Expedition':'Campaign'} · ${mode} · ${difficulty}`;
    }
  };
}
