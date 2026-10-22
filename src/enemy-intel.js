import { AUTHORED_WAVES, WAVE_SCHEDULE_VERSION } from './waves.js';

export const ENEMY_INTEL = [
  { type:'mite', name:'Moss mite', icon:'🐛', firstWave:1, role:'A fragile ground unit that tests basic coverage.', rule:'Low health makes steady damage effective; watch how many arrive together.' },
  { type:'zip', name:'Zip mite', icon:'💨', firstWave:2, role:'A fast ground runner that pressures long gaps in coverage.', rule:'Moves quickly and has little health; slowing effects can buy more attack time.' },
  { type:'armored', name:'Armored beetle', icon:'🪲', firstWave:4, role:'A durable ground unit that challenges single-target damage.', rule:'Armor reduces physical damage; armor cracking helps. Heat bypasses armor but is resisted (0.75×), while toxin is neutral (1×).' },
  { type:'boss', name:'Biome bosses', icon:'🌳', firstWave:5, role:'A slow, heavily armored boss with a distinct identity and two phases in each biome.', rule:'Bramble Matriarch summons mites then rushes in Meadow; Tideglass Warden restores shield then summons sky gnats in Creek; Cragthorn Colossus gains armor then summons an armored escort in Ridge. Each phase has a clear 1.5 second telegraph.' },
  { type:'flyer', name:'Sky gnat', icon:'🪰', firstWave:6, role:'An airborne unit that follows the sky lane.', rule:'Ground-only defenders cannot hit it, and it is immune to slow.' },
  { type:'shield', name:'Shield bug', icon:'🛡️', firstWave:7, role:'A ground unit protected by an extra shield layer.', rule:'Damage must clear its shield before health; toxin damage is especially effective.' },
  { type:'splitter', name:'Splitter', icon:'🪺', firstWave:8, role:'A tough ground unit that creates two smaller threats when defeated.', rule:'Its two mite crumbs spread pressure after the splitter is popped.' },
  { type:'crumb', name:'Mite crumb', icon:'🌱', firstWave:8, role:'A small, fast ground unit spawned by a splitter.', rule:'It has little health but moves quickly; keep coverage on the route after a split.' },
  { type:'healer', name:'Moss Tender', icon:'✚', firstWave:9, role:'A fragile support pest that restores up to 5 health to one nearby ally, three times.', rule:'A green pulse warns before each heal. Focus the Tender or use area damage; its three charges can restore at most 15 health.' },
  { type:'carrier', name:'Shield Carrier', icon:'⬡', firstWave:11, role:'A support pest that grants up to four shield to two nearby allies, twice.', rule:'A teal ring warns before each ward. Focus the carrier or use area damage; two finite pulses can add at most 16 shield.' },
  { type:'burrower', name:'Burrower', icon:'⌃', firstWave:13, role:'A ground runner that warns before diving beneath the trail and surging ahead.', rule:'A brown dirt ring and plume warn before each dive. Towers and abilities cannot target it underground; watch the brief tell and use area damage as it surfaces.' }
];

const byType = new Map(ENEMY_INTEL.map((enemy) => [enemy.type, enemy]));

export function enemyIntelFor(type, revision = WAVE_SCHEDULE_VERSION) {
  if (type === 'healer' && revision < 3) return null;
  if (type === 'carrier' && revision < 4) return null;
  if (type === 'burrower' && revision < 5) return null;
  if (type === 'boss' && revision < 2) return { ...byType.get(type), name:'Bramble boss',
    role:'A slow, heavily armored ground boss.', rule:'High health and armor demand sustained damage. Bosses resist slow, stun, and push.' };
  if (type === 'flyer' && revision >= WAVE_SCHEDULE_VERSION) return { ...byType.get(type),
    role:'An airborne unit that follows a separate sky route across the map.',
    rule:'The cyan dashed sky route is separate from the ground trail. Kite Keepers and Thorn Beacons can hit it; ground-only defenders cannot, and it is immune to slow.' };
  return byType.get(type) || null;
}

export function searchEnemyIntel(query = '') {
  const needle = String(query).trim().toLocaleLowerCase();
  if (!needle) return ENEMY_INTEL;
  return ENEMY_INTEL.filter((enemy) =>
    `${enemy.name} ${enemy.role} ${enemy.rule} ${enemy.type}`.toLocaleLowerCase().includes(needle));
}

export function firstEncounterIntel(waveNumber, schedules = AUTHORED_WAVES, revision = WAVE_SCHEDULE_VERSION) {
  if (!Number.isInteger(waveNumber) || waveNumber < 1 || !Array.isArray(schedules) || !schedules.length) return null;
  const index = (waveNumber - 1) % schedules.length;
  const cycle = Math.floor((waveNumber - 1) / schedules.length);
  if (cycle > 0) return null;
  const types = new Set(schedules[index]?.groups?.map(group => group.type) || []);
  const previous = new Set(schedules.slice(0, index).flatMap(wave => wave.groups?.map(group => group.type) || []));
  const first = ENEMY_INTEL
    .filter(enemy => types.has(enemy.type) && !previous.has(enemy.type) && enemy.type !== 'crumb' && enemyIntelFor(enemy.type, revision))
    .sort((a,b) => b.firstWave - a.firstWave)[0];
  return first ? enemyIntelFor(first.type, revision) : null;
}

