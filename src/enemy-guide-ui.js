
export function buildEnemyBriefingView({ targetWave, intro, running = false, terminal = false }) {
  if (running || terminal || !intro) return { hidden: true, enemyType: null };
  return {
    hidden: false,
    enemyType: intro.type,
    heading: `New threat · Wave ${targetWave} · ${intro.icon} ${intro.name}. `,
    rule: intro.rule,
    guideLabel: `Inspect ${intro.name} in the enemy field guide`
  };
}

export function renderEnemyBriefing({ panel, text, guideButton, view, document }) {
  panel.hidden = view.hidden;
  if (view.hidden) return;
  panel.dataset.enemyIntel = view.enemyType;
  const heading = document.createElement('strong');
  heading.textContent = view.heading;
  text.replaceChildren(heading, document.createTextNode(view.rule));
  guideButton.setAttribute('aria-label', view.guideLabel);
}

export function filterEnemyGuide({ list, empty, query }) {
  const needle = String(query || '').trim().toLocaleLowerCase();
  let count = 0;
  for (const card of list.children) {
    card.hidden = !`${card.dataset.enemyGuide} ${card.textContent}`.toLocaleLowerCase().includes(needle);
    if (!card.hidden) count++;
  }
  empty.hidden = count > 0;
}

export function renderEnemyGuide({ document, list, empty, query, intel, createEnemy, profiles, leakCost, guideWave }) {
  list.replaceChildren();
  for (const info of intel) {
    const enemy = createEnemy(info.type, guideWave, 1), profile = profiles[info.type], card = document.createElement('article');
    card.className = 'enemy-guide-card'; card.dataset.enemyGuide = info.type; card.tabIndex = -1;
    const heading = document.createElement('h3'); heading.textContent = `${info.icon} ${info.name}`; card.append(heading);
    const addLine = (label, value) => {
      const line = document.createElement('p'), strong = document.createElement('strong');
      strong.textContent = `${label} `; line.append(strong, document.createTextNode(value)); card.append(line);
    };
    addLine('Role ·', info.role); addLine('Rule ·', info.rule);
    const stats = document.createElement('div'); stats.className = 'enemy-guide-stats';
    const cost = typeof leakCost === 'function' ? leakCost(enemy) : leakCost;
    const values = [`Wave ${guideWave}`, `HP · ${enemy.maxHp}`, `Speed · ${Math.round(enemy.speed)} map units/s`, `Bounty · ${enemy.reward}`, `Leak · ${cost} ${cost === 1 ? 'life' : 'lives'}`];
    if (enemy.shield) values.push(`Shield · ${enemy.shield}`);
    if (enemy.armor) values.push(`Armor · ${enemy.armor}`);
    if (enemy.flying) values.push('Air lane');
    if (enemy.boss) values.push('Boss');
    for (const value of values) { const tag = document.createElement('span'); tag.textContent = value; stats.append(tag); }
    card.append(stats);
    const resistance = Object.entries(profile.resistances || {}).map(([channel, value]) => `${channel} ${value}×`).join(' · ');
    addLine('Damage ·', resistance || 'standard');
    const effects = [
      ...(profile.statusImmunities || []).map(name => `${name} immune`),
      ...Object.entries(profile.statusResistances || {}).map(([name, value]) => `${name} duration ${value}×`)
    ];
    if (effects.length) addLine('Status ·', effects.join(' · '));
    const button = document.createElement('button'); button.type = 'button'; button.dataset.enemyResistance = info.type;
    button.textContent = 'Open resistance table'; card.append(button); list.append(card);
  }
  filterEnemyGuide({ list, empty, query });
}
