import { distanceToPath } from './path-geometry.js';
import { applyCombatHit } from './combat-rules.js';

export const GUARDIAN_SPEED = 150;
export const GUARDIAN_RADIUS = 14;
export const GUARDIAN_PATH_CLEARANCE = 24;
export const GUARDIAN_PULSE_RADIUS = 76;
export const GUARDIAN_PULSE_COOLDOWN = 18;
export const GUARDIAN_DOWN_TIME = 4;

function pointOnSafeGrass(point, path, width, height) {
  return Array.isArray(path) && path.length >= 2 && point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x >= GUARDIAN_RADIUS && point.x <= width - GUARDIAN_RADIUS &&
    point.y >= GUARDIAN_RADIUS && point.y <= height - GUARDIAN_RADIUS &&
    distanceToPath(point.x, point.y, path) >= GUARDIAN_PATH_CLEARANCE;
}

function pointSegmentDistance(x, y, ax, ay, bx, by) {
  const dx=bx-ax,dy=by-ay,lengthSquared=dx*dx+dy*dy;
  const amount=lengthSquared===0?0:Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/lengthSquared));
  return Math.hypot(x-(ax+dx*amount),y-(ay+dy*amount));
}

function orientation(ax, ay, bx, by, cx, cy) { return (bx-ax)*(cy-ay)-(by-ay)*(cx-ax); }

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const abC=orientation(ax,ay,bx,by,cx,cy),abD=orientation(ax,ay,bx,by,dx,dy);
  const cdA=orientation(cx,cy,dx,dy,ax,ay),cdB=orientation(cx,cy,dx,dy,bx,by),epsilon=1e-9;
  if (abC*abD < -epsilon && cdA*cdB < -epsilon) return true;
  const on=(x,y,px,py,qx,qy)=>Math.abs(orientation(px,py,qx,qy,x,y))<=epsilon&&x>=Math.min(px,qx)-epsilon&&x<=Math.max(px,qx)+epsilon&&y>=Math.min(py,qy)-epsilon&&y<=Math.max(py,qy)+epsilon;
  return on(cx,cy,ax,ay,bx,by)||on(dx,dy,ax,ay,bx,by)||on(ax,ay,cx,cy,dx,dy)||on(bx,by,cx,cy,dx,dy);
}

function segmentDistance(ax, ay, bx, by, cx, cy, dx, dy) {
  if (segmentsIntersect(ax,ay,bx,by,cx,cy,dx,dy)) return 0;
  return Math.min(pointSegmentDistance(ax,ay,cx,cy,dx,dy),pointSegmentDistance(bx,by,cx,cy,dx,dy),
    pointSegmentDistance(cx,cy,ax,ay,bx,by),pointSegmentDistance(dx,dy,ax,ay,bx,by));
}

export function guardianDestinationIsSafe(from, to, path, width, height) {
  if (!pointOnSafeGrass(from, path, width, height) || !pointOnSafeGrass(to, path, width, height)) return false;
  for (let index=1;index<path.length;index++) {
    const [ax,ay]=path[index-1],[bx,by]=path[index];
    if (segmentDistance(from.x,from.y,to.x,to.y,ax,ay,bx,by)<GUARDIAN_PATH_CLEARANCE) return false;
  }
  return true;
}

export function createMeadowGuardian(path, width, height) {
  const candidates = [];
  for (let y = 36; y <= height - 36; y += 24) for (let x = 36; x <= width - 36; x += 24) {
    const point = { x, y };
    if (pointOnSafeGrass(point, path, width, height)) candidates.push(point);
  }
  if (!candidates.length) return null;
  // Prefer the lower-left quarter; break equal-distance ties by stable scan order.
  const anchor = { x: width * .24, y: height * .76 };
  candidates.sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y));
  const { x, y } = candidates[0];
  return { x, y, targetX: x, targetY: y, pulseCooldown: 0, downTimer: 0 };
}

export function validateGuardian(value, path, width = 900, height = 540) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'downTimer,pulseCooldown,targetX,targetY,x,y' ||
      !['x', 'y', 'targetX', 'targetY', 'pulseCooldown', 'downTimer'].every(key => Number.isFinite(value[key]))) return false;
  return pointOnSafeGrass(value, path, width, height) && pointOnSafeGrass({ x: value.targetX, y: value.targetY }, path, width, height) &&
    guardianDestinationIsSafe(value, { x: value.targetX, y: value.targetY }, path, width, height) &&
    value.pulseCooldown >= 0 && value.pulseCooldown <= GUARDIAN_PULSE_COOLDOWN &&
    value.downTimer >= 0 && value.downTimer <= GUARDIAN_DOWN_TIME;
}

export function advanceMeadowGuardian(guardian, dt, { path, width = 900, height = 540, enemies = [], enemyPosition = enemy => enemy } = {}) {
  if (!guardian || !Number.isFinite(dt) || dt <= 0) return guardian;
  guardian.pulseCooldown = Math.max(0, guardian.pulseCooldown - dt);
  if (guardian.downTimer > 0) {
    guardian.downTimer = Math.max(0, guardian.downTimer - dt);
    return guardian;
  }
  const contact = enemies.find(enemy => !enemy.flying && !enemy.burrowTimer && enemy.hp > 0 &&
    Math.hypot(enemyPosition(enemy).x - guardian.x, enemyPosition(enemy).y - guardian.y) < GUARDIAN_RADIUS + enemy.radius + 2);
  if (contact) {
    guardian.downTimer = GUARDIAN_DOWN_TIME;
    guardian.targetX = guardian.x;
    guardian.targetY = guardian.y;
    return guardian;
  }
  const dx = guardian.targetX - guardian.x, dy = guardian.targetY - guardian.y, distance = Math.hypot(dx, dy);
  const step = GUARDIAN_SPEED * dt;
  const next = distance <= step ? {x:guardian.targetX,y:guardian.targetY} : distance > 0 ? {x:guardian.x+dx/distance*step,y:guardian.y+dy/distance*step} : {x:guardian.x,y:guardian.y};
  if (!guardianDestinationIsSafe(guardian, next, path, width, height)) {
    guardian.targetX = guardian.x;
    guardian.targetY = guardian.y;
    return guardian;
  }
  guardian.x=next.x;guardian.y=next.y;
  return guardian;
}

export function activateGuardianPulse(guardian, enemies, positionOf = enemy => enemy) {
  if (!guardian || guardian.downTimer > 0 || guardian.pulseCooldown > 0) return { ok: false, reason: 'Guardian pulse is unavailable.' };
  const affected = enemies.filter(enemy => !enemy.flying && !enemy.burrowTimer && enemy.hp > 0 &&
    Math.hypot(positionOf(enemy).x - guardian.x, positionOf(enemy).y - guardian.y) <= GUARDIAN_PULSE_RADIUS);
  if (!affected.length) return { ok: false, reason: 'No ground pests are close enough for Pollen Pulse.' };
  affected.forEach(enemy => applyCombatHit(enemy, 0, { slow: 1.4 }));
  guardian.pulseCooldown = GUARDIAN_PULSE_COOLDOWN;
  return { ok: true, affected };
}
