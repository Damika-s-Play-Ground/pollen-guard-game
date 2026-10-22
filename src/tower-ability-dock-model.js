import { canActivateTowerAbility } from './game-core.js';
import { towerAbilityTargets, TOWER_ABILITY_COOLDOWN_SECONDS } from './combat-actions.js';
import { towersDef } from './game-data.js';

export function buildTowerAbilityPreview({ tower, enemies = [], enemyPosition }) {
  const def = towersDef[tower.type];
  const radius = (def.range || 120) * 1.3;
  const affected = towerAbilityTargets(tower, enemies, def, enemyPosition);
  return {
    towerId: tower.id,
    radius,
    targetIds: affected.map(enemy => enemy.id),
    message: `${Math.round(radius)}-unit area · Confirm to affect highlighted enemies.`
  };
}

export function buildTowerAbilityDockModel({ tower, enemies = [], wave, gameTime, isRunning, gameOver, abilityPreview, enemyPosition }) {
  if (!tower) return { hidden: true, confirmHidden: true, cancelHidden: true };

  const def = towersDef[tower.type];
  if (def.supportStructure) return { hidden: true, confirmHidden: true, cancelHidden: true };
  const remaining = Math.max(0, (tower.abilityReadyAt || 0) - gameTime);
  const usedThisWave = tower.type === 'sunflower' && tower.abilityUsedWave === wave;
  const nearby = towerAbilityTargets(tower, enemies, def, enemyPosition).length;
  const combatReady = canActivateTowerAbility({
    running: isRunning,
    enemyCount: enemies.length,
    gameOver,
    cooldownReady: remaining === 0,
    usedThisWave
  });
  const ready = combatReady && (def.income || nearby > 0);
  const previewing = abilityPreview?.towerId === tower.id;
  const cooldownProgress = Math.round(Math.max(0, Math.min(100, 100 * (1 - remaining / TOWER_ABILITY_COOLDOWN_SECONDS))));
  const buttonTitle = ready
    ? def.income
      ? `Use ${def.ability} now during combat; it can be used once per wave.`
      : `Preview ${def.ability} area before confirming.`
    : usedThisWave
      ? 'Already used this wave.'
      : remaining > 0
        ? `Ready in ${Math.ceil(remaining)} seconds.`
        : !isRunning
          ? 'Available during combat.'
          : !enemies.length
            ? 'Waiting for an enemy on the trail.'
            : !nearby && !def.income
              ? 'Waiting for an enemy in this ability’s area.'
              : 'Ability unavailable.';

  return {
    hidden: false,
    label: usedThisWave ? `${def.ability} · used this wave` : remaining > 0 ? `${def.ability} · ${Math.ceil(remaining)}s` : `✦ ${def.income ? 'Use' : 'Preview'} ${def.ability}`,
    disabled: !ready,
    cooldownProgress,
    buttonTitle,
    confirmHidden: !previewing,
    cancelHidden: !previewing,
    confirmDisabled: previewing && !ready,
    confirmTitle: previewing && !ready ? buttonTitle : 'Confirm this ability.',
    previewText: previewing && !ready
      ? `${buttonTitle} Wait or cancel.`
      : previewing
        ? abilityPreview.message
        : ready
          ? def.income ? 'Ready · harvest petals · once per wave.' : `Ready · area power · ${nearby} in range.`
          : buttonTitle
  };
}
