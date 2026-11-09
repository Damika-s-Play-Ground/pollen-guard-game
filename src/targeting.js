export const targetPriorityInfo = Object.freeze({
  First: 'furthest along the trail',
  Last: 'least progress along the trail',
  Strongest: 'most hit points plus shield',
  Weakest: 'fewest hit points',
  Closest: 'nearest to this defender',
  AirFirst: 'flying pests first; then furthest along the trail',
  Support: 'healers and shield carriers first; then furthest along the trail'
});

const isSupportTarget = enemy => enemy.type === 'healer' || enemy.type === 'carrier';
const isFlyingTarget = enemy => Boolean(enemy.flying || enemy.type === 'flyer');

export function chooseTargetForTower(tower, candidates, positionOf = target => ({ x: target.x, y: target.y })) {
  if (!candidates.length) return null;
  const mode = tower.targetMode || 'First';
  const distance = target => {
    const position = positionOf(target);
    return Math.hypot(tower.x - position.x, tower.y - position.y);
  };
  const compare = (a, b) => {
    switch (mode) {
      case 'Last': return a.progress - b.progress;
      case 'Strongest': return b.hp + (b.shield || 0) - a.hp - (a.shield || 0);
      case 'Weakest': return a.hp - b.hp;
      case 'Closest': return distance(a) - distance(b);
      case 'AirFirst': return Number(!isFlyingTarget(a)) - Number(!isFlyingTarget(b)) || b.progress - a.progress;
      case 'Support': return Number(!isSupportTarget(a)) - Number(!isSupportTarget(b)) || b.progress - a.progress;
      default: return b.progress - a.progress;
    }
  };
  let best = candidates[0];
  for (let index = 1; index < candidates.length; index++) {
    const candidate = candidates[index];
    if (compare(best, candidate) > 0) best = candidate;
  }
  return best;
}
