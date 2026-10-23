import { exportChallengeCode, generateBoardChallenge } from './challenge-board.js';
import { CHALLENGE_RULES, DIFFICULTIES } from './challenge-rules.js';
import { modes } from './game-data.js';

function bestText(record) {
  return record ? `${record.won ? 'Cleared' : `Reached wave ${record.wave}`} · ${record.lives} seeds left · ${record.popped} pests popped` : 'No local result recorded yet.';
}

export function renderChallengeBoard({ document, root, bests = {}, now = new Date(), imported = null, activeId = null }) {
  if (!root) return [];
  root.replaceChildren();
  const challenges = [generateBoardChallenge('daily', now), generateBoardChallenge('weekly', now)];
  if (imported && !challenges.some(item => item.id === imported.id)) challenges.push(imported);
  for (const challenge of challenges) {
    const card = document.createElement('article'); card.className = 'challenge-board-card';
    const title = document.createElement('h4'); title.textContent = challenge.cadence === 'daily' ? 'Daily garden' : challenge.cadence === 'weekly' ? 'Weekly garden' : 'Imported garden';
    const summary = document.createElement('p');
    const rules = challenge.rules.length ? challenge.rules.map(rule => CHALLENGE_RULES[rule]?.label ?? rule).join(' + ') : 'No extra rule';
    summary.textContent = `${mapsName(challenge.mapId)} · ${modes[challenge.mode]?.label ?? challenge.mode} · ${DIFFICULTIES[challenge.difficulty]?.label ?? challenge.difficulty} · ${rules}`;
    const period = document.createElement('small'); period.textContent = `${challenge.cadence === 'weekly' ? 'Week starting' : 'UTC date'} ${challenge.period}${activeId === challenge.id ? ' · current run' : ''}`;
    const best = document.createElement('p'); best.className = 'challenge-best'; best.textContent = `Personal best on this device: ${bestText(bests[challenge.id])}`;
    const play = document.createElement('button'); play.type = 'button'; play.dataset.challengeCode = exportChallengeCode(challenge); play.textContent = activeId === challenge.id ? 'Challenge selected' : 'Play this challenge'; play.setAttribute('aria-label', `${title.textContent}, ${period.textContent}: ${play.textContent}`); play.setAttribute('aria-pressed',String(activeId === challenge.id));
    const codeLabel = document.createElement('label'); codeLabel.textContent = 'Shareable challenge code (offline; no leaderboard)';
    const code = document.createElement('input'); code.readOnly = true; code.value = exportChallengeCode(challenge); code.setAttribute('aria-label', `${title.textContent} shareable challenge code`);
    const copy = document.createElement('button'); copy.type = 'button'; copy.dataset.copyChallengeCode = 'true'; copy.textContent = 'Copy code'; copy.setAttribute('aria-label', `Copy ${title.textContent} challenge code`);
    codeLabel.append(code); card.append(title, summary, period, best, play, codeLabel, copy); root.append(card);
  }
  const importLabel = document.createElement('label'); importLabel.className = 'challenge-import-label'; importLabel.textContent = 'Open a challenge code from someone else';
  const input = document.createElement('input'); input.id = 'challengeCodeImport'; input.autocomplete = 'off'; input.maxLength = 1205; input.placeholder = 'PGC1-…'; input.setAttribute('aria-label', 'Challenge code to open'); input.setAttribute('aria-describedby','challengeImportStatus');
  const importButton = document.createElement('button'); importButton.type = 'button'; importButton.id = 'challengeImportBtn'; importButton.textContent = 'Check code';
  const importStatus=document.createElement('p');importStatus.id='challengeImportStatus';importStatus.setAttribute('role','status');importStatus.setAttribute('aria-live','polite');importStatus.setAttribute('aria-atomic','true');
  importLabel.append(input); root.append(importLabel, importButton, importStatus);
  const note = document.createElement('p'); note.className = 'challenge-local-note';
  note.textContent = 'Challenges use a shared map and spell kit, are generated from the device’s UTC date, and work offline. Personal bests stay on this device and are keyed to the challenge date; changing the clock will not overwrite another day. Bests rank clear, wave reached, seeds remaining, then pests popped. Codes share rules only, not verified scores; there is no global leaderboard or anti-cheat.';
  root.append(note);
  return challenges;
}

function mapsName(mapId) { return mapId === 'meadow' ? 'Sunny Meadow' : mapId; }
