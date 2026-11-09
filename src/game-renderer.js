import { distanceToPath, pointOnPath } from './path-geometry.js';
import { drawTowerArt } from './tower-art.js';
import { projectileStyleForTower } from './projectile-visuals.js';
import { combinationForPair } from './tower-combinations.js';
import { PLANTING_SETTLE_SECONDS } from './planting-effects.js';
import { pathSegmentsWithinRadius } from './route-coverage.js';
import { guardianDestinationIsSafe, GUARDIAN_PATH_CLEARANCE, GUARDIAN_PULSE_RADIUS } from './meadow-guardian.js';
import { TERRAIN_TYPES, TERRAIN_ZONES } from './terrain.js';
import { enemySilhouetteMetrics } from './enemy-silhouette.js';
import { canHitTarget } from './combat-rules.js';

const COMBINATION_LINK_STYLES = Object.freeze({
  'golden-seeds': Object.freeze({ color:'#ffd447', dash:[5, 7] }),
  'frosted-seeds': Object.freeze({ color:'#91eaff', dash:[10, 7] }),
  'steam-burst': Object.freeze({ color:'#ff944f', dash:[5, 7, 2, 7] }),
  sporecap: Object.freeze({ color:'#b9e66b', dash:[9, 7, 3, 7] }),
  'windcarved-thorns': Object.freeze({ color:'#d6d6ff', dash:[5, 9] }),
  'cyclone-cap': Object.freeze({ color:'#dd9fff', dash:[8, 7, 2, 7] })
});

function tracePath(ctx, path) {
  ctx.beginPath();
  path.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
}

function drawAirRoute(ctx,path) {
  if (!Array.isArray(path) || path.length < 2) return;
  tracePath(ctx,path);ctx.setLineDash([]);ctx.strokeStyle='#244e58aa';ctx.lineWidth=9;ctx.stroke();
  tracePath(ctx,path);ctx.setLineDash([2,7]);ctx.strokeStyle='#7be0ef';ctx.lineWidth=4;ctx.stroke();ctx.setLineDash([]);
}

function drawGateRoutePreviews(ctx,routes,selectedRoute,displayScale=1){
  if(!Array.isArray(routes)||routes.length<2)return;
  const colors=['#b5f071','#72d9e8','#edc76c'];
  routes.forEach((route,index)=>{
    if(!Array.isArray(route.path)||route.path.length<2)return;
    tracePath(ctx,route.path);ctx.strokeStyle=colors[index%colors.length]+'aa';ctx.lineWidth=Math.max(2,3/(displayScale||1));ctx.setLineDash([8,7]);ctx.stroke();ctx.setLineDash([]);
    const [x,y]=route.path[Math.floor((route.path.length-1)/2)];ctx.fillStyle='#17271ee8';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors[index%colors.length];ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(route.label.slice(0,1).toUpperCase(),x,y);
  });
  ctx.setLineDash([]);ctx.globalAlpha=1;
}

function drawSeedRecoveryPaths(ctx,path,pathLength,objective,displayScale=1){
  if(!objective||!Array.isArray(path)||path.length<2||!Number.isFinite(pathLength)||pathLength<=0)return;
  const pickupDistance=pathLength*.52,step=Math.max(12,22/(displayScale||1));
  for(const [offset,color,direction] of [[-3,'#69d6b7',1],[3,'#f1bd67',-1]]){
    ctx.beginPath();
    for(let distance=0,index=0;distance<pickupDistance;distance+=step,index++){
      const point=pointOnPath(path,distance);if(index===0)ctx.moveTo(point.x,point.y+offset);else ctx.lineTo(point.x,point.y+offset);
    }
    const cache=pointOnPath(path,pickupDistance);ctx.lineTo(cache.x,cache.y+offset);
    ctx.strokeStyle=color;ctx.lineWidth=Math.max(2.2,3/(displayScale||1));ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);
    const arrowDistance=direction>0?pickupDistance*.78:pickupDistance*.25;
    const tip=pointOnPath(path,arrowDistance),behind=pointOnPath(path,arrowDistance-direction*8);
    const angle=Math.atan2(tip.y-behind.y,tip.x-behind.x);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(tip.x,tip.y+offset);
    ctx.lineTo(tip.x-Math.cos(angle-.55)*8,tip.y+offset-Math.sin(angle-.55)*8);ctx.lineTo(tip.x-Math.cos(angle+.55)*8,tip.y+offset-Math.sin(angle+.55)*8);ctx.closePath();ctx.fill();
  }
  const cache=pointOnPath(path,pickupDistance),available=objective.seeds.filter(seed=>seed.state==='available');
  available.forEach((seed,index)=>{
    const offset=(index-(available.length-1)/2)*14;ctx.fillStyle='#f8e18c';ctx.strokeStyle='#473b23';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(cache.x+offset,cache.y-15,5,8,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
  });
  objective.seeds.filter(seed=>seed.state==='dropped').forEach(seed=>{
    ctx.beginPath();ctx.arc(seed.x,seed.y,10,0,Math.PI*2);ctx.fillStyle='#f2c66c55';ctx.fill();ctx.strokeStyle='#fff0a1';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff2b5';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',seed.x,seed.y);
  });
}

function drawAirCoverage(ctx,path,center,radius,displayScale) {
  if (!Array.isArray(path) || !Number.isFinite(radius) || radius<=0) return;
  const segments=pathSegmentsWithinRadius(path,center,radius);
  if (!segments.length) return;
  ctx.beginPath();for(const segment of segments){ctx.moveTo(segment.x1,segment.y1);ctx.lineTo(segment.x2,segment.y2);}
  ctx.strokeStyle='#ffdf6e';ctx.lineWidth=Math.max(3,5/(displayScale||1));ctx.setLineDash([]);ctx.stroke();
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
  ctx.fillStyle = '#354e35'; ctx.beginPath(); ctx.arc(gateX, gateY, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f3e7bf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gateX - 6, gateY + 5); ctx.lineTo(gateX - 6, gateY - 6); ctx.lineTo(gateX + 6, gateY - 6); ctx.lineTo(gateX + 6, gateY + 5); ctx.moveTo(gateX - 8, gateY - 6); ctx.lineTo(gateX, gateY - 10); ctx.lineTo(gateX + 8, gateY - 6); ctx.stroke();
  ctx.fillStyle = '#fff4d5'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('IN', gateX, gateY + 1);

  const goal = pointOnPath(path, pathLength);
  ctx.fillStyle = '#557e48'; ctx.beginPath(); ctx.arc(goal.x, goal.y, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eff2be'; ctx.beginPath(); ctx.arc(goal.x, goal.y, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#876c3f'; ctx.beginPath(); ctx.ellipse(goal.x, goal.y - 1, 6, 9, -.25, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#486b3b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(goal.x, goal.y - 8); ctx.lineTo(goal.x + 1, goal.y - 13); ctx.lineTo(goal.x + 8, goal.y - 16); ctx.moveTo(goal.x + 2, goal.y - 12); ctx.lineTo(goal.x - 5, goal.y - 16); ctx.stroke();
  ctx.fillStyle = '#334d31'; ctx.font = 'bold 7px sans-serif'; ctx.fillText('GOAL', goal.x, goal.y + 14);
}

function drawTerrainZones(ctx,map,displayScale=1) {
  const zones=TERRAIN_ZONES[map.biome]||[],scale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
  for(const zone of zones){
    const terrain=TERRAIN_TYPES[zone.type],{x,y,radius}=zone;
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=terrain.color+'22';ctx.fill();
    ctx.setLineDash([7,5]);ctx.strokeStyle=terrain.color;ctx.lineWidth=Math.max(2,1.3/scale);ctx.stroke();ctx.setLineDash([]);
    if(zone.type==='fertile'){
      ctx.fillStyle='#e8d66caa';for(const [dx,dy] of [[-22,-16],[20,-12],[-11,20],[24,17]]){ctx.beginPath();ctx.ellipse(x+dx,y+dy,4,2.2,-.6,0,Math.PI*2);ctx.fill();}
    }else if(zone.type==='waterEdge'){
      ctx.strokeStyle='#d5ffffbb';ctx.lineWidth=Math.max(1.5,1/scale);
      for(let row=-1;row<=1;row++){ctx.beginPath();for(let step=-22;step<=22;step+=4){const py=y+row*12+Math.sin(step/5)*2.5;step===-22?ctx.moveTo(x+step,py):ctx.lineTo(x+step,py);}ctx.stroke();}
    }else if(zone.type==='elevated'){
      ctx.strokeStyle='#f4fbffc4';ctx.lineWidth=Math.max(1.5,1/scale);
      for(const inset of [0,10,20]){ctx.beginPath();ctx.moveTo(x-28+inset,y+17-inset*.35);ctx.lineTo(x,y-19+inset*.45);ctx.lineTo(x+28-inset,y+17-inset*.35);ctx.stroke();}
    }
  }
  ctx.setLineDash([]);ctx.globalAlpha=1;
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
  for(const zone of map.buildZones||[]){ctx.fillStyle='#d4f3a466';ctx.fillRect(zone.x,zone.y,zone.width,zone.height);ctx.strokeStyle='#34683dcc';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.strokeRect(zone.x,zone.y,zone.width,zone.height);ctx.setLineDash([]);ctx.fillStyle='#1d3828';ctx.font=`700 ${Math.max(9,10/displayScale)}px sans-serif`;ctx.fillText('BUILD ZONE',zone.x+4,zone.y+12);}
  drawTerrainZones(ctx,map,displayScale);
  tracePath(ctx, path); ctx.strokeStyle = map.edge; ctx.lineWidth = 44; ctx.stroke();
  tracePath(ctx, path); ctx.strokeStyle = map.trail; ctx.lineWidth = 34; ctx.stroke();
  tracePath(ctx, path); ctx.setLineDash([4, 9]); ctx.strokeStyle = '#af9f6c'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);
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
      const key = JSON.stringify([width, height, map.biome, map.background, map.patch, map.edge, map.trail, map.buildZones||null, path, pathLength, airPath, showAirRoute, displayScale]);
      if (!canvas || cacheKey !== key) {
        canvas = createCanvas(width, height);
        canvas.width = width;
        canvas.height = height;
        drawStaticMapLayer(canvas.getContext('2d'), state);
        cacheKey = key;
      }
      ctx.drawImage(canvas, 0, 0);
    },
    invalidate() {
      cacheKey = null;
    }
  };
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

function drawStatusMarks(ctx, enemy, x, y) {
  const marks = [enemy.burn > 0 && 'burn', enemy.poison > 0 && 'poison', enemy.slow > 0 && 'slow', enemy.stun > 0 && 'stun', enemy.armorBreak > 0 && 'break'].filter(Boolean);
  marks.forEach((mark, index) => {
    const cx = x + (index - (marks.length - 1) / 2) * 9, cy = y;
    ctx.beginPath(); ctx.strokeStyle = '#fff'; ctx.fillStyle = '#172019'; ctx.lineWidth = 1.4;
    if (mark === 'burn') { ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx, cy + 3); ctx.lineTo(cx - 2, cy + 1); ctx.closePath(); ctx.fill(); }
    else if (mark === 'poison') { ctx.arc(cx - 2, cy, 1.4, 0, Math.PI * 2); ctx.arc(cx + 2, cy, 1.4, 0, Math.PI * 2); ctx.fill(); }
    else if (mark === 'slow') { ctx.moveTo(cx - 3, cy); ctx.lineTo(cx + 3, cy); ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 3); }
    else if (mark === 'stun') { ctx.moveTo(cx - 2, cy - 3); ctx.lineTo(cx - 2, cy + 3); ctx.moveTo(cx + 2, cy - 3); ctx.lineTo(cx + 2, cy + 3); }
    else { ctx.moveTo(cx - 3, cy + 3); ctx.lineTo(cx, cy - 3); ctx.lineTo(cx + 3, cy + 3); }
    if (mark !== 'burn' && mark !== 'poison') ctx.stroke(); else ctx.stroke();
  });
}

function drawEnemyDetails(ctx, enemy, x, y, time = 0, displayScale = 1) {
  const {gait}=enemySilhouetteMetrics(enemy,time);
  const scale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
  ctx.lineWidth = Math.max(enemy.boss ? 2 : 1.4,1/scale); ctx.strokeStyle = '#24372b'; ctx.fillStyle = '#fff0c9';
  if (enemy.flying) {
    const flap = gait;
    ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 12, y - 7 - flap); ctx.lineTo(x - 7, y + 2); ctx.moveTo(x + 3, y); ctx.lineTo(x + 12, y - 7 + flap); ctx.lineTo(x + 7, y + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x - 7, y + 6); ctx.moveTo(x + 5, y + 3); ctx.lineTo(x + 7, y + 6); ctx.stroke();
  } else {
    const legY = y + enemy.radius * .55;
    ctx.beginPath();
    for (const side of [-1, 1]) { ctx.moveTo(x + side * 4, legY); ctx.lineTo(x + side * 7, legY + 3 + gait * .35); ctx.moveTo(x + side * 1, legY + 1); ctx.lineTo(x + side * 2, legY + 4 - gait * .35); }
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
    for (const [x, y] of [[-radius, -radius * .55], [-radius, radius * .55], [radius * .5, -radius * .7], [radius * .5, radius * .7]]) {
      ctx.beginPath(); ctx.arc(x, y, radius * .32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
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
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function shotRecoil(animation, now, launchedAt, duration = .075) {
  if (animation !== 'full' || !(duration > 0) || !Number.isFinite(launchedAt)) return 0;
  return Math.max(0, Math.min(1, 1 - Math.max(0, now - launchedAt) / duration));
}

function drawCosmeticParticle(ctx, particle) {
  const alpha=Math.max(0,particle.life/particle.maxLife);
  if(particle.impactKind){
    const mark=['kill','armoredKill','bossKill'].includes(particle.impactKind)?particle.impactKind:projectileStyleForTower(particle.impactKind).mark;
    drawImpactMark(ctx,mark,particle.x,particle.y,particle.r*1.5,alpha);
    if(particle.splashRadius)drawSplashBoundary(ctx,particle.x,particle.y,particle.splashRadius,alpha);
  }else{
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=particle.color;ctx.beginPath();ctx.arc(particle.x,particle.y,particle.r,0,Math.PI*2);ctx.fill();ctx.restore();
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

export function enemyCueStackRanks(centers) {
  const ranks = new Map(centers.map(center => [center.id, 0]));
  if (!centers.length) return ranks;
  let cellSize = 0;
  for (const center of centers) {
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.radius) || center.radius < 0) {
      return countCueOverlaps(centers, ranks);
    }
    cellSize = Math.max(cellSize, center.radius * 2 + 18);
  }
  if (cellSize >= Math.sqrt(Number.MAX_VALUE)) return countCueOverlaps(centers, ranks);

  const cellCoordinates = centers.map(center => ({ x: Math.floor(center.x / cellSize), y: Math.floor(center.y / cellSize) }));
  if (cellCoordinates.some(({ x, y }) => !Number.isSafeInteger(x) || !Number.isSafeInteger(y) || Math.abs(x) >= Number.MAX_SAFE_INTEGER || Math.abs(y) >= Number.MAX_SAFE_INTEGER)) {
    return countCueOverlaps(centers, ranks);
  }
  const cells = new Map();
  for (let index = 0; index < centers.length; index++) {
    const { x, y } = cellCoordinates[index];
    let row = cells.get(y);
    if (!row) { row = new Map(); cells.set(y, row); }
    const cell = row.get(x) || [];
    cell.push(index);
    row.set(x,cell);
  }
  for (let left = 0; left < centers.length; left++) {
    const a = centers[left], { x: cellX, y: cellY } = cellCoordinates[left];
    for (let y = cellY - 1; y <= cellY + 1; y++) {
      const row = cells.get(y);
      if (!row) continue;
      for (let x = cellX - 1; x <= cellX + 1; x++) {
        for (const right of row.get(x) || []) {
          if (right <= left) continue;
          const b = centers[right];
          if (a.id === b.id) continue;
          const reach = a.radius + b.radius + 18, dx = a.x - b.x, dy = a.y - b.y;
          if (!(Math.hypot(dx, dy) < reach)) continue;
          const higher = a.id > b.id ? a.id : b.id;
          ranks.set(higher, ranks.get(higher) + 1);
        }
      }
    }
  }
  return ranks;
}

function countCueOverlaps(centers, ranks) {
  for (let left = 0; left < centers.length; left++) for (let right = left + 1; right < centers.length; right++) {
    const a = centers[left], b = centers[right];
    if (a.id === b.id) continue;
    const reach = a.radius + b.radius + 18, dx = a.x - b.x, dy = a.y - b.y;
    if (!(Math.hypot(dx, dy) < reach)) continue;
    const higher = a.id > b.id ? a.id : b.id;
    ranks.set(higher, ranks.get(higher) + 1);
  }
  return ranks;
}

export function drawBattlefield(ctx, state, renderAlpha = 1, staticMapCache = null) {
  const {
    width, height, displayScale = 1, map, path, pathLength, airPath, towers, selectedTower, towersDef, towersLinked, selectedTowerRange,
    enemies, enemyPosition, shots, shotPosition, shotAngle = () => 0, particles, selectedType, pointer, placementError,
    placementPreviewRange, abilityPreview, palette, highContrastEnemyColors, selectedTargetId, visualTime = 0, enemyHitFlash = () => 0, impactCausalityForEnemy = () => null, recoilForTower = () => 0, recoilAngleForTower = () => null,
    plantingForTower = () => null, attackCueForTower = () => null, armorFeedbackForEnemy = () => null, healerLinks = [], healerFeedbackForEnemy = () => null, burrowEmergenceForEnemy = () => null, bossChoreoForEnemy = () => null, guardian = null, guardianMoveActive = false, guardianCursor = null, gateRoutePreviews = null, selectedGateRoute = null, placementComboPreviews = () => []
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

  const firingByTower = new Map();
  for (const shot of shots) if (shot.sourceTowerId != null && !firingByTower.has(shot.sourceTowerId)) firingByTower.set(shot.sourceTowerId, shot);
  const linkScale = Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1;
  for (let i = 0; i < towers.length; i++) for (let j = i + 1; j < towers.length; j++) {
    const a = towers[i], b = towers[j];
    if (!towersLinked(a, b)) continue;
    const focused = selectedTower === a || selectedTower === b;
    const combination = combinationForPair(a, b), style = focused && combination ? COMBINATION_LINK_STYLES[combination.id] : null;
    ctx.setLineDash(style ? style.dash.map(length => length / linkScale) : [3, 6]); ctx.strokeStyle = style?.color || '#ffe18a77';
    ctx.lineWidth = style ? Math.max(2, 2.5 / linkScale) : 2;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  towers.forEach(tower => {
    const def = towersDef[tower.type], isSelected = tower === selectedTower;
    const range = isSelected ? selectedTowerRange(tower) : null;
    let artX=tower.x,artY=tower.y;
    const firingShot=firingByTower.get(tower.id);
    const recoil=Math.max(0,Math.min(1,recoilForTower(tower.id)));
    if(recoil>0){const dx=firingShot?firingShot.x-tower.x:0,dy=firingShot?firingShot.y-tower.y:0,angle=recoilAngleForTower(tower.id)??(firingShot?(Math.hypot(dx,dy)>.5?Math.atan2(dy,dx):shotAngle(firingShot,renderAlpha)):0);artX-=Math.cos(angle)*2.5*recoil;artY-=Math.sin(angle)*2.5*recoil;}
    const planting=plantingForTower(tower.id);
    const attackCue=attackCueForTower(tower);
    if(attackCue&&Number.isFinite(attackCue.angle)&&attackCue.strength>0){ctx.save();ctx.globalAlpha=Math.min(1,.35+attackCue.strength*.65);ctx.strokeStyle=def.color||'#fff2b1';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(tower.x+Math.cos(attackCue.angle)*13,tower.y+Math.sin(attackCue.angle)*13);ctx.lineTo(tower.x+Math.cos(attackCue.angle)*23,tower.y+Math.sin(attackCue.angle)*23);ctx.stroke();ctx.restore();}
    if(planting?.outlineAlpha>0){ctx.beginPath();ctx.arc(tower.x,tower.y,22,0,Math.PI*2);ctx.strokeStyle=`rgba(230,255,187,${planting.outlineAlpha})`;ctx.lineWidth=2.4;ctx.stroke();}
    if (range) { ctx.beginPath(); ctx.arc(tower.x, tower.y, range, 0, Math.PI * 2); ctx.fillStyle = '#efffc31b'; ctx.fill(); ctx.strokeStyle = '#f1ffd588'; ctx.lineWidth = 1.3; ctx.stroke(); }
    drawTowerArt(ctx, tower.type, artX, artY+(planting?.offsetY||0), { level: tower.level, branch: tower.branch ?? tower.branchChoice, color: def.color, scaleX:planting?.scaleX??1, scaleY:planting?.scaleY??1, displayScale });
    if (isSelected) { ctx.beginPath(); ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2); ctx.setLineDash([2, 3]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
    if (tower.level > 1) { ctx.fillStyle = '#ffe28b'; ctx.beginPath(); ctx.arc(tower.x + 11, tower.y - 11, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#493e20'; ctx.font = '8px DM Mono, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tower.level, tower.x + 11, tower.y - 10); }
  });
  if (abilityPreview) {
    const tower = towers.find(item => item.id === abilityPreview.towerId);
    if (tower) {
      ctx.beginPath(); ctx.arc(tower.x, tower.y, abilityPreview.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe18a20'; ctx.fill(); ctx.setLineDash([7, 5]); ctx.strokeStyle = '#fff0a9'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      enemies.forEach(enemy => { if (abilityPreview.targetIds && !abilityPreview.targetIds.includes(enemy.id)) return; const point = enemyPosition(enemy, renderAlpha); ctx.beginPath(); ctx.arc(point.x, point.y, enemy.radius + 7, 0, Math.PI * 2); ctx.fillStyle = '#ffe18a44'; ctx.fill(); ctx.strokeStyle = '#fff7c9'; ctx.lineWidth = 2.5; ctx.stroke(); });
    }
  }
  healerLinks.forEach(link=>{if(!link?.from||!link?.to)return;ctx.save();ctx.globalAlpha=link.alpha??1;ctx.strokeStyle='#c8f59a';ctx.fillStyle='#f4ffd1';ctx.lineWidth=Math.max(2,2/enemyStrokeScale);ctx.setLineDash([6/enemyStrokeScale,4/enemyStrokeScale]);ctx.beginPath();ctx.moveTo(link.from.x,link.from.y);ctx.lineTo(link.to.x,link.to.y);ctx.stroke();ctx.setLineDash([]);const pulse=link.progress??1,x=link.from.x+(link.to.x-link.from.x)*pulse,y=link.from.y+(link.to.y-link.from.y)*pulse;ctx.beginPath();ctx.arc(x,y,3.5/enemyStrokeScale,0,Math.PI*2);ctx.fill();ctx.restore();});
  // Threat silhouettes follow projectiles and particles; health and warning overlays follow the bodies.
  shots.forEach(shot=>drawProjectile(ctx,shot,shotPosition(shot,renderAlpha),shotAngle(shot,renderAlpha),displayScale));
  particles.forEach(particle=>drawCosmeticParticle(ctx,particle));
  enemies.forEach(enemy => {
    const point = enemyPosition(enemy, renderAlpha);
    const silhouette=enemySilhouetteMetrics(enemy,visualTime),shape={...enemy,radius:silhouette.radius};
    const altitude=enemy.flying?silhouette.radius*.85:silhouette.float,bodyY=point.y-altitude;
    const causality=impactCausalityForEnemy(enemy);
    if(causality?.from&&causality.alpha>0){ctx.save();ctx.globalAlpha=Math.min(1,causality.alpha)*.55;ctx.strokeStyle=causality.color||'#fff0a8';ctx.lineWidth=Math.max(1.5,2/enemyStrokeScale);ctx.setLineDash([5/enemyStrokeScale,4/enemyStrokeScale]);ctx.beginPath();ctx.moveTo(causality.from.x,causality.from.y);ctx.lineTo(point.x,bodyY);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=Math.min(1,causality.alpha);ctx.beginPath();ctx.arc(point.x,bodyY,silhouette.radius+7,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.fillStyle = '#35503d66'; ctx.beginPath(); ctx.ellipse(point.x, point.y + (enemy.flying ? 13 : 8), silhouette.radius * 1.1, silhouette.radius * .52, 0, 0, Math.PI * 2); ctx.fill();
    if (enemy.flying) { ctx.beginPath(); ctx.setLineDash([2, 3]); ctx.moveTo(point.x, point.y + 5); ctx.lineTo(point.x, bodyY + silhouette.radius * .65); ctx.strokeStyle = '#f9f6d0aa'; ctx.lineWidth = Math.max(1,1/enemyStrokeScale); ctx.stroke(); ctx.setLineDash([]); }
    if (enemy.boss || enemy.shield > 0 || enemy.armor > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(enemy.boss ? 2.5 : 1.8,1.05/enemyStrokeScale); ctx.beginPath(); ctx.arc(point.x, bodyY, silhouette.radius + (enemy.boss ? 4 : 2), 0, Math.PI * 2); if (enemy.shield > 0) ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
    if (enemy.carrierTelegraphTimer > 0 || enemy.wardFlash > 0) {
      ctx.beginPath(); ctx.arc(point.x, bodyY, enemy.radius + (enemy.carrierTelegraphTimer > 0 ? 9 : 6), 0, Math.PI * 2);
      ctx.strokeStyle = '#a9f4ef'; ctx.lineWidth = enemy.carrierTelegraphTimer > 0 ? 2.6 : 2; ctx.setLineDash(enemy.carrierTelegraphTimer > 0 ? [3, 2] : []); ctx.stroke(); ctx.setLineDash([]);
    }
    if (enemy.healerTelegraphTimer > 0 || enemy.supportFlash > 0) {
      ctx.beginPath(); ctx.arc(point.x, bodyY, enemy.radius + (enemy.healerTelegraphTimer > 0 ? 8 : 5), 0, Math.PI * 2);
      ctx.strokeStyle = '#e3ffc1'; ctx.lineWidth = enemy.healerTelegraphTimer > 0 ? 2.6 : 2; ctx.setLineDash(enemy.healerTelegraphTimer > 0 ? [3, 2] : []); ctx.stroke(); ctx.setLineDash([]);
    }
    if (enemy.burrowTelegraphTimer > 0) {
      ctx.beginPath(); ctx.arc(point.x, point.y, enemy.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#e0b878'; ctx.lineWidth = 2.6; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);
      for (const [dx,dy] of [[-5,-enemy.radius-5],[0,-enemy.radius-9],[5,-enemy.radius-5]]) {
        ctx.beginPath(); ctx.arc(point.x+dx,point.y+dy,2.2,0,Math.PI*2); ctx.fillStyle='#c99453'; ctx.fill();
      }
    }
    if (enemy.burrowTimer > 0) {
      for(const offset of [12,25,38]){const soil=pointOnPath(path,Math.max(0,enemy.progress-offset));ctx.beginPath();ctx.ellipse(soil.x,soil.y,Math.min(10,Math.max(2.5,3.5/enemyStrokeScale)),Math.min(6,Math.max(1.8,2.4/enemyStrokeScale)),0,0,Math.PI*2);ctx.fillStyle='#b88b55cc';ctx.fill();}
      ctx.fillStyle = '#8a5b28'; ctx.strokeStyle = '#4b321c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(point.x, point.y, enemy.radius * 1.2, enemy.radius * .58, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(point.x, point.y - 1, enemy.radius * .5, Math.PI, Math.PI * 2); ctx.strokeStyle = '#d7b77b'; ctx.stroke();
    } else {
      ctx.fillStyle = palette === 'high-contrast' ? (highContrastEnemyColors[enemy.type] || enemy.color) : enemy.color; traceEnemyShape(ctx, shape, point.x, bodyY, silhouette.radius); ctx.fill(); ctx.strokeStyle = '#172019'; ctx.lineWidth = Math.max(1.5,1.05/enemyStrokeScale); ctx.stroke();
      drawEnemyDetails(ctx, shape, point.x, bodyY, visualTime,enemyStrokeScale);
    }
    if (enemyHitFlash(enemy) > 0) { ctx.beginPath(); ctx.arc(point.x, bodyY, silhouette.radius + 2, 0, Math.PI * 2); ctx.strokeStyle = '#fff8d9'; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.font = enemy.boss ? '17px sans-serif' : '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff8df';
    if (enemy.burrowTimer > 0) ctx.fillText('⌃', point.x, point.y - 2);
    else ctx.fillText(enemy.flying ? '✦' : enemy.type === 'armored' ? '⬟' : enemy.type === 'shield' ? '◇' : enemy.type === 'carrier' ? '⬡' : enemy.type === 'splitter' ? '●' : enemy.type === 'healer' ? '+' : enemy.boss ? '♛' : '•', point.x, bodyY);
    const burrowEmergence=enemy.type==='burrower'&&enemy.burrowTimer<=0?burrowEmergenceForEnemy(enemy):null;
    if(burrowEmergence){ctx.save();ctx.globalAlpha=burrowEmergence.alpha??1;ctx.beginPath();ctx.arc(point.x,bodyY,silhouette.radius+11,0,Math.PI*2);ctx.strokeStyle='#e9cf82';ctx.lineWidth=Math.max(2.2,2.4/enemyStrokeScale);ctx.stroke();ctx.fillStyle='#fff0ae';ctx.font=`bold ${Math.max(8,9/enemyStrokeScale)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('SURFACED',point.x,bodyY+silhouette.radius+13/enemyStrokeScale);ctx.restore();}
    if(enemy.carryingSeedId!==null&&enemy.carryingSeedId!==undefined){ctx.fillStyle='#fff1a0';ctx.font='bold 13px sans-serif';ctx.fillText('✦',point.x+enemy.radius*.75,bodyY-enemy.radius*.8);}
  });
  if (guardian) {
    if (guardianMoveActive && guardian.downTimer <= 0) {
      const safe = guardianCursor && guardianDestinationIsSafe(guardian, guardianCursor, path, width, height);
      ctx.beginPath();ctx.arc(guardian.x,guardian.y,GUARDIAN_PULSE_RADIUS,0,Math.PI*2);ctx.fillStyle='#d9f48b12';ctx.fill();ctx.strokeStyle='#e6f5ae77';ctx.setLineDash([5,5]);ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(guardian.x,guardian.y);ctx.lineTo(guardianCursor?.x??guardian.targetX,guardianCursor?.y??guardian.targetY);ctx.strokeStyle=safe?'#e7f3a8cc':'#f0937acc';ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);
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
  const bossWarningBoxes = [];
  const bossWarnings = [];
  const enemyCueCenters = enemies.map(enemy => { const point=enemyPosition(enemy,renderAlpha),silhouette=enemySilhouetteMetrics(enemy,visualTime);return {id:enemy.id,radius:silhouette.radius,x:point.x,y:point.y-(enemy.flying?silhouette.radius*.85:silhouette.float),rawY:point.y}; });
  const cueCentersById = new Map(enemyCueCenters.map(center=>[center.id,center]));
  const cueStackRanks = enemyCueStackRanks(enemyCueCenters);
  enemies.forEach(enemy => {
    const cueCenter=cueCentersById.get(enemy.id),point={x:cueCenter.x,y:cueCenter.rawY},bodyY=cueCenter.y,radius=cueCenter.radius;
    const stackRank=cueStackRanks.get(enemy.id)||0,cueY=bodyY-stackRank*11;
    const barWidth=enemy.boss?42:26,barTop=cueY-radius-9;
    ctx.fillStyle = '#263b2c'; ctx.fillRect(point.x - barWidth / 2 - 1, barTop - 1, barWidth + 2, 5);
    ctx.fillStyle = '#f2d77e'; ctx.fillRect(point.x - barWidth / 2, barTop, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 3);
    if (enemy.shield > 0) { ctx.fillStyle = '#effcff'; ctx.fillRect(point.x - barWidth / 2 - 1, barTop - 5, barWidth + 2, 3); ctx.fillStyle = '#347c91'; ctx.fillRect(point.x - barWidth / 2, barTop - 4, barWidth * Math.min(1, enemy.shield / (enemy.maxHp * .5)), 1); }
    const healerFeedback=healerFeedbackForEnemy(enemy);if(healerFeedback?.amount>0){ctx.save();ctx.globalAlpha=healerFeedback.alpha??1;ctx.fillStyle='#c8f59a';ctx.font=`bold ${Math.max(8,9/enemyStrokeScale)}px sans-serif`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(`+${healerFeedback.amount} HP`,point.x+barWidth/2+4,barTop);ctx.restore();}
    if (enemy.armor > 0) { ctx.beginPath(); ctx.moveTo(point.x-radius*.5,bodyY-radius*.25);ctx.lineTo(point.x+radius*.5,bodyY-radius*.25);ctx.moveTo(point.x-radius*.5,bodyY+radius*.25);ctx.lineTo(point.x+radius*.5,bodyY+radius*.25);ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke(); }
    drawStatusMarks(ctx, enemy, point.x, barTop - 5);
    const armorFeedback=armorFeedbackForEnemy(enemy);
    if(armorFeedback?.label){const label=armorFeedback.label,labelScale=Math.max(.35,enemyStrokeScale),fontSize=9/labelScale,labelWidth=(label.length*5.2+12)/labelScale,labelY=barTop-13/labelScale;ctx.save();ctx.globalAlpha=armorFeedback.alpha??1;ctx.fillStyle='#17271eeF';ctx.fillRect(point.x-labelWidth/2,labelY-8/labelScale,labelWidth,11/labelScale);ctx.strokeStyle=armorFeedback.kind==='blocked'?'#ff9a82':armorFeedback.kind==='bypassed'?'#b8ef83':'#ffe18a';ctx.lineWidth=1.5/labelScale;ctx.strokeRect(point.x-labelWidth/2,labelY-8/labelScale,labelWidth,11/labelScale);ctx.fillStyle=ctx.strokeStyle;ctx.font=`bold ${fontSize}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,point.x,labelY-2.5/labelScale);ctx.restore();}
    if (enemy.progress > .82) { ctx.beginPath();ctx.arc(point.x,bodyY,radius+7,0,Math.PI*2);ctx.setLineDash([2,2]);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);ctx.font='bold 8px sans-serif';ctx.fillStyle='#fff';ctx.fillText('!',point.x+radius+5,barTop-8); }
    if (enemy.id === selectedTargetId) { ctx.beginPath();ctx.arc(point.x,bodyY,radius+9,0,Math.PI*2);ctx.setLineDash([3,2]);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);ctx.font='bold 8px sans-serif';ctx.fillStyle='#fff';ctx.fillText('TARGET',point.x,bodyY+radius+13+stackRank*9); }
    if (enemy.telegraph || enemy.bossTelegraphTimer > 0) { ctx.beginPath();ctx.arc(point.x,bodyY,radius+13,0,Math.PI*2);ctx.setLineDash([3,3]);ctx.strokeStyle=enemy.boss?'#ffe2a0':'#fff';ctx.lineWidth=enemy.boss?3:2;ctx.stroke();ctx.setLineDash([]); }
    const choreography=enemy.boss?bossChoreoForEnemy(enemy):null;
    if(choreography){ctx.save();ctx.globalAlpha=choreography.alpha??1;ctx.beginPath();ctx.arc(point.x,bodyY,radius+17,0,Math.PI*2);ctx.setLineDash(choreography.kind==='danger'?[2,3]:[]);ctx.strokeStyle=choreography.kind==='danger'?'#ff745f':'#b8f28a';ctx.lineWidth=3;ctx.stroke();ctx.setLineDash([]);ctx.font='bold 9px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle=choreography.kind==='danger'?'#ff9b82':'#c9f59c';ctx.fillText(choreography.kind==='danger'?'DANGER':'RECOVERY',point.x,bodyY+radius+19);ctx.restore();}
    if (enemy.bossTelegraphTimer > 0 && enemy.bossTelegraph) {
      ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const name = enemy.bossName || 'Bramble boss', labelWidth = Math.min(240, Math.max(ctx.measureText(name).width, ctx.measureText(enemy.bossTelegraph).width) + 12);
      const labelX = Math.max(labelWidth / 2 + 4, Math.min(width - labelWidth / 2 - 4, point.x));
      let labelTop = Math.max(4, bodyY - radius - 41);
      const overlaps = top => bossWarningBoxes.some(box => Math.abs(box.x-labelX) < (box.width+labelWidth)/2+4 && Math.abs(box.top-top) < 38);
      if (overlaps(labelTop)) {
        for (let offset=38; offset<height; offset+=38) {
          const top = [labelTop+offset,labelTop-offset].find(y=>y>=4 && y<=height-38 && !overlaps(y));
          if (top !== undefined) { labelTop=top; break; }
        }
      }
      bossWarningBoxes.push({x:labelX,top:labelTop,width:labelWidth});
      bossWarnings.push({ x:point.x, bodyY, radius, labelX, labelTop, labelWidth, name, cue:enemy.bossTelegraph });
    }
  });
  if (selectedType && pointer.inside) {
    const def = towersDef[selectedType], valid = !placementError(pointer);
    ctx.globalAlpha = .68; ctx.fillStyle = valid ? def.color : '#dd6655'; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 14, 0, Math.PI * 2); ctx.fill();
    const range=placementPreviewRange(selectedType,pointer);
    ctx.globalAlpha = .3; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, range, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    const groundSegments=pathSegmentsWithinRadius(path,pointer,range);
    if(groundSegments.length){ctx.beginPath();for(const segment of groundSegments){ctx.moveTo(segment.x1,segment.y1);ctx.lineTo(segment.x2,segment.y2);}ctx.strokeStyle='#f8ffe6';ctx.lineWidth=Math.max(3,5/(displayScale||1));ctx.setLineDash([]);ctx.stroke();}
    if(def.antiAir&&airPath)drawAirCoverage(ctx,airPath,pointer,range,displayScale);
    ctx.save();ctx.strokeStyle='#fff3a6';ctx.lineWidth=2;ctx.setLineDash([3,2]);
    enemies.filter(enemy=>canHitTarget({canHitAir:Boolean(def.antiAir)},enemy)&&Math.hypot(enemyPosition(enemy).x-pointer.x,enemyPosition(enemy).y-pointer.y)<=range).forEach(enemy=>{const target=enemyPosition(enemy);ctx.beginPath();ctx.arc(target.x,target.y,enemy.radius+4,0,Math.PI*2);ctx.stroke();});ctx.restore();
    (valid?placementComboPreviews(selectedType,pointer):[]).forEach(({combination,counterpart})=>{
      const style=COMBINATION_LINK_STYLES[combination.id];if(!style)return;
      ctx.save();ctx.globalAlpha=.9;ctx.setLineDash(style.dash.map(length=>length/(displayScale||1)));ctx.strokeStyle=style.color;ctx.lineWidth=Math.max(2,2.5/(displayScale||1));ctx.beginPath();ctx.moveTo(counterpart.x,counterpart.y);ctx.lineTo(pointer.x,pointer.y);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(counterpart.x,counterpart.y,24,0,Math.PI*2);ctx.strokeStyle=style.color;ctx.lineWidth=Math.max(2,2/(displayScale||1));ctx.stroke();
      drawTowerArt(ctx,selectedType,pointer.x,pointer.y,{level:1,branch:null,color:def.color,scaleX:.82,scaleY:.82,displayScale});
      const label=`${combination.name} link`;ctx.font=`bold ${Math.max(9,10/(displayScale||1))}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';const labelY=Math.max(12,pointer.y-31),labelWidth=ctx.measureText(label).width+10;ctx.fillStyle='#17241bec';ctx.fillRect(pointer.x-labelWidth/2,labelY-8,labelWidth,16);ctx.fillStyle=style.color;ctx.fillText(label,pointer.x,labelY);ctx.restore();
    });
  }
  // Draw connectors first, then opaque cards last so later enemies and placement previews cannot cover threat text.
  bossWarnings.forEach(({x,bodyY,radius,labelX,labelTop})=>{
    ctx.beginPath(); ctx.moveTo(x, bodyY-radius); ctx.lineTo(labelX,labelTop+34);
    ctx.strokeStyle = '#ffe8a6'; ctx.lineWidth = 1; ctx.stroke();
  });
  bossWarnings.forEach(({labelX,labelTop,labelWidth,name,cue})=>{
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#20271fee'; ctx.fillRect(labelX - labelWidth / 2, labelTop, labelWidth, 34);
    ctx.fillStyle = '#fff4d2'; ctx.fillText(name, labelX, labelTop + 13, labelWidth - 8);
    ctx.fillStyle = '#ffe8a6'; ctx.fillText(cue, labelX, labelTop + 28, labelWidth - 8);
  });
}

export { projectileStyleForTower };
