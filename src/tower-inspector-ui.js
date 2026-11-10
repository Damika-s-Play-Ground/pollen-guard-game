import { renderBranchPreview } from './branch-preview.js';

function appendBranchPreview(document, parent, option, motion) {
  if(!option.preview)return;
  const row=document.createElement('span');row.className='branch-preview-row';
  row.append(renderBranchPreview(document,option.preview,motion));
  const caption=document.createElement('small');caption.className='branch-preview-caption';caption.textContent=option.preview.label;row.append(caption);parent.append(row);
}

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
  const contextBranches = byId('contextBranches');
  if (empty) {
    branches.replaceChildren();
    contextBranches.replaceChildren();
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
      if(option.portrait){const portrait=document.createElement('span');portrait.className='branch-evolution-preview';portrait.setAttribute('aria-hidden','true');portrait.innerHTML=option.portrait;button.append(portrait);}
      const details = document.createElement('span');
      details.append(document.createTextNode(option.name));
      appendBranchPreview(document,details,option,view.previewMotion);
      const description = document.createElement('small'); description.textContent = option.description; details.append(description);
      const comparison = document.createElement('small'); comparison.textContent = `Next · ${option.changes}`; details.append(comparison);
      const ability = document.createElement('small'); ability.textContent = option.abilityText; details.append(ability);
      const price = document.createElement('span'); price.textContent = `${option.cost} ✿`;
      const shortage=document.createElement('small');shortage.className='affordability-shortfall';shortage.dataset.cost=String(option.cost);shortage.hidden=!option.shortfall;shortage.textContent=option.shortfall?`Need ${option.shortfall} more`:'';price.append(shortage);
      button.append(details, price); button.onclick = () => view.onChooseBranch(index);
      return button;
    });
    branches.replaceChildren(...choices);
  }
  const contextChoices = (view.branchOptions || []).map((option, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'context-branch'; button.dataset.branch = String(index);
    button.title = `${option.title} · ${option.changes}`;
    button.setAttribute('aria-pressed', String(view.selectedBranch === index));
    if(option.portrait){const portrait=document.createElement('span');portrait.className='branch-evolution-preview';portrait.setAttribute('aria-hidden','true');portrait.innerHTML=option.portrait;button.append(portrait);}
    button.append(document.createTextNode(option.name));
    const cost = document.createElement('small'); cost.textContent = `${option.cost} ✿`;
    const shortage=document.createElement('small');shortage.className='affordability-shortfall';shortage.dataset.cost=String(option.cost);shortage.hidden=!option.shortfall;shortage.textContent=option.shortfall?`Need ${option.shortfall} more`:'';cost.append(shortage);
    button.append(cost); button.onclick = () => view.onChooseBranch(index);
    return button;
  });
  contextBranches.replaceChildren(...contextChoices);
  contextBranches.hidden = !contextChoices.length;
  for (const button of branches.querySelectorAll('[data-branch]')) {
    const selected = view.selectedBranch === Number(button.dataset.branch);
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }

  byId('upgradeBtn').textContent = view.upgradeText;
  byId('upgradeBtn').title = view.upgradeTitle;
  byId('upgradeBtn').disabled = view.upgradeDisabled&&!view.upgradeFocusable;
  byId('upgradeBtn').setAttribute('aria-disabled',String(Boolean(view.upgradeDisabled)));
  byId('contextUpgradeBtn').disabled = view.upgradeDisabled&&!view.upgradeFocusable;
  byId('contextUpgradeBtn').setAttribute('aria-disabled',String(Boolean(view.upgradeDisabled)));
  byId('contextUpgradeBtn').textContent = view.contextUpgradeText;
  byId('contextUpgradeBtn').title = view.upgradeTitle;
  byId('targetModeSelect').value = view.targetMode;
  byId('targetModeSelect').disabled = view.targetModeDisabled;
  const supportTargetOption=byId('supportTargetModeOption');
  if(supportTargetOption){supportTargetOption.hidden=!view.supportTargetingAvailable;supportTargetOption.disabled=!view.supportTargetingAvailable;}
  const airTargetOption=byId('airTargetModeOption');
  if(airTargetOption){airTargetOption.hidden=!view.airTargetingAvailable;airTargetOption.disabled=!view.airTargetingAvailable;}
  byId('towerAbilityInfo').textContent = view.abilityInfo;
  byId('contextTitle').textContent = view.contextTitle;
}
