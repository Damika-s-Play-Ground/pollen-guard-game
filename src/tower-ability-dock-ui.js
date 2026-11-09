export function renderTowerAbilityDock({ document, view }) {
  const byId = id => document.getElementById(id);
  const control = byId('towerAbilityControl');
  const wasHidden=control.hidden;
  const confirm = byId('towerAbilityConfirm');
  const cancel = byId('towerAbilityCancel');
  control.hidden = view.hidden;
  control.classList?.toggle('aiming',Boolean(view.aiming));
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
  if(wasHidden&&!view.hidden){
    const dock=control.parentElement;
    if(!dock?.getBoundingClientRect||!control.getBoundingClientRect)return;
    const dockRect=dock.getBoundingClientRect(),controlRect=control.getBoundingClientRect();
    if(controlRect.right>dockRect.right)dock.scrollLeft+=controlRect.right-dockRect.right;
    else if(controlRect.left<dockRect.left)dock.scrollLeft-=dockRect.left-controlRect.left;
  }
}
