import { enemyCombatProfiles } from './game-data.js';
import { AUTHORED_WAVES, buildWaveQueue, calculateWaveBudget, summarizeWave, upcomingWaves } from './waves.js';
import { ENDLESS_CHOICES } from './endless-mode.js';

const pluralNames = {
  mite: 'moss mites', zip: 'zip mites', armored: 'armored beetles', shield: 'shield bugs',
  splitter: 'splitters', flyer: 'sky gnats', boss: 'Bramble bosses'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export function waveRating(budget) {
  return budget >= 45 ? 'extreme' : budget >= 30 ? 'high' : budget >= 18 ? 'medium' : 'low';
}

function bossCue(cue, name) {
  return name ? cue.replace(/Bramble bosses/g, `${name} bosses`).replace(/Bramble boss|Bramble beetle/g, name) : cue;
}

export function buildWaveTimelineView({ bossName, terminal, won, running, paused, wave, scheduled, enemyCount, sunflowerIncome, intermission, challenge, limit, difficulty, challengeRules, endlessModifier = null, schedules = AUTHORED_WAVES }) {
  const options={difficulty,challengeRules,endless:challenge==='endless',endlessModifier};
  const summary = running ? summarizeWave(wave, schedules, options) : null;
  return {
    terminal, won, running, paused, wave,
    spawned: summary ? Math.max(0, summary.total - scheduled) : 0,
    scheduled,
    enemyCount,
    sunflowerIncome,
    intermission,
    forecasts: upcomingWaves(wave + 1, 3, challenge === 'endless' ? Infinity : limit, schedules, options).map(summary=>({...summary,bossName,cue:bossCue(summary.cue,bossName)}))
  };
}

const previewEnemyNames = {
  mite: 'moss mites', zip: 'zip mites', armored: 'armored beetles', shield: 'shield bugs',
  splitter: 'splitters', flyer: 'sky gnats', boss: 'BRAMBLE BOSS', healer:'Moss Tenders', carrier:'Shield Carriers', burrower:'Burrowers'
};

export function buildWavePreviewView({ terminal, won, running, wave, mapLabel, bossName = 'Bramble boss', schedules = AUTHORED_WAVES, airRouteEnabled = false, difficulty, challengeRules, endless = false, endlessModifier = null }) {
  if (terminal) return {
    terminal: true,
    won,
    waveInfo: won ? 'All waves cleared! This garden is thriving.' : 'The seed pod was overrun. Try another layout or challenge rule.'
  };

  const previewWave = running ? wave : wave + 1;
  const queue = buildWaveQueue(previewWave, schedules, {difficulty,challengeRules,endless,endlessModifier});
  const counts = queue.reduce((all, item) => {
    const type = typeof item === 'string' ? item : item.type;
    all[type] = (all[type] || 0) + 1;
    return all;
  }, {});
  const budget = calculateWaveBudget(queue);
  const seedRecovery=Boolean(challengeRules?.includes('seedRecovery'));
  const markedSeedThieves=queue.filter(item=>item.seedCarrier).length;
  const names = { ...previewEnemyNames, boss:bossName };
  const incoming = Object.entries(counts).map(([type,count])=>`${count} ${names[type] || type}`).join(', ');
  const preview = {
    wave: previewWave,
    counts,
    total: queue.length,
    threat: waveRating(budget),
    names,
    cue: `${bossCue(schedules[(previewWave - 1) % schedules.length].cue, bossName === 'Bramble boss' ? undefined : bossName)}${endless&&endlessModifier&&ENDLESS_CHOICES[endlessModifier]?` Endless pressure: ${ENDLESS_CHOICES[endlessModifier].description}`:''}${markedSeedThieves?' Marked ground pest carries one seed out to the cache, then returns along the amber route. Defeat it to recover the seed.':''}`,
    budget
  };
  const waveInfo = running
    ? `Wave ${preview.wave} is in progress. ${preview.total} enemies are in this encounter. ${preview.cue}`
    : wave === 0
      ? `Wave 1 brings ${incoming}. ${preview.cue} Encounter rating is ${preview.threat}; place a defender and launch when ready.`
      : `Wave ${preview.wave}: ${preview.total} enemies expected. ${preview.cue} Early launch starts the threat now and adds the displayed bonus; waiting or normal launch pays no early bonus.`;
  return { terminal: false, preview, boss: Boolean(counts.boss), bossName, mapLabel, airRouteEnabled,seedRecovery, waveInfo };
}

export function renderWavePreview({ document, enemyPreview, waveThreat, mapNote, waveInfo, view }) {
  if (view.terminal) {
    enemyPreview.replaceChildren();
    waveThreat.className = 'wave-threat';
    waveThreat.textContent = 'Encounter complete';
    mapNote.classList.remove('boss-callout');
    setMapNote(document, mapNote, 'NO UPCOMING WAVES', 'This trail is complete');
    waveInfo.textContent = view.waveInfo;
    return;
  }

  const { preview, boss } = view;
  const chips = Object.entries(preview.counts).map(([type, count]) => {
    const name = preview.names[type] || type;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `enemy-chip ${type === 'boss' ? 'boss' : ''}`;
    button.dataset.enemyIntel = type;
    button.setAttribute('aria-label', `Inspect ${name} in the enemy field guide`);
    button.setAttribute('title', `${name} · ${count} incoming`);
    button.textContent = `${name} ×${count}`;
    return button;
  });
  enemyPreview.replaceChildren(...chips);
  waveThreat.className = `wave-threat ${preview.threat === 'high' || preview.threat === 'extreme' ? 'high' : ''} ${boss ? 'boss' : ''}`;
  waveThreat.textContent = `Encounter rating · ${preview.threat}${boss ? ' · BOSS WAVE' : ''}`;
  mapNote.classList.toggle('boss-callout', boss);
  const note=view.seedRecovery?'Green → cache · amber ← return. Marked ground pests steal one seed; defeat them to recover it.':view.airRouteEnabled?'Cyan dashes: sky route · gold: anti-air reach':boss?'Prepare for a heavy wave':'Place defenders beside the winding trail';
  setMapNote(document, mapNote, boss ? (view.bossName || 'Bramble boss').toUpperCase() : view.mapLabel, note);
  waveInfo.textContent = view.waveInfo;
}

function setMapNote(document, mapNote, headingText, bodyText) {
  const heading = document.createElement('strong');
  heading.textContent = headingText;
  mapNote.replaceChildren(heading, document.createElement('br'), document.createTextNode(bodyText));
}

export function renderWaveCard(summary, label = 'Upcoming') {
  const rating = waveRating(summary.budget), boss = summary.groups.some(group => group.type === 'boss');
  const groups = summary.groups.map(group => {
    const name = escapeHtml(group.type === 'boss' && summary.bossName ? summary.bossName : enemyCombatProfiles[group.type]?.name || group.type);
    const plural = group.count === 1 ? name : group.type === 'boss' && summary.bossName ? `${name} bosses` : pluralNames[group.type] || `${name}s`;
    const lane = group.lane === 'air' ? 'Air' : 'Ground';
    const safeType = escapeHtml(group.type), safeCount = escapeHtml(group.count), safeLane = escapeHtml(lane);
    const seedNote=group.seedCarrierCount?` · ${group.seedCarrierCount} seed thief` : '';
    return `<button type="button" class="wave-group ${group.lane === 'air' ? 'air' : ''}" data-enemy-intel="${safeType}" aria-label="Inspect ${safeCount} ${plural}, ${safeLane} lane"><span>${safeCount} ${plural}</span><small>${safeLane} lane${seedNote}</small></button>`;
  }).join('');
  return `<article class="wave-forecast ${boss ? 'boss' : ''}"><div class="wave-forecast-head"><b>${escapeHtml(label)} · Wave ${escapeHtml(summary.wave)}${boss ? ' · BOSS' : ''}</b><span class="wave-rating ${rating}">Encounter · ${rating}</span></div><p>${escapeHtml(summary.cue)}</p><div class="wave-groups">${groups}</div><small>Spawn span ≈ ${escapeHtml(summary.spawnSpan.toFixed(1))}s · up to ${escapeHtml(summary.bounty)} bounty + ${escapeHtml(summary.clearBonus)} clear bonus petals (all defeats; Sunflower income not included)</small></article>`;
}

export function renderWaveTimeline(element, state) {
  if (!element) return false;
  const { terminal, won, running, paused, wave, spawned, scheduled, enemyCount, sunflowerIncome, intermission, forecasts } = state;
  let content = '';
  if (terminal) {
    content = `<p class="timeline-terminal">${won ? 'Garden complete · no upcoming waves.' : 'Run ended · no upcoming waves.'}</p>`;
  } else {
    if (running) {
      content += `<div class="wave-current"><b>Current · Wave ${escapeHtml(wave)}</b><span>${paused ? 'Paused' : 'In progress'} · ${escapeHtml(spawned)} spawned · ${escapeHtml(scheduled)} still scheduled · ${escapeHtml(enemyCount)} on the trail</span></div>`;
    } else if (wave > 0) {
      content += '<div class="wave-current cleared"><b>Wave ' + escapeHtml(wave) + ' cleared</b><span>Plan for the next encounter</span></div>';
    }
    if (forecasts.length) {
      const summary = forecasts[0], earlyBonus = intermission > 0 ? Math.max(1, Math.ceil(intermission)) : 0;
      const abilityNote = 'Ivy Snare costs 45 petals; Golden Harvest adds 35 once per wave when used during combat.';
      content += `<section class="economy-forecast" aria-label="Next wave economy"><b>Wave ${escapeHtml(summary.wave)} economy</b><span>On a cleared wave: +${escapeHtml(summary.clearBonus)} clear bonus${sunflowerIncome ? ` + ${escapeHtml(sunflowerIncome)} Sunflower income` : ''} petals.</span><span>Enemy bounty: up to ${escapeHtml(summary.bounty)} petals, only for enemies defeated before they leak.</span><span>${earlyBonus ? `Early call now: +${escapeHtml(earlyBonus)} petals, trading the remaining prep countdown for an immediate launch. Normal launch or waiting pays no early bonus.` : 'Early-call bonus: 0 petals; the countdown ended, so waiting pays no bonus.'}</span><small>${abilityNote} Forecast excludes ability use; leaks cost seeds.</small></section>`;
      content += forecasts.map((forecast, index) => renderWaveCard(forecast, index === 0 ? 'Next' : 'Then')).join('');
    } else {
      content += `<p class="timeline-terminal">${running ? 'Final wave in progress · no later waves.' : 'No upcoming waves.'}</p>`;
    }
  }
  if (element.innerHTML === content) return false;
  element.innerHTML = content;
  return true;
}
