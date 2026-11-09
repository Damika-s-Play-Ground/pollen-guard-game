export function upgradeConfirmationKind(tower, nextLevel) {
  return tower?.level === 1 && nextLevel === 2 && Number.isInteger(tower.branchChoice)
    ? 'branch-commit'
    : null;
}

export function activateUpgrade({ tower, nextLevel, now, canActivate, purchase, confirmBranch }) {
  if (!canActivate(now)) return 'duplicate';
  if (upgradeConfirmationKind(tower, nextLevel) === 'branch-commit') {
    confirmBranch(purchase);
    return 'confirmation-required';
  }
  purchase();
  return 'purchased';
}

export function createUpgradeActivationGate(windowMs = 350) {
  let lastActivation = -Infinity;
  return now => {
    if (!Number.isFinite(now) || now - lastActivation < windowMs) return false;
    lastActivation = now;
    return true;
  };
}
