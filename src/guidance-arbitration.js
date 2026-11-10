// A pending placement decision needs its own feedback; otherwise one active
// teaching prompt owns the hint slot until it is dismissed or completed.
export function resolveGuidanceOwner({
  criticalWarning = false,
  placementFeedback = false,
  tutorialActive = false,
  firstAction = false,
  placementAvailable = false,
  placementCancelled = false,
  mapNoteAvailable = false
} = {}) {
  if (criticalWarning) return 'warning';
  if (placementFeedback) return 'placement';
  if (tutorialActive || firstAction) return 'tutorial';
  if (placementAvailable || placementCancelled) return 'placement';
  if (mapNoteAvailable) return 'map-note';
  return null;
}

export function guidanceVisibility(owner) {
  return {
    tutorialCoach:owner==='tutorial',
    placementHint:owner==='placement',
    mapNote:owner==='map-note',
    criticalWarning:owner==='warning'
  };
}

export function applyGuidanceVisibility({ visibility, coach, placementHint, mapNoteGuidance, placementConfirm, placementCandidate }) {
  coach.hidden=!visibility.tutorialCoach;
  placementHint.hidden=!visibility.placementHint;
  if(mapNoteGuidance)mapNoteGuidance.hidden=!visibility.mapNote;
  placementConfirm.hidden=visibility.criticalWarning||!placementCandidate;
}
