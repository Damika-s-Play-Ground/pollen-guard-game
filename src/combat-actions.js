import { applyCombatHit, filterEligibleTargets } from './combat-rules.js';

export const TOWER_ABILITY_COOLDOWN_SECONDS = 18;

function withinRadius(targets, center, radius, positionOf) {
  return targets.filter(target => {
    const position = positionOf(target);
    return Math.hypot(position.x - center.x, position.y - center.y) <= radius;
  });
}

export function resolveProjectileImpact(shot, enemies, positionOf) {
  const targets = shot.splash > 0
    ? withinRadius(enemies, positionOf(shot.target), shot.splash, positionOf)
    : [shot.target];
  const affected = filterEligibleTargets(targets, shot);
  const results = affected.map(enemy => ({ enemy, ...applyCombatHit(enemy, shot.damage, shot) }));
  const splitTargets = shot.splitTargets > 0 && shot.splitRadius > 0 && shot.splitDamage > 0
    ? filterEligibleTargets(enemies.filter(enemy => !affected.includes(enemy) &&
      Math.hypot(positionOf(enemy).x - positionOf(shot.target).x, positionOf(enemy).y - positionOf(shot.target).y) <= shot.splitRadius), shot)
      .sort((a, b) => {
        const origin = positionOf(shot.target), pa = positionOf(a), pb = positionOf(b);
        return Math.hypot(pa.x - origin.x, pa.y - origin.y) - Math.hypot(pb.x - origin.x, pb.y - origin.y) || a.id - b.id;
      }).slice(0, shot.splitTargets)
    : [];
  return {
    affected, splitTargets,
    defeated: results.filter(result => result.enemy.hp <= 0).map(result => result.enemy),
    results
  };
}

export function towerAbilityTargets(tower, enemies, def, positionOf) {
  if (tower.type === 'sunflower') return [];
  const center = { x: tower.x, y: tower.y };
  const eligible = filterEligibleTargets(enemies, { canHitAir: !!def.antiAir });
  const nearby = withinRadius(eligible, center, (def.range || 120) * 1.3, positionOf);
  return tower.type === 'sprout' ? nearby.slice(0, 3) : nearby;
}

export function resolveTowerAbility(tower, enemies, def, positionOf, trackAttribution = true) {
  if (tower.type === 'sunflower') return { affected: [], defeated: [], cashDelta: 35, message: 'Golden harvest: +35 petals!' };
  const sources = {
    sprout: { amount: 6, options: { pierce: true } },
    dew: { amount: 0, options: { slow: 3.5 } },
    puff: { amount: 9, options: { stun: 0.9 } },
    thorn: { amount: 7, options: { pierce: true, armorBreak: 5 } },
    gust: { amount: 0, options: { push: 75, stun: 0.7 } },
    ember: { amount: 4, options: { channel: 'heat', burn: 5, burnDamage: 2 } },
    briar: { amount: 3, options: { channel: 'toxin', poison: 6, poisonDamage: 1, slow: 1.5 } }
  };
  const source = sources[tower.type];
  if (!source) return { affected: [], defeated: [], cashDelta: 0, message: '' };
  const attack = { ...source.options, canHitAir: !!def.antiAir,
    ...(trackAttribution ? { sourceTowerId:tower.id, sourceTowerType:tower.type } : {}) };
  const selected = towerAbilityTargets(tower, enemies, def, positionOf);
  const results = selected.map(enemy => ({ enemy, ...applyCombatHit(enemy, source.amount, attack) }));
  const messages = {
    sprout: 'Seed burst!', dew: 'Dew wave slowed the trail.', puff: 'Mushroom burst!',
    thorn: 'Armor cracked!', gust: 'Tailwind pushed the swarm back.',
    ember: 'Firefly flare!', briar: 'Roots snared the swarm.'
  };
  return {
    affected: selected,
    defeated: results.filter(result => result.enemy.hp <= 0).map(result => result.enemy),
    results,
    cashDelta: 0,
    message: messages[tower.type]
  };
}

export function resolveGlobalCombatAbility(name, enemies) {
  const effects = name === 'bloom'
    ? { amount: 7, attack: { slow: 1.8, canHitAir: true } }
    : name === 'snare'
      ? { amount: 0, attack: { stun: 1.7, canHitAir: true } }
      : null;
  if (!effects) return { affected: [], defeated: [], cashDelta: 0 };
  const affected = filterEligibleTargets(enemies, effects.attack);
  const results = affected.map(enemy => ({ enemy, ...applyCombatHit(enemy, effects.amount, effects.attack) }));
  return {
    affected,
    defeated: results.filter(result => result.enemy.hp <= 0).map(result => result.enemy),
    results,
    cashDelta: 0
  };
}
