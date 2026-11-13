import { formatMapUnits } from './game-core.js';

export function buildPlacementHintView({ selectedType, placementCandidate, error = '', definition, stats, terrainText = '', targetText = '', coverageText = '', firstAction = false }) {
  if (!selectedType) {
    return {
      text:'Placement canceled. Select a defender to continue.',
      className:'placement-hint',
      hidden:false,
      confirmHidden:true,
      previewActive:false,
      confirmDisabled:true
    };
  }

  const terrain = terrainText ? ` · ${terrainText.replace(/\.$/, '')}` : '';
  const target = targetText ? ` · ${targetText}` : '';
  const coverage = coverageText ? ` · Covers ${coverageText}` : '';
  const message = placementCandidate
    ? (error || `Preview · ${definition.name} · range ${formatMapUnits(stats.range)}${terrain}${target}${coverage}. Confirm to spend ${definition.cost} petals.`)
    : firstAction && selectedType === 'sprout' && !error
      ? 'Sprout is selected. Tap open grass beside the trail.'
    : error || `Choose ${definition.name} · range ${formatMapUnits(stats.range)}${terrain}${target}${coverage}. Tap open grass to preview.`;
  return {
    text:message,
    className:`placement-hint ${error ? 'invalid' : 'placing'}`,
    hidden:!placementCandidate&&!error&&!firstAction,
    confirmHidden:!placementCandidate,
    previewActive:Boolean(placementCandidate),
    confirmDisabled:!placementCandidate || Boolean(error)
  };
}

export function renderPlacementHint({ hint, confirm, board, confirmButton, view }) {
  hint.textContent = view.text;
  hint.className = view.className;
  hint.hidden = view.hidden;
  confirm.hidden = view.confirmHidden;
  board.classList.toggle('has-placement-preview', view.previewActive);
  confirmButton.disabled = view.confirmDisabled;
}

