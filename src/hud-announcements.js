export function createHudResourceAnnouncements({ announce, schedule = setTimeout, delay = 700 } = {}) {
  let previous = null;
  let latest = null;
  let scheduled = false;
  let generation = 0;
  let changes = { petalsGained:0, petalsSpent:0, healthRestored:0, healthLost:0 };

  function flush(token = generation) {
    if(token!==generation)return;
    scheduled = false;
    const messages = [];
    if (changes.petalsSpent) messages.push(`Spent ${changes.petalsSpent} petals.`);
    if (changes.petalsGained) messages.push(`Gained ${changes.petalsGained} petals.`);
    if (changes.healthLost) messages.push(`Garden health lost ${changes.healthLost}.`);
    if (changes.healthRestored) messages.push(`Garden health restored ${changes.healthRestored}.`);
    if (changes.petalsSpent || changes.petalsGained) messages.push(`${latest.petals} petals available.`);
    if (changes.healthLost || changes.healthRestored) messages.push(`${latest.health} Garden health remaining.`);
    changes = { petalsGained:0, petalsSpent:0, healthRestored:0, healthLost:0 };
    if (messages.length) announce?.(messages.join(' '));
  }

  function update({ cash, lives }) {
    const next = { petals:Math.floor(cash), health:Math.floor(lives) };
    if (!previous) { previous = next; latest = next; return; }
    const petalChange = next.petals - previous.petals;
    const healthChange = next.health - previous.health;
    if (petalChange < 0) changes.petalsSpent += -petalChange;
    if (petalChange > 0) changes.petalsGained += petalChange;
    if (healthChange < 0) changes.healthLost += -healthChange;
    if (healthChange > 0) changes.healthRestored += healthChange;
    previous = next;
    latest = next;
    if (scheduled || !(petalChange || healthChange)) return;
    scheduled = true;
    const token=++generation;
    schedule(()=>flush(token), delay);
  }

  function synchronize({cash,lives}) {
    generation++;
    scheduled=false;
    changes={petalsGained:0,petalsSpent:0,healthRestored:0,healthLost:0};
    previous=latest={petals:Math.floor(cash),health:Math.floor(lives)};
  }

  return { update, synchronize };
}
