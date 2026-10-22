export function buildHudView({
  cash, lives, popped, wave, lifeCapacity, limit, mapName, challengeLabel,
  running, paused, gameOver, selectedTower, roster, previousTowerKey, nextTowerKey,
  intermission, tutorialActive, tutorialTask, bloomCharge, hasEnemies, speed,
  resumeDisabled, upgradeDisabled
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
    life: { percent: lifePercent, value: lives },
    bloom: { percent: bloomCharge },
    waveLimit: limit === Infinity ? '· ∞' : `/ ${limit}`,
    battlefieldSummary: `${mapName}, ${challengeLabel} rules. Wave ${wave} of ${limit === Infinity ? 'unlimited' : limit}; ${runStatus}. ${cashValue} petals and ${lives} seeds. ${roster.length} defenders: ${rosterText} ${selectedDescription} Use arrow keys to aim a selected build, Enter to preview and place, Escape to cancel. Cycle placed defenders with ${previousTowerKey} and ${nextTowerKey}.`,
    battlefieldLabel: `${mapName} battlefield. Wave ${wave}, ${lives} seeds, ${cashValue} petals. ${selectedDescription} Arrow keys aim; Enter previews then places; Escape to cancel.`,
    buttons: {
      startBtn: { disabled: running || paused || finished || (tutorialActive && tutorialTask !== 4), text: finished ? (lives > 0 ? 'Garden saved' : 'Meadow over') : paused ? 'Game paused' : running ? 'Wave in progress…' : `Start wave ${wave + 1}  ↗` },
      fastBtn: { disabled: running || paused || finished || intermission <= 0 || tutorialActive, text: intermission > 0 ? `Early +${Math.max(1, Math.ceil(intermission))} ✿` : 'Early start' },
      pauseBtn: { text: paused ? '▶' : 'Ⅱ', label: paused ? 'Resume game (Space)' : 'Pause game (Space)', pressed: paused },
      bloomBtn: { text: `✦ Bloom pulse · ${bloomCharge} / 100`, disabled: bloomCharge < 100 || !hasEnemies || gameOver || tutorialActive },
      snareBtn: { disabled: cash < 45 || !hasEnemies || gameOver || (tutorialActive && tutorialTask !== 5) },
      speedBtn: { text: `${speed}× speed`, shortLabel: `${speed}×`, label: `Game speed ${speed}×`, active: speed > 1 }
    },
    waveTag: running ? 'DEFEND THE POD' : finished ? 'RUN COMPLETE' : intermission > 0 ? `EARLY BONUS ${Math.ceil(intermission)}s` : `WAVE ${wave + 1} INCOMING`,
    bloomStatus: gameOver ? 'Run ended.' : !hasEnemies ? 'Wait for enemies on the trail.' : bloomCharge < 100 ? `Charge by popping enemies · ${100 - bloomCharge} more needed.` : 'Ready · affects every enemy on the trail.',
    snareStatus: gameOver ? 'Run ended.' : cash < 45 ? `Need ${45 - cash} more petals.` : !hasEnemies ? 'Wait for enemies on the trail.' : 'Ready · stuns every enemy on the trail.',
    resumeDisabled,
    upgradeDisabled
  };
}

export function renderHud(document, view) {
  const byId = id => document.getElementById(id);
  for (const [id, value] of Object.entries(view.counters)) byId(id).textContent = value;

  byId('lifeBar').style.width = `${view.life.percent}%`;
  byId('lifeBar').parentElement.setAttribute('aria-valuenow', view.life.value);
  byId('bloomBar').style.width = `${view.bloom.percent}%`;
  byId('bloomBar').parentElement.setAttribute('aria-valuenow', view.bloom.percent);
  byId('waveLimit').textContent = view.waveLimit;
  byId('battlefieldSummary').textContent = view.battlefieldSummary;
  byId('game').setAttribute('aria-label', view.battlefieldLabel);

  for (const [id, button] of Object.entries(view.buttons)) {
    const element = byId(id);
    if (button.text !== undefined) element.textContent = button.text;
    if (button.disabled !== undefined && element.disabled !== button.disabled) element.disabled = button.disabled;
    if (button.label !== undefined) element.setAttribute('aria-label', button.label);
    if (button.pressed !== undefined) element.setAttribute('aria-pressed', String(button.pressed));
    if (button.shortLabel !== undefined) element.dataset.shortLabel = button.shortLabel;
    if (button.active !== undefined) element.classList.toggle('active', button.active);
  }

  byId('waveTag').textContent = view.waveTag;
  byId('bloomStatus').textContent = view.bloomStatus;
  byId('snareStatus').textContent = view.snareStatus;
  const resume = byId('resumeBtn');
  if (resume.disabled !== view.resumeDisabled) resume.disabled = view.resumeDisabled;
  const upgrade = byId('upgradeBtn');
  if (view.upgradeDisabled !== undefined && upgrade.disabled !== view.upgradeDisabled) upgrade.disabled = view.upgradeDisabled;
}
