const polygon = (points, fill, stroke = '#263b2c', width = 1.3) => ({ kind: 'polygon', points, fill, stroke, width });
const circle = (x, y, r, fill, stroke = '#263b2c', width = 1) => ({ kind: 'circle', x, y, r, fill, stroke, width });
const line = (points, stroke = '#263b2c', width = 1.4) => ({ kind: 'line', points, stroke, width });

// Original, small-scale meadow forms. Coordinates share one 32px viewBox so the
// catalog, inspector and battlefield all render the same authored shapes.
export const TOWER_ART_MANIFEST = Object.freeze({
  sprout: { base: [line([[16,25],[16,15]], '#315538', 2.4), polygon([[16,19],[7,14],[9,22]], '#79b85b'), polygon([[16,17],[24,11],[24,19]], '#9ad36d'), circle(16,12,5,'#e9c36d')] },
  dew: { base: [polygon([[8,10],[24,10],[22,21],[18,26],[14,26],[10,21]], '#64bcc0'), line([[11,11],[13,7],[19,7],[21,11]], '#d5fff0', 2), circle(16,16,2,'#e4ffff','#4a8992')] },
  puff: { base: [polygon([[12,15],[20,15],[22,26],[10,26]], '#f1d5a6'), polygon([[5,16],[7,10],[12,7],[20,7],[25,10],[27,16],[24,19],[8,19]], '#d98067'), circle(12,13,1.4,'#fff0c8','none',0), circle(20,11,1.4,'#fff0c8','none',0)] },
  thorn: { base: [polygon([[11,26],[11,14],[14,11],[18,11],[21,14],[21,26]], '#8ab76b'), polygon([[10,17],[5,15],[7,20],[11,21]], '#739d59'), polygon([[21,18],[26,15],[25,20],[21,22]], '#739d59'), polygon([[14,11],[16,5],[18,11]], '#d8e6a2')] },
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
  dew: [[polygon([[16,1],[21,8],[16,15],[11,8]], '#e6ffff')], [polygon([[4,12],[1,18],[5,25],[10,18]], '#9de7e0'), polygon([[28,12],[31,18],[27,25],[22,18]], '#9de7e0')]],
  puff: [[polygon([[2,10],[5,2],[13,8],[11,14]], '#f4dfbb'), polygon([[30,10],[27,2],[19,8],[21,14]], '#f4dfbb')], [circle(5,10,4,'#f6eabf'), circle(27,10,4,'#f6eabf')]],
  thorn: [[polygon([[16,0],[11,12],[16,9],[21,12]], '#e3efba')], [polygon([[15,4],[2,12],[9,12],[16,10]], '#dce9a9'), polygon([[17,4],[30,12],[23,12],[16,10]], '#dce9a9')]],
  sunflower: [[circle(16,8,4,'#f8e49b'), circle(8,14,3,'#f8e49b'), circle(24,14,3,'#f8e49b')], [polygon([[16,0],[21,10],[16,7],[11,10]], '#fff0a6')]],
  gust: [[line([[17,19],[7,21],[1,28]], '#fff0bd', 3), circle(1,28,2.5,'#fff0bd','none',0)], [polygon([[3,10],[14,12],[7,18]], '#f1ffff'), polygon([[29,10],[18,12],[25,18]], '#f1ffff')]],
  ember: [[polygon([[13,10],[1,0],[9,16],[15,20]], '#ffd27a'), polygon([[19,10],[31,0],[23,16],[17,20]], '#ffd27a')], [polygon([[16,0],[22,10],[16,8],[10,10]], '#fff0a1')]],
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

export function drawTowerArt(ctx, type, x, y, { level = 1, branch = null, color = '#79b85b', scale = 1 } = {}) {
  const layers = towerArtLayers(type, level, branch);
  if (!layers.length) return false;
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = '#375541'; ctx.beginPath(); ctx.ellipse(0, 9, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(-16, -16);
  for (const layer of layers) {
    ctx.beginPath(); ctx.fillStyle = layer.fill || 'transparent'; ctx.strokeStyle = layer.stroke || 'transparent'; ctx.lineWidth = layer.width || 0; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (layer.kind === 'circle') ctx.arc(layer.x, layer.y, layer.r, 0, Math.PI * 2);
    else { layer.points.forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); if (layer.kind === 'polygon') ctx.closePath(); }
    if (layer.fill && layer.fill !== 'none') ctx.fill();
    if (layer.stroke && layer.stroke !== 'none' && layer.width) ctx.stroke();
  }
  ctx.restore();
  return true;
}
