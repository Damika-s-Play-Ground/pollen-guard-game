import { distanceToPath, pointOnPath } from './path-geometry.js';
import { drawTowerArt } from './tower-art.js';
import { projectileStyleForTower } from './projectile-visuals.js';
import { combinationForPair } from './tower-combinations.js';
import { PLANTING_SETTLE_SECONDS } from './planting-effects.js';
import { pathSegmentsWithinRadius } from './route-coverage.js';
import { guardianDestinationIsSafe, GUARDIAN_PATH_CLEARANCE, GUARDIAN_PULSE_RADIUS } from './meadow-guardian.js';
import { TERRAIN_TYPES, TERRAIN_ZONES } from './terrain.js';
import { enemySilhouetteMetrics, writeEnemySilhouetteMetrics } from './enemy-silhouette.js';
import { canTowerHitTarget, isBurrowed } from './combat-rules.js';

const COMBINATION_LINK_STYLES = Object.freeze({
  'golden-seeds': Object.freeze({ color:'#ffd447', dash:[5, 7] }),
  'frosted-seeds': Object.freeze({ color:'#91eaff', dash:[10, 7] }),
  'steam-burst': Object.freeze({ color:'#ff944f', dash:[5, 7, 2, 7] }),
  sporecap: Object.freeze({ color:'#b9e66b', dash:[9, 7, 3, 7] }),
  'windcarved-thorns': Object.freeze({ color:'#d6d6ff', dash:[5, 9] }),
  'cyclone-cap': Object.freeze({ color:'#dd9fff', dash:[8, 7, 2, 7] })
});

const enemyRoleGlyphSprites = new WeakMap();
// drawBattlefield is synchronous; reuse these per-enemy wrappers between frames
// instead of allocating one short-lived object per enemy on every render.
const enemyVisualScratch = [];
const shotVisualScratch = [];
// Battlefield draws are synchronous; these frame workspaces are consumed before reuse.
const firingShotByTowerScratch = new Map();
const scaledDashScratch = [];
const EMPTY_DASH = Object.freeze([]);
const DASH_2_2 = Object.freeze([2,2]);
const DASH_2_3 = Object.freeze([2,3]);
const DASH_2_7 = Object.freeze([2,7]);
const DASH_3_2 = Object.freeze([3,2]);
const DASH_3_3 = Object.freeze([3,3]);
const DASH_4_4 = Object.freeze([4,4]);
const DASH_4_9 = Object.freeze([4,9]);
const DASH_5_4 = Object.freeze([5,4]);
const DASH_5_5 = Object.freeze([5,5]);
const DASH_6_4 = Object.freeze([6,4]);
const DASH_7_5 = Object.freeze([7,5]);
const DASH_8_6 = Object.freeze([8,6]);
const DASH_8_7 = Object.freeze([8,7]);
const DASH_3_6_LINK = Object.freeze([3,6]);
const bossWarningBoxScratch = [];
const bossWarningScratch = [];
const bossWarningCandidateScratch = [];
const bossWarningCandidatePool = [];
const terrainLabelBoxScratch = [];
const towerArtOptionsScratch = [];
const placementTowerArtOptionsScratch = {level:1,branch:null,color:'#79b85b',scale:1,scaleX:.82,scaleY:.82,displayScale:1};
const seedRecoveryPathPointScratch={x:0,y:0};
const burrowPathPointScratch={x:0,y:0};
const SEED_RECOVERY_PATH_LINES=Object.freeze([
  Object.freeze({offset:-3,color:'#69d6b7',direction:1}),
  Object.freeze({offset:3,color:'#f1bd67',direction:-1})
]);
const BURROW_SOIL_OFFSETS=Object.freeze([12,25,38]);
const ENEMY_LEG_SIDES=Object.freeze([-1,1]);
function compareBossWarningCandidates(a,b) { return a.score-b.score; }
const DEFAULT_ROLE_GLYPH_STYLE = Object.freeze({});
const EXIT_WARNING_GLYPH_STYLE = Object.freeze({ fontWeight:'bold', color:'#fff' });

function drawEnemyRoleGlyphFallback(ctx, glyph, x, y, fontSize, style) {
  const fontWeight = style.fontWeight || '';
  const color = style.color || '#fff8df';
  ctx.font = `${fontWeight ? `${fontWeight} ` : ''}${fontSize}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  ctx.fillText(glyph, x, y);
}

function drawEnemyRoleGlyph(ctx, glyph, x, y, fontSize, style = DEFAULT_ROLE_GLYPH_STYLE) {
  const document = ctx.canvas?.ownerDocument;
  if (!document?.createElement) { drawEnemyRoleGlyphFallback(ctx, glyph, x, y, fontSize, style); return; }
  let styles = enemyRoleGlyphSprites.get(document);
  if (!styles) { styles = new Map(); enemyRoleGlyphSprites.set(document, styles); }
  let sizes = styles.get(style);
  if (!sizes) { sizes = new Map(); styles.set(style, sizes); }
  let sprites = sizes.get(fontSize);
  if (!sprites) { sprites = new Map(); sizes.set(fontSize, sprites); }
  let sprite = sprites.get(glyph);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = 32; sprite.height = 32;
    const spriteContext = sprite.getContext('2d');
    if (!spriteContext) { drawEnemyRoleGlyphFallback(ctx, glyph, x, y, fontSize, style); return; }
    const fontWeight = style.fontWeight || '';
    const color = style.color || '#fff8df';
    spriteContext.font = `${fontWeight ? `${fontWeight} ` : ''}${fontSize}px sans-serif`;
    spriteContext.textAlign = 'center'; spriteContext.textBaseline = 'middle'; spriteContext.fillStyle = color;
    spriteContext.fillText(glyph, 16, 16);
    sprites.set(glyph, sprite);
  }
  ctx.drawImage(sprite, x - 16, y - 16);
}

function tracePath(ctx, path) {
  ctx.beginPath();
  for(let index=0;index<path.length;index++){
    const [x,y]=path[index];
    if(index)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
}

function traceOffsetPath(ctx,path,offsetX,offsetY){
  ctx.beginPath();
  for(let index=0;index<path.length;index++){
    const [x,y]=path[index],drawX=x+offsetX,drawY=y+offsetY;
    if(index)ctx.lineTo(drawX,drawY);else ctx.moveTo(drawX,drawY);
  }
}

function setScaledLineDash(ctx,pattern,scale){
  const normalizedScale=Number.isFinite(scale)&&scale>0?scale:1;
  scaledDashScratch.length=pattern.length;
  for(let index=0;index<pattern.length;index++)scaledDashScratch[index]=pattern[index]/normalizedScale;
  ctx.setLineDash(scaledDashScratch);
}

function drawAirRoute(ctx,path) {
  if (!Array.isArray(path) || path.length < 2) return;
  tracePath(ctx,path);ctx.setLineDash(EMPTY_DASH);ctx.strokeStyle='#244e58aa';ctx.lineWidth=9;ctx.stroke();
  tracePath(ctx,path);ctx.setLineDash(DASH_2_7);ctx.strokeStyle='#7be0ef';ctx.lineWidth=4;ctx.stroke();ctx.setLineDash(EMPTY_DASH);
}

function drawGateRoutePreviews(ctx,routes,selectedRoute,displayScale=1){
  if(!Array.isArray(routes)||routes.length<2)return;
  const colors=['#b5f071','#72d9e8','#edc76c'];
  routes.forEach((route,index)=>{
    if(!Array.isArray(route.path)||route.path.length<2)return;
    tracePath(ctx,route.path);ctx.strokeStyle=colors[index%colors.length]+'aa';ctx.lineWidth=Math.max(2,3/(displayScale||1));ctx.setLineDash(DASH_8_7);ctx.stroke();ctx.setLineDash(EMPTY_DASH);
    const [x,y]=route.path[Math.floor((route.path.length-1)/2)];ctx.fillStyle='#17271ee8';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors[index%colors.length];ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(route.label.slice(0,1).toUpperCase(),x,y);
  });
  ctx.setLineDash(EMPTY_DASH);ctx.globalAlpha=1;
}

function drawSeedRecoveryPaths(ctx,path,pathLength,objective,displayScale=1){
  if(!objective||!Array.isArray(path)||path.length<2||!Number.isFinite(pathLength)||pathLength<=0)return;
  const pickupDistance=pathLength*.52,step=Math.max(12,22/(displayScale||1));
  for(let lineIndex=0;lineIndex<SEED_RECOVERY_PATH_LINES.length;lineIndex++){
    const {offset,color,direction}=SEED_RECOVERY_PATH_LINES[lineIndex];
    ctx.beginPath();
    for(let distance=0,index=0;distance<pickupDistance;distance+=step,index++){
      const point=pointOnPath(path,distance,seedRecoveryPathPointScratch);if(index===0)ctx.moveTo(point.x,point.y+offset);else ctx.lineTo(point.x,point.y+offset);
    }
    const cache=pointOnPath(path,pickupDistance,seedRecoveryPathPointScratch);ctx.lineTo(cache.x,cache.y+offset);
    ctx.strokeStyle=color;ctx.lineWidth=Math.max(2.2,3/(displayScale||1));ctx.setLineDash(DASH_5_4);ctx.stroke();ctx.setLineDash(EMPTY_DASH);
    const arrowDistance=direction>0?pickupDistance*.78:pickupDistance*.25;
    const tip=pointOnPath(path,arrowDistance,seedRecoveryPathPointScratch),tipX=tip.x,tipY=tip.y;
    const behind=pointOnPath(path,arrowDistance-direction*8,seedRecoveryPathPointScratch);
    const angle=Math.atan2(tipY-behind.y,tipX-behind.x);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(tipX,tipY+offset);
    ctx.lineTo(tipX-Math.cos(angle-.55)*8,tipY+offset-Math.sin(angle-.55)*8);ctx.lineTo(tipX-Math.cos(angle+.55)*8,tipY+offset-Math.sin(angle+.55)*8);ctx.closePath();ctx.fill();
  }
  const cache=pointOnPath(path,pickupDistance,seedRecoveryPathPointScratch),cacheX=cache.x,cacheY=cache.y;
  let availableCount=0;
  for(let index=0;index<objective.seeds.length;index++)if(objective.seeds[index].state==='available')availableCount++;
  let availableIndex=0;
  for(let index=0;index<objective.seeds.length;index++){
    const seed=objective.seeds[index];
    if(seed.state!=='available')continue;
    const offset=(availableIndex++-(availableCount-1)/2)*14;ctx.fillStyle='#f8e18c';ctx.strokeStyle='#473b23';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(cacheX+offset,cacheY-15,5,8,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  for(let index=0;index<objective.seeds.length;index++){
    const seed=objective.seeds[index];
    if(seed.state!=='dropped')continue;
    ctx.beginPath();ctx.arc(seed.x,seed.y,10,0,Math.PI*2);ctx.fillStyle='#f2c66c55';ctx.fill();ctx.strokeStyle='#fff0a1';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff2b5';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',seed.x,seed.y);
  }
}

function drawAirCoverage(ctx,path,center,radius,displayScale) {
  if (!Array.isArray(path) || !Number.isFinite(radius) || radius<=0) return;
  const segments=pathSegmentsWithinRadius(path,center,radius);
  if (!segments.length) return;
  ctx.beginPath();for(const segment of segments){ctx.moveTo(segment.x1,segment.y1);ctx.lineTo(segment.x2,segment.y2);}
  ctx.strokeStyle='#ffdf6e';ctx.lineWidth=Math.max(3,5/(displayScale||1));ctx.setLineDash(EMPTY_DASH);ctx.stroke();
}

function drawBiomeAccents(ctx, map, path) {
  let turn = 0;
  for (let index = 1; index < path.length - 1; index++) {
    const [x, y] = path[index], [px, py] = path[index - 1], [nx, ny] = path[index + 1];
    const aLength = Math.hypot(x - px, y - py), bLength = Math.hypot(nx - x, ny - y);
    if (!aLength || !bLength) continue;
    const cross = (x - px) * (ny - y) - (y - py) * (nx - x);
    if (Math.abs(cross) < 1 || turn++ % 2) continue;
    const normalX = (-(y - py) / aLength - (ny - y) / bLength), normalY = ((x - px) / aLength + (nx - x) / bLength);
    const normalLength = Math.hypot(normalX, normalY) || 1, accentX = x + normalX / normalLength * 35, accentY = y + normalY / normalLength * 35;
    if (map.biome === 'creek') {
      ctx.fillStyle = '#579db477'; ctx.beginPath(); ctx.ellipse(accentX, accentY, 11, 5, .4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(accentX - 5, accentY); ctx.lineTo(accentX - 1, accentY - 2); ctx.lineTo(accentX + 3, accentY); ctx.moveTo(accentX - 2, accentY + 3); ctx.lineTo(accentX + 3, accentY + 1); ctx.strokeStyle = '#e4f1da'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = '#5d7754'; ctx.beginPath(); ctx.moveTo(accentX + 7, accentY + 6); ctx.lineTo(accentX + 7, accentY - 5); ctx.moveTo(accentX + 10, accentY + 6); ctx.lineTo(accentX + 10, accentY - 3); ctx.stroke(); ctx.fillStyle = '#79583c'; ctx.fillRect(accentX + 5.5, accentY - 7, 3, 4); ctx.fillRect(accentX + 8.5, accentY - 5, 3, 3);
    } else if (map.biome === 'ridge') {
      ctx.fillStyle = '#827957'; ctx.beginPath(); ctx.moveTo(accentX - 12, accentY + 6); ctx.lineTo(accentX - 8, accentY - 4); ctx.lineTo(accentX - 2, accentY - 8); ctx.lineTo(accentX + 5, accentY - 3); ctx.lineTo(accentX + 12, accentY + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#526449'; ctx.beginPath(); ctx.moveTo(accentX + 8, accentY + 5); ctx.lineTo(accentX + 14, accentY - 8); ctx.lineTo(accentX + 20, accentY + 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d4c49b'; ctx.beginPath(); ctx.moveTo(accentX - 7, accentY - 3); ctx.lineTo(accentX - 2, accentY - 8); ctx.lineTo(accentX + 2, accentY - 3); ctx.closePath(); ctx.fill();
    } else {
      for (let petal = 0; petal < 5; petal++) { const angle = petal * Math.PI * 2 / 5; ctx.fillStyle = petal % 2 ? '#fff1c4' : '#efb39d'; ctx.beginPath(); ctx.arc(accentX + Math.cos(angle) * 5, accentY + Math.sin(angle) * 5, 2.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#d8a93e'; ctx.beginPath(); ctx.arc(accentX, accentY, 2.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawRouteLandmarks(ctx, path, pathLength) {
  const start = path[0], next = path[1], dx = next[0] - start[0], dy = next[1] - start[1], length = Math.hypot(dx, dy) || 1;
  const gateX = start[0] - dy / length * 24, gateY = start[1] + dx / length * 24;
  ctx.fillStyle = '#765b3dcc'; ctx.beginPath(); ctx.ellipse(gateX, gateY + 2, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#273522'; ctx.beginPath(); ctx.ellipse(gateX, gateY + 1, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d5bf86'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(gateX, gateY + 1, 7, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c2a16a';
  for(const [dxStone,dyStone,radius] of [[-10,-2,2.5],[9,-3,2.2],[-7,7,2],[8,7,2.4]]){
    ctx.beginPath();ctx.arc(gateX+dxStone,gateY+dyStone,radius,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle = '#fff4d5'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('IN', gateX, gateY + 14);

  const goal = pointOnPath(path, pathLength);
  ctx.fillStyle = '#557e48'; ctx.beginPath(); ctx.arc(goal.x, goal.y, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eff2be'; ctx.beginPath(); ctx.arc(goal.x, goal.y, 20, 0, Math.PI * 2); ctx.fill();
  const seedY=goal.y-4;
  ctx.fillStyle = '#a67745'; ctx.strokeStyle = '#755434'; ctx.lineWidth = 1.2; ctx.beginPath();
  ctx.moveTo(goal.x,seedY+8);ctx.bezierCurveTo(goal.x-4,seedY+5,goal.x-11,seedY-1,goal.x-9,seedY-6);
  ctx.bezierCurveTo(goal.x-7,seedY-11,goal.x-2,seedY-9,goal.x,seedY-5);
  ctx.bezierCurveTo(goal.x+3,seedY-11,goal.x+9,seedY-9,goal.x+10,seedY-4);
  ctx.bezierCurveTo(goal.x+11,seedY+1,goal.x+4,seedY+7,goal.x,seedY+8);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle = '#486b3b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(goal.x, goal.y - 7); ctx.lineTo(goal.x + 1, goal.y - 13); ctx.lineTo(goal.x + 8, goal.y - 16); ctx.moveTo(goal.x + 2, goal.y - 12); ctx.lineTo(goal.x - 5, goal.y - 16); ctx.stroke();
  ctx.fillStyle = '#334d31'; ctx.font = 'bold 7px sans-serif'; ctx.fillText('GOAL', goal.x, goal.y + 14);
}

function drawTerrainZones(ctx,map,displayScale=1) {
  const zones=TERRAIN_ZONES[map.biome]||[],scale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
  for(const zone of zones){
    const terrain=TERRAIN_TYPES[zone.type],{x,y,radius}=zone;
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=terrain.color+'22';ctx.fill();
    if(zone.type==='fertile'){
      // Distinct cultivated beds make the benefit read as worked soil, while
      // the outer ring continues to show the exact circular rules boundary.
      for(const [dx,dy,angle] of [[-20,-13,-.18],[18,-10,.16],[-10,17,-.12],[22,17,.2]]){
        ctx.beginPath();ctx.ellipse(x+dx,y+dy,18,8,angle,0,Math.PI*2);ctx.fillStyle='#79573d99';ctx.fill();
        ctx.strokeStyle='#e8d99a';ctx.lineWidth=Math.max(1.2,1/scale);
        for(const offset of [-3,2]){ctx.beginPath();ctx.moveTo(x+dx-12,y+dy+offset);ctx.lineTo(x+dx+12,y+dy+offset);ctx.stroke();}
        ctx.fillStyle='#91b86e';ctx.beginPath();ctx.arc(x+dx,y+dy-5,2.2,0,Math.PI*2);ctx.fill();
      }
    }else if(zone.type==='waterEdge'){
      ctx.beginPath();ctx.moveTo(x-42,y-10);ctx.bezierCurveTo(x-24,y-25,x-7,y-1,x+6,y-13);ctx.bezierCurveTo(x+22,y-28,x+31,y-4,x+43,y-10);
      ctx.lineTo(x+40,y+17);ctx.bezierCurveTo(x+21,y+28,x+10,y+8,x-5,y+22);ctx.bezierCurveTo(x-20,y+34,x-29,y+10,x-42,y+20);ctx.closePath();
      ctx.fillStyle='#438e91b8';ctx.fill();ctx.strokeStyle='#b4e5d0';ctx.lineWidth=Math.max(1.5,1/scale);ctx.stroke();
      ctx.strokeStyle='#d5ffffdd';ctx.lineWidth=Math.max(1.5,1/scale);
      for(const [dx,dy,width] of [[-25,-5,13],[8,-2,16],[-4,12,11],[28,10,7]]){
        ctx.beginPath();ctx.moveTo(x+dx-width/2,y+dy);ctx.quadraticCurveTo(x+dx,y+dy-2,x+dx+width/2,y+dy);ctx.stroke();
      }
    }else if(zone.type==='elevated'){
      ctx.beginPath();ctx.moveTo(x-38,y+20);ctx.lineTo(x-27,y-2);ctx.lineTo(x-12,y-11);ctx.lineTo(x-3,y-31);ctx.lineTo(x+12,y-17);
      ctx.lineTo(x+25,y-13);ctx.lineTo(x+39,y+20);ctx.closePath();ctx.fillStyle='#89999a';ctx.fill();ctx.strokeStyle='#e8f0dc';ctx.lineWidth=Math.max(1.5,1/scale);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-26,y+13);ctx.lineTo(x-17,y-2);ctx.lineTo(x-7,y-7);ctx.lineTo(x-1,y-20);ctx.lineTo(x+9,y-9);
      ctx.lineTo(x+22,y-4);ctx.lineTo(x+31,y+13);ctx.closePath();ctx.fillStyle='#aebbb0';ctx.fill();
      ctx.strokeStyle='#667d7b';ctx.lineWidth=Math.max(1.2,1/scale);
      for(const [ax,ay,bx,by] of [[-20,1,-13,5],[8,-9,15,-4],[17,7,24,10]]){ctx.beginPath();ctx.moveTo(x+ax,y+ay);ctx.lineTo(x+bx,y+by);ctx.stroke();}
    }
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.setLineDash(DASH_7_5);ctx.strokeStyle=terrain.color;ctx.lineWidth=Math.max(2,1.3/scale);ctx.stroke();ctx.setLineDash(EMPTY_DASH);
  }
  ctx.setLineDash(EMPTY_DASH);ctx.globalAlpha=1;
}

function drawTerrainLabels(ctx,map,displayScale=1) {
  const scale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
  for(const zone of TERRAIN_ZONES[map.biome]||[]){
    const label=TERRAIN_TYPES[zone.type].label,fontSize=Math.max(9,10/scale),labelY=zone.y+zone.radius*(scale<.7&&zone.type==='waterEdge'?-2.2:scale<.7?.82:.58);
    ctx.font=`700 ${fontSize}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    const labelWidth=label.length*fontSize*.62+10,labelHeight=fontSize+6;
    ctx.fillStyle='#17271edc';ctx.fillRect(zone.x-labelWidth/2,labelY-labelHeight/2,labelWidth,labelHeight);
    ctx.fillStyle='#f3f8e7';ctx.fillText(label,zone.x,labelY);
  }
}

function drawStaticMapLayer(ctx, { width, height, map, path, pathLength, airPath, showAirRoute = true, displayScale = 1 }) {
  ctx.fillStyle = map.background;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 34; i++) {
    const x = (i * 173 + 39) % width, y = (i * 97 + 26) % height;
    if (distanceToPath(x, y, path) < 43) continue;
    ctx.globalAlpha = .55; ctx.fillStyle = i % 2 ? map.patch : '#638b62'; ctx.beginPath(); ctx.ellipse(x, y, 24 + (i % 4) * 7, 11 + (i % 3) * 5, (i % 5) * .3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .9; ctx.fillStyle = ['#fff0bd', '#f4b8a5', '#e7f4d0'][i % 3]; ctx.beginPath(); ctx.arc((i * 137 + 21) % width, (i * 71 + 15) % height, 1.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for(const zone of map.buildZones||[]){ctx.fillStyle='#d4f3a42a';ctx.fillRect(zone.x,zone.y,zone.width,zone.height);ctx.strokeStyle='#34683c88';ctx.lineWidth=1.5;ctx.setLineDash(DASH_8_6);ctx.strokeRect(zone.x,zone.y,zone.width,zone.height);ctx.setLineDash(EMPTY_DASH);ctx.fillStyle='#294630';ctx.font=`700 ${Math.max(9,10/displayScale)}px sans-serif`;ctx.fillText('BUILD ZONE',zone.x+4,zone.y+12);}
  drawTerrainZones(ctx,map,displayScale);
  // A single down-right cast shadow gives the route a raised edge against the
  // garden while remaining below all moving enemies and placement feedback.
  traceOffsetPath(ctx,path,3,7);ctx.strokeStyle='#35463c';ctx.globalAlpha=.22;ctx.lineWidth=48;ctx.stroke();ctx.globalAlpha=1;
  tracePath(ctx, path); ctx.strokeStyle = map.edge; ctx.lineWidth = 44; ctx.stroke();
  tracePath(ctx, path); ctx.strokeStyle = map.trail; ctx.lineWidth = 34; ctx.stroke();
  tracePath(ctx, path); ctx.setLineDash(DASH_4_9); ctx.strokeStyle = '#af9f6c'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash(EMPTY_DASH);
  if(showAirRoute)drawAirRoute(ctx,airPath);
  drawBiomeAccents(ctx, map, path);
  drawRouteLandmarks(ctx, path, pathLength);
  drawTerrainLabels(ctx,map,displayScale);
  ctx.globalAlpha = 1;
}

export function createStaticMapCache(createCanvas) {
  let canvas = null, cacheKey = null;
  return {
    draw(ctx, state) {
      const { width, height, map, path, pathLength, airPath, showAirRoute = true, displayScale } = state;
      const buildZones=map.buildZones||null;
      let changed=!cacheKey||width!==cacheKey.width||height!==cacheKey.height||map.biome!==cacheKey.biome||
        map.background!==cacheKey.background||map.patch!==cacheKey.patch||map.edge!==cacheKey.edge||map.trail!==cacheKey.trail||
        pathLength!==cacheKey.pathLength||showAirRoute!==cacheKey.showAirRoute||displayScale!==cacheKey.displayScale||
        !samePathCoordinates(path,cacheKey.path)||!samePathCoordinates(airPath,cacheKey.airPath)||!sameBuildZoneCoordinates(buildZones,cacheKey.buildZones);
      if (changed) {
        canvas = createCanvas(width, height);
        canvas.width = width;
        canvas.height = height;
        drawStaticMapLayer(canvas.getContext('2d'), state);
        cacheKey={width,height,biome:map.biome,background:map.background,patch:map.patch,edge:map.edge,trail:map.trail,
          path:copyPathCoordinates(path),pathLength,airPath:copyPathCoordinates(airPath),showAirRoute,displayScale,buildZones:copyBuildZoneCoordinates(buildZones)};
      }
      ctx.drawImage(canvas, 0, 0);
    },
    invalidate() {
      cacheKey = null;
    }
  };
}

function samePathCoordinates(path,snapshot) {
  if(!Array.isArray(path))return snapshot===null;
  if(!snapshot||snapshot.length!==path.length*2)return false;
  for(let index=0;index<path.length;index++){
    const point=path[index],offset=index*2;
    if(!point||point[0]!==snapshot[offset]||point[1]!==snapshot[offset+1])return false;
  }
  return true;
}

function copyPathCoordinates(path) {
  if(!Array.isArray(path))return null;
  const snapshot=new Array(path.length*2);
  for(let index=0;index<path.length;index++){
    const point=path[index],offset=index*2;
    snapshot[offset]=point?.[0];snapshot[offset+1]=point?.[1];
  }
  return snapshot;
}

function sameBuildZoneCoordinates(zones,snapshot) {
  if(!Array.isArray(zones))return snapshot===null;
  if(!snapshot||snapshot.length!==zones.length*4)return false;
  for(let index=0;index<zones.length;index++){
    const zone=zones[index],offset=index*4;
    if(!zone||zone.x!==snapshot[offset]||zone.y!==snapshot[offset+1]||zone.width!==snapshot[offset+2]||zone.height!==snapshot[offset+3])return false;
  }
  return true;
}

function copyBuildZoneCoordinates(zones) {
  if(!Array.isArray(zones))return null;
  const snapshot=new Array(zones.length*4);
  for(let index=0;index<zones.length;index++){
    const zone=zones[index],offset=index*4;
    snapshot[offset]=zone?.x;snapshot[offset+1]=zone?.y;snapshot[offset+2]=zone?.width;snapshot[offset+3]=zone?.height;
  }
  return snapshot;
}

export function traceEnemyShape(ctx, enemy, x, y, radius) {
  ctx.beginPath();
  if (enemy.boss) {
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * .78 : radius;
      const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  } else if (enemy.type === 'shield') {
    ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y); ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y); ctx.closePath();
  } else if (enemy.type === 'carrier') {
    for (let i = 0; i < 6; i++) { const angle = -Math.PI / 2 + i * Math.PI / 3, cut = radius * (i % 2 ? .9 : 1), px = x + Math.cos(angle) * cut, py = y + Math.sin(angle) * cut; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  } else if (enemy.type === 'burrower') {
    ctx.ellipse(x, y, radius, radius * .72, 0, 0, Math.PI * 2);
  } else if (enemy.flying) {
    ctx.moveTo(x, y - radius); ctx.lineTo(x + radius * 1.45, y - radius * .25); ctx.lineTo(x + radius * .55, y + radius * .15);
    ctx.lineTo(x, y + radius * .95); ctx.lineTo(x - radius * .55, y + radius * .15); ctx.lineTo(x - radius * 1.45, y - radius * .25); ctx.closePath();
  } else if (enemy.type === 'armored') {
    for (let i = 0; i < 6; i++) { const angle = -Math.PI / 2 + i * Math.PI / 3, px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  } else if (enemy.type === 'splitter') {
    ctx.arc(x, y, radius * .52, 0, Math.PI * 2);
    for (let i = 0; i < 3; i++) { const angle = -Math.PI / 2 + i * Math.PI * 2 / 3; ctx.arc(x + Math.cos(angle) * radius * .68, y + Math.sin(angle) * radius * .68, radius * .28, 0, Math.PI * 2); }
  } else if (enemy.type === 'healer') {
    ctx.moveTo(x - radius * .5, y - radius); ctx.lineTo(x + radius * .5, y - radius); ctx.lineTo(x + radius * .5, y - radius * .5);
    ctx.lineTo(x + radius, y - radius * .5); ctx.lineTo(x + radius, y + radius * .5); ctx.lineTo(x + radius * .5, y + radius * .5);
    ctx.lineTo(x + radius * .5, y + radius); ctx.lineTo(x - radius * .5, y + radius); ctx.lineTo(x - radius * .5, y + radius * .5);
    ctx.lineTo(x - radius, y + radius * .5); ctx.lineTo(x - radius, y - radius * .5); ctx.lineTo(x - radius * .5, y - radius * .5); ctx.closePath();
  } else if (enemy.type === 'crumb') {
    ctx.moveTo(x, y - radius * .8); ctx.lineTo(x + radius * .8, y + radius * .65); ctx.lineTo(x - radius * .8, y + radius * .65); ctx.closePath();
  } else if (enemy.type === 'zip') {
    ctx.moveTo(x - radius * 1.25, y); ctx.lineTo(x - radius * .2, y - radius * .72); ctx.lineTo(x + radius * 1.3, y); ctx.lineTo(x - radius * .2, y + radius * .72); ctx.closePath();
  } else {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
}

function drawStatusMark(ctx, mark, x, y) {
  ctx.beginPath();
  if (mark === 'burn') { ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 3); ctx.lineTo(x - 2, y + 1); ctx.closePath(); ctx.fill(); }
  else if (mark === 'poison') { ctx.arc(x - 2, y, 1.4, 0, Math.PI * 2); ctx.arc(x + 2, y, 1.4, 0, Math.PI * 2); ctx.fill(); }
  else if (mark === 'slow') { ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); }
  else if (mark === 'stun') { ctx.moveTo(x - 2, y - 3); ctx.lineTo(x - 2, y + 3); ctx.moveTo(x + 2, y - 3); ctx.lineTo(x + 2, y + 3); }
  else { ctx.moveTo(x - 3, y + 3); ctx.lineTo(x, y - 3); ctx.lineTo(x + 3, y + 3); }
  ctx.stroke();
}

function drawStatusMarks(ctx, enemy, x, y) {
  const burn=enemy.burn>0,poison=enemy.poison>0,slow=enemy.slow>0,stun=enemy.stun>0,armorBreak=enemy.armorBreak>0;
  const count=Number(burn)+Number(poison)+Number(slow)+Number(stun)+Number(armorBreak);
  if(!count)return;
  ctx.strokeStyle='#fff';ctx.fillStyle='#172019';ctx.lineWidth=1.4;
  let index=0;
  if(burn)drawStatusMark(ctx,'burn',x+(index++-(count-1)/2)*9,y);
  if(poison)drawStatusMark(ctx,'poison',x+(index++-(count-1)/2)*9,y);
  if(slow)drawStatusMark(ctx,'slow',x+(index++-(count-1)/2)*9,y);
  if(stun)drawStatusMark(ctx,'stun',x+(index++-(count-1)/2)*9,y);
  if(armorBreak)drawStatusMark(ctx,'break',x+(index-(count-1)/2)*9,y);
}

function drawEnemyDetails(ctx, enemy, x, y, time = 0, displayScale = 1, silhouette = enemySilhouetteMetrics(enemy,time)) {
  const {gait}=silhouette;
  const scale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
  ctx.lineWidth = Math.max(enemy.boss ? 2 : 1.4,1/scale); ctx.strokeStyle = '#24372b'; ctx.fillStyle = '#fff0c9';
  if (enemy.flying) {
    const flap = gait;
    ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 12, y - 7 - flap); ctx.lineTo(x - 7, y + 2); ctx.moveTo(x + 3, y); ctx.lineTo(x + 12, y - 7 + flap); ctx.lineTo(x + 7, y + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x - 7, y + 6); ctx.moveTo(x + 5, y + 3); ctx.lineTo(x + 7, y + 6); ctx.stroke();
  } else {
    const legY = y + enemy.radius * .55;
    ctx.beginPath();
    for (const side of ENEMY_LEG_SIDES) {
      ctx.moveTo(x + side * 4, legY); ctx.lineTo(x + side * 7, legY + 3 + gait * .35);
      ctx.moveTo(x + side * 1, legY + 1); ctx.lineTo(x + side * 2, legY + 4 - gait * .35);
    }
    ctx.stroke();
  }
  if (enemy.type === 'mite') {
    ctx.beginPath(); ctx.moveTo(x - 3, y - enemy.radius * .6); ctx.lineTo(x - 6, y - enemy.radius - 3); ctx.moveTo(x + 3, y - enemy.radius * .6); ctx.lineTo(x + 6, y - enemy.radius - 3); ctx.stroke();
    ctx.fillStyle = '#263b2c'; ctx.beginPath(); ctx.arc(x - 3, y - 1, 1.2, 0, Math.PI * 2); ctx.arc(x + 3, y - 1, 1.2, 0, Math.PI * 2); ctx.fill();
  } else if (enemy.type === 'zip') {
    ctx.beginPath(); ctx.moveTo(x - enemy.radius - 8, y - 3); ctx.lineTo(x - enemy.radius - 2, y - 3); ctx.moveTo(x - enemy.radius - 10, y + 2); ctx.lineTo(x - enemy.radius - 3, y + 2); ctx.stroke();
    ctx.fillStyle = '#263b2c'; ctx.beginPath(); ctx.arc(x + 2, y - 1, 1, 0, Math.PI * 2); ctx.fill();
  } else if (enemy.type === 'armored' || enemy.boss) {
    ctx.beginPath(); ctx.moveTo(x - enemy.radius * .55, y - 2); ctx.lineTo(x - enemy.radius * .25, y - enemy.radius * .55); ctx.lineTo(x + enemy.radius * .1, y - 2); ctx.moveTo(x + enemy.radius * .1, y - 2); ctx.lineTo(x + enemy.radius * .4, y - enemy.radius * .55); ctx.lineTo(x + enemy.radius * .65, y - 2); ctx.stroke();
    if (enemy.boss) { ctx.beginPath(); ctx.moveTo(x - 10, y - enemy.radius + 3); ctx.lineTo(x - 15, y - enemy.radius - 8); ctx.lineTo(x - 5, y - enemy.radius + 1); ctx.moveTo(x + 10, y - enemy.radius + 3); ctx.lineTo(x + 15, y - enemy.radius - 8); ctx.lineTo(x + 5, y - enemy.radius + 1); ctx.stroke(); }
  } else if (enemy.type === 'shield') {
    ctx.beginPath(); ctx.moveTo(x - enemy.radius * .55, y - enemy.radius * .25); ctx.lineTo(x, y - enemy.radius * .65); ctx.lineTo(x + enemy.radius * .55, y - enemy.radius * .25); ctx.stroke();
  } else if (enemy.type === 'splitter') {
    ctx.fillStyle = '#e7f2c7'; ctx.beginPath(); ctx.arc(x - enemy.radius * .55, y, 2, 0, Math.PI * 2); ctx.arc(x + enemy.radius * .55, y, 2, 0, Math.PI * 2); ctx.fill();
  } else if (enemy.type === 'healer') {
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
  } else if (enemy.type === 'carrier') {
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y - 1); ctx.lineTo(x, y + 3); ctx.lineTo(x - 4, y - 1); ctx.closePath(); ctx.stroke();
  } else if (enemy.type === 'crumb') {
    ctx.beginPath(); ctx.moveTo(x, y - enemy.radius - 1); ctx.lineTo(x - 3, y - enemy.radius + 3); ctx.moveTo(x, y - enemy.radius - 1); ctx.lineTo(x + 3, y - enemy.radius + 3); ctx.stroke();
  }
}

export function projectileScreenRadius(shot, displayScale = 1) {
  const scale = Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1;
  return Math.min(14, Math.max(7, (shot.r || 3) * 1.25, 4.5 / scale));
}

export function drawProjectile(ctx, shot, point, angle = 0, displayScale = 1) {
  const { shape:style, trail } = projectileStyleForTower(shot.sourceTowerType);
  const radius = projectileScreenRadius(shot, displayScale);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  ctx.fillStyle = shot.color || '#f3e8be';
  ctx.strokeStyle = shot.color || '#f3e8be';
  ctx.lineWidth = 1.8;
  if (trail !== 'none') {
    ctx.globalAlpha = .62;
    ctx.beginPath();
    if (trail === 'curl') {
      ctx.arc(-radius * 1.7, 0, radius, -.9, .9);
      ctx.arc(-radius * 1.3, 0, radius * .58, -.8, .8);
    } else if (trail === 'ripple') {
      ctx.arc(-radius * .9, 0, radius * .65, 2.25, 4.05);
    } else if (trail === 'soft') {
      ctx.arc(-radius * 1.1, -radius * .25, radius * .7, 2.5, 4.2);
      ctx.arc(-radius * 1.1, radius * .25, radius * .7, 2.1, 3.8);
    } else if (trail === 'ember') {
      ctx.moveTo(-radius * 1.8, 0); ctx.lineTo(-radius * .75, -radius * .35);
      ctx.moveTo(-radius * 1.35, radius * .15); ctx.lineTo(-radius * .5, radius * .3);
    } else if (trail === 'roots') {
      ctx.moveTo(-radius * 1.8, 0); ctx.lineTo(-radius * .65, 0);
      ctx.moveTo(-radius * 1.1, 0); ctx.lineTo(-radius * 1.55, -radius * .55);
      ctx.moveTo(-radius * .95, 0); ctx.lineTo(-radius * 1.35, radius * .55);
    } else {
      ctx.moveTo(-radius * 1.8, 0); ctx.lineTo(-radius * .8, 0);
      if (trail === 'short') { ctx.moveTo(-radius * 1.3, 0); ctx.lineTo(-radius * .9, -radius * .65); }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = '#20352a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (shot.splitProjectile) {
    ctx.moveTo(radius, 0); ctx.lineTo(0, -radius * .65); ctx.lineTo(-radius, 0); ctx.lineTo(0, radius * .65); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-radius * .7, -radius * .8, radius * .28, 0, Math.PI * 2); ctx.arc(-radius * .7, radius * .8, radius * .28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (style === 'leaf') {
    ctx.moveTo(-radius, 0); ctx.quadraticCurveTo(-radius * .15, -radius, radius, 0);
    ctx.quadraticCurveTo(-radius * .15, radius, -radius, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-radius * .65, 0); ctx.lineTo(radius * .68, 0); ctx.stroke();
  } else if (style === 'droplet') {
    ctx.moveTo(radius, 0); ctx.quadraticCurveTo(radius * .05, radius * 1.1, -radius, 0);
    ctx.quadraticCurveTo(-radius * .55, -radius * .75, radius, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-radius * .15, -radius * .2, Math.max(1, radius * .2), 0, Math.PI * 2); ctx.fillStyle = '#e8ffff'; ctx.fill();
  } else if (style === 'spore') {
    ctx.arc(0, 0, radius * .7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const satelliteRadius=radius*.32;
    ctx.beginPath();ctx.arc(-radius,-radius*.55,satelliteRadius,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(-radius,radius*.55,satelliteRadius,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(radius*.5,-radius*.7,satelliteRadius,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(radius*.5,radius*.7,satelliteRadius,0,Math.PI*2);ctx.fill();ctx.stroke();
  } else if (style === 'dart') {
    ctx.moveTo(radius * 1.8, 0); ctx.lineTo(-radius, -radius * .52); ctx.lineTo(-radius * .35, 0); ctx.lineTo(-radius, radius * .52); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (style === 'wind') {
    ctx.arc(0, 0, radius * .8, -.9, .9); ctx.arc(0, 0, radius * .45, -.75, .75);
    ctx.strokeStyle = '#f4f4d6'; ctx.lineWidth = 2.8; ctx.stroke(); ctx.strokeStyle = '#20352a'; ctx.lineWidth = 1.4; ctx.stroke();
  } else if (style === 'flame') {
    ctx.moveTo(radius * 1.3, 0); ctx.quadraticCurveTo(radius * .25, radius, -radius, 0);
    ctx.quadraticCurveTo(-radius * .15, -radius * .65, -radius * .35, -radius); ctx.quadraticCurveTo(radius * .1, -radius * .62, radius * 1.3, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (style === 'seed') {
    ctx.moveTo(radius * 1.2, 0); ctx.lineTo(0, -radius * .7); ctx.lineTo(-radius, 0); ctx.lineTo(0, radius * .7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-radius * .25, -radius * .55); ctx.lineTo(-radius * .7, -radius * 1.05); ctx.moveTo(-radius * .25, radius * .55); ctx.lineTo(-radius * .7, radius * 1.05); ctx.stroke();
  } else {
    ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

export function drawImpactMark(ctx, kind, x, y, radius, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#fff8df';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (kind === 'kill') {
    for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,inner=radius*.32,outer=i%2?radius*.72:radius,ix=x+Math.cos(a)*inner,iy=y+Math.sin(a)*inner,ox=x+Math.cos(a)*outer,oy=y+Math.sin(a)*outer;ctx.moveTo(ix,iy);ctx.lineTo(ox,oy);}
  }
  else if(kind==='armoredKill'){ctx.arc(x,y,radius*.7,0,Math.PI*2);ctx.moveTo(x-radius*.8,y);ctx.lineTo(x+radius*.8,y);ctx.moveTo(x,y-radius*.8);ctx.lineTo(x,y+radius*.8);ctx.moveTo(x-radius*.56,y-radius*.56);ctx.lineTo(x+radius*.56,y+radius*.56);ctx.moveTo(x+radius*.56,y-radius*.56);ctx.lineTo(x-radius*.56,y+radius*.56);}
  else if(kind === 'bossKill') { ctx.arc(x,y,radius,0,Math.PI*2);ctx.moveTo(x-radius*.7,y);ctx.lineTo(x+radius*.7,y);ctx.moveTo(x,y-radius*.7);ctx.lineTo(x,y+radius*.7); }
  else if (kind === 'ripple') ctx.arc(x, y, radius, 0, Math.PI * 2);
  else if (kind === 'burst') { ctx.arc(x, y, radius * .7, 0, Math.PI * 2); ctx.arc(x-radius, y+radius*.25, radius*.45, 0, Math.PI*2); ctx.arc(x+radius, y+radius*.25, radius*.45, 0, Math.PI*2); }
  else if (kind === 'cross') { ctx.moveTo(x-radius,y-radius);ctx.lineTo(x+radius,y+radius);ctx.moveTo(x+radius,y-radius);ctx.lineTo(x-radius,y+radius); }
  else if (kind === 'split') { ctx.moveTo(x-radius,y);ctx.lineTo(x+radius,y);ctx.moveTo(x,y-radius);ctx.lineTo(x,y+radius); }
  else if (kind === 'gust') { ctx.arc(x, y, radius, -.8, .8);ctx.arc(x, y, radius*.65, 2.3, 3.9); }
  else if (kind === 'flame') { ctx.moveTo(x,y+radius);ctx.lineTo(x-radius*.45,y);ctx.lineTo(x,y-radius);ctx.lineTo(x+radius*.45,y);ctx.closePath(); }
  else if (kind === 'roots') { for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,r=i%2?radius*.45:radius,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath(); }
  else if (kind === 'leaf') { ctx.moveTo(x-radius,y);ctx.quadraticCurveTo(x,y-radius,x+radius,y);ctx.quadraticCurveTo(x,y+radius,x-radius,y);ctx.closePath(); }
  else { ctx.arc(x, y, radius, 0, Math.PI * 2); }
  ctx.stroke();
  ctx.restore();
}

export function drawSplashBoundary(ctx, x, y, radius, alpha = 1) {
  if (!(radius > 0)) return;
  ctx.save();
  ctx.globalAlpha = alpha * .78;
  ctx.strokeStyle = '#fff3bd';
  ctx.lineWidth = 1.4;
  ctx.setLineDash(DASH_4_4);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash(EMPTY_DASH);
  ctx.restore();
}

export function shotRecoil(animation, now, launchedAt, duration = .075) {
  if (animation !== 'full' || !(duration > 0) || !Number.isFinite(launchedAt)) return 0;
  return Math.max(0, Math.min(1, 1 - Math.max(0, now - launchedAt) / duration));
}

export function cosmeticParticleScreenRadius(particle, displayScale = 1) {
  const scale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
  return particle.impactKind?Math.max(particle.r*1.5,2/scale):Math.max(particle.r,1/scale);
}

function drawCosmeticParticle(ctx, particle, displayScale = 1) {
  const alpha=Math.max(0,particle.life/particle.maxLife);
  const radius=cosmeticParticleScreenRadius(particle,displayScale);
  if(particle.impactKind){
    const mark=['kill','armoredKill','bossKill'].includes(particle.impactKind)?particle.impactKind:projectileStyleForTower(particle.impactKind).mark;
    drawImpactMark(ctx,mark,particle.x,particle.y,radius,alpha);
    if(particle.splashRadius)drawSplashBoundary(ctx,particle.x,particle.y,particle.splashRadius,alpha);
  }else{
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=particle.color;ctx.beginPath();ctx.arc(particle.x,particle.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}

export function plantingSettle(animation, now, plantedAt, duration = PLANTING_SETTLE_SECONDS) {
  if (!Number.isFinite(now) || !Number.isFinite(plantedAt) || !(duration > 0)) return null;
  const age=now-plantedAt;
  if(age<0||age>=duration||animation==='off')return null;
  const progress=Math.max(0,Math.min(1,age/duration));
  if(animation==='reduced')return {progress,scaleX:1,scaleY:1,offsetY:0,outlineAlpha:1};
  if(animation!=='full')return null;
  const mix=(a,b,t)=>a+(b-a)*t;
  let scaleX,scaleY,offsetY;
  if(progress<.22){const t=progress/.22;scaleX=mix(.86,1.1,t);scaleY=mix(.74,1.1,t);offsetY=mix(2.5,-1,t);}
  else if(progress<.56){const t=(progress-.22)/.34;scaleX=mix(1.1,.97,t);scaleY=mix(1.1,.93,t);offsetY=mix(-1,1,t);}
  else{const t=(progress-.56)/.44;scaleX=mix(.97,1,t);scaleY=mix(.93,1,t);offsetY=mix(1,0,t);}
  return {progress,scaleX,scaleY,offsetY,outlineAlpha:0};
}

// The returned Map is a borrowed workspace and is overwritten on the next call.
export function createEnemyCueStackRanker() {
  const ranks=new Map(),cellCoordinates=[],cells=new Map(),usedCells=[];
  return function rankEnemyCueStacks(centers) {
    ranks.clear();
    for(const center of centers)ranks.set(center.id,0);
    for(const cell of usedCells)cell.length=0;
    usedCells.length=0;
    if(!centers.length)return ranks;
    let cellSize=0;
    for(const center of centers){
      const overlapRadius=center.overlapRadius??center.radius;
      if(!Number.isFinite(center.x)||!Number.isFinite(center.y)||!Number.isFinite(overlapRadius)||overlapRadius<0)return countCueOverlaps(centers,ranks);
      cellSize=Math.max(cellSize,overlapRadius*2+18);
    }
    if(cellSize>=Math.sqrt(Number.MAX_VALUE))return countCueOverlaps(centers,ranks);

    for(let index=0;index<centers.length;index++){
      const center=centers[index],x=Math.floor(center.x/cellSize),y=Math.floor(center.y/cellSize);
      if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||Math.abs(x)>=Number.MAX_SAFE_INTEGER||Math.abs(y)>=Number.MAX_SAFE_INTEGER)return countCueOverlaps(centers,ranks);
      const coordinate=cellCoordinates[index]||(cellCoordinates[index]={x:0,y:0});
      coordinate.x=x;coordinate.y=y;
    }
    for(let index=0;index<centers.length;index++){
      const {x,y}=cellCoordinates[index];
      let row=cells.get(y);
      if(!row){row=new Map();cells.set(y,row);}
      let cell=row.get(x);
      if(!cell){cell=[];row.set(x,cell);}
      if(!cell.length)usedCells.push(cell);
      cell.push(index);
    }
    for(let left=0;left<centers.length;left++){
      const a=centers[left],{x:cellX,y:cellY}=cellCoordinates[left];
      for(let y=cellY-1;y<=cellY+1;y++){
        const row=cells.get(y);
        if(!row)continue;
        for(let x=cellX-1;x<=cellX+1;x++){
          const cell=row.get(x);
          if(!cell)continue;
          for(const right of cell){
            if(right<=left)continue;
            const b=centers[right];
            if(a.id===b.id)continue;
            const reach=(a.overlapRadius??a.radius)+(b.overlapRadius??b.radius)+18,dx=a.x-b.x,dy=a.y-b.y;
            if(!(Math.hypot(dx,dy)<reach))continue;
            const higher=a.id>b.id?a.id:b.id;
            ranks.set(higher,ranks.get(higher)+1);
          }
        }
      }
    }
    return ranks;
  };
}

export function enemyCueStackRanks(centers) {
  return createEnemyCueStackRanker()(centers);
}

function countCueOverlaps(centers, ranks) {
  for (let left = 0; left < centers.length; left++) for (let right = left + 1; right < centers.length; right++) {
    const a = centers[left], b = centers[right];
    if (a.id === b.id) continue;
    const reach = (a.overlapRadius??a.radius) + (b.overlapRadius??b.radius) + 18, dx = a.x - b.x, dy = a.y - b.y;
    if (!(Math.hypot(dx, dy) < reach)) continue;
    const higher = a.id > b.id ? a.id : b.id;
    ranks.set(higher, ranks.get(higher) + 1);
  }
  return ranks;
}

// drawBattlefield is synchronous and already uses module-owned visual scratch.
// This rank Map is consumed within the same callback before the next frame reuses it.
const renderEnemyCueStackRanks=createEnemyCueStackRanker();

export function drawBattlefield(ctx, state, renderAlpha = 1, staticMapCache = null) {
  const {
    width, height, displayScale = 1, map, path, pathLength, airPath, towers, selectedTower, towersDef, towersLinked, selectedTowerRange,
    enemies, enemyPosition, shots, shotPosition, shotAngle = () => 0, particles, selectedType, pointer, placementError,
    placementPreviewRange, abilityPreview, palette, highContrastEnemyColors, selectedTargetId, visualTime = 0, enemyHitFlash = () => 0, impactCausalityForEnemy = () => null, recoilForTower = () => 0, recoilAngleForTower = () => null,
    plantingForTower = () => null, attackCueForTower = () => null, armorFeedbackForEnemy = () => null, healerLinks = [], healerFeedbackForEnemy = () => null, burrowEmergenceForEnemy = () => null, bossChoreoForEnemy = () => null, guardian = null, guardianMoveActive = false, guardianCursor = null, gateRoutePreviews = null, selectedGateRoute = null, placementComboPreviews = () => [], showEnemyRoleGlyphs = true
  } = state;
  const enemyStrokeScale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
  ctx.clearRect(0, 0, width, height);
  if (staticMapCache) staticMapCache.draw(ctx, state);
  else drawStaticMapLayer(ctx, state);
  drawGateRoutePreviews(ctx,gateRoutePreviews,selectedGateRoute,displayScale);
  drawSeedRecoveryPaths(ctx,path,pathLength,state.seedObjective,displayScale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (selectedTower && towersDef[selectedTower.type]?.antiAir && airPath) {
    drawAirCoverage(ctx,airPath,selectedTower,selectedTowerRange(selectedTower),displayScale);
  }

  const firingByTower = firingShotByTowerScratch;
  firingByTower.clear();
  for (const shot of shots) if (shot.sourceTowerId != null && !firingByTower.has(shot.sourceTowerId)) firingByTower.set(shot.sourceTowerId, shot);
  const linkScale = Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1;
  for (let i = 0; i < towers.length; i++) for (let j = i + 1; j < towers.length; j++) {
    const a = towers[i], b = towers[j];
    if (!towersLinked(a, b)) continue;
    const focused = selectedTower === a || selectedTower === b;
    const combination = combinationForPair(a, b), style = focused && combination ? COMBINATION_LINK_STYLES[combination.id] : null;
    if(style)setScaledLineDash(ctx,style.dash,linkScale);else ctx.setLineDash(DASH_3_6_LINK); ctx.strokeStyle = style?.color || '#ffe18a77';
    ctx.lineWidth = style ? Math.max(2, 2.5 / linkScale) : 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash(EMPTY_DASH);
  }
  for(let towerIndex=0;towerIndex<towers.length;towerIndex++){
    const tower=towers[towerIndex];
    const def = towersDef[tower.type], isSelected = tower === selectedTower;
    const range = isSelected ? selectedTowerRange(tower) : null;
    let artX=tower.x,artY=tower.y;
    const firingShot=firingByTower.get(tower.id);
    const recoil=Math.max(0,Math.min(1,recoilForTower(tower.id)));
    if(recoil>0){const dx=firingShot?firingShot.x-tower.x:0,dy=firingShot?firingShot.y-tower.y:0,angle=recoilAngleForTower(tower.id)??(firingShot?(Math.hypot(dx,dy)>.5?Math.atan2(dy,dx):shotAngle(firingShot,renderAlpha)):0);artX-=Math.cos(angle)*2.5*recoil;artY-=Math.sin(angle)*2.5*recoil;}
    const planting=plantingForTower(tower.id);
    const attackCue=attackCueForTower(tower);
    if(planting?.outlineAlpha>0){ctx.beginPath();ctx.arc(tower.x,tower.y,22,0,Math.PI*2);ctx.strokeStyle=`rgba(230,255,187,${planting.outlineAlpha})`;ctx.lineWidth=2.4;ctx.stroke();}
    if (range) { ctx.beginPath(); ctx.arc(tower.x, tower.y, range, 0, Math.PI * 2); ctx.fillStyle = '#efffc31b'; ctx.fill(); ctx.strokeStyle = '#f1ffd588'; ctx.lineWidth = 1.3; ctx.stroke(); }
    const artOptions=towerArtOptionsScratch[towerIndex]||(towerArtOptionsScratch[towerIndex]={});
    artOptions.level=tower.level;artOptions.branch=tower.branch??tower.branchChoice;artOptions.color=def.color;artOptions.scale=1;
    artOptions.scaleX=planting?.scaleX??1;artOptions.scaleY=planting?.scaleY??1;artOptions.displayScale=displayScale;
    drawTowerArt(ctx, tower.type, artX, artY+(planting?.offsetY||0), artOptions);
    if(attackCue&&Number.isFinite(attackCue.angle)&&attackCue.strength>0){
      const angle=attackCue.angle,cos=Math.cos(angle),sin=Math.sin(angle),start=tower.radius??18,end=start+18,tipX=tower.x+cos*end,tipY=tower.y+sin*end,backX=tower.x+cos*(end-5),backY=tower.y+sin*(end-5),wingX=-sin*4,wingY=cos*4;
      ctx.save();ctx.globalAlpha=Math.min(1,.5+attackCue.strength*.5);ctx.lineCap='round';ctx.lineJoin='round';
      ctx.strokeStyle='#263d2c';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(tower.x+cos*start,tower.y+sin*start);ctx.lineTo(tipX,tipY);ctx.moveTo(backX+wingX,backY+wingY);ctx.lineTo(tipX,tipY);ctx.lineTo(backX-wingX,backY-wingY);ctx.stroke();
      ctx.strokeStyle='#fff0a8';ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(tower.x+cos*start,tower.y+sin*start);ctx.lineTo(tipX,tipY);ctx.moveTo(backX+wingX,backY+wingY);ctx.lineTo(tipX,tipY);ctx.lineTo(backX-wingX,backY-wingY);ctx.stroke();
      ctx.restore();
    }
    if (isSelected) { ctx.beginPath(); ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2); ctx.setLineDash(DASH_2_3); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash(EMPTY_DASH); }
    if (tower.level > 1) { ctx.fillStyle = '#ffe28b'; ctx.beginPath(); ctx.arc(tower.x + 11, tower.y - 11, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#493e20'; ctx.font = '8px DM Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tower.level, tower.x + 11, tower.y - 10); }
  }
  if (abilityPreview) {
    let tower=null;
    for(let towerIndex=0;towerIndex<towers.length;towerIndex++)if(towers[towerIndex].id===abilityPreview.towerId){tower=towers[towerIndex];break;}
    if (tower) {
      ctx.beginPath(); ctx.arc(tower.x, tower.y, abilityPreview.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe18a20'; ctx.fill(); ctx.setLineDash(DASH_7_5); ctx.strokeStyle = '#fff0a9'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash(EMPTY_DASH);
    }
  }
  for(let linkIndex=0;linkIndex<healerLinks.length;linkIndex++){
    const link=healerLinks[linkIndex];
    if(!link?.from||!link?.to)continue;
    ctx.save();ctx.globalAlpha=link.alpha??1;ctx.strokeStyle='#c8f59a';ctx.fillStyle='#f4ffd1';ctx.lineWidth=Math.max(2,2/enemyStrokeScale);setScaledLineDash(ctx,DASH_6_4,enemyStrokeScale);ctx.beginPath();ctx.moveTo(link.from.x,link.from.y);ctx.lineTo(link.to.x,link.to.y);ctx.stroke();ctx.setLineDash(EMPTY_DASH);const pulse=link.progress??1,x=link.from.x+(link.to.x-link.from.x)*pulse,y=link.from.y+(link.to.y-link.from.y)*pulse;ctx.beginPath();ctx.arc(x,y,3.5/enemyStrokeScale,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  // Threat silhouettes follow projectiles and particles; health and warning overlays follow the bodies.
  const shotVisuals=shotVisualScratch;
  shotVisuals.length=shots.length;
  for(let index=0;index<shots.length;index++){
    const shot=shots[index],visual=shotVisuals[index]||(shotVisuals[index]={point:null,targetPoint:null});
    visual.point ||= {x:0,y:0};
    visual.targetPoint ||= {x:0,y:0};
    visual.point=shotPosition(shot,renderAlpha,visual.point);
    const angle=shotAngle(shot,renderAlpha,visual.point,visual.targetPoint);
    drawProjectile(ctx,shot,visual.point,angle,displayScale);
  }
  for(let particleIndex=0;particleIndex<particles.length;particleIndex++)drawCosmeticParticle(ctx,particles[particleIndex],displayScale);
  const enemyVisuals = enemyVisualScratch;
  enemyVisuals.length = enemies.length;
  for (let index = 0; index < enemies.length; index++) {
    const enemy = enemies[index];
    const visual = enemyVisuals[index] || (enemyVisuals[index] = { enemy:null, point:null, silhouette:null });
    visual.enemy = enemy;
    visual.point ||= { x:0, y:0 };
    visual.silhouette ||= enemySilhouetteMetrics(enemy,visualTime);
    visual.point = enemyPosition(enemy,renderAlpha,visual.point);
    visual.silhouette = writeEnemySilhouetteMetrics(enemy,visualTime,visual.silhouette);
    visual.id = enemy.id;
    visual.radius = visual.silhouette.radius;
    visual.overlapRadius = visual.silhouette.overlapRadius;
    visual.x = visual.point.x;
    visual.y = visual.point.y - (enemy.flying ? visual.silhouette.radius * .85 : visual.silhouette.float);
    visual.rawY = visual.point.y;
  }
  for(let visualIndex=0;visualIndex<enemyVisuals.length;visualIndex++){
    const {enemy,point,silhouette}=enemyVisuals[visualIndex];
    const altitude=enemy.flying?silhouette.radius*.85:silhouette.float,bodyY=point.y-altitude;
    const causality=impactCausalityForEnemy(enemy);
    if(causality?.from&&causality.alpha>0){ctx.save();ctx.globalAlpha=Math.min(1,causality.alpha)*.55;ctx.strokeStyle=causality.color||'#fff0a8';ctx.lineWidth=Math.max(1.5,2/enemyStrokeScale);setScaledLineDash(ctx,DASH_5_4,enemyStrokeScale);ctx.beginPath();ctx.moveTo(causality.from.x,causality.from.y);ctx.lineTo(point.x,bodyY);ctx.stroke();ctx.setLineDash(EMPTY_DASH);ctx.globalAlpha=Math.min(1,causality.alpha);ctx.beginPath();ctx.arc(point.x,bodyY,silhouette.radius+7,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.fillStyle = '#35503d66'; ctx.beginPath(); ctx.ellipse(point.x, point.y + (enemy.flying ? 13 : 8), silhouette.radius * 1.1, silhouette.radius * .52, 0, 0, Math.PI * 2); ctx.fill();
    if (enemy.flying) { ctx.beginPath(); ctx.setLineDash(DASH_2_3); ctx.moveTo(point.x, point.y + 5); ctx.lineTo(point.x, bodyY + silhouette.radius * .65); ctx.strokeStyle = '#f9f6d0aa'; ctx.lineWidth = Math.max(1,1/enemyStrokeScale); ctx.stroke(); ctx.setLineDash(EMPTY_DASH); }
    if (enemy.boss || enemy.shield > 0 || enemy.armor > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(enemy.boss ? 2.5 : 1.8,1.05/enemyStrokeScale); ctx.beginPath(); ctx.arc(point.x, bodyY, silhouette.radius + (enemy.boss ? 4 : 2), 0, Math.PI * 2); if (enemy.shield > 0) ctx.setLineDash(DASH_2_2); ctx.stroke(); ctx.setLineDash(EMPTY_DASH); }
    if (enemy.carrierTelegraphTimer > 0 || enemy.wardFlash > 0) {
      ctx.beginPath(); ctx.arc(point.x, bodyY, enemy.radius + (enemy.carrierTelegraphTimer > 0 ? 9 : 6), 0, Math.PI * 2);
      ctx.strokeStyle = '#a9f4ef'; ctx.lineWidth = enemy.carrierTelegraphTimer > 0 ? 2.6 : 2; ctx.setLineDash(enemy.carrierTelegraphTimer > 0 ? DASH_3_2 : EMPTY_DASH); ctx.stroke(); ctx.setLineDash(EMPTY_DASH);
    }
    if (enemy.healerTelegraphTimer > 0 || enemy.supportFlash > 0) {
      ctx.beginPath(); ctx.arc(point.x, bodyY, enemy.radius + (enemy.healerTelegraphTimer > 0 ? 8 : 5), 0, Math.PI * 2);
      ctx.strokeStyle = '#e3ffc1'; ctx.lineWidth = enemy.healerTelegraphTimer > 0 ? 2.6 : 2; ctx.setLineDash(enemy.healerTelegraphTimer > 0 ? DASH_3_2 : EMPTY_DASH); ctx.stroke(); ctx.setLineDash(EMPTY_DASH);
    }
    if (enemy.burrowTelegraphTimer > 0) {
      ctx.beginPath(); ctx.arc(point.x, point.y, enemy.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#e0b878'; ctx.lineWidth = 2.6/enemyStrokeScale; setScaledLineDash(ctx,DASH_3_2,enemyStrokeScale); ctx.stroke(); ctx.setLineDash(EMPTY_DASH);
      for (let markerIndex=0;markerIndex<3;markerIndex++) {
        const dx=markerIndex===1?0:markerIndex===0?-5:5,dy=-enemy.radius-(markerIndex===1?9:5);
        ctx.beginPath(); ctx.arc(point.x+dx/enemyStrokeScale,point.y+Math.sign(dy)*enemy.radius+dy/enemyStrokeScale,2.2/enemyStrokeScale,0,Math.PI*2); ctx.fillStyle='#c99453'; ctx.fill();
      }
    }
    const burrowed=isBurrowed(enemy);
    if (burrowed) {
      for(let soilIndex=0;soilIndex<BURROW_SOIL_OFFSETS.length;soilIndex++){const soil=pointOnPath(path,Math.max(0,enemy.progress-BURROW_SOIL_OFFSETS[soilIndex]),burrowPathPointScratch);ctx.beginPath();ctx.ellipse(soil.x,soil.y,Math.min(10,Math.max(2.5,3.5/enemyStrokeScale)),Math.min(6,Math.max(1.8,2.4/enemyStrokeScale)),0,0,Math.PI*2);ctx.fillStyle='#b88b55cc';ctx.fill();}
      ctx.fillStyle = '#8a5b28'; ctx.strokeStyle = '#4b321c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(point.x, point.y, enemy.radius * 1.2, enemy.radius * .58, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(point.x, point.y - 1, enemy.radius * .5, Math.PI, Math.PI * 2); ctx.strokeStyle = '#d7b77b'; ctx.stroke();
    } else {
      ctx.fillStyle = palette === 'high-contrast' ? (highContrastEnemyColors[enemy.type] || enemy.color) : enemy.color; traceEnemyShape(ctx, enemy, point.x, bodyY, silhouette.radius); ctx.fill(); ctx.strokeStyle = '#172019'; ctx.lineWidth = Math.max(1.5,1.05/enemyStrokeScale); ctx.stroke();
      drawEnemyDetails(ctx, enemy, point.x, bodyY, visualTime,enemyStrokeScale,silhouette);
    }
    if (enemyHitFlash(enemy) > 0) { ctx.beginPath(); ctx.arc(point.x, bodyY, silhouette.radius + 2, 0, Math.PI * 2); ctx.strokeStyle = '#fff8d9'; ctx.lineWidth = 2.5; ctx.stroke(); }
    const roleGlyphFontSize = enemy.boss ? 17 : 13;
    if (showEnemyRoleGlyphs) {
      if (burrowed) drawEnemyRoleGlyph(ctx, '⌃', point.x, point.y - 2, roleGlyphFontSize);
      else drawEnemyRoleGlyph(ctx, enemy.flying ? '✦' : enemy.type === 'armored' ? '⬟' : enemy.type === 'shield' ? '◇' : enemy.type === 'carrier' ? '⬡' : enemy.type === 'splitter' ? '●' : enemy.type === 'healer' ? '+' : enemy.boss ? '♛' : '•', point.x, bodyY, roleGlyphFontSize);
    }
    const burrowEmergence=enemy.type==='burrower'&&enemy.burrowTimer<=0?burrowEmergenceForEnemy(enemy):null;
    if(burrowEmergence){ctx.save();ctx.globalAlpha=burrowEmergence.alpha??1;ctx.beginPath();ctx.arc(point.x,bodyY,silhouette.radius+11,0,Math.PI*2);ctx.strokeStyle='#e9cf82';ctx.lineWidth=Math.max(2.2,2.4/enemyStrokeScale);ctx.stroke();ctx.fillStyle='#fff0ae';ctx.font=`bold ${Math.max(8,9/enemyStrokeScale)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SURFACED',point.x,bodyY+silhouette.radius+13/enemyStrokeScale);ctx.restore();}
    if(enemy.carryingSeedId!==null&&enemy.carryingSeedId!==undefined){ctx.fillStyle='#fff1a0';ctx.font='bold 13px sans-serif';ctx.fillText('✦',point.x+enemy.radius*.75,bodyY-enemy.radius*.8);}
  }
  // Ability target markers must sit above enemy silhouettes, like selected-target markers.
  let abilityTowerExists=false;
  if(abilityPreview)for(let towerIndex=0;towerIndex<towers.length;towerIndex++)if(towers[towerIndex].id===abilityPreview.towerId){abilityTowerExists=true;break;}
  if(abilityPreview&&abilityTowerExists){
    for(let enemyIndex=0;enemyIndex<enemies.length;enemyIndex++){
      const enemy=enemies[enemyIndex];
      if(abilityPreview.targetIds&&!abilityPreview.targetIds.includes(enemy.id))continue;
      const point=enemyPosition(enemy,renderAlpha);ctx.beginPath();ctx.arc(point.x,point.y,enemy.radius+7,0,Math.PI*2);ctx.fillStyle='#ffe18a44';ctx.fill();ctx.strokeStyle='#fff7c9';ctx.lineWidth=2.5;ctx.stroke();
    }
  }
  if (guardian) {
    if (guardianMoveActive && guardian.downTimer <= 0) {
      const safe = guardianCursor && guardianDestinationIsSafe(guardian, guardianCursor, path, width, height);
      ctx.beginPath();ctx.arc(guardian.x,guardian.y,GUARDIAN_PULSE_RADIUS,0,Math.PI*2);ctx.fillStyle='#d9f48b12';ctx.fill();ctx.strokeStyle='#e6f5ae77';ctx.setLineDash(DASH_5_5);ctx.lineWidth=1;ctx.stroke();ctx.setLineDash(EMPTY_DASH);
      ctx.beginPath();ctx.moveTo(guardian.x,guardian.y);ctx.lineTo(guardianCursor?.x??guardian.targetX,guardianCursor?.y??guardian.targetY);ctx.strokeStyle=safe?'#e7f3a8cc':'#f0937acc';ctx.setLineDash(DASH_4_4);ctx.stroke();ctx.setLineDash(EMPTY_DASH);
      if(guardianCursor){ctx.beginPath();ctx.arc(guardianCursor.x,guardianCursor.y,GUARDIAN_PATH_CLEARANCE,0,Math.PI*2);ctx.strokeStyle=safe?'#dff6a6':'#ff9c89';ctx.lineWidth=2;ctx.stroke();}
    }
    ctx.fillStyle='#26442a99';ctx.beginPath();ctx.ellipse(guardian.x,guardian.y+8,13,6,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=guardian.downTimer>0?.58:1;
    ctx.fillStyle='#7aab52';ctx.strokeStyle='#243b29';ctx.lineWidth=2;ctx.beginPath();ctx.arc(guardian.x,guardian.y,13,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(let index=0;index<5;index++){const angle=index*Math.PI*2/5;ctx.fillStyle='#f4df8b';ctx.beginPath();ctx.ellipse(guardian.x+Math.cos(angle)*6,guardian.y+Math.sin(angle)*6,3,5,angle,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#593f2c';ctx.beginPath();ctx.arc(guardian.x,guardian.y,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    if(guardian.downTimer>0){ctx.strokeStyle='#fff0d9';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(guardian.x-5,guardian.y-5);ctx.lineTo(guardian.x+5,guardian.y+5);ctx.moveTo(guardian.x+5,guardian.y-5);ctx.lineTo(guardian.x-5,guardian.y+5);ctx.stroke();}
  }
  ctx.globalAlpha = 1;
  // Keep threat information readable even when volleys and impact particles cross the enemy.
  const bossWarningBoxes = bossWarningBoxScratch;
  bossWarningBoxes.length = 0;
  const bossWarnings = bossWarningScratch;
  bossWarnings.length = 0;
  const terrainZones = TERRAIN_ZONES[map.biome]||[];
  const terrainLabelBoxes = terrainLabelBoxScratch;
  terrainLabelBoxes.length = terrainZones.length;
  for(let index=0;index<terrainZones.length;index++){
    const zone=terrainZones[index];
    const terrainScale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
    const label=TERRAIN_TYPES[zone.type].label,fontSize=Math.max(9,10/terrainScale);
    const labelY=zone.y+zone.radius*(terrainScale<.7&&zone.type==='waterEdge'?-2.2:terrainScale<.7?.82:.58);
    const labelWidth=label.length*fontSize*.62+10,labelHeight=fontSize+6;
    const box=terrainLabelBoxes[index]||(terrainLabelBoxes[index]={left:0,right:0,top:0,bottom:0});
    box.left=zone.x-labelWidth/2;box.right=zone.x+labelWidth/2;box.top=labelY-labelHeight/2;box.bottom=labelY+labelHeight/2;
  }
  const cueStackRanks = renderEnemyCueStackRanks(enemyVisuals);
  for(let index=0;index<enemies.length;index++){
    const enemy=enemies[index],cueCenter=enemyVisuals[index],point=cueCenter.point,bodyY=cueCenter.y,radius=cueCenter.radius;
    const stackRank=cueStackRanks.get(enemy.id)||0,cueY=bodyY-stackRank*11;
    const barWidth=enemy.boss?42:26,barTop=cueY-radius-9;
    ctx.fillStyle = '#263b2c'; ctx.fillRect(point.x - barWidth / 2 - 1, barTop - 1, barWidth + 2, 5);
    ctx.fillStyle = '#f2d77e'; ctx.fillRect(point.x - barWidth / 2, barTop, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 3);
    if (enemy.shield > 0) { ctx.fillStyle = '#effcff'; ctx.fillRect(point.x - barWidth / 2 - 1, barTop - 5, barWidth + 2, 3); ctx.fillStyle = '#347c91'; ctx.fillRect(point.x - barWidth / 2, barTop - 4, barWidth * Math.min(1, enemy.shield / (enemy.maxHp * .5)), 1); }
    const healerFeedback=healerFeedbackForEnemy(enemy);if(healerFeedback?.amount>0){ctx.save();ctx.globalAlpha=healerFeedback.alpha??1;ctx.fillStyle='#c8f59a';ctx.font=`bold ${Math.max(8,9/enemyStrokeScale)}px sans-serif`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(`+${healerFeedback.amount} HP`,point.x+barWidth/2+4,barTop);ctx.restore();}
    if (enemy.armor > 0) { ctx.beginPath(); ctx.moveTo(point.x-radius*.5,bodyY-radius*.25);ctx.lineTo(point.x+radius*.5,bodyY-radius*.25);ctx.moveTo(point.x-radius*.5,bodyY+radius*.25);ctx.lineTo(point.x+radius*.5,bodyY+radius*.25);ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke(); }
    // Reserve separate rows for status glyphs, shields, and health. The old
    // barTop-5 anchor put status marks directly over the shield meter.
    drawStatusMarks(ctx, enemy, point.x, barTop - 11);
    const armorFeedback=armorFeedbackForEnemy(enemy);
    if(armorFeedback?.label){const label=armorFeedback.label,labelScale=Math.max(.35,enemyStrokeScale),fontSize=9/labelScale,labelWidth=(label.length*5.2+12)/labelScale,labelY=barTop-23/labelScale;ctx.save();ctx.globalAlpha=armorFeedback.alpha??1;ctx.fillStyle='#17271eeF';ctx.fillRect(point.x-labelWidth/2,labelY-8/labelScale,labelWidth,11/labelScale);ctx.strokeStyle=armorFeedback.kind==='blocked'?'#ff9a82':armorFeedback.kind==='bypassed'?'#b8ef83':'#ffe18a';ctx.lineWidth=1.5/labelScale;ctx.strokeRect(point.x-labelWidth/2,labelY-8/labelScale,labelWidth,11/labelScale);ctx.fillStyle=ctx.strokeStyle;ctx.font=`bold ${fontSize}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,point.x,labelY-2.5/labelScale);ctx.restore();}
    if (enemy.progress > .82) { ctx.beginPath();ctx.arc(point.x,bodyY,radius+7,0,Math.PI*2);ctx.setLineDash(DASH_2_2);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash(EMPTY_DASH);ctx.font='bold 8px sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';drawEnemyRoleGlyph(ctx,'!',point.x+radius+5,barTop-8,8,EXIT_WARNING_GLYPH_STYLE); }
    if (enemy.id === selectedTargetId) { ctx.beginPath();ctx.arc(point.x,bodyY,radius+9,0,Math.PI*2);ctx.setLineDash(DASH_3_2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash(EMPTY_DASH);ctx.font='bold 8px sans-serif';ctx.fillStyle='#fff';ctx.fillText('TARGET',point.x,bodyY+radius+13+stackRank*9); }
    if (enemy.telegraph || enemy.bossTelegraphTimer > 0) { ctx.beginPath();ctx.arc(point.x,bodyY,radius+13,0,Math.PI*2);ctx.setLineDash(DASH_3_3);ctx.strokeStyle=enemy.boss?'#ffe2a0':'#fff';ctx.lineWidth=enemy.boss?3:2;ctx.stroke();ctx.setLineDash(EMPTY_DASH); }
    const choreography=enemy.boss?bossChoreoForEnemy(enemy):null;
    if(choreography){const cueScale=enemyStrokeScale;ctx.save();ctx.globalAlpha=choreography.alpha??1;ctx.beginPath();ctx.arc(point.x,bodyY,radius+17,0,Math.PI*2);if(choreography.kind==='danger')setScaledLineDash(ctx,DASH_2_3,cueScale);else ctx.setLineDash(EMPTY_DASH);ctx.strokeStyle=choreography.kind==='danger'?'#ff745f':'#b8f28a';ctx.lineWidth=3/cueScale;ctx.stroke();ctx.setLineDash(EMPTY_DASH);ctx.font=`bold ${9/cueScale}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle=choreography.kind==='danger'?'#ff9b82':'#c9f59c';ctx.fillText(choreography.kind==='danger'?'DANGER':'RECOVERY',point.x,bodyY+radius+19/cueScale);ctx.restore();}
    if (enemy.bossTelegraphTimer > 0 && enemy.bossTelegraph) {
      const warningScale=1/(Number.isFinite(displayScale)&&displayScale>0?displayScale:1),warningHeight=34*warningScale,warningGap=4*warningScale;
      ctx.font = `bold ${10*warningScale}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const name = enemy.bossName || 'Bramble boss', labelWidth = Math.min(240*warningScale, Math.max(ctx.measureText(name).width, ctx.measureText(enemy.bossTelegraph).width) + 12*warningScale);
      const preferredX = Math.max(labelWidth / 2 + warningGap, Math.min(width - labelWidth / 2 - warningGap, point.x));
      const preferredTop = Math.max(warningGap, bodyY - radius - 41*warningScale);
      const candidates=bossWarningCandidateScratch;
      candidates.length=0;
      let candidateCount=0;
      for(let column=-4;column<=4;column++)for(let row=-Math.ceil(height/(warningHeight+warningGap));row<=Math.ceil(height/(warningHeight+warningGap));row++){
        const x=preferredX+column*(labelWidth+2*warningGap),top=preferredTop+row*(warningHeight+warningGap);
        if(x>=labelWidth/2+warningGap&&x<=width-labelWidth/2-warningGap&&top>=warningGap&&top<=height-warningHeight-warningGap){
          const candidate=bossWarningCandidatePool[candidateCount]||(bossWarningCandidatePool[candidateCount]={x:0,top:0,score:0});
          candidate.x=x;candidate.top=top;candidate.score=(x-preferredX)**2+(top-preferredTop)**2;
          candidates.push(candidate);candidateCount++;
        }
      }
      candidates.sort(compareBossWarningCandidates);
      let labelX=preferredX,labelTop=preferredTop;
      for(let candidateIndex=0;candidateIndex<candidates.length;candidateIndex++){
        const candidate=candidates[candidateIndex],x=candidate.x,top=candidate.top;
        let collides=false;
        for(let warningIndex=0;warningIndex<bossWarningBoxes.length;warningIndex++){
          const box=bossWarningBoxes[warningIndex];
          if(Math.abs(box.x-x)<(box.width+labelWidth)/2+warningGap&&Math.abs(box.top-top)<warningHeight+warningGap){collides=true;break;}
        }
        if(collides)continue;
        const left=x-labelWidth/2-warningGap/2,right=x+labelWidth/2+warningGap/2,bottom=top+warningHeight;
        for(let terrainIndex=0;terrainIndex<terrainLabelBoxes.length;terrainIndex++){
          const box=terrainLabelBoxes[terrainIndex];
          if(left<box.right+warningGap&&right>box.left-warningGap&&top<box.bottom+warningGap&&bottom>box.top-warningGap){collides=true;break;}
        }
        if(collides)continue;
        for(let centerIndex=0;centerIndex<enemyVisuals.length;centerIndex++){
          const center=enemyVisuals[centerIndex],nearestX=Math.max(left,Math.min(right,center.x)),nearestY=Math.max(top,Math.min(bottom,center.y));
          const dx=center.x-nearestX,dy=center.y-nearestY,threatRadius=center.overlapRadius+3*warningScale;
          if(dx*dx+dy*dy<threatRadius*threatRadius){collides=true;break;}
        }
        if(!collides){labelX=x;labelTop=top;break;}
      }
      bossWarningBoxes.push({x:labelX,top:labelTop,width:labelWidth});
      bossWarnings.push({ x:point.x, bodyY, radius, labelX, labelTop, labelWidth, name, cue:enemy.bossTelegraph });
    }
  }
  if (selectedType && pointer.inside) {
    const def = towersDef[selectedType], valid = !placementError(pointer);
    ctx.globalAlpha = .68; ctx.fillStyle = valid ? def.color : '#dd6655'; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 14, 0, Math.PI * 2); ctx.fill();
    const range=placementPreviewRange(selectedType,pointer);
    ctx.globalAlpha = .3; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, range, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    const groundSegments=pathSegmentsWithinRadius(path,pointer,range);
    if(groundSegments.length){ctx.beginPath();for(const segment of groundSegments){ctx.moveTo(segment.x1,segment.y1);ctx.lineTo(segment.x2,segment.y2);}ctx.strokeStyle='#f8ffe6';ctx.lineWidth=Math.max(3,5/(displayScale||1));ctx.setLineDash(EMPTY_DASH);ctx.stroke();}
    if(def.antiAir&&airPath)drawAirCoverage(ctx,airPath,pointer,range,displayScale);
    ctx.save();ctx.strokeStyle='#fff3a6';ctx.lineWidth=2;ctx.setLineDash(DASH_3_2);
    for(let enemyIndex=0;enemyIndex<enemies.length;enemyIndex++){
      const enemy=enemies[enemyIndex];
      if(!canTowerHitTarget({tower:pointer,target:enemy,range,canHitAir:Boolean(def.antiAir),positionOf:enemyPosition}))continue;
      const target=enemyPosition(enemy);ctx.beginPath();ctx.arc(target.x,target.y,enemy.radius+4,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
    const combinationPreviews=valid?placementComboPreviews(selectedType,pointer):[];
    for(let previewIndex=0;previewIndex<combinationPreviews.length;previewIndex++){
      const {combination,counterpart}=combinationPreviews[previewIndex];
      const style=COMBINATION_LINK_STYLES[combination.id];if(!style)continue;
      ctx.save();ctx.globalAlpha=.9;setScaledLineDash(ctx,style.dash,displayScale);ctx.strokeStyle=style.color;ctx.lineWidth=Math.max(2,2.5/(displayScale||1));ctx.beginPath();ctx.moveTo(counterpart.x,counterpart.y);ctx.lineTo(pointer.x,pointer.y);ctx.stroke();ctx.setLineDash(EMPTY_DASH);
      ctx.beginPath();ctx.arc(counterpart.x,counterpart.y,24,0,Math.PI*2);ctx.strokeStyle=style.color;ctx.lineWidth=Math.max(2,2/(displayScale||1));ctx.stroke();
      const artOptions=placementTowerArtOptionsScratch;artOptions.color=def.color;artOptions.displayScale=displayScale;
      drawTowerArt(ctx,selectedType,pointer.x,pointer.y,artOptions);
      const label=`${combination.name} link`;ctx.font=`bold ${Math.max(9,10/(displayScale||1))}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';const labelY=Math.max(12,pointer.y-31),labelWidth=ctx.measureText(label).width+10;ctx.fillStyle='#17241bec';ctx.fillRect(pointer.x-labelWidth/2,labelY-8,labelWidth,16);ctx.fillStyle=style.color;ctx.fillText(label,pointer.x,labelY);ctx.restore();
    }
  }
  // Draw connectors first, then opaque cards last so later enemies and placement previews cannot cover threat text.
  for(let warningIndex=0;warningIndex<bossWarnings.length;warningIndex++){
    const {x,bodyY,radius,labelX,labelTop}=bossWarnings[warningIndex];
    const warningScale=1/(Number.isFinite(displayScale)&&displayScale>0?displayScale:1);
    ctx.beginPath(); ctx.moveTo(x, bodyY-radius); ctx.lineTo(labelX,labelTop+34*warningScale);
    ctx.strokeStyle = '#ffe8a6'; ctx.lineWidth = 1; ctx.stroke();
  }
  for(let warningIndex=0;warningIndex<bossWarnings.length;warningIndex++){
    const {labelX,labelTop,labelWidth,name,cue}=bossWarnings[warningIndex];
    const warningScale=1/(Number.isFinite(displayScale)&&displayScale>0?displayScale:1);
    ctx.font = `bold ${10*warningScale}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#20271fee'; ctx.fillRect(labelX - labelWidth / 2, labelTop, labelWidth, 34*warningScale);
    ctx.fillStyle = '#fff4d2'; ctx.fillText(name, labelX, labelTop + 13*warningScale, labelWidth - 8*warningScale);
    ctx.fillStyle = '#ffe8a6'; ctx.fillText(cue, labelX, labelTop + 28*warningScale, labelWidth - 8*warningScale);
  }
}

export { projectileStyleForTower };
