import { archivedDailyChallenge, exportChallengeCode, generateBoardChallenge } from './challenge-board.js';
import { CHALLENGE_RULES, DIFFICULTIES } from './challenge-rules.js';
import { modes } from './game-data.js';

function bestText(record) {
  return record ? `${record.won ? 'Cleared' : `Reached wave ${record.wave}`} · ${record.lives} seeds left · ${record.popped} pests popped` : 'No local result recorded yet.';
}

export function renderChallengeBoard({ document, root, bests = {}, now = new Date(), imported = null, activeId = null, archiveDate = '' }) {
  if (!root) return [];
  root.replaceChildren();
  const challenges = [generateBoardChallenge('daily', now), generateBoardChallenge('weekly', now)];
  const archived=archivedDailyChallenge(archiveDate,now);
  if(archived.ok&&!challenges.some(item=>item.id===archived.challenge.id))challenges.push(archived.challenge);
  if (imported && !challenges.some(item => item.id === imported.id)) challenges.push(imported);
  for (const challenge of challenges) {
    const card = document.createElement('article'); card.className = 'challenge-board-card';
    const title = document.createElement('h4'); title.textContent = challenge.cadence==='daily'&&challenge.period < new Date(now).toISOString().slice(0,10) ? 'Archived daily garden' : challenge.cadence === 'daily' ? 'Daily garden' : challenge.cadence === 'weekly' ? 'Weekly garden' : 'Imported garden';
    const summary = document.createElement('p');
    const rules = challenge.rules.length ? challenge.rules.map(rule => CHALLENGE_RULES[rule]?.label ?? rule).join(' + ') : 'No extra rule';
    summary.textContent = `${mapsName(challenge.mapId)} · ${modes[challenge.mode]?.label ?? challenge.mode} · ${DIFFICULTIES[challenge.difficulty]?.label ?? challenge.difficulty} · ${rules}`;
    const period = document.createElement('small'); period.textContent = `${challenge.cadence === 'weekly' ? 'Week starting' : 'UTC date'} ${challenge.period}${activeId === challenge.id ? ' · current run' : ''}`;
    const best = document.createElement('p'); best.className = 'challenge-best'; best.textContent = `Personal best on this device: ${bestText(bests[challenge.id])}`;
    const currentOrArchived=challenges.slice(0,archiveDate?3:2).some(item=>item.id===challenge.id);
    const isShared=imported?.id===challenge.id&&!currentOrArchived;
    const play = document.createElement('button'); play.type = 'button'; play.dataset.challengeCode = exportChallengeCode(challenge); play.textContent = activeId === challenge.id ? 'Challenge selected' : isShared?'Play shared garden':'Play this garden'; play.setAttribute('aria-label', `${title.textContent}, ${period.textContent}: ${play.textContent}`); play.setAttribute('aria-pressed',String(activeId === challenge.id));
    const sharing=document.createElement('details');sharing.className='challenge-sharing';const shareSummary=document.createElement('summary');shareSummary.textContent='Share this garden';sharing.append(shareSummary);
    const codeLabel = document.createElement('label'); codeLabel.textContent = 'Garden code (works offline; no leaderboard)';
    const code = document.createElement('input'); code.readOnly = true; code.value = exportChallengeCode(challenge); code.setAttribute('aria-label', `${title.textContent} shareable challenge code`);
    const copy = document.createElement('button'); copy.type = 'button'; copy.dataset.copyChallengeCode = 'true'; copy.textContent = 'Copy garden'; copy.setAttribute('aria-label', `Copy ${title.textContent} garden code`);
    codeLabel.append(code);sharing.append(codeLabel,copy);card.append(title, summary, period, best, play, sharing); root.append(card);
  }
  const archiveLabel=document.createElement('label');archiveLabel.className='challenge-archive-label';archiveLabel.textContent='Replay a past daily garden';
  const archiveInput=document.createElement('input');archiveInput.type='date';archiveInput.id='challengeArchiveDate';archiveInput.max=new Date(new Date(now).getTime()-86400000).toISOString().slice(0,10);archiveInput.value=archiveDate;archiveInput.setAttribute('aria-label','Past daily garden UTC date');archiveInput.setAttribute('aria-describedby','challengeArchiveStatus');
  const archiveButton=document.createElement('button');archiveButton.type='button';archiveButton.id='challengeArchiveBtn';archiveButton.textContent='Open past garden';
  const archiveStatus=document.createElement('p');archiveStatus.id='challengeArchiveStatus';archiveStatus.setAttribute('role','status');archiveStatus.setAttribute('aria-live','polite');
  archiveLabel.append(archiveInput);root.append(archiveLabel,archiveButton,archiveStatus);
  const importLabel = document.createElement('label'); importLabel.className = 'challenge-import-label'; importLabel.textContent = 'Open a shared garden code';
  const input = document.createElement('input'); input.id = 'challengeCodeImport'; input.autocomplete = 'off'; input.maxLength = 1205; input.placeholder = 'PGC1-…'; input.setAttribute('aria-label', 'Challenge code to open'); input.setAttribute('aria-describedby','challengeImportStatus');
  const importButton = document.createElement('button'); importButton.type = 'button'; importButton.id = 'challengeImportBtn'; importButton.textContent = 'Open shared garden';
  const importStatus=document.createElement('p');importStatus.id='challengeImportStatus';importStatus.setAttribute('role','status');importStatus.setAttribute('aria-live','polite');importStatus.setAttribute('aria-atomic','true');
  importLabel.append(input); root.append(importLabel, importButton, importStatus);
  const note = document.createElement('p'); note.className = 'challenge-local-note';
  note.textContent = 'Challenges are optional, work offline, and past daily gardens remain replayable. There are no streaks or missed-day penalties. Personal bests stay on this device and are keyed to the challenge date; changing the clock will not overwrite another day. Bests rank clear, wave reached, seeds remaining, then pests popped. Codes share rules only, not verified scores; there is no global leaderboard or anti-cheat.';
  root.append(note);
  return challenges;
}

function mapsName(mapId) { return mapId === 'meadow' ? 'Sunny Meadow' : mapId; }
