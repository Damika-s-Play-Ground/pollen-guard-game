import { masterOutputLevel } from './audio-mix.js';

export const MAX_AUDIO_VOICES = 8;

export const AUDIO_CUE_PROFILES = Object.freeze({
  place: Object.freeze([{ start:540, end:820, duration:.09, type:'triangle' }]),
  waveStart: Object.freeze([{ start:420, end:520, duration:.11, type:'triangle' }, { start:640, end:700, duration:.09, delay:.07, type:'triangle' }]),
  select: Object.freeze([{ start:650, end:780, duration:.055, type:'sine' }]),
  upgrade: Object.freeze([{ start:580, end:720, duration:.09, type:'triangle' }, { start:760, end:900, duration:.11, delay:.065, type:'triangle' }]),
  ability: Object.freeze([{ start:350, end:520, duration:.16, type:'triangle' }]),
  enemyDefeat: Object.freeze([{ start:560, end:430, duration:.055, type:'sine' }]),
  bossDefeat: Object.freeze([{ start:190, end:120, duration:.16, type:'sawtooth' }]),
  bloom: Object.freeze([{ start:300, end:170, duration:.23, type:'sawtooth' }]),
  snare: Object.freeze([{ start:420, end:270, duration:.16, type:'triangle' }]),
  waveClear: Object.freeze([{ start:600, end:700, duration:.08, type:'triangle' }, { start:760, end:900, duration:.12, delay:.07, type:'triangle' }]),
  victory: Object.freeze([{ start:620, end:800, duration:.2, type:'triangle' }, { start:780, end:1040, duration:.22, delay:.08, type:'triangle' }]),
  defeat: Object.freeze([{ start:210, end:140, duration:.26, type:'sawtooth' }]),
  achievement: Object.freeze([{ start:720, end:960, duration:.16, type:'triangle' }]),
  soundOn: Object.freeze([{ start:600, end:760, duration:.07, type:'triangle' }])
});

export const ATTACK_CUE_PROFILES = Object.freeze({
  sprout: Object.freeze({ launch:[{ start:760,end:980,duration:.035,type:'triangle' },{ start:1520,end:1200,duration:.025,type:'sine',level:.24 }], impact:[{ start:540,end:420,duration:.045,type:'sine' },{ start:1080,end:760,duration:.05,type:'triangle',level:.22 }] }),
  dew: Object.freeze({ launch:[{ start:540,end:700,duration:.065,type:'sine' },{ start:1100,end:1400,duration:.05,type:'triangle',level:.2 }], impact:[{ start:660,end:880,duration:.09,type:'sine' },{ start:1320,end:1040,duration:.06,type:'triangle',level:.25 }] }),
  puff: Object.freeze({ launch:[{ start:300,end:420,duration:.09,type:'sine' },{ start:600,end:480,duration:.08,type:'triangle',level:.2 }], impact:[{ start:260,end:180,duration:.13,type:'sine' },{ start:520,end:390,duration:.09,type:'triangle',level:.2 }] }),
  thorn: Object.freeze({ launch:[{ start:940,end:620,duration:.045,type:'sawtooth' },{ start:1880,end:1240,duration:.035,type:'sine',level:.2 }], impact:[{ start:720,end:480,duration:.055,type:'triangle' },{ start:1080,end:880,duration:.05,type:'sawtooth',level:.18 }] }),
  gust: Object.freeze({ launch:[{ start:920,end:1180,duration:.04,type:'triangle' },{ start:1380,end:1760,duration:.03,type:'sine',level:.18 }], impact:[{ start:780,end:620,duration:.07,type:'sine' },{ start:1560,end:1240,duration:.05,type:'triangle',level:.2 }] }),
  ember: Object.freeze({ launch:[{ start:340,end:220,duration:.08,type:'sawtooth' },{ start:680,end:480,duration:.06,type:'triangle',level:.2 }], impact:[{ start:240,end:360,duration:.1,type:'sawtooth' },{ start:480,end:720,duration:.07,type:'triangle',level:.18 }] }),
  briar: Object.freeze({ launch:[{ start:460,end:360,duration:.07,type:'triangle' },{ start:920,end:720,duration:.055,type:'sine',level:.2 }], impact:[{ start:390,end:250,duration:.11,type:'triangle' },{ start:780,end:520,duration:.08,type:'sawtooth',level:.18 }] })
});

export function createGameAudio({ AudioContextCtor, getSettings, maxVoices = MAX_AUDIO_VOICES }) {
  let context = null, masterGain = null, ambient = null;
  const activeVoices = new Set();

  function ensureContext() {
    if (!context) {
      if (typeof AudioContextCtor !== 'function') return null;
      context = new AudioContextCtor();
      masterGain = context.createGain();
      masterGain.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume()?.catch?.(() => {});
    return context;
  }

  function updateMaster() {
    if (!context || !masterGain) return;
    const settings = getSettings();
    masterGain.gain.setTargetAtTime(masterOutputLevel(settings), context.currentTime, .01);
  }

  function startNotes(notes, volume) {
    if (activeVoices.size >= maxVoices) return 0;
    const audio = ensureContext();
    if (!audio) return 0;
    updateMaster();
    let started = 0;
    for (const note of notes) {
      if (activeVoices.size >= maxVoices) break;
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const startAt = audio.currentTime + (note.delay || 0), duration = note.duration;
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.start, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, note.end), startAt + duration);
      gain.gain.setValueAtTime(volume * (note.level ?? 1), startAt);
      gain.gain.exponentialRampToValueAtTime(.001, startAt + duration);
      oscillator.connect(gain); gain.connect(masterGain);
      oscillator.onended = () => { activeVoices.delete(oscillator); sync(); };
      activeVoices.add(oscillator);
      oscillator.start(startAt); oscillator.stop(startAt + duration + .005);
      started++;
    }
    return started;
  }

  function sync() {
    try {
      const settings = getSettings();
      if (settings.soundEnabled && settings.masterVolume > 0 && settings.musicVolume > 0) ensureContext();
      updateMaster();
      if (!context) return;
      if (!settings.soundEnabled || !settings.masterVolume || !settings.musicVolume) {
        if (ambient) {
          ambient.gain.gain.setTargetAtTime(0, context.currentTime, .04);
          for (const oscillator of ambient.oscillators) {
            try { oscillator.stop(context.currentTime + .2); } catch {}
          }
          ambient = null;
        }
        return;
      }
      if (!ambient && activeVoices.size + 3 <= maxVoices) {
        const gain = context.createGain(); gain.connect(masterGain);
        const oscillators = [110, 164.81, 220].map((frequency, index) => {
          const oscillator = context.createOscillator(), voiceGain = context.createGain();
          oscillator.type = 'sine'; oscillator.frequency.value = frequency; voiceGain.gain.value = [.42, .24, .12][index];
          oscillator.connect(voiceGain); voiceGain.connect(gain); activeVoices.add(oscillator); oscillator.start();
          oscillator.onended = () => { activeVoices.delete(oscillator); sync(); };
          return oscillator;
        });
        ambient = { gain, oscillators };
      }
      if (ambient) ambient.gain.gain.setTargetAtTime(.06 * (settings.musicVolume / 100), context.currentTime, .08);
    } catch { /* Browser audio may be unavailable or blocked; gameplay remains unaffected. */ }
  }

  function play(cue, variant = null) {
    const settings = getSettings();
    if (!settings.soundEnabled || !settings.masterVolume || !settings.effectsVolume) return 0;
    let notes = AUDIO_CUE_PROFILES[cue];
    if (cue === 'attackLaunch' || cue === 'attackImpact') {
      const family = ATTACK_CUE_PROFILES[variant];
      notes = family?.[cue === 'attackLaunch' ? 'launch' : 'impact'];
    } else if (cue === 'ability') {
      const family = ATTACK_CUE_PROFILES[variant];
      notes = family?.launch || AUDIO_CUE_PROFILES.ability;
    }
    if (!notes) return 0;
    try { return startNotes(notes, .045 * (settings.effectsVolume / 100)); }
    catch { return 0; }
  }

  return { play, sync, activeVoiceCount:() => activeVoices.size };
}
