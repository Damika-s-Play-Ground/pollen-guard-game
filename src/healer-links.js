export function writeHealerLinkVisuals({
  pulses,
  enemies,
  gameTime,
  renderAlpha,
  pathFor,
  positionAt,
  output
}) {
  let count = 0;
  for (const pulse of pulses.values()) {
    let healer = null;
    let target = null;
    for (let index = 0; index < enemies.length; index++) {
      const enemy = enemies[index];
      if (enemy.id === pulse.healerId) healer = enemy;
      if (enemy.id === pulse.targetId) target = enemy;
      if (healer && target) break;
    }
    if (!healer || !target) continue;

    const link = output[count] || (output[count] = { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } });
    positionAt(healer, pathFor, renderAlpha, link.from);
    positionAt(target, pathFor, renderAlpha, link.to);
    const age = gameTime - pulse.time;
    link.amount = pulse.amount;
    link.progress = Math.min(1, age / .45);
    link.alpha = Math.max(.25, 1 - age / .5);
    link.targetId = target.id;
    count++;
  }
  output.length = count;
  return output;
}
