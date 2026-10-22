import { keyCodeLabel } from './keyboard-bindings.js';

export function keyboardActionLabels(towersDef) {
  const labels={pause:'Pause / resume',speed:'Toggle speed',startWave:'Start wave',bloom:'Bloom pulse',snare:'Ivy Snare',previousTower:'Previous defender',nextTower:'Next defender'};
  Object.keys(towersDef).slice(0,8).forEach((type,index)=>{labels[`tower${index+1}`]=`Choose ${towersDef[type].name}`;});
  return labels;
}

export function keyboardBindingGuideText(keyBindings) {
  return `${keyCodeLabel(keyBindings.pause)} pause · ${keyCodeLabel(keyBindings.speed)} speed · ${keyCodeLabel(keyBindings.startWave)} start wave · ${keyCodeLabel(keyBindings.bloom)} Bloom · ${keyCodeLabel(keyBindings.snare)} Snare · ${keyCodeLabel(keyBindings.previousTower)}/${keyCodeLabel(keyBindings.nextTower)} cycle defenders · ${keyCodeLabel(keyBindings.tower1)}–${keyCodeLabel(keyBindings.tower8)} select defenders · arrows aim · Enter place · Escape cancel.`;
}

export function renderKeyboardBindings({ root, guideHelp, towersDef, keyBindings, document }) {
  const focusedAction=Array.from(root.children||[]).find(button=>button===document.activeElement)?.dataset?.keyBinding||null;
  root.replaceChildren();
  for(const [action,label] of Object.entries(keyboardActionLabels(towersDef))){
    const button=document.createElement('button');button.type='button';button.dataset.keyBinding=action;button.setAttribute('aria-label',`${label}, currently ${keyCodeLabel(keyBindings[action])}. Activate to remap.`);
    const title=document.createElement('span');title.textContent=label;const key=document.createElement('kbd');key.textContent=keyCodeLabel(keyBindings[action]);button.append(title,key);root.append(button);
  }
  if(focusedAction)Array.from(root.children||[]).find(button=>button.dataset?.keyBinding===focusedAction)?.focus({preventScroll:true});
  guideHelp.textContent=keyboardBindingGuideText(keyBindings);
}
