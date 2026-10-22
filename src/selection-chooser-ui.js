export function showTowerSelectionChooser({ chooser, board, candidates, towerDefinitions, onSelect, document }) {
  chooser.replaceChildren();
  for (const tower of candidates) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${towerDefinitions[tower.type].name} · level ${tower.level}`;
    button.setAttribute('aria-label', `Inspect ${button.textContent}`);
    button.onclick = () => onSelect(tower);
    chooser.append(button);
  }
  chooser.hidden = false;
  board.classList.add('has-selection-chooser');
}

export function hideTowerSelectionChooser({ chooser, board }) {
  chooser.hidden = true;
  board.classList.remove('has-selection-chooser');
}
