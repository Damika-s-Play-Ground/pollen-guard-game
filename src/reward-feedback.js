export const MAX_REWARD_SPRITES_PER_BATCH = 8;
export const MAX_ACTIVE_REWARD_SPRITES = 12;

export function packRewardGains(gains, limit = MAX_REWARD_SPRITES_PER_BATCH) {
  if (!Array.isArray(gains) || !Number.isInteger(limit) || limit < 1) return [];
  const valid = gains.filter(gain => Number.isFinite(gain?.amount) && gain.amount > 0 && Number.isFinite(gain.x) && Number.isFinite(gain.y));
  if (!valid.length) return [];
  const count = Math.min(limit, valid.length), packets = [];
  for (let index = 0; index < count; index++) {
    const start = Math.floor(index * valid.length / count), end = Math.floor((index + 1) * valid.length / count);
    const group = valid.slice(start, end), amount = group.reduce((sum, gain) => sum + gain.amount, 0);
    packets.push({ amount, x: group.reduce((sum, gain) => sum + gain.x, 0) / group.length, y: group.reduce((sum, gain) => sum + gain.y, 0) / group.length });
  }
  return packets;
}

export function createRewardFeedbackQueue({ onPresent, maxActive = MAX_ACTIVE_REWARD_SPRITES, maxPending = 32 } = {}) {
  if (typeof onPresent !== 'function' || !Number.isInteger(maxActive) || maxActive < 1 || !Number.isInteger(maxPending) || maxPending < 1)
    throw new TypeError('Reward queue requires a presenter and positive integer limits.');
  const pending = [];
  let active = 0;

  function drain() {
    while (active < maxActive && pending.length) {
      const packet = pending.shift();
      active++;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        active = Math.max(0, active - 1);
        drain();
      };
      try { onPresent(packet, finish); }
      catch { finish(); }
    }
  }

  function enqueue(gains) {
    pending.push(...packRewardGains(gains));
    drain();
    if (pending.length > maxPending) {
      const total = pending.reduce((sum, packet) => sum + packet.amount, 0);
      const x = pending.reduce((sum, packet) => sum + packet.x * packet.amount, 0) / total;
      const y = pending.reduce((sum, packet) => sum + packet.y * packet.amount, 0) / total;
      pending.splice(0, pending.length, { amount: total, x, y });
    }
    drain();
  }

  return { enqueue, activeCount: () => active, pendingCount: () => pending.length,
    pendingAmount: () => pending.reduce((sum, packet) => sum + packet.amount, 0) };
}
