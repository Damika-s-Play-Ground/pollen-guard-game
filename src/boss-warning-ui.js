export function bossWarningText(enemies) {
  const groups = new Map();
  for (const enemy of enemies) {
    if (!(enemy.bossTelegraphTimer > 0) || !enemy.bossTelegraph) continue;
    const text = `${enemy.bossName} · ${enemy.bossTelegraph} · ${Math.ceil(enemy.bossTelegraphTimer * 2) / 2}s`;
    groups.set(text, (groups.get(text) || 0) + 1);
  }
  return [...groups].map(([text, count]) => `${count > 1 ? `${count} bosses · ` : ''}${text}`).join('\n');
}

export function renderBossWarnings(panel, enemies) {
  const text = bossWarningText(enemies);
  if (panel.textContent !== text) panel.textContent = text;
  if (panel.hidden !== !text) panel.hidden = !text;
}
