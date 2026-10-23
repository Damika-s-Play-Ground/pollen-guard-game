import { formatMapUnits } from './game-core.js';

export function renderTowerCatalog({ document, root, towersDef, towerRoles, selectedType, filter, challenge, challengeRules = [], researchLoadout=[],relicLoadout=[], keyBindings, keyCodeLabel, getEffectiveTowerStats, towerArtSvg }) {
  const entries = Object.entries(towersDef).filter(([id]) => filter === 'all' || towerRoles[id] === filter);
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
    button.setAttribute('title', `${tower.name}: ${stats}. Cost ${tower.cost} petals. ${shortcutHelp}`);
    button.disabled = unavailable;

    const icon = document.createElement('span'); icon.className = 'tower-icon'; icon.innerHTML = towerArtSvg(id);
    if (shortcut) { const key = document.createElement('kbd'); key.className = 'tower-shortcut'; key.setAttribute('aria-hidden', 'true'); key.textContent = shortcut; icon.append(key); }
    const copy = document.createElement('span'); copy.className = 'tower-copy';
    const name = document.createElement('b'); name.textContent = tower.name;
    const role = document.createElement('small'); role.textContent = tower.supportStructure ? supportRole : tower.role; copy.append(name, role);
    const cost = document.createElement('span'); cost.className = 'cost'; cost.textContent = `${tower.cost} ✿`;
    button.append(icon, copy, cost);
    return button;
  });
  root.replaceChildren(...buttons);
}

