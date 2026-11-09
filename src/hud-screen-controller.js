// Coordinates presentation updates for the combat HUD. Game state and domain
// decisions stay with the caller; all renderers consume the same HUD view.
export function createHudScreenController({
  document, renderHud, announceResources, refreshAffordability,
  renderSeedObjective, refreshSpellControls, updateGuardianControls,
  refreshUpgradeAndAbilityDock, updateWaveTimeline, updateEnemyGuide,
  updateEnemyBriefing, updateEndlessChoices, renderAutoStartControls
}) {
  return function presentHud({ view, cash, lives, selectedUpgrade, seedObjective }) {
    announceResources({ cash, lives });
    renderHud(document, view);
    refreshAffordability({ document, cash, selectedUpgrade });
    renderSeedObjective(seedObjective);
    refreshSpellControls();
    updateGuardianControls();
    refreshUpgradeAndAbilityDock();
    updateWaveTimeline();
    updateEnemyGuide();
    updateEnemyBriefing();
    updateEndlessChoices();
    renderAutoStartControls();
  };
}
