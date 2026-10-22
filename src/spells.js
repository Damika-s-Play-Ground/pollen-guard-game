import { applyCombatHit, canHitTarget } from './combat-rules.js';

export const DEFAULT_SPELL_LOADOUT = Object.freeze(['bloom', 'snare', 'rootTrap']);
export const SPELL_LOADOUT_SIZE = 3;

export const SPELLS = Object.freeze({
  bloom: Object.freeze({ id:'bloom', name:'Bloom Pulse', kind:'global', range:'Whole trail', area:'All surfaced pests', duration:'1.8s slow', cost:'100 Bloom charge' }),
  snare: Object.freeze({ id:'snare', name:'Ivy Snare', kind:'global', range:'Whole trail', area:'All surfaced pests', duration:'1.7s stun', cost:'45 petals' }),
  rootTrap: Object.freeze({ id:'rootTrap', name:'Root Trap', kind:'circle', range:'Whole field', radius:48, area:'48-unit radius', duration:'2.4s root', cost:55 }),
  lineGust: Object.freeze({ id:'lineGust', name:'Line Gust', kind:'line', range:'Whole field · 240-unit line', length:240, width:34, area:'34-unit wide line', duration:'0.7s push/stagger', cost:65 }),
  rejuvenation: Object.freeze({ id:'rejuvenation', name:'Rejuvenation Field', kind:'circle', range:'Whole field', radius:78, area:'78-unit radius', duration:'6s · 15% faster attacks', cost:80 })
});

export function validSpellLoadout(loadout) {
  return Array.isArray(loadout) && loadout.length === SPELL_LOADOUT_SIZE &&
    loadout.every(id => Object.hasOwn(SPELLS, id)) && new Set(loadout).size === SPELL_LOADOUT_SIZE;
}

export function normalizeSpellLoadout(loadout) {
  return validSpellLoadout(loadout) ? [...loadout] : [...DEFAULT_SPELL_LOADOUT];
}

export function buildSpellPreview(spellId) {
  const spell = SPELLS[spellId];
  if (!spell) return null;
  return {
    id:spell.id, name:spell.name, range:spell.range, area:spell.area,
    duration:spell.duration, cost:typeof spell.cost === 'number' ? `${spell.cost} petals` : spell.cost,
    targeting:spell.kind === 'line' ? 'Choose a start point, then an endpoint. Tap again to cast.' : spell.kind === 'circle' ? 'Choose a point on the field.' : 'Affects the whole trail.'
  };
}

export function pointToSegmentDistance(point, start, end) {
  const dx=end.x-start.x, dy=end.y-start.y, lengthSquared=dx*dx+dy*dy;
  const amount=lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x-start.x)*dx+(point.y-start.y)*dy)/lengthSquared));
  return Math.hypot(point.x-(start.x+dx*amount), point.y-(start.y+dy*amount));
}

export function isSpellTargetValid(spellId, payload, width=900, height=540) {
  if (!payload || !Number.isFinite(payload.x) || !Number.isFinite(payload.y) || payload.x<0 || payload.x>width || payload.y<0 || payload.y>height) return false;
  if (spellId === 'rootTrap' || spellId === 'rejuvenation') return true;
  if (spellId !== 'lineGust' || !Number.isFinite(payload.endX) || !Number.isFinite(payload.endY) || payload.endX<0 || payload.endX>width || payload.endY<0 || payload.endY>height) return false;
  const length=Math.hypot(payload.endX-payload.x,payload.endY-payload.y);
  return length>0 && length<=SPELLS.lineGust.length;
}

export function applyAimedSpell(spellId, payload, enemies, positionOf=enemy=>enemy) {
  const spell=SPELLS[spellId];
  if (!spell || !['rootTrap','lineGust'].includes(spellId)) return { affected:[], defeated:[], results:[] };
  const start={x:payload.x,y:payload.y}, end={x:payload.endX,y:payload.endY};
  const eligible=enemies.filter(enemy=>canHitTarget({canHitAir:spellId==='lineGust'},enemy));
  const affected=eligible.filter(enemy=>{
    const point=positionOf(enemy);
    return spellId==='rootTrap'
      ? Math.hypot(point.x-start.x,point.y-start.y)<=spell.radius
      : pointToSegmentDistance(point,start,end)<=spell.width/2;
  });
  const attack=spellId==='rootTrap'?{stun:2.4}:{push:70,stun:.7};
  const results=affected.map(enemy=>({enemy,...applyCombatHit(enemy,0,attack)}));
  return { affected, results, defeated:[] };
}
