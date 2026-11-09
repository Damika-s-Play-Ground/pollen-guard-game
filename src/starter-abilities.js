export function visibleSpellIdsForRun(spellLoadout, { starterOnly = false } = {}) {
  const equipped = Array.isArray(spellLoadout) ? [...new Set(spellLoadout)] : [];
  if (!starterOnly || equipped.length <= 1) return equipped;
  const rescue = equipped.includes('bloom') ? 'bloom' : equipped[0];
  return rescue ? [rescue] : [];
}
