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
