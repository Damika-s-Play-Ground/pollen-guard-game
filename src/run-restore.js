import { restoredRunMapId } from './game-core.js';
import { assignEnemyCombatProfile } from './combat-rules.js';
import { DEFAULT_SPELL_LOADOUT } from './spells.js';

export function projectSavedRunToRuntime(run, { maps, towerDefinitions, enemyCombatProfiles, currentNextEntityId = 1 }) {
  let nextEntityId = Math.max(run.nextEntityId || 1, currentNextEntityId);
  const towers = run.towers.filter(tower => tower && towerDefinitions[tower.type])
    .map(tower => ({ ...tower, id:tower.id ?? nextEntityId++, invested:Number.isFinite(tower.invested) ? tower.invested : towerDefinitions[tower.type].cost }));
  const enemies = run.enemies.filter(enemy => enemy && typeof enemy.type === 'string')
    .map(enemy => assignEnemyCombatProfile({ ...enemy, id:enemy.id ?? nextEntityId++ }, enemyCombatProfiles[enemy.type] || enemyCombatProfiles.mite));
  const spawnQueue = run.spawnQueue.map(item => typeof item === 'string' ? { type:item, interval:.56 } : { ...item })
    .filter(item => item && typeof item.type === 'string' && Number.isFinite(item.interval));
  const shots = run.shots.map(({ targetId, ...shot }) => ({ ...shot, target:enemies.find(enemy => enemy.id === targetId) }))
    .filter(shot => shot.target);

  return {
    selectedMap:restoredRunMapId(run,maps), gateRoute:run.gateRoute??'default',gateSwitchesRemaining:run.gateSwitchesRemaining??0,terrainRulesVersion:run.terrainRulesVersion??0, waveScheduleVersion:run.waveScheduleVersion, challenge:run.challenge, difficulty:run.difficulty??'standard',challengeRules:[...(run.challengeRules??[])],seedObjective:run.seedObjective?{...run.seedObjective,seeds:run.seedObjective.seeds.map(seed=>({...seed}))}:null,cash:run.cash, lives:run.lives,
    popped:run.popped, wave:run.wave, combatPerformance:run.combatPerformance, bloomCharge:run.bloomCharge,
    towers, enemies, spawnQueue, shots, gameTime:run.gameTime,
    nextEntityId:Math.max(run.nextEntityId || 1,nextEntityId), spawnClock:run.spawnClock,
    intermission:run.intermission, speed:run.speed, runSeed:run.runSeed, simulationTick:run.simulationTick,
    actionLog:run.actionLog, actionLogComplete:run.actionLogComplete,
    guardianMode:run.guardianMode ?? 'none', guardian:run.guardian ? { ...run.guardian } : null,
    spellLoadout:[...(run.spellLoadout??DEFAULT_SPELL_LOADOUT)], rejuvenationField:run.rejuvenationField ? { ...run.rejuvenationField } : null,
    researchLoadout:[...(run.researchLoadout??[])]
  };
}
