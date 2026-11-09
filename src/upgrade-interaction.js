export function upgradeConfirmationKind(tower, nextLevel) {
  return tower?.level === 1 && nextLevel === 2 && Number.isInteger(tower.branchChoice)
    ? 'branch-commit'
    : null;
}

export function branchCommitConfirmation({ branchName, towerName, cost, cash, investedAfter, refundAfter }) {
  return {
    title:`Commit ${branchName}?`,
    message:`Spend ${cost} petals to commit ${towerName} to the ${branchName} branch? This choice cannot be changed for this defender. Funds after: ${Math.floor(cash-cost)} · total investment: ${investedAfter} · sell return after upgrade: ${refundAfter}.`,
    acceptLabel:`Commit branch · ${cost} ✿`
  };
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
