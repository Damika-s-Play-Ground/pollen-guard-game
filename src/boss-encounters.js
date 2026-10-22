export const BOSS_PHASE_CUES = Object.freeze({
  meadow: Object.freeze(['Roots gather · mite brood', 'Thorns flare · root rush']),
  'meadow-crossing': Object.freeze(['Roots gather · crossing brood', 'Thorns flare · crossing rush']),
  'meadow-orchard': Object.freeze(['Roots gather · orchard brood', 'Thorns flare · orchard rush']),
  creek: Object.freeze(['Shell glows · shield pulse', 'Creek mist rises · sky gnats']),
  'creek-ford': Object.freeze(['Shell glows · ford shield pulse', 'Creek mist rises · ford sky gnats']),
  'creek-floodplain': Object.freeze(['Shell glows · floodplain shield pulse', 'Creek mist rises · floodplain sky gnats']),
  ridge: Object.freeze(['Stone plates lock · armor up', 'Ridge shakes · armored escort']),
  'ridge-switchback': Object.freeze(['Stone plates lock · pass armor', 'Ridge shakes · switchback escort']),
  'ridge-summit': Object.freeze(['Stone plates lock · summit armor', 'Ridge shakes · summit escort'])
});
export const BOSS_VARIANTS = Object.freeze({
  meadow: Object.freeze({ name:'Bramble Matriarch', color:'#794c86', biome:'meadow' }),
  'meadow-crossing': Object.freeze({ name:'Crossing Matriarch', color:'#794c86', biome:'meadow' }),
  'meadow-orchard': Object.freeze({ name:'Orchard Matriarch', color:'#794c86', biome:'meadow' }),
  creek: Object.freeze({ name:'Tideglass Warden', color:'#477f91', biome:'creek' }),
  'creek-ford': Object.freeze({ name:'Ford Warden', color:'#477f91', biome:'creek' }),
  'creek-floodplain': Object.freeze({ name:'Floodplain Warden', color:'#477f91', biome:'creek' }),
  ridge: Object.freeze({ name:'Cragthorn Colossus', color:'#755b48', biome:'ridge' }),
  'ridge-switchback': Object.freeze({ name:'Switchback Colossus', color:'#755b48', biome:'ridge' }),
  'ridge-summit': Object.freeze({ name:'Summit Colossus', color:'#755b48', biome:'ridge' })
});

const PHASE_THRESHOLDS = [0.66, 0.33];
const TELEGRAPH_SECONDS = 1.5;

export function validBossEncounter(enemy, revision, mapId) {
  if (revision < 2 || enemy.type !== 'boss') return true;
  const { bossVariant:variant, bossPhase:phase, bossTelegraphTimer:timer, bossRushTimer:rush } = enemy;
  if (!enemy.boss || variant !== mapId || !Object.hasOwn(BOSS_VARIANTS, variant) ||
      enemy.bossName !== BOSS_VARIANTS[variant].name || !Number.isInteger(phase) || phase < 0 || phase > 2 ||
      !Number.isFinite(timer) || timer < 0 || timer > TELEGRAPH_SECONDS ||
      !Number.isFinite(rush) || rush < 0 || rush > 3) return false;
  if (rush > 0 && (BOSS_VARIANTS[variant].biome !== 'meadow' || phase !== 2 || timer > 0)) return false;
  return timer > 0
    ? phase < 2 && enemy.bossPendingPhase === phase + 1 && enemy.bossTelegraph === BOSS_PHASE_CUES[variant][phase]
    : enemy.bossPendingPhase === undefined && enemy.bossTelegraph === '';
}

function triggerPhase(enemy, phase, state) {
  const variant = BOSS_PHASE_CUES[enemy.bossVariant] ? enemy.bossVariant : 'meadow';
  enemy.bossPendingPhase = phase;
  enemy.bossTelegraphTimer = TELEGRAPH_SECONDS;
  enemy.bossTelegraph = BOSS_PHASE_CUES[variant][phase - 1];
  state.bossSummons ||= [];
}

function resolvePhase(enemy, state) {
  const phase = enemy.bossPendingPhase, variant = enemy.bossVariant, biome=BOSS_VARIANTS[variant]?.biome || variant;
  if (biome === 'meadow' && phase === 1 || biome === 'ridge' && phase === 2) {
    const types = biome === 'meadow' ? ['mite', 'mite', 'mite'] : ['armored', 'zip'];
    for (const type of types) {
      state.bossSummons.push({ type, lane:'ground', progress:enemy.progress, telegraph:`${biome === 'meadow' ? 'Root brood' : 'Ridge escort'} · summoned` });
    }
  } else if (biome === 'meadow') {
    enemy.bossRushTimer = 3;
  } else if (biome === 'creek' && phase === 1) {
    enemy.shield += 24;
  } else if (biome === 'creek') {
    for (let index = 0; index < 2; index++) {
      state.bossSummons.push({ type:'flyer', lane:'air', progress:enemy.progress, telegraph:'Creek mist · summoned sky gnat' });
    }
  } else if (biome === 'ridge') {
    enemy.armor += 2;
  }
  enemy.bossPhase = phase;
  enemy.bossPendingPhase = undefined;
  enemy.bossTelegraphTimer = 0;
  enemy.bossTelegraph = '';
}

export function advanceBossEncounter(enemy, state, dt) {
  if (!enemy.boss || !(state.waveScheduleVersion >= 2)) return 1;
  if (!Number.isInteger(enemy.bossPhase)) enemy.bossPhase = 0;
  if (!Number.isFinite(enemy.bossTelegraphTimer)) enemy.bossTelegraphTimer = 0;
  if (!Number.isFinite(enemy.bossRushTimer)) enemy.bossRushTimer = 0;
  if (enemy.bossTelegraphTimer > 0) {
    enemy.bossTelegraphTimer = Math.max(0, enemy.bossTelegraphTimer - dt);
    if (enemy.bossTelegraphTimer === 0) resolvePhase(enemy, state);
    return 1;
  }
  if (enemy.bossPhase < 2) {
    const nextPhase = enemy.bossPhase + 1;
    if (enemy.hp <= enemy.maxHp * PHASE_THRESHOLDS[nextPhase - 1]) {
      triggerPhase(enemy, nextPhase, state);
      return 1;
    }
  }
  if (enemy.bossRushTimer > 0) {
    enemy.bossRushTimer = Math.max(0, enemy.bossRushTimer - dt);
    return 1.8;
  }
  return 1;
}

export function bossLeakCost(enemy, scheduleVersion = 0) {
  return enemy?.boss && scheduleVersion >= 2 ? 3 : 1;
}
