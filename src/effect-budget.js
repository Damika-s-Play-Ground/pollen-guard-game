export const MAX_COSMETIC_PARTICLES = 180;

export function appendCosmeticParticles(current, incoming, limit = MAX_COSMETIC_PARTICLES) {
  if (!Array.isArray(current) || !Array.isArray(incoming) || !Number.isInteger(limit) || limit < 0) return [];
  if (incoming.length >= limit) return incoming.slice(incoming.length - limit);
  const overflow = Math.max(0, current.length + incoming.length - limit);
  return [...current.slice(overflow), ...incoming];
}
