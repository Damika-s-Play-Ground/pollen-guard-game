import { maps } from './game-data.js';

export const TERRAIN_TYPES = Object.freeze({
  ground:Object.freeze({ id:'ground', name:'Ordinary grass', label:'OPEN GRASS', color:'#e1edbf' }),
  fertile:Object.freeze({ id:'fertile', name:'Fertile soil', label:'FERTILE', color:'#f1d86c' }),
  waterEdge:Object.freeze({ id:'waterEdge', name:'Water edge', label:'WATER EDGE', color:'#79d8dc' }),
  elevated:Object.freeze({ id:'elevated', name:'High ground', label:'HIGH GROUND', color:'#d8e7ef' })
});

const BASE_TERRAIN_ZONES = Object.freeze({
  meadow:Object.freeze([
    Object.freeze({ type:'fertile', x:180, y:140, radius:72 }),
    Object.freeze({ type:'waterEdge', x:335, y:410, radius:72 }),
    Object.freeze({ type:'elevated', x:780, y:78, radius:72 })
  ]),
  creek:Object.freeze([
    Object.freeze({ type:'fertile', x:220, y:145, radius:72 }),
    Object.freeze({ type:'waterEdge', x:550, y:335, radius:72 }),
    Object.freeze({ type:'elevated', x:755, y:75, radius:72 })
  ]),
  ridge:Object.freeze([
    Object.freeze({ type:'fertile', x:235, y:75, radius:72 }),
    Object.freeze({ type:'waterEdge', x:415, y:280, radius:72 }),
    Object.freeze({ type:'elevated', x:760, y:110, radius:72 })
  ])
});

export const TERRAIN_ZONES = Object.freeze({
  ...BASE_TERRAIN_ZONES,
  'meadow-crossing':BASE_TERRAIN_ZONES.meadow,
  'meadow-orchard':BASE_TERRAIN_ZONES.meadow,
  'creek-ford':BASE_TERRAIN_ZONES.creek,
  'creek-floodplain':BASE_TERRAIN_ZONES.creek,
  'ridge-switchback':BASE_TERRAIN_ZONES.ridge,
  'ridge-summit':BASE_TERRAIN_ZONES.ridge
});

const ATTACKERS = new Set(['sprout','puff','thorn','gust','ember','briar']);
const terrainByPoint = new WeakMap();

export function terrainZoneAt(mapId, point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return TERRAIN_TYPES.ground;
  const cached=point&&typeof point==='object'?terrainByPoint.get(point):null;
  if(cached&&cached.mapId===mapId&&cached.x===point.x&&cached.y===point.y)return cached.terrain;
  const biome = maps[mapId]?.biome || mapId;
  const zone = (TERRAIN_ZONES[mapId] || TERRAIN_ZONES[biome] || []).find(item => {
    const dx=point.x-item.x,dy=point.y-item.y;
    return dx*dx+dy*dy<=item.radius*item.radius;
  });
  const terrain=zone ? TERRAIN_TYPES[zone.type] : TERRAIN_TYPES.ground;
  if(point&&typeof point==='object')terrainByPoint.set(point,{mapId,x:point.x,y:point.y,terrain});
  return terrain;
}

export function terrainBonusForTower(terrain, towerType) {
  const id = typeof terrain === 'string' ? terrain : terrain?.id || 'ground';
  if (id === 'fertile') {
    if (towerType === 'sunflower') return 'Fertile soil · Sunflower earns +3 petals per cleared wave.';
    if (ATTACKERS.has(towerType)) return 'Fertile soil · attack interval is 8% shorter.';
    return 'Fertile soil · no modifier for this support structure.';
  }
  if (id === 'waterEdge') {
    if (towerType === 'dew') return 'Water edge · normal attacks slow for 15% longer.';
    if (towerType === 'briar') return 'Water edge · normal attacks slow and poison for 15% longer.';
    return 'Water edge · no slow or poison modifier for this defender.';
  }
  if (id === 'elevated') {
    if (ATTACKERS.has(towerType)) return 'High ground · attack range is 12% longer.';
    return 'High ground · no attack-range modifier for this support defender.';
  }
  return 'Ordinary grass · standard defender stats.';
}

