export function missionChangeNeedsConfirmation({ wave = 0, towerCount = 0, pendingSavedGarden = false } = {}) {
  return wave > 0 || towerCount > 0 || pendingSavedGarden;
}

export function closeMissionPreparation(panel) {
  if (panel) panel.open = false;
}
