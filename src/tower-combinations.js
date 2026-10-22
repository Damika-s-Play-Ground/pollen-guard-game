export const TOWER_COMBINATIONS = Object.freeze([
  Object.freeze({
    id: 'golden-seeds',
    name: 'Golden Seeds',
    towerTypes: Object.freeze(['sunflower', 'sprout']),
    activeSummary: '12% shorter interval',
    bonus: 'Sprout attack interval is 12% shorter while inside the Sunflower radius.',
    stacking: 'Only one Golden Seeds bonus applies to a Sprout; extra Sunflowers do not stack.'
  }),
  Object.freeze({
    id: 'frosted-seeds',
    name: 'Frosted Seeds',
    towerTypes: Object.freeze(['dew', 'sprout']),
    radius: 108,
    slowDuration: 0.3,
    activeSummary: '0.30s slow',
    bonus: 'Sprout shots slow ground pests for 0.30s.',
    stacking: 'Only one Dew Bell source applies per Sprout; extra Dew Bells do not increase the slow.'
  }),
  Object.freeze({
    id: 'steam-burst',
    name: 'Steam Burst',
    towerTypes: Object.freeze(['dew', 'ember']),
    radius: 108,
    splashRadius: 32,
    slowDuration: 0.45,
    activeSummary: '32-unit splash; 0.45s slow',
    bonus: 'Ember shots burst in a 32-unit radius and slow nearby ground pests for 0.45s.',
    stacking: 'Only one Dew Bell source applies per Ember Moth; extra Dew Bells do not increase the burst.'
  }),
  Object.freeze({
    id: 'sporecap',
    name: 'Sporecap',
    towerTypes: Object.freeze(['briar', 'puff']),
    radius: 100,
    poisonDuration: 1,
    poisonDamage: 1,
    activeSummary: '1.0s poison',
    bonus: 'Puff Pod blasts poison ground pests for 1.0s.',
    stacking: 'Only one Briar Patch source applies per Puff Pod; extra Briars do not extend the poison.'
  }),
  Object.freeze({
    id: 'windcarved-thorns',
    name: 'Windcarved Thorns',
    towerTypes: Object.freeze(['gust', 'thorn']),
    radius: 132,
    pushDistance: 7,
    relayRadius: 160,
    relayRange: 88,
    activeSummary: '7-unit push on Thorn hits',
    bonus: 'Thorn Beacon hits push eligible ground and air pests back by 7 map units.',
    stacking: 'Only one Kite Keeper source applies per Thorn Beacon; extra Kite Keepers do not increase the push.'
  }),
  Object.freeze({
    id: 'cyclone-cap',
    name: 'Cyclone Cap',
    towerTypes: Object.freeze(['gust', 'puff']),
    radius: 120,
    pushDistance: 10,
    activeSummary: '10-unit area push',
    bonus: 'Puff Pod blasts push eligible ground pests back by 10 map units.',
    stacking: 'Only one Kite Keeper source applies per Puff Pod; extra Kite Keepers do not increase the push.'
  })
]);

export function combinationForPair(a, b) {
  if (!a || !b || a === b || a.type === b.type || (a.id !== undefined && a.id === b.id)) return null;
  return TOWER_COMBINATIONS.find(combo =>
    combo.towerTypes.includes(a.type) && combo.towerTypes.includes(b.type)
  ) || null;
}
