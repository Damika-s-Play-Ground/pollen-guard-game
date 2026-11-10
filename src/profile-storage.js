import { DEFAULT_KEY_BINDINGS, normalizeKeyBindings } from './keyboard-bindings.js';
import { DEFAULT_SPELL_LOADOUT, normalizeSpellLoadout } from './spells.js';
import { DIFFICULTIES } from './challenge-rules.js';
import { earnedResearchPoints, normalizeResearchState } from './research-tree.js';
import { normalizeRelicState } from './relics.js';
import { normalizeChallengeBests } from './challenge-board.js';

export const PROFILE_STORAGE_KEY = 'pollen-guard.profile.v2';
export const PROFILE_BACKUP_KEY = 'pollen-guard.profile.backup.v1';
export const UI_SETTINGS_STORAGE_KEY = 'pollen-guard.ui.v1';

export const DEFAULT_PROFILE = Object.freeze({ unlockedMaps: ['meadow'], unlockedMissions:['meadow'], completedMissions:[], missionRecords:{}, missionMastery:{}, research:{unlocked:[],loadout:{}}, relics:{unlocked:[],loadout:[]}, achievements: [], bestWave: {}, challengeBests:{} });
export const DEFAULT_UI_SETTINGS = Object.freeze({
  animation: 'full', shake: true, flashes: true, compact: false, palette: 'garden', showAirRoute: false,
  textSize: 'normal', tutorialSeen: false, tutorialInProgress: false, tutorialReturnToSavedRun: false, sound: false,
  masterVolume: 80, musicVolume: 20, effectsVolume: 70,
  keyBindings: DEFAULT_KEY_BINDINGS, spellLoadout: DEFAULT_SPELL_LOADOUT, autoStart: false, autoStartHold: false, autoStartDelaySeconds:5
});

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function normalizeMissionMastery(value,{ missionIds=[] }={}){
  const source=isRecord(value)?value:{},validMissions=new Set(missionIds),validDifficulties=new Set(Object.keys(DIFFICULTIES)),normalized={};
  for(const [missionId,byDifficulty] of Object.entries(source)){
    if(!validMissions.has(missionId)||!isRecord(byDifficulty))continue;
    const records={};
    for(const [difficulty,record] of Object.entries(byDifficulty)){
      if(!validDifficulties.has(difficulty)||!isRecord(record))continue;
      const tiers=['completion','objective','efficiency'];
      const safe=Object.fromEntries(tiers.map(tier=>[tier,record[tier]===true]));
      if(tiers.some(tier=>safe[tier]))records[difficulty]=safe;
    }
    if(Object.keys(records).length)normalized[missionId]=records;
  }
  return normalized;
}

export function normalizeProfile(value, { mapIds = [], achievementIds = [] } = {}) {
  const source = isRecord(value) ? value : {};
  const validMaps = new Set(mapIds.length ? mapIds : ['meadow']);
  const validAchievements = new Set(achievementIds);
  const unlockedMaps = Array.isArray(source.unlockedMaps)
    ? [...new Set(source.unlockedMaps.filter(id => validMaps.has(id)))]
    : [...DEFAULT_PROFILE.unlockedMaps];
  if (validMaps.has('meadow') && !unlockedMaps.includes('meadow')) unlockedMaps.unshift('meadow');
  const achievements = Array.isArray(source.achievements)
    ? [...new Set(source.achievements.filter(id => validAchievements.has(id)))]
    : [];
  const missionIds=validMaps;
  const unlockedMissions=Array.isArray(source.unlockedMissions)
    ? [...new Set(source.unlockedMissions.filter(id=>missionIds.has(id)))]
    : (missionIds.has('meadow')?['meadow']:[]);
  if(missionIds.has('meadow')&&!unlockedMissions.includes('meadow'))unlockedMissions.unshift('meadow');
  const completedMissions=Array.isArray(source.completedMissions)
    ? [...new Set(source.completedMissions.filter(id=>missionIds.has(id)))] : [];
  const missionRecords={};
  if(isRecord(source.missionRecords))for(const [id,record] of Object.entries(source.missionRecords)){
    if(!missionIds.has(id)||!isRecord(record)||record.cleared!==true)continue;
    missionRecords[id]={cleared:true,objectiveMet:record.objectiveMet===true,
      lives:Number.isSafeInteger(record.lives)&&record.lives>=0?record.lives:0,
      leaks:Number.isSafeInteger(record.leaks)&&record.leaks>=0?record.leaks:0};
  }
  for(const id of completedMissions)if(!missionRecords[id])missionRecords[id]={cleared:true,objectiveMet:false,lives:0,leaks:0};
  const bestWave = {};
  if (isRecord(source.bestWave)) {
    for (const [key, wave] of Object.entries(source.bestWave)) {
      if (key.length <= 120 && Number.isSafeInteger(wave) && wave >= 0) bestWave[key] = wave;
    }
  }
  const missionMastery=normalizeMissionMastery(source.missionMastery,{missionIds:[...missionIds]});
  const researchProfile={completedMissions:[...completedMissions],missionMastery};
  return { ...source, unlockedMaps, unlockedMissions, completedMissions, missionRecords, missionMastery,
    research:normalizeResearchState(source.research,earnedResearchPoints(researchProfile)),
    relics:normalizeRelicState(source.relics,completedMissions), achievements, bestWave,
    challengeBests:normalizeChallengeBests(source.challengeBests) };
}

export function normalizeUiSettings(value) {
  const source = isRecord(value) ? value : {};
  return {
    ...source,
    animation: ['full', 'reduced', 'off'].includes(source.animation) ? source.animation : DEFAULT_UI_SETTINGS.animation,
    shake: typeof source.shake === 'boolean' ? source.shake : DEFAULT_UI_SETTINGS.shake,
    flashes: typeof source.flashes === 'boolean' ? source.flashes : DEFAULT_UI_SETTINGS.flashes,
    compact: typeof source.compact === 'boolean' ? source.compact : DEFAULT_UI_SETTINGS.compact,
    showAirRoute: typeof source.showAirRoute === 'boolean' ? source.showAirRoute : DEFAULT_UI_SETTINGS.showAirRoute,
    palette: ['garden', 'high-contrast'].includes(source.palette) ? source.palette : DEFAULT_UI_SETTINGS.palette,
    textSize: source.textSize === 'large' ? '150' : ['normal', '125', '150'].includes(source.textSize) ? source.textSize : DEFAULT_UI_SETTINGS.textSize,
    tutorialSeen: typeof source.tutorialSeen === 'boolean' ? source.tutorialSeen : DEFAULT_UI_SETTINGS.tutorialSeen,
    tutorialInProgress: typeof source.tutorialInProgress === 'boolean' ? source.tutorialInProgress : DEFAULT_UI_SETTINGS.tutorialInProgress,
    tutorialReturnToSavedRun: typeof source.tutorialReturnToSavedRun === 'boolean' ? source.tutorialReturnToSavedRun : DEFAULT_UI_SETTINGS.tutorialReturnToSavedRun,
    spellLoadout: normalizeSpellLoadout(source.spellLoadout),
    keyBindings: normalizeKeyBindings(source.keyBindings),
    autoStart: typeof source.autoStart === 'boolean' ? source.autoStart : DEFAULT_UI_SETTINGS.autoStart,
    autoStartHold: source.autoStart === true && source.autoStartHold === true,
    autoStartDelaySeconds: [5,10,15].includes(source.autoStartDelaySeconds) ? source.autoStartDelaySeconds : DEFAULT_UI_SETTINGS.autoStartDelaySeconds,
    sound: typeof source.sound === 'boolean' ? source.sound : DEFAULT_UI_SETTINGS.sound,
    masterVolume: Number.isFinite(source.masterVolume) ? Math.round(Math.max(0, Math.min(100, source.masterVolume))) : DEFAULT_UI_SETTINGS.masterVolume,
    musicVolume: Number.isFinite(source.musicVolume) ? Math.round(Math.max(0, Math.min(100, source.musicVolume))) : DEFAULT_UI_SETTINGS.musicVolume,
    effectsVolume: Number.isFinite(source.effectsVolume) ? Math.round(Math.max(0, Math.min(100, source.effectsVolume))) : DEFAULT_UI_SETTINGS.effectsVolume
  };
}

export function createProfileStorage(storageProvider, { mapIds = [], achievementIds = [] } = {}) {
  let profileLoadState = 'ok';
  let profileRecoverySnapshot = null;
  function read(key, fallback, normalize) {
    try {
      const raw = storageProvider().getItem(key);
      return raw === null ? normalize(fallback) : normalize(JSON.parse(raw));
    } catch {
      return normalize(fallback);
    }
  }

  function write(key, value) {
    storageProvider().setItem(key, JSON.stringify(value));
  }

  function readProfileCandidate(key) {
    const raw=storageProvider().getItem(key);
    if(raw===null)return null;
    return normalizeProfile(JSON.parse(raw),{mapIds,achievementIds});
  }

  return {
    loadProfile() {
      try {
        const profile=readProfileCandidate(PROFILE_STORAGE_KEY);
        if(!profile){
          const backup=readProfileCandidate(PROFILE_BACKUP_KEY);
          if(backup){
            let backupRaw=null;
            try { backupRaw=storageProvider().getItem(PROFILE_BACKUP_KEY); } catch {}
            profileRecoverySnapshot={primary:null,backup:backupRaw};
            profileLoadState='recovered-backup';
            return backup;
          }
        }
        profileLoadState='ok';
        return profile??normalizeProfile(DEFAULT_PROFILE,{mapIds,achievementIds});
      } catch {
        let primary=null,backupRaw=null;
        try { primary=storageProvider().getItem(PROFILE_STORAGE_KEY); } catch {}
        try { backupRaw=storageProvider().getItem(PROFILE_BACKUP_KEY); } catch {}
        profileRecoverySnapshot={primary,backup:backupRaw};
        try {
          const backup=readProfileCandidate(PROFILE_BACKUP_KEY);
          if(backup){profileLoadState='recovered-backup';return backup;}
        } catch {}
        profileLoadState='unreadable';
        return normalizeProfile(DEFAULT_PROFILE,{mapIds,achievementIds});
      }
    },
    saveProfile(value) {
      const storage=storageProvider();
      let existing=null;
      try { existing=storage.getItem(PROFILE_STORAGE_KEY); } catch {}
      if(existing!==null){
        try { normalizeProfile(JSON.parse(existing),{mapIds,achievementIds}); storage.setItem(PROFILE_BACKUP_KEY,existing); }
        catch { /* Keep the previous known-good backup if the current profile is unreadable. */ }
      }
      storage.setItem(PROFILE_STORAGE_KEY,JSON.stringify(value));
    },
    profileLoadState: () => profileLoadState,
    profileRecoveryData() {
      if(profileRecoverySnapshot)return {status:profileLoadState,...profileRecoverySnapshot};
      let primary=null,backup=null;
      try { primary=storageProvider().getItem(PROFILE_STORAGE_KEY); } catch {}
      try { backup=storageProvider().getItem(PROFILE_BACKUP_KEY); } catch {}
      return {status:profileLoadState,primary,backup};
    },
    restoreProfileRecovery(bundle) {
      if(!isRecord(bundle)||bundle.format!=='pollen-guard-profile-recovery-v1')throw new Error('This is not a Pollen Guard profile recovery file.');
      const candidates=[bundle.primary,bundle.backup];
      let recovered=null;
      for(const raw of candidates){
        if(typeof raw!=='string')continue;
        try { const parsed=JSON.parse(raw);if(isRecord(parsed)){recovered=normalizeProfile(parsed,{mapIds,achievementIds});break;} } catch {}
      }
      if(!recovered)throw new Error('No readable profile was found in that recovery file.');
      const current=this.loadProfile();
      this.saveProfile(current);
      this.saveProfile(recovered);
      return recovered;
    },
    loadSettings: () => read(UI_SETTINGS_STORAGE_KEY, DEFAULT_UI_SETTINGS, normalizeUiSettings),
    saveSettings(value) {
      try { write(UI_SETTINGS_STORAGE_KEY, value); return true; }
      catch { return false; }
    }
  };
}
