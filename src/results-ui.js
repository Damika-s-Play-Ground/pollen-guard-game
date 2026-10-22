const rounded = value => Math.round((Number(value) || 0) * 10) / 10;

export function renderRunDebrief(container, report, document) {
  container.replaceChildren();
  const heading = document.createElement('h3'); heading.textContent = 'Combat report'; container.append(heading);
  const context = document.createElement('p'); context.className = 'debrief-context';
  context.textContent = `${report.mapName} · ${report.challengeLabel} · ${report.won ? 'Victory' : 'Defeat'}${report.complete ? '' : ' · partial contribution history'}`; container.append(context);
  const totals = document.createElement('p'); totals.className = 'debrief-totals';
  totals.textContent = `${report.totalDamage} effective damage (${report.towerDamage} by defenders${report.otherDamage ? ` · ${report.otherDamage} by meadow powers` : ''}) · ${report.totalKills} defeats · ${report.totalLeaks} leaks`; container.append(totals);
  const suggestion = document.createElement('p'); suggestion.className = 'debrief-suggestion'; suggestion.textContent = report.suggestion; container.append(suggestion);
  const table = document.createElement('table'); table.className = 'debrief-table';
  const caption = document.createElement('caption'); caption.textContent = 'Defender contribution'; table.append(caption);
  const head = document.createElement('thead'), headerRow = document.createElement('tr');
  for (const label of ['Defender','Damage','Defeats','Income','Control']) {
    const header = document.createElement('th'); header.scope = 'col'; header.textContent = label; headerRow.append(header);
  }
  head.append(headerRow); table.append(head);
  const body = document.createElement('tbody'), maxDamage = Math.max(1, ...report.towers.map(tower => tower.damage));
  for (const tower of report.towers) {
    const row = document.createElement('tr');
    const name = document.createElement('td'); name.textContent = `${tower.name} · level ${tower.level || 1}`; row.append(name);
    const damage = document.createElement('td'), damageLabel = document.createElement('span'), meter = document.createElement('div');
    damageLabel.textContent = `${rounded(tower.damage)} effective damage`;
    meter.className = 'debrief-damage-meter'; meter.setAttribute('role','meter'); meter.setAttribute('aria-label',`${tower.name} effective damage`);
    meter.setAttribute('aria-valuemin','0'); meter.setAttribute('aria-valuemax',String(maxDamage)); meter.setAttribute('aria-valuenow',String(rounded(tower.damage)));
    const fill = document.createElement('i'); fill.style.width = `${Math.max(0,Math.min(100,100*tower.damage/maxDamage))}%`; meter.append(fill); damage.append(damageLabel,meter); row.append(damage);
    for (const value of [`${tower.kills} defeats`, `${rounded(tower.income)} income`, `${rounded(tower.slowSeconds + tower.stunSeconds)}s control effects`]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
    body.append(row);
  }
  if (!report.towers.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 5; cell.textContent = 'No defender contribution was recorded.'; row.append(cell); body.append(row); }
  table.append(body); container.append(table);
  const enemyDetails = document.createElement('details');
  const summary = document.createElement('summary'); summary.textContent = 'Enemy and route outcome'; enemyDetails.append(summary);
  const enemyList = document.createElement('ul');
  for (const enemy of report.enemies) { const item = document.createElement('li'); item.textContent = `${enemy.name}: ${rounded(enemy.damage)} damage taken · ${enemy.defeated} defeated · ${enemy.leaked} leaked`; enemyList.append(item); }
  enemyDetails.append(enemyList); container.append(enemyDetails);
}

export function renderResultsScreen(elements, model, document) {
  elements.kicker.textContent = model.won ? 'GARDEN COMPLETE' : 'RUN COMPLETE';
  elements.title.textContent = model.won ? 'Garden saved' : 'The trail got through';
  elements.description.textContent = model.won
    ? 'Your defenders protected the meadow. Here is how the run finished.'
    : 'Your seed pod was overrun. Try another trail or challenge rule.';
  elements.wave.textContent = String(model.wave);
  elements.popped.textContent = String(model.popped);
  elements.petals.textContent = String(model.petals);
  elements.record.textContent = model.record;
  renderRunDebrief(elements.debrief, model.report, document);
}
