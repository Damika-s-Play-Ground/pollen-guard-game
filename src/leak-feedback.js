import { seedObjectiveTally } from './seed-objective.js';

export function describeLeakFeedback({ leaked = [], livesBefore = 0, livesAfter = 0, seedObjective = null } = {}) {
  if (!leaked.length) return '';
  const names=leaked.map(enemy=>enemy.type==='flyer'?'Sky gnat':enemy.type==='boss'?enemy.bossName||'Bramble boss':enemy.type==='zip'?'Zip mite':'enemy');
  const lost=Math.max(0,livesBefore-livesAfter);
  const health=lost?`${lost} garden seed${lost===1?'':'s'} lost · ${livesAfter} remain.`:`No garden seeds lost · ${livesAfter} remain.`;
  const escaped=leaked.filter(enemy=>enemy.carryingSeedId!=null).length;
  const tally=seedObjectiveTally(seedObjective);
  const recovery=[];
  if(tally.dropped)recovery.push(`${tally.dropped} dropped cache seed${tally.dropped===1?' is':'s are'} marked and recoverable`);
  if(escaped)recovery.push(`${escaped} seed thief${escaped===1?'':'s'} escaped with a cache seed`);
  if(recovery.length)recovery.push(`${tally.safe}/${tally.total} cache seeds safe`);
  return `${leaked.length} leak${leaked.length===1?'':'s'} · ${names.join(', ')} reached the goal. ${health}${recovery.length?` ${recovery.join('; ')}.`:''}`;
}
