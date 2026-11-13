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
const defaultTargetPosition = target => target;

function distanceFromTower(tower, target, positionOf) {
  const position=positionOf(target);
  return Math.hypot(tower.x-position.x,tower.y-position.y);
}

function compareTargetPriority(mode, tower, a, b, positionOf) {
  switch (mode) {
    case 'Last': return a.progress - b.progress;
    case 'Strongest': return b.hp + (b.shield || 0) - a.hp - (a.shield || 0);
    case 'Weakest': return a.hp - b.hp;
    case 'Closest': return distanceFromTower(tower,a,positionOf)-distanceFromTower(tower,b,positionOf);
    case 'AirFirst': return Number(!isFlyingTarget(a)) - Number(!isFlyingTarget(b)) || b.progress - a.progress;
    case 'Support': return Number(!isSupportTarget(a)) - Number(!isSupportTarget(b)) || b.progress - a.progress;
    default: return b.progress - a.progress;
  }
}

export function chooseTargetForTower(tower, candidates, positionOf = defaultTargetPosition) {
  if (!candidates.length) return null;
  const mode = tower.targetMode || 'First';
  let best = candidates[0];
  for (let index = 1; index < candidates.length; index++) {
    const candidate = candidates[index];
    if (compareTargetPriority(mode,tower,best,candidate,positionOf) > 0) best = candidate;
  }
  return best;
}
