// A splash can affect several pests, but its source-to-target trace should lead
// to the projectile's authored target instead of drawing a web across the group.
export function primaryImpactCausalityTarget(shot, results, selectedTargetId) {
  if (!shot || !Array.isArray(results)) return null;
  const result = results.find(item => item?.enemy?.id === shot.targetId);
  if (!result) return null;
  const enemy = result.enemy;
  return enemy.id === selectedTargetId || enemy.boss || enemy.armor > 0 || enemy.shield > 0
    ? enemy
    : null;
}
