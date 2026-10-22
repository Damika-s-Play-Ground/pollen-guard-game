export function bindUiSettingsControls({ controls, settings, saveSettings, applySettings, redraw, syncAudio, setSoundEnabled }) {
  controls.sound.onclick = () => {
    settings.sound = !settings.sound;
    saveSettings();
    controls.sound.textContent = settings.sound ? '♫ Sound on' : '♫ Sound muted';
    controls.sound.setAttribute('aria-pressed', String(settings.sound));
    setSoundEnabled(settings.sound);
  };
  controls.animation.onchange = event => { settings.animation = event.target.value; saveSettings(); applySettings(); };
  controls.shake.onchange = event => { settings.shake = event.target.checked; saveSettings(); };
  controls.flashes.onchange = event => { settings.flashes = event.target.checked; saveSettings(); };
  for (const name of ['masterVolume', 'musicVolume', 'effectsVolume']) {
    controls[name].oninput = event => {
      settings[name] = Number(event.target.value);
      controls[`${name}Value`].value = `${settings[name]}%`;
      controls[`${name}Value`].textContent = `${settings[name]}%`;
      saveSettings();
      syncAudio();
    };
  }
  controls.compact.onchange = event => { settings.compact = event.target.checked; saveSettings(); applySettings(); };
  controls.palette.onchange = event => { settings.palette = event.target.value; saveSettings(); applySettings(); redraw(); };
  controls.textSize.onchange = event => { settings.textSize = event.target.value; saveSettings(); applySettings(); };
}
