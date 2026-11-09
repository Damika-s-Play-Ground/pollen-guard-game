// A pending placement decision needs its own feedback; otherwise one active
// teaching prompt owns the hint slot until it is dismissed or completed.
export function resolveGuidanceOwner({
  criticalWarning = false,
  placementFeedback = false,
  tutorialActive = false,
  firstAction = false,
  placementAvailable = false,
  placementCancelled = false
} = {}) {
  if (criticalWarning) return 'warning';
  if (placementFeedback) return 'placement';
  if (tutorialActive || firstAction) return 'tutorial';
  if (placementAvailable || placementCancelled) return 'placement';
  return null;
}
