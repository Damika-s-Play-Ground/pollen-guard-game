import { getEffectiveTowerStats, towersAreLinked } from './game-core.js';
import { towersDef, enemyCombatProfiles } from './game-data.js';
import { assignEnemyCombatProfile, canHitTarget, DOT_TICK_RULES, tickEnemyStatuses } from './combat-rules.js';
import { resolveProjectileImpact } from './combat-actions.js';
import { chooseTargetForTower } from './targeting.js';
import { recordCombatControl, recordCombatDamage, recordEnemyDefeat, recordEnemyLeak, recordTowerIncome } from './combat-performance.js';
import { advanceBossEncounter, BOSS_VARIANTS, bossLeakCost } from './boss-encounters.js';
import { combinationForPair } from './tower-combinations.js';
import { assignPollenBeaconBuffs, triggerCompostTraps } from './support-structures.js';
import { terrainZoneAt } from './terrain.js';
import { advanceDroppedSeeds, claimSeedForCarrier, dropCarriedSeed, escapeCarriedSeed } from './seed-objective.js';

export const ENEMY_LEAK_COST = 1;

const ENEMY_DEFS = {
  mite: wave => ({ hp: 2 + Math.floor(wave * .4), speed: 47 + wave, radius: 9, color: '#df8a6d', reward: 2, armor: 0 }),
  zip: wave => ({ hp: 2 + Math.floor(wave * .25), speed: 82 + wave, radius: 7, color: '#e2c357', reward: 3, armor: 0 }),
  armored: wave => ({ hp: 9 + wave * 1.5, speed: 27 + wave * .45, radius: 12, color: '#7966b3', reward: 6, armor: 2 }),
  shield: wave => ({ hp: 6 + wave, shield: 6 + wave, speed: 37 + wave * .5, radius: 11, color: '#60a7b6', reward: 5, armor: 0 }),
  splitter: wave => ({ hp: 8 + wave, speed: 33 + wave * .5, radius: 12, color: '#78a451', reward: 5, armor: 0 }),
  flyer: wave => ({ hp: 5 + wave, speed: 58 + wave * .65, radius: 9, color: '#eaa3ca', reward: 6, armor: 0, flying: true }),
  crumb: wave => ({ hp: 2 + Math.floor(wave * .2), speed: 64 + wave, radius: 6, color: '#9cba67', reward: 1, armor: 0 }),
  boss: wave => ({ hp: 70 + wave * 13, speed: 20 + wave * .2, radius: 20, color: '#794c86', reward: 35, armor: 2, boss: true }),
  healer: wave => ({ hp: 7 + wave, speed: 31 + wave * .35, radius: 10, color: '#a98b68', reward: 5, armor: 0,
    healerCharges:3, healerCooldown:.6, healerTelegraphTimer:0 }),
  carrier: wave => ({ hp: 9 + wave, speed: 28 + wave * .3, radius: 12, color: '#5d9e9a', reward: 6, armor: 0,
    carrierCharges:2, carrierCooldown:.8, carrierTelegraphTimer:0 }),
  burrower: wave => ({ hp: 8 + wave, speed: 38 + wave * .55, radius: 10, color: '#987b51', reward: 5, armor: 0,
    burrowCooldown:1.4, burrowTelegraphTimer:0, burrowTimer:0 })
};

export function createEnemy(type, wave, id, lane = 'ground', telegraph = '', encounter = {}) {
  const definition = (ENEMY_DEFS[type] || ENEMY_DEFS.mite)(wave);
  const enemy = assignEnemyCombatProfile({
    id, type, lane, telegraph, progress: 0, maxHp: definition.hp, hp: definition.hp,
    shield: definition.shield || 0, speed: definition.speed, radius: definition.radius,
    color: definition.color, reward: definition.reward, armor: definition.armor || 0,
    flying: Boolean(definition.flying), boss: Boolean(definition.boss), slow: 0, stun: 0,
    ...(type === 'healer' ? { healerCharges:definition.healerCharges, healerCooldown:definition.healerCooldown,
      healerTelegraphTimer:definition.healerTelegraphTimer } : {}),
    ...(type === 'carrier' ? { carrierCharges:definition.carrierCharges, carrierCooldown:definition.carrierCooldown,
      carrierTelegraphTimer:definition.carrierTelegraphTimer } : {}),
    ...(type === 'burrower' ? { burrowCooldown:definition.burrowCooldown, burrowTelegraphTimer:definition.burrowTelegraphTimer,
      burrowTimer:definition.burrowTimer } : {}),
    ...(encounter.seedCarrier ? {seedCarrier:true,returning:false,carryingSeedId:null} : {}),
    push: 0, burn: 0, burnTick: DOT_TICK_RULES.burn.first, burnDamage: 1, poison: 0,
    poisonTick: DOT_TICK_RULES.poison.first, poisonDamage: 1, armorBreak: 0
  }, enemyCombatProfiles[type] || enemyCombatProfiles.mite);
  if (definition.boss && encounter.scheduleVersion >= 2) {
    const bossVariant = Object.hasOwn(BOSS_VARIANTS, encounter.mapId) ? encounter.mapId : 'meadow';
    const boss = Object.assign(enemy, {
      bossVariant, bossName:BOSS_VARIANTS[bossVariant].name,
      bossPhase: 0, bossTelegraph: '', bossTelegraphTimer: 0, bossRushTimer: 0
    });
    boss.color = BOSS_VARIANTS[bossVariant].color;
    return boss;
  }
  return enemy;
}

function removeDefeated(state, enemy, positionOf) {
  const index = state.enemies.indexOf(enemy);
  if (index < 0) return false;
  state.enemies.splice(index, 1);
  state.cash += enemy.reward;
  state.popped++;
  state.bloomCharge = Math.min(100, state.bloomCharge + 8);
  recordEnemyDefeat(state.performance, enemy);
  if(enemy.carryingSeedId!==null&&enemy.carryingSeedId!==undefined){
    const point=positionOf?.(enemy)??{x:0,y:0};
    dropCarriedSeed(state.seedObjective,enemy.carryingSeedId,enemy.id,point);
    enemy.carryingSeedId=null;enemy.returning=false;
  }
  if (enemy.type === 'splitter') {
    for (let count = 0; count < 2; count++) {
      const crumb = createEnemy('crumb', state.wave, state.nextEntityId++);
      crumb.progress = enemy.progress;
      state.enemies.push(crumb);
    }
  }
  return true;
}

function tickTower(tower, state, dt, positionOf, hooks = {}, pollenBeaconBuffedIds = new Set()) {
  const def = towersDef[tower.type];
  if (!def || def.income || def.supportStructure) return;
  tower.cooldown = Math.max(0, tower.cooldown - dt);
  if (tower.cooldown > 0) return;
  const linkedCombinations = state.towers
    .filter(other => other !== tower && towersAreLinked(tower, other, towersDef, state.towers,state.researchLoadout??[]))
    .map(other => combinationForPair(tower, other));
  const hasGoldenSeeds = linkedCombinations.some(combination => combination?.id === 'golden-seeds');
  const terrain=state.terrainRulesVersion>=1?terrainZoneAt(state.selectedMap,tower):'ground';
  const stats = getEffectiveTowerStats(tower, { challenge: state.challenge, challengeRules:state.challengeRules, linked: hasGoldenSeeds, terrain, researchLoadout:state.researchLoadout??[] }, def);
  if (pollenBeaconBuffedIds.has(tower.id)) stats.rate *= state.researchLoadout?.includes('beacon-network') ? .91 : towersDef.pollenBeacon.buffMultiplier;
  const rejuvenationField=state.rejuvenationField;
  if (rejuvenationField?.duration>0 && Math.hypot(tower.x-rejuvenationField.x,tower.y-rejuvenationField.y)<=78) stats.rate*=.85;
  const candidates = state.enemies.filter(enemy => canHitTarget({ canHitAir: def.antiAir }, enemy) &&
    Math.hypot(tower.x - positionOf(enemy).x, tower.y - positionOf(enemy).y) <= stats.range);
  if (!candidates.length) return;
  const target = chooseTargetForTower(tower, candidates, positionOf);
  tower.cooldown = stats.rate;
  const steamBurst = tower.type === 'ember' ? linkedCombinations.find(combination => combination?.id === 'steam-burst') : null;
  const frostedSeeds = tower.type === 'sprout' ? linkedCombinations.find(combination => combination?.id === 'frosted-seeds') : null;
  const sporecap = tower.type === 'puff' ? linkedCombinations.find(combination => combination?.id === 'sporecap') : null;
  const cycloneCap = tower.type === 'puff' ? linkedCombinations.find(combination => combination?.id === 'cyclone-cap') : null;
  const windcarvedThorns = tower.type === 'thorn' ? linkedCombinations.find(combination => combination?.id === 'windcarved-thorns') : null;
  const shot = {
    id: state.nextEntityId++, x: tower.x, y: tower.y, target, targetId: target.id,
    ...(state.trackAttribution === false ? {} : { sourceTowerId: tower.id, sourceTowerType: tower.type }),
    damage: stats.damage, splitTargets:stats.splitTargets, splitRadius:stats.splitRadius, splitDamage:stats.splitDamage,
    channel: tower.type === 'ember' ? 'heat' : tower.type === 'briar' ? 'toxin' : 'physical',
    canHitAir: Boolean(def.antiAir), speed: tower.type === 'puff' ? 265 : 440, color: def.color,
    r: tower.type === 'puff' ? 5 : 3, splash: steamBurst?.splashRadius ?? stats.splash,
    slow: steamBurst?.slowDuration ?? frostedSeeds?.slowDuration ?? stats.slow,
    stun: stats.stun, push: cycloneCap?.pushDistance ?? windcarvedThorns?.pushDistance ?? stats.push, poison: sporecap?.poisonDuration ?? stats.poison,
    poisonDamage: sporecap?.poisonDamage ?? stats.poisonDamage,
    burn: stats.burn, burnDamage: stats.burnDamage, pierce: stats.pierce, armorBreak: stats.armorBreak
  };
  state.shots.push(shot);
  hooks.onShot?.(shot);
}

function defeat(state, enemy, hooks, positionOf) {
  if (!removeDefeated(state, enemy, positionOf)) return;
  hooks.onDefeat?.(enemy);
}

function tickHealerSupport(enemy, enemies, dt, positionOf) {
  if (enemy.healerCharges <= 0) return;
  if (enemy.healerTelegraphTimer > 0) {
    enemy.healerTelegraphTimer = Math.max(0, enemy.healerTelegraphTimer - dt);
    if (enemy.healerTelegraphTimer > 0) return;
    const origin = positionOf(enemy);
    const target = enemies.filter(other => other !== enemy && other.hp > 0 && other.type !== 'healer' && other.hp < other.maxHp &&
      Math.hypot(positionOf(other).x - origin.x, positionOf(other).y - origin.y) <= 84)
      .sort((a,b) => (b.maxHp - b.hp) - (a.maxHp - a.hp) || a.id - b.id)[0];
    if (!target) { enemy.healerCooldown = .25; return; }
    target.hp = Math.min(target.maxHp, target.hp + 5);
    target.supportFlash = .45;
    enemy.healerCharges--;
    enemy.healerCooldown = enemy.healerCharges ? 2.6 : 0;
    return;
  }
  enemy.healerCooldown = Math.max(0, enemy.healerCooldown - dt);
  if (enemy.healerCooldown > 0) return;
  const origin = positionOf(enemy);
  if (enemies.some(other => other !== enemy && other.hp > 0 && other.type !== 'healer' && other.hp < other.maxHp &&
      Math.hypot(positionOf(other).x - origin.x, positionOf(other).y - origin.y) <= 84)) enemy.healerTelegraphTimer = .75;
}

function tickCarrierSupport(enemy, enemies, dt, positionOf) {
  if (enemy.carrierCharges <= 0) return;
  const eligible = () => enemies.filter(other => other !== enemy && other.hp > 0 && !other.boss &&
    !['shield', 'carrier'].includes(other.type) && Math.hypot(positionOf(other).x - positionOf(enemy).x, positionOf(other).y - positionOf(enemy).y) <= 78)
    .sort((a,b) => Math.hypot(positionOf(a).x - positionOf(enemy).x, positionOf(a).y - positionOf(enemy).y) -
      Math.hypot(positionOf(b).x - positionOf(enemy).x, positionOf(b).y - positionOf(enemy).y) || a.id - b.id).slice(0,2);
  if (enemy.carrierTelegraphTimer > 0) {
    enemy.carrierTelegraphTimer = Math.max(0, enemy.carrierTelegraphTimer - dt);
    if (enemy.carrierTelegraphTimer > 0) return;
    const targets = eligible();
    if (!targets.length) { enemy.carrierCooldown = .25; return; }
    for (const target of targets) {
      target.shield = (target.shield || 0) + 4;
      target.wardFlash = .45;
    }
    enemy.carrierCharges--;
    enemy.carrierCooldown = enemy.carrierCharges ? 2.8 : 0;
    return;
  }
  enemy.carrierCooldown = Math.max(0, enemy.carrierCooldown - dt);
  if (enemy.carrierCooldown <= 0 && eligible().length) enemy.carrierTelegraphTimer = .75;
}

function tickBurrower(enemy, dt) {
  if (enemy.burrowTimer > 0) {
    enemy.burrowTimer = Math.max(0, enemy.burrowTimer - dt);
    if (enemy.burrowTimer === 0) enemy.burrowCooldown = 2.5;
    return;
  }
  if (enemy.burrowTelegraphTimer > 0) {
    enemy.burrowTelegraphTimer = Math.max(0, enemy.burrowTelegraphTimer - dt);
    if (enemy.burrowTelegraphTimer === 0) enemy.burrowTimer = .85;
    return;
  }
  enemy.burrowCooldown = Math.max(0, enemy.burrowCooldown - dt);
  if (enemy.burrowCooldown === 0) enemy.burrowTelegraphTimer = .5;
}

// Mutates only the supplied gameplay state. Hooks are cosmetic/UI notifications;
// all combat, spawning, rewards, leaks, and wave-clear decisions stay deterministic here.
export function stepCombat(state, dt, { pathLength, positionOf, onDefeat, onLeak, onStatusTick, onShot, onImpact } = {}) {
  advanceDroppedSeeds(state.seedObjective,dt);
  const hooks = { onDefeat, onLeak, onStatusTick, onShot, onImpact };
  if (!state.running || state.gameOver) return { defeated: [], leaked: [], waveClear: null, lost: false };
  if (state.rejuvenationField?.duration>0) {
    state.rejuvenationField.duration=Math.max(0,state.rejuvenationField.duration-dt);
    if (state.rejuvenationField.duration===0) state.rejuvenationField=null;
  }
  const defeated = [], leaked = [];
  const bossSummons = [];
  if (state.spawnQueue.length) {
    state.spawnClock -= dt;
    if (state.spawnClock <= 0) {
      const spawn = state.spawnQueue.shift();
      state.enemies.push(createEnemy(typeof spawn === 'string' ? spawn : spawn.type, state.wave, state.nextEntityId++,
        typeof spawn === 'string' ? 'ground' : spawn.lane, typeof spawn === 'string' ? '' : spawn.telegraph,
        { mapId:state.selectedMap, scheduleVersion:state.waveScheduleVersion, seedCarrier:Boolean(spawn.seedCarrier&&state.seedObjective) }));
      state.spawnClock = typeof spawn === 'string' ? .56 : spawn.interval;
    }
  }
  for (const enemy of [...state.enemies]) {
    recordCombatControl(state.performance, enemy.slowSourceTowerId, enemy.slowSourceTowerType, 'slow', Math.min(dt, enemy.slow || 0));
    recordCombatControl(state.performance, enemy.stunSourceTowerId, enemy.stunSourceTowerType, 'stun', Math.min(dt, enemy.stun || 0));
    const statusTicks = tickEnemyStatuses(enemy, dt);
    statusTicks.forEach(tick => recordCombatDamage(state.performance, tick.sourceTowerId, tick.sourceTowerType, enemy, tick));
    if (statusTicks.length) hooks.onStatusTick?.(enemy, statusTicks);
    if (enemy.hp <= 0) { defeat(state, enemy, hooks,positionOf); defeated.push(enemy); continue; }
    if (enemy.type !== 'healer' && enemy.supportFlash > 0) enemy.supportFlash = Math.max(0, enemy.supportFlash - dt);
    if (enemy.type !== 'carrier' && enemy.wardFlash > 0) enemy.wardFlash = Math.max(0, enemy.wardFlash - dt);
    if (enemy.stun > 0) continue;
    if (enemy.type === 'healer') tickHealerSupport(enemy, state.enemies, dt, positionOf);
    if (enemy.type === 'carrier') tickCarrierSupport(enemy, state.enemies, dt, positionOf);
    if (enemy.type === 'burrower') tickBurrower(enemy, dt);
    const bossSpeedFactor = advanceBossEncounter(enemy, { waveScheduleVersion:state.waveScheduleVersion, bossSummons }, dt);
    const factor = (enemy.slow > 0 ? .55 : 1) * (enemy.burrowTimer > 0 ? 1.7 : 1) * bossSpeedFactor;
    const enemyPathLength = typeof pathLength === 'function' ? pathLength(enemy) : pathLength;
    const moveDistance=enemy.speed*factor*dt;
    enemy.progress += enemy.returning ? -moveDistance : moveDistance;
    if (enemy.push > 0) {
      enemy.progress = enemy.returning ? Math.min(enemyPathLength*.52,enemy.progress+enemy.push*dt) : Math.max(0, enemy.progress - enemy.push * dt);
      enemy.push = Math.max(0, enemy.push - enemy.push * dt);
    }
    const pickupDistance=enemyPathLength*.52;
    if(enemy.seedCarrier&&state.seedObjective&&!enemy.returning&&enemy.progress>=pickupDistance){
      const seedId=claimSeedForCarrier(state.seedObjective,enemy.id);
      if(seedId!==null){enemy.progress=pickupDistance;enemy.carryingSeedId=seedId;enemy.returning=true;}
    }
    if(enemy.returning&&enemy.progress<=0&&enemy.carryingSeedId!==null){
      escapeCarriedSeed(state.seedObjective,enemy.carryingSeedId,enemy.id);
    }
    if (enemy.returning ? enemy.progress<=0 : enemy.progress >= enemyPathLength) {
      state.lives = Math.max(0, state.lives - bossLeakCost(enemy, state.waveScheduleVersion));
      const point = positionOf(enemy);
      const covered = state.towers.some(tower => {
        const def = towersDef[tower.type];
        if (!def || def.supportStructure || !canHitTarget({ canHitAir: def.antiAir }, enemy)) return false;
        const hasLink = state.towers.some(other => other !== tower && towersAreLinked(tower, other, towersDef, state.towers,state.researchLoadout??[]));
        const terrain=state.terrainRulesVersion>=1?terrainZoneAt(state.selectedMap,tower):'ground';
        const range = getEffectiveTowerStats(tower, { challenge: state.challenge, challengeRules:state.challengeRules, linked: hasLink, terrain,researchLoadout:state.researchLoadout??[] }, def).range;
        return Math.hypot(tower.x - point.x, tower.y - point.y) <= range;
      });
      recordEnemyLeak(state.performance, enemy, covered);
      state.enemies.splice(state.enemies.indexOf(enemy), 1);
      leaked.push(enemy);
      hooks.onLeak?.(enemy);
      if (state.lives <= 0) {
        state.lives = 0;
        state.gameOver = true;
        state.running = false;
        return { defeated, leaked, waveClear: null, lost: true };
      }
    }
  }
  bossSummons.forEach(summon => {
    const add = createEnemy(summon.type, state.wave, state.nextEntityId++, summon.lane, summon.telegraph);
    add.progress = summon.progress;
    state.enemies.push(add);
  });
  const pollenBeaconBuffedIds = assignPollenBeaconBuffs(state.towers,state.researchLoadout??[]);
  const trapTriggers = triggerCompostTraps(state.towers, state.enemies, positionOf,state.researchLoadout??[]);
  trapTriggers.forEach(({ trap, enemy }) => recordCombatControl(state.performance, trap.id, trap.type, 'slow', Math.min(dt, enemy.slow || 0)));
  state.towers.forEach(tower => tickTower(tower, state, dt, positionOf, hooks, pollenBeaconBuffedIds));
  for (let index = state.shots.length - 1; index >= 0; index--) {
    const shot = state.shots[index];
    if (!state.enemies.includes(shot.target)) { state.shots.splice(index, 1); continue; }
    const target = positionOf(shot.target), dx = target.x - shot.x, dy = target.y - shot.y;
    const distance = Math.hypot(dx, dy), travel = shot.speed * dt;
    if (distance < travel + 5) {
      const impactPosition = positionOf(shot.target);
      const impact = resolveProjectileImpact(shot, state.enemies, positionOf);
      impact.results.forEach(result => recordCombatDamage(state.performance, shot.sourceTowerId, shot.sourceTowerType, result.enemy, result));
      impact.defeated.forEach(enemy => { defeat(state, enemy, hooks,positionOf); defeated.push(enemy); });
      impact.splitTargets.forEach(target => {
        const splitShot={id:state.nextEntityId++,target,targetId:target.id,sourceTowerId:shot.sourceTowerId,sourceTowerType:shot.sourceTowerType,
          x:impactPosition.x,y:impactPosition.y,damage:shot.splitDamage,speed:shot.speed,color:shot.color,r:Math.max(2,(shot.r||3)*.8),
          channel:shot.channel,canHitAir:shot.canHitAir,pierce:shot.pierce,armorBreak:shot.armorBreak,
          splash:0,slow:0,stun:0,push:0,poison:0,poisonDamage:shot.poisonDamage||1,burn:0,burnDamage:shot.burnDamage||1,
          splitTargets:0,splitRadius:0,splitDamage:0,splitProjectile:true};
        state.shots.push(splitShot);
        hooks.onShot?.(splitShot);
      });
      hooks.onImpact?.(shot, impactPosition, impact);
      state.shots.splice(index, 1);
    } else {
      shot.x += dx / distance * travel;
      shot.y += dy / distance * travel;
    }
  }
  for (let index = state.shots.length - 1; index >= 0; index--) {
    if (!state.enemies.includes(state.shots[index].target)) state.shots.splice(index, 1);
  }
  if (!state.spawnQueue.length && !state.enemies.length) {
    state.running = false;
    // Wave income is resolved from the same effective stat the inspector previews.
    const income = state.towers.filter(tower => tower.type === 'sunflower').reduce((sum, tower) =>
      sum + getEffectiveTowerStats(tower, {terrain:state.terrainRulesVersion>=1?terrainZoneAt(state.selectedMap,tower):'ground',researchLoadout:state.researchLoadout??[]}, towersDef.sunflower).income, 0);
    for (const tower of state.towers.filter(tower => tower.type === 'sunflower')) {
      recordTowerIncome(state.performance, tower.id, tower.type, getEffectiveTowerStats(tower, {terrain:state.terrainRulesVersion>=1?terrainZoneAt(state.selectedMap,tower):'ground',researchLoadout:state.researchLoadout??[]}, towersDef.sunflower).income);
    }
    const bonus = 12 + state.wave * 2 + income;
    state.cash += bonus;
    state.intermission = 12;
    return { defeated, leaked, waveClear: { bonus, income }, lost: false };
  }
  return { defeated, leaked, waveClear: null, lost: false };
}

export function defeatCombatEnemy(state, enemy, onDefeat, positionOf) {
  const wasDefeated = removeDefeated(state, enemy,positionOf);
  if (wasDefeated) onDefeat?.(enemy);
  return wasDefeated;
}
