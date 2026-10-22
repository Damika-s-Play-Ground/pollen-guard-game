import { getEffectiveTowerStats, describeTowerStatChanges, formatMapUnits, towerUpgradeQuote, saleRefund, towersAreLinked } from './game-core.js';
import { TOWER_COMBINATIONS } from './tower-combinations.js';
import { DOT_TICK_RULES, canHitTarget } from './combat-rules.js';
import { chooseTargetForTower, targetPriorityInfo } from './targeting.js';
import { enemyCombatProfiles, towersDef } from './game-data.js';
import { towerArtSvg } from './tower-art.js';
import { assignPollenBeaconBuffs } from './support-structures.js';
import { terrainBonusForTower } from './terrain.js';

function applyBeaconInterval(stats, tower, towers) {
  if (assignPollenBeaconBuffs(towers).has(tower.id)) stats.rate *= towersDef.pollenBeacon.buffMultiplier;
  return stats;
}

export function isTowerLinkedToAnother(selectedTower, towers, towersLinked) {
  if (!selectedTower) return false;
  return towers.some(other => other !== selectedTower && towersLinked(selectedTower, other));
}

function combinationStatus(tower, towers, combo) {
  const partnerType = combo.towerTypes.find(type => type !== tower.type);
  const partnerName = towersDef[partnerType]?.name || partnerType;
  const partners = towers.filter(other => other !== tower && other.id !== tower.id && other.type === partnerType);
  if (!partners.length) return `${combo.name} inactive · no ${partnerName} placed`;
  if (partners.some(other => towersAreLinked(tower, other, towersDef, towers))) {
    return `${combo.name} active (${combo.activeSummary})`;
  }
  const nearest = partners.reduce((best, other) => {
    const distance = Math.hypot(tower.x - other.x, tower.y - other.y);
    return distance < best.distance ? { partner: other, distance } : best;
  }, { partner: partners[0], distance: Infinity });
  const radius = combo.id === 'golden-seeds'
    ? getEffectiveTowerStats(tower.type === 'sunflower' ? tower : nearest.partner, {}, towersDef.sunflower).allyLinkRadius
    : combo.id === 'windcarved-thorns' && towers.some(relay => relay.type === 'pollinatorRelay' &&
      Math.hypot(relay.x - tower.x, relay.y - tower.y) <= combo.relayRange && Math.hypot(relay.x - nearest.partner.x, relay.y - nearest.partner.y) <= combo.relayRange)
      ? combo.relayRadius : combo.radius;
  return `${combo.name} inactive · nearest ${partnerName} ${formatMapUnits(nearest.distance)} away; needs < ${radius} map units`;
}

function combinationStatuses(tower, towers) {
  return TOWER_COMBINATIONS
    .filter(combo => combo.towerTypes.includes(tower.type))
    .map(combo => combinationStatus(tower, towers, combo))
    .join(' · ');
}

export function buildTowerUpgradePreview({ tower, towers = [tower], challenge, challengeRules = [], linked, cash, terrain = 'ground' }) {
  if (!tower) return '';
  if (towersDef[tower.type]?.supportStructure) return `${towersDef[tower.type].name} is a fixed support structure; it has no upgrades.`;
  if (tower.level === 3) return 'Fully grown · no further upgrade.';
  if (tower.level === 1 && tower.branchChoice == null) return 'Choose a branch to see its exact next stats.';

  const def = towersDef[tower.type], quote = towerUpgradeQuote(tower, def);
  const current = applyBeaconInterval(getEffectiveTowerStats(tower, { challenge, challengeRules, linked, terrain }, def), tower, towers);
  const next = applyBeaconInterval(getEffectiveTowerStats({ ...tower, level: tower.level + 1, branch: quote.branch }, { challenge, challengeRules, linked, terrain }, def), tower, towers);
  const changes = describeTowerStatChanges(current, next);
  const shortfall = Math.max(0, quote.cost - cash);
  return `Next · ${changes.length ? changes.join(' · ') : 'No numeric stat change'} · Ability unchanged: ${def.ability} · Cost ${quote.cost} petals · Investment ${quote.investedAfter} · sell return ${quote.refundAfter}${shortfall ? ` · Need ${shortfall} more` : ''}`;
}

export function buildTowerTargetStatus({ tower, enemies = [], challenge, challengeRules = [], linked, enemyPosition, isRunning = false, terrain = 'ground' }) {
  if (!tower) return 'Select a defender to see its target.';
  const def = towersDef[tower.type];
  if (def.supportStructure) return `${def.name} is a support structure and does not select or attack targets.`;
  if (def.income) return `Unavailable · ${def.name} harvests petals and cannot attack enemies.`;

  const range = getEffectiveTowerStats(tower, { challenge, challengeRules, linked, terrain }, def).range;
  const inRange = enemies.filter(enemy => Math.hypot(tower.x - enemyPosition(enemy).x, tower.y - enemyPosition(enemy).y) <= range);
  const eligible = inRange.filter(enemy => canHitTarget({ canHitAir: def.antiAir }, enemy));
  const target = chooseTargetForTower(tower, eligible, enemyPosition);
  if (target) {
    const name = enemyCombatProfiles[target.type]?.name || target.type;
    const defenses = [target.shield > 0 && `${Math.ceil(target.shield)} shield`, target.armor > 0 && `${Math.ceil(target.armor)} armor`].filter(Boolean);
    const effects = [[target.burn,'Burning'],[target.poison,'Poisoned'],[target.slow,'Slowed'],[target.stun,'Stunned'],[target.armorBreak,'Armor broken']].filter(([duration]) => duration > 0).map(([,label]) => label);
    return `Current target · ${name} — ${targetPriorityInfo[tower.targetMode || 'First']}.${defenses.length ? ` Defenses: ${defenses.join(', ')}.` : ''}${effects.length ? ` Effects: ${effects.join(', ')}.` : ''}`;
  }
  if (inRange.length) {
    const names = [...new Set(inRange.map(enemy => enemy.flying ? 'air enemies' : 'ground enemies'))].join(' and ');
    return `Unavailable target · ${names} are in range, but this defender cannot hit them.`;
  }
  if (enemies.length) return `No target in range · ${enemies.length} ${enemies.length === 1 ? 'enemy' : 'enemies'} beyond ${formatMapUnits(range)}.`;
  return isRunning ? 'No target in range · waiting for an enemy.' : 'No current target · start a wave to preview targets.';
}

export function buildTowerInspectorModel({ selectedTower, towers = [], challenge, challengeRules = [], linked, cash, wave, gameTime, terrain = 'ground', tutorialActive = false, tutorialTask = 0, tutorialTowerId = null, onChooseBranch }) {
  if (!selectedTower) return { empty: true };

  const def = towersDef[selectedTower.type], level = selectedTower.level, branch = selectedTower.branch;
  if (def.supportStructure) {
    const trapCount = selectedTower.type === 'compostTrap' ? (selectedTower.compostTriggeredIds || []).length : 0;
    const connectedPair = selectedTower.type === 'pollinatorRelay' && towers.some(a => a.type === 'gust' && towers.some(b => b.type === 'thorn' &&
      Math.hypot(a.x - b.x, a.y - b.y) >= 132 && Math.hypot(a.x - b.x, a.y - b.y) < 160 &&
      Math.hypot(a.x - selectedTower.x, a.y - selectedTower.y) <= 88 && Math.hypot(b.x - selectedTower.x, b.y - selectedTower.y) <= 88));
    const details = selectedTower.type === 'pollenBeacon'
      ? 'Up to 3 Sprout, Puff, Thorn, Kite, Ember, or Briar attackers within 142 units get a 12% shorter attack interval (×0.88). Dew Bells and support structures are ineligible. A tower receives one Beacon buff at most; 48-unit footprint.'
      : selectedTower.type === 'compostTrap'
        ? `${Math.max(0, def.triggerLimit - trapCount)} of ${def.triggerLimit} triggers remain. Each trap slows a unique ground pest within ${def.range} units for ${def.slowDuration}s; each pest can trigger only one Compost Trap. Footprint ${def.footprint}.`
        : `Windcarved Thorns extends from 132 to <160 units when this Relay is within 88 units of both partners. Only one Relay counts per pair; footprint 38.${connectedPair ? ' Pair currently connected.' : ' No pair currently connected.'}`;
    return {
      empty:false, portrait:towerArtSvg(selectedTower.type), name:def.name,
      levelLabel:'SUPPORT STRUCTURE · FIXED',
      upgradeDescription:details, range:formatMapUnits(def.range),
      impact:selectedTower.type === 'compostTrap' ? `${Math.max(0,3-trapCount)} triggers remain` : 'No direct damage',
      interval:'Support effect · no attack cycle', targets:'Support only · cannot target or attack', effects:`${details} · ${terrainBonusForTower(terrain,selectedTower.type)}`,
      investment:`${selectedTower.invested || def.cost} invested · sell returns ${saleRefund(selectedTower.invested || def.cost, def.cost)}`,
      showBranches:false, branchOptions:null, selectedBranch:null, onChooseBranch,
      upgradeText:'NO UPGRADES', upgradeTitle:`${def.name} has a fixed support effect.`, upgradeDisabled:true,
      contextUpgradeText:'No upgrades', targetMode:selectedTower.targetMode || 'First', targetModeDisabled:true,
      abilityInfo:details, contextTitle:def.name
    };
  }
  const stats = applyBeaconInterval(getEffectiveTowerStats(selectedTower, { challenge, challengeRules, linked, terrain }, def), selectedTower, towers);
  const chosenBranch = level === 1 ? selectedTower.branchChoice : branch;
  const hasBranchChoice = chosenBranch != null;
  const quote = towerUpgradeQuote(selectedTower, def);
  const cost = level === 3 || !hasBranchChoice ? 0 : quote.cost;
  const shortage = Math.max(0, cost - cash);
  const investment = quote.investment;
  const remaining = Math.max(0, (selectedTower.abilityReadyAt || 0) - gameTime);
  const usedThisWave = selectedTower.type === 'sunflower' && selectedTower.abilityUsedWave === wave;
  const effect = def.income
    ? `Income +${stats.income} petals per wave.`
    : [
      stats.slow > 0 && `slows for ${stats.slow.toFixed(2)}s`,
      stats.stun > 0 && `stuns for ${stats.stun.toFixed(2)}s`,
      stats.push > 0 && `pushes ${formatMapUnits(stats.push)}`,
      stats.poison > 0 && `poisons ${stats.poison.toFixed(2)}s · ${stats.poisonDamage} damage/tick (first ${DOT_TICK_RULES.poison.first}s, then every ${DOT_TICK_RULES.poison.interval}s)`,
      stats.burn > 0 && `burns ${stats.burn.toFixed(2)}s · ${stats.burnDamage} damage/tick (first ${DOT_TICK_RULES.burn.first}s, then every ${DOT_TICK_RULES.burn.interval}s)`,
      stats.armorBreak > 0 && `breaks armor for ${stats.armorBreak}s`,
      stats.splash > 0 && `splash radius ${formatMapUnits(stats.splash)}`,
      stats.splitTargets > 0 && `splits to ${stats.splitTargets} nearby pests within ${formatMapUnits(stats.splitRadius)} for ${stats.splitDamage.toFixed(2)} damage`,
      stats.pierce && 'pierces armor'
    ].filter(Boolean).join(' · ') || 'Direct seed damage.';

  let branchOptions = null;
  if (level === 1) {
    const base = applyBeaconInterval(getEffectiveTowerStats({ ...selectedTower, level: 1, branch: undefined }, { challenge, challengeRules, linked, terrain }, def), selectedTower, towers);
    branchOptions = def.branches.map(([name, description, branchCost], index) => {
      const next = applyBeaconInterval(getEffectiveTowerStats({ ...selectedTower, level: 2, branch: index }, { challenge, challengeRules, linked, terrain }, def), selectedTower, towers);
      const changes = describeTowerStatChanges(base, next);
      return {
        name, description, cost: branchCost,
        changes: changes.join(' · ') || 'No numeric stat change',
        abilityText: `${def.ability} remains unchanged`,
        title: `${description} · ${branchCost} petals`
      };
    });
  }

  const payback = def.income && stats.income > 0 ? Math.ceil(investment / stats.income) : 0;
  const pairing = combinationStatuses(selectedTower, towers);
  return {
    empty: false,
    portrait: towerArtSvg(selectedTower.type, level, branch ?? selectedTower.branchChoice),
    name: def.name,
    levelLabel: `LEVEL ${level} · ${branch !== null ? def.branches[branch][0] : selectedTower.branchChoice != null ? `${def.branches[selectedTower.branchChoice][0]} selected` : 'Base · choose a branch'}`,
    upgradeDescription: level === 1 ? 'Choose a branch to preview its stats. Upgrades do not change the active ability.' : level === 2 ? `${def.branches[branch][1]} · the active ability remains unchanged.` : 'Fully grown · branch bonus active; active ability unchanged.',
    range: formatMapUnits(stats.range),
    impact: def.income ? `+${stats.income} petals / wave` : `${stats.damage} damage / hit`,
    interval: def.income ? 'Economy defender' : `Every ${stats.rate.toFixed(2)} seconds`,
    targets: `${def.income ? `Golden Seeds radius · ${stats.allyLinkRadius} map units` : def.antiAir ? 'Ground + air' : 'Ground only'}${pairing ? ` · ${pairing}` : ''}`,
    effects: `${effect} · ${terrainBonusForTower(terrain,selectedTower.type)}`,
    investment: `${investment} invested · sell returns ${saleRefund(investment, def.cost)}${payback ? ` · simple payback ${payback} cleared ${payback === 1 ? 'wave' : 'waves'} at +${stats.income}/wave` : ''}`,
    showBranches: level === 1,
    branchOptions,
    selectedBranch: selectedTower.branchChoice,
    onChooseBranch,
    upgradeText: level === 3 ? 'MAX LEVEL' : level === 1 && !hasBranchChoice ? 'Choose branch' : `Upgrade · ${cost} ✿`,
    upgradeTitle: level === 3 ? 'This defender is fully upgraded.' : !hasBranchChoice ? 'Choose a branch to preview its upgrade.' : `${def.branches[chosenBranch][0]}: ${def.branches[chosenBranch][1]}. Upgrade cost: ${cost} petals${shortage ? ` · Need ${shortage} more` : ''}.`,
    upgradeDisabled: level >= 3 || (level === 1 && !hasBranchChoice) || cash < cost || (tutorialActive && (tutorialTask !== 3 || selectedTower.id !== tutorialTowerId)),
    contextUpgradeText: level === 3 ? 'Max level' : !hasBranchChoice ? 'Choose branch' : `Upgrade · ${cost} ✿`,
    targetMode: selectedTower.targetMode || 'First',
    targetModeDisabled: Boolean(def.income) || (tutorialActive && (tutorialTask !== 2 || selectedTower.id !== tutorialTowerId)),
    abilityInfo: `${def.ability} · ${usedThisWave ? 'used this wave' : remaining > 0 ? `ready in ${Math.ceil(remaining)}s` : 'ready when combat allows'}`,
    contextTitle: `${def.name} · Lv ${level}`
  };
}
