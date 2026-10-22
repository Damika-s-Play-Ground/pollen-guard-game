export function renderCombatReference({ note, matrixBody, profileBody, rules, matrix, profiles, document }) {
  note.textContent = Object.values(rules).join(' ');

  for (const rule of matrix) {
    const row = document.createElement('tr');
    for (const value of Object.values(rule)) {
      const isHeading = value === rule.rule;
      const cell = document.createElement(isHeading ? 'th' : 'td');
      if (isHeading) cell.scope = 'row';
      cell.textContent = value;
      row.append(cell);
    }
    matrixBody.append(row);
  }

  for (const [type, profile] of Object.entries(profiles)) {
    const row = document.createElement('tr');
    const statusMods = [
      ...(profile.statusImmunities || []).map(name => `${name} immune`),
      ...Object.entries(profile.statusResistances || {}).map(([name, multiplier]) => `${name} ${multiplier}×`)
    ];
    row.dataset.enemy = type;
    row.tabIndex = -1;
    const values = [
      profile.name,
      ...['physical', 'heat', 'toxin'].map(channel => `${profile.resistances[channel] ?? 1}×`),
      statusMods.join(', ') || '—'
    ];
    for (const [index, value] of values.entries()) {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.scope = 'row';
      cell.textContent = value;
      row.append(cell);
    }
    profileBody.append(row);
  }
}
