import { masterOutputLevel } from './audio-mix.js';

export const MAX_AUDIO_VOICES = 8;
export const MAX_EFFECT_VOICE_GAIN = .045;
export const AMBIENT_BUS_GAIN = .06;
export const AMBIENT_MUSIC_STATES = Object.freeze({
  calm:Object.freeze([110,164.81,220]),
  pressure:Object.freeze([110,146.83,196]),
  resolve:Object.freeze([130.81,164.81,196])
});
export const AMBIENT_MUSIC_GLIDE_SECONDS = .72;
export const CRITICAL_AUDIO_RESERVED_VOICES = 2;
export const CRITICAL_AUDIO_PRIORITY = 3;
export const AUDIO_CUE_PRIORITIES = Object.freeze({
  bossWarning:5, leak:5, victory:5, defeat:5, bossDefeat:4,
  ability:2, snare:2, bloom:2, waveStart:2, waveClear:2, upgrade:2,
  place:1, select:1, enemyDefeat:1, achievement:1, soundOn:1
});

export const AUDIO_CUE_PROFILES = Object.freeze({
  place: Object.freeze([{ start:540, end:820, duration:.09, type:'triangle' }]),
  bossWarning: Object.freeze([{ start:280, end:210, duration:.18, type:'sine' },{ start:560,end:420,duration:.16,delay:.035,type:'triangle',level:.3 }]),
  leak: Object.freeze([{ start:210,end:145,duration:.15,type:'sine' },{ start:420,end:290,duration:.12,delay:.025,type:'triangle',level:.22 }]),
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

// Procedural oscillator and envelope recipes below were authored for Pollen Guard;
// they use no third-party samples, libraries, or generated assets.
export const ATTACK_CUE_PROFILES = Object.freeze({
  sprout: Object.freeze({ launch:[{ start:1120,end:620,duration:.027,attack:.001,type:'triangle' },{ start:2240,end:1240,duration:.02,attack:.001,type:'sine',level:.18 }], impact:[{ start:720,end:380,duration:.036,attack:.001,type:'triangle' },{ start:1440,end:760,duration:.032,attack:.001,type:'sine',level:.18 }] }),
  dew: Object.freeze({ launch:[{ start:740,end:1120,duration:.12,attack:.009,type:'sine' },{ start:1480,end:2240,duration:.105,attack:.012,type:'triangle',level:.22 }], impact:[{ start:1020,end:720,duration:.13,attack:.006,type:'sine' },{ start:2040,end:1440,duration:.095,attack:.009,type:'sine',level:.24 }] }),
  puff: Object.freeze({ launch:[{ start:190,end:86,duration:.14,attack:.003,type:'sine' },{ start:380,end:210,duration:.105,attack:.004,type:'triangle',level:.28 }], impact:[{ start:145,end:68,duration:.17,attack:.002,type:'sine' },{ start:435,end:190,duration:.12,attack:.004,type:'triangle',level:.24 }] }),
  thorn: Object.freeze({ launch:[{ start:1280,end:430,duration:.043,attack:.001,type:'sawtooth' },{ start:2560,end:860,duration:.031,attack:.001,type:'square',level:.12 }], impact:[{ start:980,end:320,duration:.052,attack:.001,type:'sawtooth' },{ start:1960,end:640,duration:.038,attack:.001,type:'square',level:.14 }] }),
  gust: Object.freeze({ launch:[{ start:920,end:1180,duration:.04,type:'triangle' },{ start:1380,end:1760,duration:.03,type:'sine',level:.18 }], impact:[{ start:780,end:620,duration:.07,type:'sine' },{ start:1560,end:1240,duration:.05,type:'triangle',level:.2 }] }),
  ember: Object.freeze({ launch:[{ start:340,end:220,duration:.08,type:'sawtooth' },{ start:680,end:480,duration:.06,type:'triangle',level:.2 }], impact:[{ start:240,end:360,duration:.1,type:'sawtooth' },{ start:480,end:720,duration:.07,type:'triangle',level:.18 }] }),
  briar: Object.freeze({ launch:[{ start:460,end:360,duration:.07,type:'triangle' },{ start:920,end:720,duration:.055,type:'sine',level:.2 }], impact:[{ start:390,end:250,duration:.11,type:'triangle' },{ start:780,end:520,duration:.08,type:'sawtooth',level:.18 }] })
});

export function createGameAudio({ AudioContextCtor, getSettings, maxVoices = MAX_AUDIO_VOICES }) {
  let context = null, masterGain = null, effectsBus = null, ambient = null;
  let musicState='calm';
  const activeVoices = new Set();
  const voiceMeta = new Map();
  const voiceLimit=Number.isFinite(maxVoices)?Math.max(1,Math.floor(maxVoices)):MAX_AUDIO_VOICES;
  const reservedVoices=Math.min(CRITICAL_AUDIO_RESERVED_VOICES,Math.max(0,voiceLimit-1));
  let criticalUntil=0;

  function ensureContext() {
    if (!context) {
      if (typeof AudioContextCtor !== 'function') return null;
      context = new AudioContextCtor();
      masterGain = context.createGain();
      masterGain.connect(context.destination);
      effectsBus = context.createGain();
      effectsBus.gain.value = Math.max(0,Math.min(100,Number(getSettings().effectsVolume)||0))/100;
      effectsBus.connect(masterGain);
    }
    if (context.state === 'suspended') context.resume()?.catch?.(() => {});
    return context;
  }

  function updateMaster() {
    if (!context || !masterGain) return;
    const settings = getSettings();
    masterGain.gain.setTargetAtTime(masterOutputLevel(settings), context.currentTime, .01);
  }

  function updateEffects() {
    if(!context||!effectsBus)return;
    const settings=getSettings();
    const level=Number.isFinite(settings.effectsVolume)?Math.max(0,Math.min(100,settings.effectsVolume))/100:0;
    effectsBus.gain.setTargetAtTime(level,context.currentTime,.01);
  }

  function stealVoice(priority) {
    const victims=[...activeVoices].filter(voice=>(voiceMeta.get(voice)?.priority??0)<priority)
      .sort((a,b)=>{
        const first=voiceMeta.get(a),second=voiceMeta.get(b);
        return (first?.category==='ambient'?-1:0)-(second?.category==='ambient'?-1:0) ||
          (first?.priority??0)-(second?.priority??0) || (first?.startedAt??0)-(second?.startedAt??0);
      });
    const victim=victims[0];if(!victim)return false;
    const metadata=voiceMeta.get(victim),now=context.currentTime;
    if(metadata?.category==='ambient'&&ambient){
      for(const oscillator of ambient.oscillators){
        const voice=voiceMeta.get(oscillator);
        if(!voice)continue;
        voice.gain.gain.setTargetAtTime(.0001,now,.002);
        try{oscillator.stop(now+.006);}catch{}
        activeVoices.delete(oscillator);voiceMeta.delete(oscillator);
      }
      ambient=null;
      return true;
    }
    metadata?.gain.gain.setTargetAtTime(.0001,now,.002);
    try{victim.stop(now+.006);}catch{}
    activeVoices.delete(victim);voiceMeta.delete(victim);
    return true;
  }

  function duckAmbient(duration) {
    if(!context)return;
    const settings=getSettings(),now=context.currentTime;
    criticalUntil=Math.max(criticalUntil,now+duration+.16);
    if(!ambient)return;
    const music=settings.musicVolume/100;
    ambient.gain.gain.setTargetAtTime(.008*music,now,.008);
    ambient.gain.gain.setTargetAtTime(AMBIENT_BUS_GAIN*music,criticalUntil,.04);
  }

  function setMusicState(nextState) {
    if(!Object.hasOwn(AMBIENT_MUSIC_STATES,nextState)||nextState===musicState)return false;
    musicState=nextState;
    if(context&&ambient){
      const now=context.currentTime;
      AMBIENT_MUSIC_STATES[musicState].forEach((frequency,index)=>
        ambient.oscillators[index]?.frequency.setTargetAtTime(frequency,now,AMBIENT_MUSIC_GLIDE_SECONDS));
    }
    return true;
  }

  function startNotes(notes, volume, priority=1) {
    if (!notes?.length) return 0;
    const audio = ensureContext();
    if (!audio) return 0;
    updateMaster();
    updateEffects();
    let started = 0;
    for (const note of notes) {
      const ordinaryLimit=voiceLimit-reservedVoices;
      if(priority<CRITICAL_AUDIO_PRIORITY&&activeVoices.size>=ordinaryLimit)break;
      while(activeVoices.size>=voiceLimit&&priority>=CRITICAL_AUDIO_PRIORITY){if(!stealVoice(priority))break;}
      if(activeVoices.size>=voiceLimit)break;
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const startAt = audio.currentTime + (note.delay || 0), duration = note.duration;
      const attack=Math.min(duration*.5,Math.max(.001,note.attack??.003));
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.start, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, note.end), startAt + duration);
      gain.gain.setValueAtTime(.001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume * (note.level ?? 1), startAt + attack);
      gain.gain.exponentialRampToValueAtTime(.001, startAt + duration);
      oscillator.connect(gain); gain.connect(effectsBus);
      oscillator.onended = () => { activeVoices.delete(oscillator);voiceMeta.delete(oscillator);sync(); };
      activeVoices.add(oscillator);
      voiceMeta.set(oscillator,{gain,priority,category:'effect',startedAt:audio.currentTime});
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
      updateEffects();
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
      if (!ambient && activeVoices.size + 3 <= voiceLimit) {
        const gain = context.createGain(); gain.connect(masterGain);
        const oscillators = AMBIENT_MUSIC_STATES[musicState].map((frequency, index) => {
          const oscillator = context.createOscillator(), voiceGain = context.createGain();
          oscillator.type = 'sine'; oscillator.frequency.value = frequency; voiceGain.gain.value = [.42, .24, .12][index];
          oscillator.connect(voiceGain); voiceGain.connect(gain); activeVoices.add(oscillator); oscillator.start();
          oscillator.onended = () => { activeVoices.delete(oscillator);voiceMeta.delete(oscillator);sync(); };
          voiceMeta.set(oscillator,{gain:voiceGain,priority:0,category:'ambient',startedAt:context.currentTime});
          return oscillator;
        });
        ambient = { gain, oscillators };
      }
      if (ambient) {
        const music=settings.musicVolume/100;
        ambient.gain.gain.setTargetAtTime((context.currentTime < criticalUntil ? .008 : AMBIENT_BUS_GAIN)*music,context.currentTime,.08);
        if(context.currentTime<criticalUntil)ambient.gain.gain.setTargetAtTime(AMBIENT_BUS_GAIN*music,criticalUntil,.04);
      }
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
    const priority=cue==='attackLaunch'?1:cue==='attackImpact'?2:(AUDIO_CUE_PRIORITIES[cue]??1);
    if(priority>=CRITICAL_AUDIO_PRIORITY){
      const duration=Math.max(...notes.map(note=>(note.delay||0)+note.duration));
      if(!context)ensureContext();
      duckAmbient(duration);
    }
    try { return startNotes(notes, MAX_EFFECT_VOICE_GAIN,priority); }
    catch { return 0; }
  }

  return { play, sync, setMusicState, activeVoiceCount:() => activeVoices.size };
}
