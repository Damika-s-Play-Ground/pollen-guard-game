export function renderTowerUpgradePreview({ document, text }) {
  document.getElementById('upgradePreview').textContent = text;
}

export function renderTowerTargetStatus({ document, text }) {
  document.getElementById('targetStatus').textContent = text;
}

export function renderTowerInspector({ document, canvasHost, view }) {
  const byId = id => document.getElementById(id);
  const empty = Boolean(view.empty);
  byId('selectedPanel').style.display = empty ? 'none' : 'block';
  byId('selectedContext').hidden = empty;
  canvasHost.classList.toggle('has-selected-tower', !empty);
  const branches = byId('branchChoices');
  if (empty) {
    branches.replaceChildren();
    return;
  }

  byId('selectedPortrait').innerHTML = view.portrait;
  byId('selectedName').textContent = view.name;
  byId('selectedLevel').textContent = view.levelLabel;
  byId('upgradeDesc').textContent = view.upgradeDescription;
  byId('towerRange').textContent = view.range;
  byId('towerImpact').textContent = view.impact;
  byId('towerInterval').textContent = view.interval;
  byId('towerTargets').textContent = view.targets;
  byId('towerEffects').textContent = view.effects;
  byId('towerInvestment').textContent = view.investment;
  branches.style.display = view.showBranches ? 'grid' : 'none';

  if (!view.showBranches) branches.replaceChildren();
  else if (view.branchOptions) {
    const choices = view.branchOptions.map((option, index) => {
      const button = document.createElement('button'); button.className = 'branch-choice';
      button.dataset.branch = String(index); button.title = option.title;
      button.setAttribute('aria-pressed', String(view.selectedBranch === index));
      const details = document.createElement('span');
      details.append(document.createTextNode(option.name));
      const description = document.createElement('small'); description.textContent = option.description; details.append(description);
      const price = document.createElement('span'); price.textContent = `${option.cost} ✿`;
      button.append(details, price); button.onclick = () => view.onChooseBranch(index);
      return button;
    });
    branches.replaceChildren(...choices);
  }
  for (const button of branches.querySelectorAll('[data-branch]')) {
    const selected = view.selectedBranch === Number(button.dataset.branch);
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }

  byId('upgradeBtn').textContent = view.upgradeText;
  byId('upgradeBtn').title = view.upgradeTitle;
  byId('upgradeBtn').disabled = view.upgradeDisabled;
  byId('sellBtn').textContent = 'Sell';
  byId('targetModeSelect').value = view.targetMode;
  byId('targetModeSelect').disabled = view.targetModeDisabled;
  byId('towerAbilityInfo').textContent = view.abilityInfo;
  byId('contextTitle').textContent = view.contextTitle;
}
