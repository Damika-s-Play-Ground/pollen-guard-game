export function renderTowerAbilityDock({ document, view }) {
  const byId = id => document.getElementById(id);
  const control = byId('towerAbilityControl');
  const confirm = byId('towerAbilityConfirm');
  const cancel = byId('towerAbilityCancel');
  control.hidden = view.hidden;
  confirm.hidden = view.confirmHidden;
  cancel.hidden = view.cancelHidden;
  if (view.hidden) return;

  byId('towerAbilityLabel').textContent = view.label;
  const button = byId('towerAbilityBtn');
  button.disabled = view.disabled;
  button.style.setProperty('--cooldown-progress', `${view.cooldownProgress}%`);
  button.title = view.buttonTitle;
  confirm.disabled = view.confirmDisabled;
  confirm.title = view.confirmTitle;
  byId('towerAbilityPreview').textContent = view.previewText;
}
