// Shared combat contract. Shields absorb every channel before resistance or armor;
// physical damage alone is reduced by armor. Statuses refresh to the longer
// duration and do not stack. Bosses resist control (slow/stun/push), not damage.
export const DAMAGE_CHANNELS = Object.freeze(['physical', 'heat', 'toxin']);
export const DOT_TICK_RULES = Object.freeze({
  burn: Object.freeze({ first: 0.35, interval: 0.45 }),
  poison: Object.freeze({ first: 0.45, interval: 0.55 })
});
export const COMBAT_RULES = Object.freeze({
  shield: 'Absorbs physical, heat, and toxin damage before other defenses.',
  armor: 'Reduces physical damage after shields; armor break and pierce bypass it.',
  resistance: 'Each damage channel uses its target multiplier: below 1 reduces damage, above 1 increases it; 1 is normal.',
  status: 'Flying targets ignore slow. Repeated statuses refresh to the longer duration; they do not stack.',
  bossControl: 'Bosses receive 35% of slow and stun duration, and 35% push distance.',
  air: 'Air targets require an anti-air attack, except for global meadow spells.'
});
export const COMBAT_INTERACTION_MATRIX = Object.freeze([
  Object.freeze({ rule:'Physical damage', shield:'Absorbs first', armor:'Reduced after shields; pierce or active armor break bypasses', resistance:'Physical multiplier' }),
  Object.freeze({ rule:'Heat damage', shield:'Absorbs first', armor:'Ignored', resistance:'Heat multiplier' }),
  Object.freeze({ rule:'Toxin damage', shield:'Absorbs first', armor:'Ignored', resistance:'Toxin multiplier' }),
  Object.freeze({ rule:'Air targeting', shield:'—', armor:'—', resistance:'Requires anti-air; global meadow spells can hit air' }),
  Object.freeze({ rule:'Statuses', shield:'Can apply through shields', armor:'—', resistance:'Refresh to longer duration; immunity blocks; flying ignores slow; bosses get 35% slow/stun duration and push distance' })
]);

export function canHitTarget(attack = {}, target = {}) {
  return !target.burrowTimer && (!target.flying || Boolean(attack.canHitAir));
}

export function filterEligibleTargets(targets, attack = {}) {
  return targets.filter(target => canHitTarget(attack, target));
}

export function assignEnemyCombatProfile(enemy, profile = {}) {
  enemy.resistances = { ...(profile.resistances || {}) };
  enemy.statusImmunities = [...(profile.statusImmunities || [])];
  enemy.statusResistances = { ...(profile.statusResistances || {}) };
  return enemy;
}

export function resolveDamage(target, amount, { channel = 'physical', pierce = false, armorBreak = false } = {}) {
  if (!DAMAGE_CHANNELS.includes(channel) || !Number.isFinite(amount) || amount <= 0) {
    return { hp: target.hp, shield: target.shield || 0, dealt: 0, absorbed: 0 };
  }
  let remaining = amount;
  const shield = Math.max(0, target.shield || 0);
  const absorbed = Math.min(shield, remaining);
  remaining -= absorbed;
  let damage = remaining * (target.resistances?.[channel] ?? 1);
  if (channel === 'physical' && !pierce && !armorBreak && (target.armorBreak || 0) <= 0) {
    damage = Math.max(0, damage - Math.max(0, target.armor || 0));
  }
  const dealt = Math.min(Math.max(0, target.hp), damage);
  return { hp: Math.max(0, target.hp - damage), shield: shield - absorbed, dealt, absorbed };
}

export function applyCombatHit(target, amount, attack = {}) {
  if (!canHitTarget(attack, target)) return { hit: false, dealt: 0, absorbed: 0 };
  const result = resolveDamage(target, amount, attack);
  target.hp = result.hp;
  target.shield = result.shield;
  const controlScale = target.boss ? 0.35 : 1;
  const statusDuration = (name, duration) => target.statusImmunities?.includes(name)
    ? 0
    : duration * (target.statusResistances?.[name] ?? 1) * (['slow', 'stun', 'push'].includes(name) ? controlScale : 1);
  if (attack.slow && !target.flying) { const duration = statusDuration('slow', attack.slow); if (duration > (target.slow || 0)) { target.slowSourceTowerId = attack.sourceTowerId; target.slowSourceTowerType = attack.sourceTowerType; } target.slow = Math.max(target.slow || 0, duration); }
  if (attack.stun) { const duration = statusDuration('stun', attack.stun); if (duration > (target.stun || 0)) { target.stunSourceTowerId = attack.sourceTowerId; target.stunSourceTowerType = attack.sourceTowerType; } target.stun = Math.max(target.stun || 0, duration); }
  if (attack.push) target.push = Math.max(target.push || 0, statusDuration('push', attack.push));
  if (attack.burn && statusDuration('burn', attack.burn) > 0) {
    const wasActive = target.burn > 0, previousTick = target.burnTick;
    const duration = statusDuration('burn', attack.burn); if (duration > target.burn) { target.burnSourceTowerId = attack.sourceTowerId; target.burnSourceTowerType = attack.sourceTowerType; }
    target.burn = Math.max(target.burn || 0, duration);
    target.burnDamage = wasActive ? Math.max(target.burnDamage || 0, attack.burnDamage || 1) : (attack.burnDamage || 1);
    target.burnTick = wasActive
      ? Math.min(Number.isFinite(previousTick) ? previousTick : DOT_TICK_RULES.burn.interval, DOT_TICK_RULES.burn.interval)
      : DOT_TICK_RULES.burn.first;
  }
  if (attack.poison && statusDuration('poison', attack.poison) > 0) {
    const wasActive = target.poison > 0, previousTick = target.poisonTick;
    const duration = statusDuration('poison', attack.poison); if (duration > target.poison) { target.poisonSourceTowerId = attack.sourceTowerId; target.poisonSourceTowerType = attack.sourceTowerType; }
    target.poison = Math.max(target.poison || 0, duration);
    target.poisonDamage = wasActive ? Math.max(target.poisonDamage || 0, attack.poisonDamage || 1) : (attack.poisonDamage || 1);
    target.poisonTick = wasActive
      ? Math.min(Number.isFinite(previousTick) ? previousTick : DOT_TICK_RULES.poison.interval, DOT_TICK_RULES.poison.interval)
      : DOT_TICK_RULES.poison.first;
  }
  if (attack.armorBreak) target.armorBreak = Math.max(target.armorBreak || 0, statusDuration('armorBreak', attack.armorBreak));
  return { hit: true, dealt: result.dealt, absorbed: result.absorbed };
}

export function tickEnemyStatuses(target, dt) {
  target.slow = Math.max(0, (target.slow || 0) - dt);
  target.stun = Math.max(0, (target.stun || 0) - dt);
  target.armorBreak = Math.max(0, (target.armorBreak || 0) - dt);
  const damage = [];
  for (const [durationKey, tickKey, damageKey, channel, rules] of [
    ['burn', 'burnTick', 'burnDamage', 'heat', DOT_TICK_RULES.burn],
    ['poison', 'poisonTick', 'poisonDamage', 'toxin', DOT_TICK_RULES.poison]
  ]) {
    if (target[durationKey] <= 0) continue;
    target[durationKey] = Math.max(0, target[durationKey] - dt);
    target[tickKey] -= dt;
    while (target[tickKey] <= 0 && target[durationKey] > 0) {
      const result = resolveDamage(target, target[damageKey] || 1, { channel });
      target.hp = result.hp;
      target.shield = result.shield;
      target[tickKey] += rules.interval;
      damage.push({ channel, sourceTowerId:target[`${durationKey}SourceTowerId`], sourceTowerType:target[`${durationKey}SourceTowerType`], ...result });
    }
  }
  return damage;
}
