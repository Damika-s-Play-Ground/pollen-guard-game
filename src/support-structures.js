import { applyCombatHit } from './combat-rules.js';
import { towersDef } from './game-data.js';
import { getEffectiveTowerStats } from './game-core.js';

export function assignPollenBeaconBuffs(towers, researchLoadout=[],relicLoadout=[]) {
  const beacons = towers.filter(tower => tower.type === 'pollenBeacon').sort((a, b) => a.id - b.id);
  const attackers = towers.filter(tower => ['sprout', 'puff', 'thorn', 'gust', 'ember', 'briar'].includes(tower.type)).sort((a, b) => a.id - b.id);
  const assignments = new Map();
  for (const tower of attackers) {
    const nearby = beacons.filter(beacon => Math.hypot(beacon.x - tower.x, beacon.y - tower.y) < getEffectiveTowerStats(beacon,{researchLoadout,relicLoadout},towersDef.pollenBeacon).range)
      .sort((a, b) => Math.hypot(a.x - tower.x, a.y - tower.y) - Math.hypot(b.x - tower.x, b.y - tower.y) || a.id - b.id);
    const beacon = nearby.find(candidate => (assignments.get(candidate.id)?.length || 0) < towersDef.pollenBeacon.buffCap);
    if (!beacon) continue;
    assignments.set(beacon.id, [...(assignments.get(beacon.id) || []), tower.id]);
  }
  return new Set([...assignments.values()].flat());
}

export function triggerCompostTraps(towers, enemies, positionOf, researchLoadout=[]) {
  const triggered = [];
  const traps = towers.filter(tower => tower.type === 'compostTrap').sort((a, b) => a.id - b.id);
  for (const trap of traps) {
    trap.compostTriggeredIds ||= [];
    const definition = towersDef.compostTrap;
    const researched=researchLoadout.includes('compost-lattice');
    if (trap.compostTriggeredIds.length >= definition.triggerLimit-(researched?1:0)) continue;
    const candidates = enemies.filter(enemy => !enemy.flying && !enemy.burrowTimer && !enemy.compostTrapTriggered && enemy.hp > 0 &&
      Math.hypot(trap.x - positionOf(enemy).x, trap.y - positionOf(enemy).y) <= definition.range+(researched?12:0))
      .sort((a, b) => b.progress - a.progress || a.id - b.id);
    const target = candidates[0];
    if (!target) continue;
    applyCombatHit(target, 0, { slow: definition.slowDuration, sourceTowerId: trap.id, sourceTowerType: trap.type });
    target.compostTrapTriggered = true;
    trap.compostTriggeredIds.push(target.id);
    triggered.push({ trap, enemy: target });
  }
  return triggered;
}
