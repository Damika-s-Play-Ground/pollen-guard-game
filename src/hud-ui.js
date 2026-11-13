import { uiIconSvg } from './ui-icons.js';

export function buildHudView({
  cash, lives, popped, wave, lifeCapacity, limit, mapName, challengeLabel,
  running, paused, gameOver, selectedTower, roster, previousTowerKey, nextTowerKey,
  intermission, tutorialActive, tutorialTask, bloomCharge, hasEnemies, speed,
  resumeDisabled, upgradeDisabled, upgradeFocusable=false
}) {
  const finished = gameOver;
  const runStatus = finished ? 'ended' : paused ? 'paused' : running ? 'in progress' : 'planning';
  const selectedDescription = selectedTower
    ? `Selected ${selectedTower.name}, level ${selectedTower.level}, target ${selectedTower.targetMode || 'First'}.`
    : 'No defender selected.';
  const rosterText = roster.length ? roster.map(tower => `${tower.name} level ${tower.level}`).join(', ') : 'No defenders placed.';
  const cashValue = Math.floor(cash);
  const lifePercent = Math.max(0, Math.min(100, lives / lifeCapacity * 100));

  return {
    counters: { cash: cashValue, lives, popped, wave },
    life: { percent: lifePercent, value: lives, max:lifeCapacity },
    bloom: { percent: bloomCharge },
    waveLimit: limit === Infinity ? '· ∞' : `/ ${limit}`,
    battlefieldSummary: `${mapName}, ${challengeLabel} rules. Wave ${wave} of ${limit === Infinity ? 'unlimited' : limit}; ${runStatus}. ${cashValue} spendable petals. Garden health: ${lives} of ${lifeCapacity}. ${roster.length} defenders: ${rosterText} ${selectedDescription} With a selected build, use arrow keys to aim; hold Shift with an arrow for a larger move. Press Enter to preview, arrows to adjust, then Enter again to place. Escape cancels. Cycle placed defenders with ${previousTowerKey} and ${nextTowerKey}.`,
    battlefieldLabel: `${mapName} battlefield. Wave ${wave}, garden health ${lives} of ${lifeCapacity}, ${cashValue} spendable petals. ${selectedDescription} With a selected build, arrows aim; hold Shift for larger moves; Enter previews, arrows adjust, and Enter again places; Escape cancels.`,
    buttons: {
      startBtn: { disabled: running || paused || finished || (tutorialActive && tutorialTask !== 4), text: finished ? (lives > 0 ? 'Garden saved' : 'Meadow over') : paused ? 'Game paused' : running ? 'Wave in progress…' : `Launch wave ${wave + 1}  ↗` },
      pauseBtn: { text: paused ? 'play' : 'pause', label: paused ? 'Resume game (Space)' : 'Pause game (Space)', pressed: paused },
      bloomBtn: { text: `✦ Bloom pulse · ${bloomCharge} / 100`, disabled: bloomCharge < 100 || !hasEnemies || gameOver || tutorialActive },
      snareBtn: { disabled: cash < 45 || !hasEnemies || gameOver || (tutorialActive && tutorialTask !== 5) },
      speedBtn: { text: `${speed}×`, shortLabel: `${speed}×`, label: `Game speed ${speed}×. Activate to cycle 1×, 1.5×, 2×, and 2.5×.`, active: speed > 1 }
    },
    waveTag: running ? 'DEFEND THE POD' : finished ? 'RUN COMPLETE' : intermission > 0 ? `PREP ${Math.ceil(intermission)}s` : `WAVE ${wave + 1} INCOMING`,
    bloomStatus: gameOver ? 'Run ended.' : !hasEnemies ? 'Wait for enemies on the trail.' : bloomCharge < 100 ? `Charge by popping enemies · ${100 - bloomCharge} more needed.` : 'Ready · affects every enemy on the trail.',
    snareStatus: gameOver ? 'Run ended.' : cash < 45 ? `Need ${45 - cash} more petals.` : !hasEnemies ? 'Wait for enemies on the trail.' : 'Ready · stuns every enemy on the trail.',
    resumeDisabled,
    upgradeDisabled,
    upgradeFocusable
  };
}

const hudElementsByDocument = new WeakMap();
const pauseButtonMarkup = new Map();

function hudElements(document) {
  let elements = hudElementsByDocument.get(document);
  if (elements) return elements;
  const byId = id => document.getElementById(id);
  elements = {
    counters: Object.fromEntries(['cash','lives','popped','wave'].map(id => [id, byId(id)])),
    lifeBar: byId('lifeBar'),
    lifeMeter: byId('lifeBar').parentElement,
    bloomBar: byId('bloomBar'),
    bloomMeter: byId('bloomBar').parentElement,
    waveLimit: byId('waveLimit'),
    battlefieldSummary: byId('battlefieldSummary'),
    game: byId('game'),
    buttons: Object.fromEntries(['startBtn','pauseBtn','bloomBtn','snareBtn','speedBtn'].map(id => [id, byId(id)])),
    waveTag: byId('waveTag'),
    bloomStatus: byId('bloomStatus'),
    snareStatus: byId('snareStatus'),
    resume: byId('resumeBtn'),
    upgrade: byId('upgradeBtn')
  };
  hudElementsByDocument.set(document, elements);
  return elements;
}

function setText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

function setAttribute(element, name, value) {
  const text = String(value);
  if (element.getAttribute(name) !== text) element.setAttribute(name, text);
}

export function renderHud(document, view) {
  const elements = hudElements(document);
  for (const [id, value] of Object.entries(view.counters)) setText(elements.counters[id], value);

  const lifeWidth = `${view.life.percent}%`;
  if (elements.lifeBar.style.width !== lifeWidth) elements.lifeBar.style.width = lifeWidth;
  setAttribute(elements.lifeMeter, 'aria-valuemax', view.life.max);
  setAttribute(elements.lifeMeter, 'aria-valuenow', view.life.value);
  const bloomWidth = `${view.bloom.percent}%`;
  if (elements.bloomBar.style.width !== bloomWidth) elements.bloomBar.style.width = bloomWidth;
  setAttribute(elements.bloomMeter, 'aria-valuenow', view.bloom.percent);
  setText(elements.waveLimit, view.waveLimit);
  setText(elements.battlefieldSummary, view.battlefieldSummary);
  setAttribute(elements.game, 'aria-label', view.battlefieldLabel);

  for (const [id, button] of Object.entries(view.buttons)) {
    const element = elements.buttons[id];
    if (button.text !== undefined) {
      if (id === 'pauseBtn') {
        let markup = pauseButtonMarkup.get(button.text);
        if (markup === undefined) {
          markup = uiIconSvg(button.text, 'ui-icon pause-icon');
          pauseButtonMarkup.set(button.text, markup);
        }
        if (element.innerHTML !== markup) element.innerHTML = markup;
      } else setText(element, button.text);
    }
    if (button.disabled !== undefined && element.disabled !== button.disabled) element.disabled = button.disabled;
    if (button.label !== undefined) setAttribute(element, 'aria-label', button.label);
    if (button.pressed !== undefined) setAttribute(element, 'aria-pressed', button.pressed);
    if (button.shortLabel !== undefined && element.dataset.shortLabel !== button.shortLabel) element.dataset.shortLabel = button.shortLabel;
    if (button.active !== undefined && element.classList.contains('active') !== button.active) element.classList.toggle('active', button.active);
  }

  setText(elements.waveTag, view.waveTag);
  setText(elements.bloomStatus, view.bloomStatus);
  setText(elements.snareStatus, view.snareStatus);
  if (elements.resume.disabled !== view.resumeDisabled) elements.resume.disabled = view.resumeDisabled;
  if (view.upgradeDisabled !== undefined) {
    const disabled = Boolean(view.upgradeDisabled && !view.upgradeFocusable);
    if (elements.upgrade.disabled !== disabled) elements.upgrade.disabled = disabled;
    setAttribute(elements.upgrade, 'aria-disabled', Boolean(view.upgradeDisabled));
  }
}
