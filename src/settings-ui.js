export function renderUiSettings({ app, root, body, settings, controls }) {
  app.classList.toggle('compact', Boolean(settings.compact));
  app.classList.toggle('high-contrast', settings.palette === 'high-contrast');
  root.classList.toggle('motion-reduced', settings.animation === 'reduced');
  root.classList.toggle('motion-minimal', settings.animation === 'off');
  body.dataset.textScale = settings.textSize;
  body.dataset.palette = settings.palette === 'high-contrast' ? 'high-contrast' : 'garden';
  controls.animation.value = settings.animation;
  controls.shake.checked = Boolean(settings.shake);
  controls.flashes.checked = Boolean(settings.flashes);
  for (const name of ['masterVolume', 'musicVolume', 'effectsVolume']) {
    const value = settings[name];
    controls[name].value = value;
    controls[`${name}Value`].value = `${value}%`;
    controls[`${name}Value`].textContent = `${value}%`;
  }
  controls.compact.checked = Boolean(settings.compact);
  controls.palette.value = settings.palette;
  controls.textSize.value = settings.textSize;
  controls.autoStartWaves.checked = Boolean(settings.autoStartWaves);
}
