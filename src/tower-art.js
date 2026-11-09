const polygon = (points, fill, stroke = '#263b2c', width = 1.3) => ({ kind: 'polygon', points, fill, stroke, width });
const circle = (x, y, r, fill, stroke = '#263b2c', width = 1) => ({ kind: 'circle', x, y, r, fill, stroke, width });
const line = (points, stroke = '#263b2c', width = 1.4) => ({ kind: 'line', points, stroke, width });

export const CORE_TOWER_TYPES=Object.freeze(['sprout','dew','puff','thorn']);
// Core defenders need a stronger silhouette at phone canvas scale. This is a
// presentation-only transform; placement, collision and combat radii stay put.
export function towerArtScale(type) { return CORE_TOWER_TYPES.includes(type)?1.3:1; }

// Original, small-scale meadow forms. Coordinates share one 32px viewBox so the
// catalog, inspector and battlefield all render the same authored shapes.
export const TOWER_ART_MANIFEST = Object.freeze({
  sprout: { base: [line([[16,27],[16,16]], '#315538', 2.8), polygon([[15,21],[5,14],[8,24]], '#507f49'), polygon([[15,19],[7,14],[9,22]], '#79b85b'), line([[9,17],[15,20]], '#c4e99a', 1), polygon([[17,19],[27,10],[25,22]], '#5e8e4b'), polygon([[17,17],[24,11],[24,19]], '#9ad36d'), line([[18,17],[23,13]], '#d0f0a4', 1), ...Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return circle(16+Math.cos(a)*4.2,11+Math.sin(a)*4.2,2.5,i%2?'#efb95d':'#ffdc78','#8c693d',.6);}), circle(16,11,3.2,'#7a5139','#4d372c',.8), circle(14.9,9.9,.8,'#fff2c0','none',0)] },
  dew: { base: [polygon([[16,2],[24,10],[22,19],[19,24],[16,30],[13,24],[10,19],[8,10]], '#397f88','#28525b',1.5), polygon([[16,4],[22,10],[20,18],[17,23],[16,15]], '#4c9ca3','none',0), polygon([[16,4],[10,10],[12,18],[15,23],[16,15]], '#85d4d0','none',0), line([[11,10],[13,7],[16,5]], '#e5fff1', 2.2), circle(12.3,13,1.2,'#effff5','none',0), line([[13,24],[16,27],[19,24]], '#28636d',1.3)] },
  puff: { base: [polygon([[9,17],[23,17],[24,25],[20,28],[11,27]], '#a85d50','#593e3a',1.3), polygon([[5,17],[6,12],[10,10],[12,6],[17,7],[20,9],[24,8],[27,12],[27,17],[23,20],[8,20]], '#d98067','#593e3a',1.3), polygon([[8,17],[11,19],[22,18],[23,22],[18,24],[10,22]], '#b76054','none',0), polygon([[7,12],[10,10],[12,7],[16,8],[13,11],[11,14]], '#f0a18a','none',0), circle(11,13,1.5,'#fff0c8','none',0), circle(21,12,1.5,'#fff0c8','none',0)] },
  thorn: { base: [polygon([[10,27],[10,15],[13,12],[19,12],[22,15],[22,27]], '#547b49','#334e37',1.5), polygon([[9,18],[3,14],[6,21],[11,23]], '#527949','#334e37',1), polygon([[22,19],[29,14],[26,22],[21,24]], '#527949','#334e37',1), polygon([[11,15],[8,8],[14,12],[16,4],[18,12],[24,7],[21,16]], '#a4c77a','#465f3d',1.1), line([[16,6],[16,24]], '#d9efaa',1.5), line([[16,17],[11,13]], '#d9efaa',1), line([[16,20],[21,15]], '#d9efaa',1), polygon([[14,12],[16,4],[18,12]], '#e6edb7','#465f3d',.8)] },
  sunflower: { base: [line([[16,27],[16,18]], '#417747', 2.2), polygon([[16,19],[10,16],[12,22]], '#72b75d'), ...Array.from({length:8}, (_,i)=>{const a=i*Math.PI/4,cx=16+Math.cos(a)*6.3,cy=12+Math.sin(a)*6.3;return polygon([[cx,cy-3],[cx+2.2,cy],[cx,cy+3],[cx-2.2,cy]], '#f1c85e','#8e693b',.7);}), circle(16,12,3.5,'#704d35')] },
  gust: { base: [polygon([[16,4],[26,11],[16,19],[7,14]], '#83cbd0'), line([[16,19],[16,25],[12,28],[18,29],[14,31]], '#e5e5b0', 1.5), circle(16,13,1.5,'#e8ffff','none',0)] },
  ember: { base: [polygon([[15,12],[6,7],[9,17],[14,19]], '#dc8d59'), polygon([[17,12],[26,7],[23,17],[18,19]], '#f0b451'), polygon([[14,10],[18,10],[20,22],[16,27],[12,22]], '#503e3e'), circle(16,11,3,'#f4d17b','#704339')] },
  briar: { base: [line([[8,24],[15,17],[23,9]], '#547340', 2.4), line([[24,24],[17,17],[10,9]], '#547340', 2.4), polygon([[12,18],[6,15],[10,22]], '#8fb45b'), polygon([[20,16],[26,13],[23,20]], '#8fb45b'), circle(16,17,3,'#bdc96c')] },
  pollenBeacon: { base: [line([[16,26],[16,13]], '#65703c', 2.5), circle(16,11,7,'#f0cb58','#916d35',1.2), ...Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return line([[16+Math.cos(a)*9,11+Math.sin(a)*9],[16+Math.cos(a)*13,11+Math.sin(a)*13]],'#fff1a3',1.7);}), circle(16,11,2.2,'#fff6c5')] },
  compostTrap: { base: [polygon([[4,20],[8,13],[15,17],[20,12],[28,19],[24,25],[8,26]], '#94704b','#604c34'), line([[8,19],[12,22],[18,18],[23,22]], '#d7b57b',1.8), circle(16,18,2.4,'#dce894','#637543',.7)] },
  pollinatorRelay: { base: [circle(16,16,9,'#7fc8ca','#386e73',1.3), line([[9,16],[23,16]], '#f2f1c6',1.7), line([[16,9],[16,23]], '#f2f1c6',1.7), polygon([[16,4],[19,10],[16,9],[13,10]], '#b7ece2'), circle(16,16,3,'#ffdf83','#765b3a',.8)] }
});

const branchArt = Object.freeze({
  sprout: [[polygon([[16,10],[4,3],[6,12],[13,16]], '#b5e878'), polygon([[16,10],[28,3],[26,12],[19,16]], '#b5e878')], [circle(5,10,4,'#f2d987'), circle(27,10,4,'#f2d987')]],
  dew: [[polygon([[16,-2],[23,7],[16,17],[9,7]], '#e6ffff')], [polygon([[4,12],[1,18],[5,25],[10,18]], '#9de7e0'), polygon([[28,12],[31,18],[27,25],[22,18]], '#9de7e0')]],
  puff: [[polygon([[2,10],[5,2],[13,8],[11,14]], '#f4dfbb'), polygon([[30,10],[27,2],[19,8],[21,14]], '#f4dfbb')], [circle(5,10,4,'#f6eabf'), circle(27,10,4,'#f6eabf')]],
  thorn: [[polygon([[16,-3],[9,13],[16,8],[23,13]], '#e3efba')], [polygon([[15,4],[2,12],[9,12],[16,10]], '#dce9a9'), polygon([[17,4],[30,12],[23,12],[16,10]], '#dce9a9')]],
  sunflower: [[circle(16,8,4,'#f8e49b'), circle(8,14,3,'#f8e49b'), circle(24,14,3,'#f8e49b')], [polygon([[16,-2],[22,6],[29,4],[25,12],[16,8],[7,12],[3,4],[10,6]], '#fff0a6')]],
  gust: [[line([[22,17],[7,21],[-2,31]], '#fff0bd', 3), circle(-2,31,2.5,'#fff0bd','none',0)], [polygon([[3,10],[14,12],[7,18]], '#f1ffff'), polygon([[29,10],[18,12],[25,18]], '#f1ffff')]],
  ember: [[polygon([[13,10],[1,0],[9,16],[15,20]], '#ffd27a'), polygon([[19,10],[31,0],[23,16],[17,20]], '#ffd27a')], [polygon([[16,-2],[24,10],[16,7],[8,10]], '#fff0a1')]],
  briar: [[polygon([[16,0],[10,14],[16,11],[22,14]], '#c8df79'), polygon([[4,4],[3,16],[11,12]], '#c8df79')], [circle(16,8,3.8,'#f1d47b'), polygon([[28,4],[21,12],[29,16]], '#d1e28d')]]
});

const crownArt = Object.freeze({
  sprout: polygon([[9,9],[6,0],[14,5],[16,0],[19,5],[27,0],[23,10],[19,13],[12,13]], '#e5cf82'), dew: polygon([[10,9],[16,0],[22,9],[19,15],[13,15]], '#efffff'),
  puff: polygon([[7,11],[7,3],[12,7],[16,0],[20,7],[25,3],[25,11]], '#f3dba7'), thorn: polygon([[9,13],[9,1],[16,9],[23,1],[23,13]], '#dce9a7'),
  sunflower: polygon([[7,9],[6,1],[13,6],[16,0],[19,6],[26,1],[25,9],[20,13],[12,13]], '#fff0a5'), gust: polygon([[7,8],[16,0],[25,8],[16,15]], '#eaffff'),
  ember: polygon([[8,11],[8,0],[16,7],[24,0],[24,11],[19,15],[13,15]], '#ffe080'), briar: polygon([[7,13],[11,0],[16,9],[21,0],[25,13],[19,15],[12,15]], '#d9e89b')
});

export function towerArtLayers(type, level = 1, branch = null) {
  const art = TOWER_ART_MANIFEST[type];
  if (!art) return [];
  const layers = [...art.base];
  if (level >= 2 && (branch === 0 || branch === 1)) layers.push(...branchArt[type][branch]);
  if (level >= 3) layers.push(crownArt[type]);
  return layers;
}

function pointsAttr(points) { return points.map(point => point.join(',')).join(' '); }
function layerSvg(layer) {
  const attrs = `fill="${layer.fill || 'none'}" stroke="${layer.stroke || 'none'}" stroke-width="${layer.width || 0}" stroke-linecap="round" stroke-linejoin="round"`;
  if (layer.kind === 'circle') return `<circle cx="${layer.x}" cy="${layer.y}" r="${layer.r}" ${attrs}/>`;
  if (layer.kind === 'line') return `<polyline points="${pointsAttr(layer.points)}" ${attrs}/>`;
  return `<polygon points="${pointsAttr(layer.points)}" ${attrs}/>`;
}

export function towerArtSvg(type, level = 1, branch = null) {
  const layers = towerArtLayers(type, level, branch);
  if (!layers.length) return '';
  return `<svg class="tower-art" viewBox="0 0 32 32" role="img" aria-label="${type} defender, level ${level}${branch == null ? '' : `, branch ${branch + 1}`}" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="27.5" rx="11" ry="2.5" fill="#16261d" opacity=".45"/>${layers.map(layerSvg).join('')}</svg>`;
}

export function drawTowerArt(ctx, type, x, y, { level = 1, branch = null, color = '#79b85b', scale = 1, scaleX = 1, scaleY = 1, displayScale = 1 } = {}) {
  const layers = towerArtLayers(type, level, branch);
  if (!layers.length) return false;
  const artScale=towerArtScale(type),scaledX=scale*artScale*scaleX,scaledY=scale*artScale*scaleY;
  const cssScale=Number.isFinite(displayScale)&&displayScale>0?displayScale:1;
  const minimumStroke=CORE_TOWER_TYPES.includes(type)?1.05/(cssScale*Math.min(Math.abs(scaledX),Math.abs(scaledY))):0;
  ctx.save(); ctx.translate(x, y); ctx.scale(scaledX, scaledY);
  ctx.fillStyle = '#375541'; ctx.beginPath(); ctx.ellipse(0, 9, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(-16, -16);
  for (const layer of layers) {
    ctx.beginPath(); ctx.fillStyle = layer.fill || 'transparent'; ctx.strokeStyle = layer.stroke || 'transparent'; ctx.lineWidth = Math.max(layer.width || 0,minimumStroke); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (layer.kind === 'circle') ctx.arc(layer.x, layer.y, layer.r, 0, Math.PI * 2);
    else { layer.points.forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); if (layer.kind === 'polygon') ctx.closePath(); }
    if (layer.fill && layer.fill !== 'none') ctx.fill();
    if (layer.stroke && layer.stroke !== 'none' && layer.width) ctx.stroke();
  }
  ctx.restore();
  return true;
}
