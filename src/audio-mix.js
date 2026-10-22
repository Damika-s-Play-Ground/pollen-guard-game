export function masterOutputLevel({ soundEnabled, masterVolume }) {
  if (!soundEnabled || !Number.isFinite(masterVolume)) return 0;
  return Math.max(0, Math.min(100, masterVolume)) / 100;
}
