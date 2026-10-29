import { formatMapUnits } from './game-core.js';

export function buildPlacementHintView({ selectedType, placementCandidate, error = '', definition, stats, terrainText = '' }) {
  if (!selectedType) {
    return {
      text:'Placement canceled. Select a defender to continue.',
      className:'placement-hint',
      confirmHidden:true,
      previewActive:false,
      confirmDisabled:true
    };
  }

  const terrain = terrainText ? ` · ${terrainText.replace(/\.$/, '')}` : '';
  const message = placementCandidate
    ? (error || `Preview · ${definition.name} · range ${formatMapUnits(stats.range)}${terrain}. Confirm to spend ${definition.cost} petals.`)
    : error || `Choose ${definition.name} · range ${formatMapUnits(stats.range)}${terrain}. Tap open grass to preview.`;
  return {
    text:message,
    className:`placement-hint ${error ? 'invalid' : 'placing'}`,
    confirmHidden:!placementCandidate,
    previewActive:Boolean(placementCandidate),
    confirmDisabled:!placementCandidate || Boolean(error)
  };
}

export function movePlacementConfirmation({ confirm, destination, activeElement }) {
  if (confirm.parentElement === destination) return false;
  const focused = confirm.contains(activeElement) ? activeElement : null;
  destination.append(confirm);
  focused?.focus({ preventScroll: true });
  return true;
}

export function renderPlacementHint({ hint, confirm, board, confirmButton, view }) {
  hint.textContent = view.text;
  hint.className = view.className;
  confirm.hidden = view.confirmHidden;
  board.classList.toggle('has-placement-preview', view.previewActive);
  confirmButton.disabled = view.confirmDisabled;
}

