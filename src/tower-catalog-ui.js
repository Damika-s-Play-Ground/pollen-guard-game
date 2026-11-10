import { formatMapUnits } from './game-core.js';

export const STARTER_TOWER_TYPES=Object.freeze(['sprout','dew','puff']);
export const STARTER_TOWER_ROLE_LABELS=Object.freeze({sprout:'Attack',dew:'Slow',puff:'Area'});
export const SPECIALIST_TOWER_TYPES=Object.freeze(['thorn','sunflower','gust','ember','briar','pollenBeacon','compostTrap','pollinatorRelay']);

export function specialistEncounterHint(groups=[]) {
  const present=new Set(groups.map(group=>group.type));
  if(present.has('flyer'))return 'Air threat ahead · Thorn Beacon and Kite Keeper can hit flying pests.';
  if(present.has('armored'))return 'Armored pests ahead · Thorn Beacon reaches far; Piercing Point bypasses armor after upgrade.';
  if(present.has('splitter'))return 'Splitters ahead · Briar Patch adds poison to grouped ground pests.';
  if(present.has('zip'))return 'Fast pests ahead · Dew Bell slows ground targets.';
  return '';
}

export function sunflowerPurchaseForecast({ cost, income }) {
  if(!Number.isFinite(cost)||cost<=0||!Number.isFinite(income)||income<=0)return null;
  return `Next clear: +${income} base petals · about ${Math.ceil(cost/income)} clears to repay ${cost} petals from harvest alone.`;
}

export function syncTowerCatalogSelection(buttons, selectedType=null) {
  for(const button of buttons){
    const selected=button.dataset.type===selectedType;
    button.className=`tower-option ${selected?'active':''}`.trim();
    button.setAttribute('aria-pressed',String(selected));
  }
}

export function renderTowerCatalog({ document, root, towersDef, towerRoles, selectedType, filter, challenge, challengeRules = [], researchLoadout=[],relicLoadout=[], cash=Infinity,keyBindings, keyCodeLabel, getEffectiveTowerStats, towerArtSvg, types }) {
  const allowed=new Set(types||Object.keys(towersDef));
  const entries = Object.entries(towersDef).filter(([id]) => allowed.has(id)&&(filter === 'all' || towerRoles[id] === filter));
  const buttons = entries.map(([id, tower]) => {
    const button = document.createElement('button');
    const selected = selectedType === id;
    const effective = getEffectiveTowerStats({ type: id, level: 1 }, { challenge:tower.supportStructure?'classic':challenge, challengeRules:tower.supportStructure?[]:challengeRules, linked: false,researchLoadout,relicLoadout }, tower);
    const keyCode = keyBindings[`tower${Object.keys(towersDef).indexOf(id) + 1}`];
    const shortcut = keyCode ? keyCodeLabel(keyCode) : '';
    const unavailable = (challenge === 'thrifty' || challengeRules.includes('noSunflowers')) && id === 'sunflower';
    const supportRole = tower.supportStructure==='beacon'
      ? `Buffs up to 3 eligible attackers within ${formatMapUnits(effective.range)} with ${Math.round((1-effective.buffMultiplier)*100)}% shorter attack interval, once each; 48-unit footprint.`
      : tower.supportStructure==='trap'
      ? `Slows the first ${Math.max(0,tower.triggerLimit-(researchLoadout.includes('compost-lattice')?1:0))} unique ground pests to enter its ${formatMapUnits(effective.range)} ring for ${tower.slowDuration}s, then expires; footprint ${tower.footprint} units.`
      : tower.role;
    const stats = tower.supportStructure
      ? `${supportRole} · range ${formatMapUnits(effective.range)}`
      : tower.income
      ? `+${effective.income} petals per wave · Golden Seeds radius ${effective.allyLinkRadius} map units · ${tower.ability}`
      : `Damage/hit ${effective.damage} · range ${formatMapUnits(effective.range)} · ${(1 / effective.rate).toFixed(1)} attacks/s · ${tower.role}`;
    const shortcutHelp = unavailable ? `${challenge === 'thrifty' ? 'Unavailable in Thrifty mode' : 'Unavailable under these rules'}; shortcut ${shortcut} is disabled.` : shortcut ? `Press ${shortcut} to select.` : 'Select from the catalog.';
    button.className = `tower-option ${selected ? 'active' : ''}`;
    button.dataset.type = id;
    button.setAttribute('aria-pressed', String(selected));
    if (shortcut) button.setAttribute('aria-keyshortcuts', shortcut);
    const shortfall=Math.max(0,tower.cost-cash);
    button.setAttribute('title', `${tower.name}: ${stats}. Cost ${tower.cost} petals.${shortfall?` Need ${shortfall} more petals.`:''} ${shortcutHelp}`);
    button.dataset.purchaseCost=String(tower.cost);
    button.disabled = unavailable;

    const icon = document.createElement('span'); icon.className = 'tower-icon'; icon.innerHTML = towerArtSvg(id);
    if (shortcut) { const key = document.createElement('kbd'); key.className = 'tower-shortcut'; key.setAttribute('aria-hidden', 'true'); key.textContent = shortcut; icon.append(key); }
    const copy = document.createElement('span'); copy.className = 'tower-copy';
    const name = document.createElement('b'); name.textContent = tower.name;
    const role = document.createElement('small'); role.textContent = STARTER_TOWER_ROLE_LABELS[id] || (tower.supportStructure ? supportRole : tower.role);role.className=STARTER_TOWER_ROLE_LABELS[id]?'tower-role-label':'';copy.append(name, role);
    if(id==='sunflower'){
      const forecast=document.createElement('small');forecast.className='tower-income-forecast';forecast.textContent=sunflowerPurchaseForecast({cost:tower.cost,income:effective.income});
      const conditional=document.createElement('small');conditional.className='tower-income-conditional';conditional.textContent='Separate: shared wave rewards, Golden Harvest, and Golden Seeds haste for nearby Sprouts.';
      copy.append(forecast,conditional);
    }
    const cost = document.createElement('span'); cost.className = 'cost'; cost.textContent = `${tower.cost} ✿`;
    const shortage=document.createElement('small');shortage.className='affordability-shortfall';shortage.dataset.cost=String(tower.cost);shortage.hidden=shortfall===0;shortage.textContent=shortfall?`Need ${shortfall} more`:'';cost.append(shortage);
    button.append(icon, copy, cost);
    return button;
  });
  root.replaceChildren(...buttons);
}

