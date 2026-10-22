import { maps, modes, towersDef, targetModes } from './game-data.js';
import { buildWaveQueue, LEGACY_WAVE_SCHEDULE_VERSION, PRE_BOSS_WAVE_SCHEDULE_VERSION, PRE_TACTICAL_ENEMY_SCHEDULE_VERSION, PRE_RIDGE_BALANCE_SCHEDULE_VERSION, WAVE_SCHEDULE_VERSION, waveSchedulesForMap } from './waves.js';
import { canActivateTowerAbility, saleRefund, towerUpgradeCost } from './game-core.js';
import { normalizeGameSpeed } from './simulation-speed.js';
import { resolveGlobalCombatAbility, resolveTowerAbility, TOWER_ABILITY_COOLDOWN_SECONDS } from './combat-actions.js';
import { defeatCombatEnemy, stepCombat } from './combat-simulation.js';
import { ACTION_LOG_VERSION, TickActionCursor, isValidActionLog } from './action-log.js';
import { SIMULATION_STEP, hashGameplayState } from './game-core.js';
import { distanceToPath } from './path-geometry.js';
import { createCombatPerformance, recordCombatDamage, recordTowerIncome, registerCombatTower } from './combat-performance.js';
import { activateGuardianPulse, advanceMeadowGuardian, guardianDestinationIsSafe } from './meadow-guardian.js';
import { createMissionKitState } from './mission-kit.js';
import { applyAimedSpell, isSpellTargetValid, normalizeSpellLoadout, SPELLS } from './spells.js';
import { difficultyFor, normalizeChallengeRules } from './challenge-rules.js';
import { defaultGateRoute, gateSwitchesForMap, pathForGateRoute } from './gate-routes.js';
import { createRoutePathLengthResolver } from './air-routes.js';
import { createEnemyRouteGeometry } from './air-routes.js';
import { createSeedObjective, SEED_RECOVERY_RULE } from './seed-objective.js';

export function validateTowerPlacement(state, type, point, { path, width = 900, height = 500 } = {}) {
  if (!towersDef[type]) return 'Choose a defender from the catalog first.';
  const def = towersDef[type];
  if ((state.challenge === 'thrifty' || state.challengeRules?.includes('noSunflowers')) && type === 'sunflower') return 'Sunflowers are disabled by the selected rules.';
  if (state.cash < def.cost) return `You need ${def.cost} petals for ${def.name}.`;
  const footprint = def.footprint || 19, edgeClearance = def.supportStructure ? footprint : 16;
  if (!path?.length || distanceToPath(point.x, point.y, path) < (def.supportStructure ? 25 + footprint : 44) || point.x < edgeClearance || point.x > width - edgeClearance || point.y < edgeClearance || point.y > height - edgeClearance) return 'That spot overlaps the trail or map edge.';
  if (state.towers.some(tower => Math.hypot(tower.x - point.x, tower.y - point.y) <
    (def.supportStructure ? footprint : 19) + (towersDef[tower.type]?.supportStructure ? towersDef[tower.type].footprint : 19))) return 'Leave a little space between defenders.';
  return '';
}

function findTower(state, id) { return state.towers.find(tower => tower.id === id); }
function rejected(reason) { return { ok: false, reason, defeated: [], affected: [] }; }

export function applyPlayerAction(state, action, context = {}) {
  const payload = action?.payload || {};
  switch (action?.type) {
    case 'placeTower': {
      const error = validateTowerPlacement(state, payload.towerType, { x: payload.x, y: payload.y }, context);
      if (error) return rejected(error);
      if (payload.towerId !== state.nextEntityId) return rejected('Tower ID does not match the next entity ID.');
      const def = towersDef[payload.towerType];
      const tower = { id: state.nextEntityId++, x: payload.x, y: payload.y, type: payload.towerType, level: 1, branch: null,
        branchChoice: undefined, cooldown: 0, targetMode: 'First', abilityReadyAt: 0, abilityUsedWave: -1, invested: def.cost };
      if (def.supportStructure === 'trap') tower.compostTriggeredIds = [];
      state.towers.push(tower);
      registerCombatTower(state.combatPerformance, tower);
      state.cash -= def.cost;
      return { ok: true, tower, bonus: 0, defeated: [], affected: [] };
    }
    case 'startWave': {
      if (state.running || state.gameOver || state.wave >= (context.waveLimit ?? Infinity)) return rejected('A wave cannot start in the current state.');
      const bonus = payload.early && state.intermission > 0 ? Math.max(1, Math.ceil(state.intermission)) : 0;
      if (payload.wave !== state.wave + 1 || payload.bonus !== bonus) return rejected('Wave command does not match the current wave state.');
      state.cash += bonus;
      state.wave++;
      state.spawnQueue = buildWaveQueue(state.wave, waveSchedulesForMap(state.selectedMap || 'meadow', state.waveScheduleVersion), { difficulty: state.difficulty, challengeRules: state.challengeRules });
      state.running = true;
      state.intermission = 0;
      state.spawnClock = 0;
      return { ok: true, bonus, defeated: [], affected: [] };
    }
    case 'switchGate': {
      const map=context.map ?? maps[state.selectedMap];
      if (!map?.gateRoutes || !Object.hasOwn(map.gateRoutes,payload.routeId)) return rejected('That route is not available on this mission.');
      if (state.running || state.paused || state.gameOver || state.enemies.length || state.spawnQueue.length) return rejected('Gates can only be switched during a clear planning phase.');
      if (!Number.isSafeInteger(state.gateSwitchesRemaining) || state.gateSwitchesRemaining <= 0) return rejected('No gate switches remain this run.');
      if (payload.routeId === state.gateRoute) return rejected('That route is already selected.');
      const candidatePath=pathForGateRoute(map,payload.routeId);
      const blocked=state.towers.some(tower=>distanceToPath(tower.x,tower.y,candidatePath)<(towersDef[tower.type]?.supportStructure?25+(towersDef[tower.type].footprint||19):44));
      if (blocked) return rejected('Move or sell defenders that overlap the alternate trail before switching.');
      state.gateRoute=payload.routeId;
      state.gateSwitchesRemaining--;
      return {ok:true,routeId:state.gateRoute,switchesRemaining:state.gateSwitchesRemaining,bonus:0,defeated:[],affected:[]};
    }
    case 'chooseBranch': {
      const tower = findTower(state, payload.towerId);
      if (!tower || tower.level !== 1 || towersDef[tower.type]?.supportStructure || !towersDef[tower.type]?.branches[payload.branch]) return rejected('Branch choice is unavailable.');
      tower.branchChoice = payload.branch;
      return { ok: true, tower, bonus: 0, defeated: [], affected: [] };
    }
    case 'upgradeTower': {
      const tower = findTower(state, payload.towerId), def = tower && towersDef[tower.type];
      if (!tower || !def || def.supportStructure || tower.level >= 3) return rejected('Upgrade is unavailable.');
      const branch = tower.level === 1 ? tower.branchChoice : tower.branch;
      if (!Number.isInteger(branch) || !def.branches[branch]) return rejected('Choose an upgrade branch first.');
      const cost = towerUpgradeCost(def, tower.level, branch);
      const level = tower.level + 1;
      if (payload.level !== level || payload.branch !== branch || state.cash < cost) return rejected('Upgrade command does not match the current tower or funds.');
      state.cash -= cost;
      tower.invested = (tower.invested || def.cost) + cost;
      tower.branch = branch;
      tower.level = level;
      registerCombatTower(state.combatPerformance, tower);
      return { ok: true, tower, cost, bonus: 0, defeated: [], affected: [] };
    }
    case 'setTarget': {
      const tower = findTower(state, payload.towerId);
      if (!tower || !targetModes.includes(payload.mode) || towersDef[tower.type].income || towersDef[tower.type].supportStructure) return rejected('Target mode is unavailable.');
      tower.targetMode = payload.mode;
      return { ok: true, tower, bonus: 0, defeated: [], affected: [] };
    }
    case 'sellTower': {
      const tower = findTower(state, payload.towerId);
      if (!tower) return rejected('Tower is no longer available to sell.');
      const refund = saleRefund(tower.invested, towersDef[tower.type].cost);
      if (payload.refund !== refund) return rejected('Sale refund does not match the tower investment.');
      state.cash += refund;
      state.towers.splice(state.towers.indexOf(tower), 1);
      return { ok: true, tower, refund, bonus: 0, defeated: [], affected: [] };
    }
    case 'towerAbility': {
      const tower = findTower(state, payload.towerId), def = tower && towersDef[tower.type];
      if (!tower || !def || def.supportStructure || !context.positionOf) return rejected('Tower ability is unavailable.');
      const usedThisWave = tower.type === 'sunflower' && tower.abilityUsedWave === state.wave;
      if (!state.running || !state.enemies.length || state.gameOver) return rejected('Ability requires active combat with a live enemy.');
      if (usedThisWave) return rejected('Golden harvest is already used this wave.');
      if (!canActivateTowerAbility({ running: state.running, enemyCount: state.enemies.length, gameOver: state.gameOver,
        cooldownReady: (tower.abilityReadyAt || 0) <= state.gameTime, usedThisWave })) return rejected('Ability is not ready.');
      const effect = resolveTowerAbility(tower, state.enemies, def, context.positionOf, context.trackAttribution !== false);
      if (!def.income && !effect.affected.length) return rejected('No eligible enemy in this ability’s area.');
      tower.abilityReadyAt = state.gameTime + TOWER_ABILITY_COOLDOWN_SECONDS;
      if (tower.type === 'sunflower') tower.abilityUsedWave = state.wave;
      state.cash += effect.cashDelta;
      if (effect.cashDelta) recordTowerIncome(state.combatPerformance, tower.id, tower.type, effect.cashDelta);
      effect.results?.forEach(result => recordCombatDamage(state.combatPerformance, tower.id, tower.type, result.enemy, result));
      const defeated = effect.defeated.filter(enemy => defeatCombatEnemy(state, enemy,null,context.positionOf));
      return { ok: true, tower, effect, affected: effect.affected, defeated, bonus: 0 };
    }
    case 'bloom': case 'snare': {
      if (!state.running || state.paused || state.gameOver) return rejected('Spells can only be cast during active combat.');
      if (state.spellLoadout && !state.spellLoadout.includes(action.type)) return rejected('That spell is not equipped.');
      if (action.type === 'bloom' && state.bloomCharge < 100) return rejected('Bloom is not charged.');
      if (action.type === 'bloom' && !state.enemies.length) return rejected('Bloom needs an enemy on the trail.');
      if (action.type === 'snare' && (state.cash < 45 || !state.enemies.length)) return rejected('Snare is unavailable.');
      if (!state.enemies.some(enemy => !enemy.burrowTimer)) return rejected('No eligible enemy on the trail.');
      if (action.type === 'bloom') state.bloomCharge = 0;
      else state.cash -= 45;
      const effect = resolveGlobalCombatAbility(action.type, [...state.enemies]);
      effect.results?.forEach(result => recordCombatDamage(state.combatPerformance, undefined, undefined, result.enemy, result));
      const defeated = effect.defeated.filter(enemy => defeatCombatEnemy(state, enemy,null,context.positionOf));
      return { ok: true, effect, affected: effect.affected, defeated, bonus: 0 };
    }
    case 'aimedSpell': {
      const spellId=payload.spellId, spell=SPELLS[spellId];
      if (!spell || !['rootTrap','lineGust','rejuvenation'].includes(spellId) || !state.spellLoadout?.includes(spellId)) return rejected('That spell is not equipped.');
      if (!state.running || state.paused || state.gameOver) return rejected('Spells can only be cast during active combat.');
      if (state.cash < spell.cost) return rejected(`You need ${spell.cost} petals for ${spell.name}.`);
      if (spellId==='rejuvenation' && state.rejuvenationField?.duration>0) return rejected('Rejuvenation Field is already active.');
      const target={x:payload.x,y:payload.y,endX:payload.endX,endY:payload.endY};
      if (!isSpellTargetValid(spellId,target,context.width??900,context.height??540)) return rejected('Choose a valid spell target.');
      const effect=spellId==='rejuvenation'
        ? {affected:state.towers.filter(tower=>!towersDef[tower.type]?.supportStructure&&Math.hypot(tower.x-target.x,tower.y-target.y)<=spell.radius),defeated:[],results:[]}
        : applyAimedSpell(spellId,target,state.enemies,context.positionOf);
      if (spellId!=='rejuvenation'&&!effect.affected.length) return rejected(`No eligible pests are inside ${spell.name}.`);
      if (spellId==='rejuvenation'&&!effect.affected.length) return rejected('Place an attacking defender inside Rejuvenation Field.');
      state.cash-=spell.cost;
      if (spellId==='rejuvenation') state.rejuvenationField={x:target.x,y:target.y,duration:6};
      const defeated=effect.defeated.filter(enemy=>defeatCombatEnemy(state,enemy,null,context.positionOf));
      return {ok:true,effect,affected:effect.affected,defeated,bonus:0};
    }
    case 'moveGuardian': {
      if (state.guardianMode !== 'guardian' || !state.guardian || state.gameOver || state.guardian.downTimer > 0) return rejected('The meadow guardian cannot move right now.');
      const destination = { x: payload.x, y: payload.y };
      if (!guardianDestinationIsSafe(state.guardian, destination, context.path, context.guardianWidth ?? context.width ?? 900, context.guardianHeight ?? context.height ?? 540)) return rejected('Choose open grass away from the trail and map edge.');
      state.guardian.targetX = destination.x;
      state.guardian.targetY = destination.y;
      return { ok: true, guardian: state.guardian, bonus: 0, defeated: [], affected: [] };
    }
    case 'guardianPulse': {
      if (state.guardianMode !== 'guardian' || !state.running || state.gameOver) return rejected('Pollen Pulse needs an active wave.');
      const effect = activateGuardianPulse(state.guardian, state.enemies, context.positionOf);
      return effect.ok ? { ...effect, bonus: 0, defeated: [], effect } : rejected(effect.reason);
    }
    default: return rejected(`Unsupported player action: ${action?.type || 'unknown'}`);
  }
}

export function replayRecordedRun(run, { pathLength, positionOf, path, map, width = 900, height = 500, guardianWidth = 900, guardianHeight = 540 } = {}) {
  if (!run || run.actionLogComplete !== true || run.actionLogVersion !== ACTION_LOG_VERSION || !isValidActionLog(run.actionLog) || !Number.isSafeInteger(run.simulationTick) ||
      (run.actionLog.length > 0 && run.actionLog.at(-1).tick > run.simulationTick) ||
      typeof positionOf !== 'function' || !(Number.isFinite(pathLength) || typeof pathLength === 'function')) throw new TypeError('Run is not replayable or its map geometry is missing.');
  const configuration = modes[run.challenge];
  if (!configuration) throw new TypeError('Replay challenge is unknown.');
  const difficulty=difficultyFor(run.difficulty??'standard',run.challenge);
  const challengeRules=normalizeChallengeRules(run.challengeRules??[],run.challenge);
  if(!difficulty||!challengeRules)throw new TypeError('Replay challenge rules are invalid.');
  const replayMap=map??maps[run.selectedMap];
  const waveScheduleVersion = run.waveScheduleVersion ?? (run.version >= 8 ? PRE_RIDGE_BALANCE_SCHEDULE_VERSION : run.version === 7 ? PRE_TACTICAL_ENEMY_SCHEDULE_VERSION : run.version === 6 ? PRE_BOSS_WAVE_SCHEDULE_VERSION : LEGACY_WAVE_SCHEDULE_VERSION);
  let activeGateRoute=defaultGateRoute(replayMap);
  let activePath=pathForGateRoute(replayMap,activeGateRoute);
  let activeGeometry=replayMap?.gateRoutes?createEnemyRouteGeometry({...replayMap,path:activePath},waveScheduleVersion):null;
  const positionForRoute=enemy=>activeGeometry?activeGeometry.positionOf(enemy):positionOf(enemy);
  const lengthForRoute=createRoutePathLengthResolver(activeGeometry,pathLength);
  const loadout = createMissionKitState({ challenge:run.challenge, guardianMode:run.guardianMode ?? 'none', path:activePath, width:guardianWidth, height:guardianHeight, modeDefinitions:modes });
  const trackContributions = run.combatPerformance?.complete === true;
  const state = {
    selectedMap: run.selectedMap, ...(run.version>=13?{gateRoute:activeGateRoute,gateSwitchesRemaining:gateSwitchesForMap(replayMap)}:{ }), terrainRulesVersion:run.terrainRulesVersion??0, waveScheduleVersion, challenge: run.challenge, difficulty:run.difficulty??'standard', challengeRules,seedObjective:challengeRules.includes(SEED_RECOVERY_RULE)?createSeedObjective():null, seedVersion: run.seedVersion, runSeed: run.runSeed,
    simulationTick: 0, gameTime: 0, cash: configuration.cash+difficulty.cashDelta, lives: Math.max(1,loadout.lives+difficulty.livesDelta), popped: 0, wave: 0, bloomCharge: 0,
    combatPerformance: trackContributions ? createCombatPerformance(true) : null,
    towers: [], enemies: [], shots: [], spawnQueue: [], spawnClock: 0, running: false, gameOver: false, paused: false,
    intermission: 0, speed: normalizeGameSpeed(run.speed), nextEntityId: 1,
    guardianMode: run.guardianMode ?? 'none', guardian: loadout.guardian,
    spellLoadout:normalizeSpellLoadout(run.spellLoadout), rejuvenationField:null
  };
  state.performance = trackContributions ? state.combatPerformance : null;
  const cursor = new TickActionCursor(run.actionLog), context = { path:activePath, width, height, guardianWidth, guardianHeight, pathLength:lengthForRoute, positionOf:positionForRoute, map:replayMap,
    waveLimit: configuration.limit, trackAttribution: trackContributions };
  for (let tick = 0; tick <= run.simulationTick; tick++) {
    cursor.apply(tick, action => {
      const result = applyPlayerAction(state, action, context);
      if (!result.ok) {
        const remaining=state.enemies.map(enemy=>`${enemy.type}#${enemy.id}@${Number(enemy.progress||0).toFixed(2)}`).join(',');
        throw new Error(`Replay rejected ${action.type} at tick ${tick} for ${run.selectedMap} (wave ${state.wave}, running ${state.running}, gameOver ${state.gameOver}, enemies [${remaining}], queued ${state.spawnQueue.length}): ${result.reason}`);
      }
      if(action.type==='switchGate'){
        activeGateRoute=state.gateRoute;activePath=pathForGateRoute(replayMap,activeGateRoute);
        activeGeometry=createEnemyRouteGeometry({...replayMap,path:activePath},waveScheduleVersion);
        context.pathLength=createRoutePathLengthResolver(activeGeometry,pathLength);
        context.path=activePath;
      }
    });
    if (tick === run.simulationTick) break;
    state.gameTime += SIMULATION_STEP;
    if (!state.running && !state.gameOver && state.intermission > 0) state.intermission = Math.max(0, state.intermission - SIMULATION_STEP);
    state.trackAttribution = trackContributions;
    stepCombat(state, SIMULATION_STEP, context);
    const terminalWin = configuration.limit !== Infinity && state.wave >= configuration.limit && !state.running;
    if (!state.gameOver && !terminalWin) advanceMeadowGuardian(state.guardian, SIMULATION_STEP, { path:activePath, width:guardianWidth, height:guardianHeight, enemies: state.enemies, enemyPosition: positionForRoute });
    state.simulationTick++;
  }
  state.paused = Boolean(run.paused);
  state.speed = normalizeGameSpeed(run.speed);
  const replayedRun = {
    version: run.version, ...(run.terrainRulesVersion===undefined?{}:{terrainRulesVersion:state.terrainRulesVersion}), ...(run.waveScheduleVersion === undefined ? {} : { waveScheduleVersion:state.waveScheduleVersion }),
    seedVersion: state.seedVersion, runSeed: state.runSeed, simulationTick: state.simulationTick,
    actionLogVersion: run.actionLogVersion, actionLog: run.actionLog, actionLogComplete: run.actionLogComplete,
    combatPerformance:trackContributions ? state.combatPerformance : (run.combatPerformance || createCombatPerformance(false)),
    selectedMap: state.selectedMap, challenge: state.challenge, cash: state.cash, lives: state.lives, popped: state.popped,
    ...(run.version>=13?{gateRoute:state.gateRoute,gateSwitchesRemaining:state.gateSwitchesRemaining}:{}),
    wave: state.wave, bloomCharge: state.bloomCharge, towers: state.towers, enemies: state.enemies,
    shots: state.shots.map(({ target, ...shot }) => ({ ...shot, targetId: target?.id })), spawnQueue: state.spawnQueue,
    spawnClock: state.spawnClock, running: state.running, paused: state.paused, intermission: state.intermission,
    speed: state.speed, gameTime: state.gameTime, nextEntityId: state.nextEntityId,
    ...(run.guardianMode === undefined && run.guardian === undefined ? {} : { guardianMode: state.guardianMode, guardian: state.guardian }),
    ...(run.version>=12?{difficulty:state.difficulty,challengeRules:state.challengeRules}:{}),
    ...(run.version>=10?{spellLoadout:state.spellLoadout,rejuvenationField:state.rejuvenationField}: {}),
    ...(run.version>=14?{seedObjective:state.seedObjective}: {})
  };
  return { run: replayedRun, state, hash: hashGameplayState(replayedRun) };
}
