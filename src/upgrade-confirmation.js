/** A tower's first upgrade permanently commits its selected branch. */
export function requiresUpgradeBranchConfirmation(tower) {
  return Boolean(tower && tower.level === 1 && Number.isInteger(tower.branchChoice));
}
