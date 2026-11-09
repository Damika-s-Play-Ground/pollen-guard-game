export const CORE_ATTACK_TOWERS = Object.freeze(['sprout','dew','puff','thorn']);
export const ATTACK_ANTICIPATION_SECONDS = .14;

export function attackAnticipation(animation, tower, target, duration = ATTACK_ANTICIPATION_SECONDS) {
  if (animation !== 'full' || !CORE_ATTACK_TOWERS.includes(tower?.type) || !target || !(duration > 0)) return null;
  if (!Number.isFinite(tower.cooldown) || tower.cooldown <= 0 || tower.cooldown > duration ||
      !Number.isFinite(tower.x) || !Number.isFinite(tower.y) || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return null;
  const strength = Math.max(0, Math.min(1, 1 - tower.cooldown / duration));
  if (strength <= 0) return null;
  return { angle:Math.atan2(target.y - tower.y, target.x - tower.x), strength };
}
