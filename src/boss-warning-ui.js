import { BOSS_VARIANTS } from './boss-encounters.js';
export function bossWarningText(enemies, cues = new Map(), now = 0) {
  const groups = new Map();
  for (const enemy of enemies) {
    let text = '';
    const biome=BOSS_VARIANTS[enemy.bossVariant]?.biome||enemy.bossVariant;
    if (enemy.bossTelegraphTimer > 0 && enemy.bossTelegraph) text = `${enemy.bossName} · PREPARE · ${enemy.bossTelegraph} · ${Math.ceil(enemy.bossTelegraphTimer * 2) / 2}s`;
    else if (enemy.bossRushTimer > 0) text = `${enemy.bossName} · DANGER · Root rush · ${Math.ceil(enemy.bossRushTimer * 2) / 2}s`;
    else {
      const cue = cues.get?.(enemy.id);
      if (cue && now - cue.time < .9) {
        const kind = cue.kind === 'danger' && now - cue.time < .35 ? 'DANGER' : 'RECOVERY';
        const danger=cue.phase===1
          ? biome==='meadow'?'Mite brood summoned':biome==='creek'?'Shield pulse':biome==='ridge'?'Armor increased':'Boss phase resolved'
          : biome==='meadow'?'Root rush':biome==='creek'?'Sky gnats summoned':biome==='ridge'?'Armored escort summoned':'Boss phase resolved';
        text = `${enemy.bossName} · ${kind} · ${kind === 'DANGER' ? danger : 'Attack now'}`;
      }
    }
    if (!text) continue;
    groups.set(text, (groups.get(text) || 0) + 1);
  }
  return [...groups].map(([text, count]) => `${count > 1 ? `${count} bosses · ` : ''}${text}`).join('\n');
}

export function renderBossWarnings(panel, enemies, cues, now) {
  const text = bossWarningText(enemies, cues, now);
  if (panel.textContent !== text) panel.textContent = text;
  if (panel.hidden !== !text) panel.hidden = !text;
  return Boolean(text);
}
