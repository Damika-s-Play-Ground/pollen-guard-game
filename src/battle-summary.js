const clampPercent=value=>Math.max(0,Math.min(100,Math.round(value)));
const mapPercent=(value,size)=>Number.isFinite(value)&&Number.isFinite(size)&&size>0?clampPercent(value/size*100):0;

export function buildBattleSummaryView({
  mapName='Battlefield',wave=0,waveLimit=0,lives=0,lifeCapacity=0,cash=0,running=false,paused=false,gameOver=false,
  enemies=[],pathLength=0,pathLengthFor=null,enemyNames={},towers=[],towerDefinitions={},selectedTowerId=null,fieldWidth=900,fieldHeight=540,
  groundCoveragePercent=0,skyCoveragePercent=null
}){
  const status=gameOver?'run ended':paused?'paused':running?'in progress':'planning';
  const limit=waveLimit===Infinity?'unlimited':waveLimit;
  const overview=`${mapName}. Wave ${wave} of ${limit}; ${status}. Garden health ${lives} of ${lifeCapacity}. ${Math.floor(cash)} spendable petals.`;
  const progressFraction=enemy=>{
    const length=typeof pathLengthFor==='function'?pathLengthFor(enemy):pathLength;
    return length>0?Math.max(0,Math.min(1,enemy.progress/length)):0;
  };
  const threats=[...enemies]
    .filter(enemy=>enemy&&Number.isFinite(enemy.progress))
    .sort((a,b)=>progressFraction(b)-progressFraction(a)||(a.id??0)-(b.id??0))
    .slice(0,3)
    .map(enemy=>{
      const flying=Boolean(enemy.flying||enemy.lane==='air');
      const routeLength=typeof pathLengthFor==='function'?pathLengthFor(enemy):pathLength;
      const progressPercent=routeLength>0?clampPercent(enemy.progress/routeLength*100):null;
      const burrowed=enemy.type==='burrower'&&enemy.burrowTimer>0;
      return {
        id:enemy.id,type:enemy.type,name:enemyNames[enemy.type]||String(enemy.type||'Unknown pest'),
        route:flying?'Sky route':'Ground trail',progressPercent,burrowed,
        label:`${enemyNames[enemy.type]||String(enemy.type||'Unknown pest')} on ${flying?'the sky route':'the ground trail'}${progressPercent===null?'':`, ${progressPercent}% toward the exit`}${burrowed?'; below ground and not targetable':''}`
      };
    });
  const orderedTowers=[...towers].sort((a,b)=>Number(b.id===selectedTowerId)-Number(a.id===selectedTowerId)||(a.id??0)-(b.id??0));
  const defenders=orderedTowers.slice(0,16).map(tower=>{
    const definition=towerDefinitions[tower.type]||{};
    const name=definition.name||String(tower.type||'Defender');
    const targetMode=tower.targetMode||'First';
    const xPercent=mapPercent(tower.x,fieldWidth),yPercent=mapPercent(tower.y,fieldHeight);
    const selected=tower.id===selectedTowerId;
    const role=definition.role||'';
    return {id:tower.id,name,role,level:tower.level||1,targetMode,xPercent,yPercent,selected,
      label:`${name}, level ${tower.level||1}${role?`, ${role}`:''}, ${xPercent}% across and ${yPercent}% down, targeting ${targetMode}${selected?', selected':''}`};
  });
  const selected=defenders.find(defender=>defender.selected)||null;
  const groundCoverage=clampPercent(groundCoveragePercent);
  const routes=[{name:'Ground trail',percent:groundCoverage}];
  if(skyCoveragePercent!==null)routes.push({name:'Sky route',percent:clampPercent(skyCoveragePercent)});
  const coverageText=routes.map(route=>route.percent===0
    ?`${route.name}: no attack range reaches the route.`
    :`${route.name}: ${route.percent}% of the route is within attack range${route.percent<100?'; gaps remain.':'.'}`).join(' ');
  const threatText=threats.length?`Closest threats: ${threats.map(threat=>threat.label).join('. ')}.`:'No active pests are on either route.';
  const selectedText=selected?`Selected defender: ${selected.label}.`:'No defender is selected.';
  const announcement=`${overview} ${threatText} ${coverageText} ${selectedText} ${towers.length} defenders placed.`;
  const nearest=threats[0];
  const lowHealth=lifeCapacity>0&&lives<=Math.max(1,Math.ceil(lifeCapacity*.2));
  const nearExit=nearest?.progressPercent!==null&&nearest?.progressPercent>=80;
  const urgentParts=[];
  if(lowHealth)urgentParts.push(`Garden health is low: ${lives} of ${lifeCapacity}.`);
  if(nearExit)urgentParts.push(`${nearest.name} is within the final 20% of ${nearest.route.toLowerCase()}${nearest.burrowed?' and is below ground, so it cannot be targeted yet':''}.`);
  const urgentKey=urgentParts.length?`${lowHealth?`health:${lives}`:''}|${nearExit?`${nearest.type}:${nearest.route}:${Math.floor(nearest.progressPercent/5)*5}:${nearest.burrowed}`:''}`:'';
  const signature=JSON.stringify({wave,status,lives,cash,threats:threats.map(threat=>[threat.id,threat.type,threat.route,threat.progressPercent===null?null:Math.floor(threat.progressPercent/10)*10,threat.burrowed]),routes,selected:selected?.id??null,defenderCount:towers.length});
  return {
    overview,threats,threatCount:enemies.length,threatText,routes,coverageText,defenders,selected,selectedText,
    defenderCount:towers.length,announcement,urgentAnnouncement:urgentParts.join(' '),urgentKey,signature
  };
}

export function createBattleSummaryAnnouncementGate({urgentInterval=15000,allInterval=30000}={}){
  let lastUrgentAt=-Infinity,lastSummaryAt=-Infinity,lastUrgentKey='',lastSummaryKey='';
  return function shouldAnnounce({cadence='manual',urgentKey='',summaryKey='',now=Date.now(),force=false}={}){
    if(cadence==='off')return false;
    if(force){
      if(cadence==='urgent'){lastUrgentAt=now;lastUrgentKey=urgentKey;}
      if(cadence==='all'){lastSummaryAt=now;lastSummaryKey=summaryKey;}
      return cadence==='manual'||cadence==='urgent'||cadence==='all';
    }
    if(cadence==='manual')return false;
    if(cadence==='urgent'){
      if(!urgentKey||urgentKey===lastUrgentKey||now-lastUrgentAt<urgentInterval)return false;
      lastUrgentAt=now;lastUrgentKey=urgentKey;return true;
    }
    if(cadence==='all'){
      if(!summaryKey||summaryKey===lastSummaryKey||now-lastSummaryAt<allInterval)return false;
      lastSummaryAt=now;lastSummaryKey=summaryKey;return true;
    }
    return false;
  };
}

export function renderBattleSummary(document,view){
  const byId=id=>document.getElementById(id);
  byId('battleSummaryOverview').textContent=view.overview;
  byId('battleSummaryThreatCount').textContent=`${view.threatCount} active ${view.threatCount===1?'threat':'threats'}.`;
  const threatList=byId('battleSummaryThreats');
  threatList.replaceChildren();
  if(!view.threats.length){const item=document.createElement('li');item.textContent='No active pests are on either route.';threatList.append(item);}
  else for(const threat of view.threats){const item=document.createElement('li');item.textContent=threat.label;threatList.append(item);}
  const routeList=byId('battleSummaryRoutes');
  routeList.replaceChildren();
  for(const route of view.routes){const item=document.createElement('li');item.textContent=route.percent===0
    ?`${route.name}: no attack range reaches the route.`
    :`${route.name}: ${route.percent}% within attack range${route.percent<100?'; gaps remain.':'.'}`;routeList.append(item);}
  byId('battleSummarySelected').textContent=view.selectedText;
  const defenderList=byId('battleSummaryDefenders');
  const defenderSignature=JSON.stringify(view.defenders.map(defender=>[defender.id,defender.label,defender.selected]));
  if(defenderList.dataset.summarySignature!==defenderSignature){
    defenderList.replaceChildren();
    if(!view.defenders.length){const item=document.createElement('li');item.textContent='No defenders placed.';defenderList.append(item);}
    else for(const defender of view.defenders){
      const item=document.createElement('li'),button=document.createElement('button');
      button.type='button';button.dataset.summaryDefender=String(defender.id);
      button.setAttribute('aria-pressed',String(defender.selected));
      button.textContent=`Inspect ${defender.label}`;item.append(button);defenderList.append(item);
    }
    defenderList.dataset.summarySignature=defenderSignature;
  }
  const remainder=view.defenderCount-view.defenders.length;
  byId('battleSummaryDefenderRemainder').textContent=remainder>0?`${remainder} more defenders are placed.`:'';
}
