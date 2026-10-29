/** Present the persisted finite-wave Auto preference without implying Endless automation. */
export function buildAutoStartControlView({ enabled, challenge }) {
  const on = enabled === true;
  const endless = challenge === 'endless';
  return {
    label: endless ? `Finite Auto ${on ? 'on' : 'off'}` : on ? 'Auto on' : 'Auto off',
    pressed: on,
    active: on && !endless,
    ariaLabel: endless
      ? `Auto-start later finite waves · ${on ? 'on' : 'off'}; Endless stays manual`
      : `Auto-start later finite waves · ${on ? 'on' : 'off'}`,
    title: endless
      ? `Auto is ${on ? 'on' : 'off'} for finite modes. Endless waves and modifier choices stay manual.`
      : 'First wave always starts manually; later finite waves wait five seconds.'
  };
}
