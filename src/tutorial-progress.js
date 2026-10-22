export const TUTORIAL_ACTIONS = Object.freeze(['place', 'select', 'target', 'upgrade', 'startWave', 'snare']);

export function tutorialActionMatches(task, action, details = {}, tutorialTowerId = null) {
  if (!Number.isInteger(task) || task < 0 || task >= TUTORIAL_ACTIONS.length || action !== TUTORIAL_ACTIONS[task]) return false;
  if (action === 'place') return details.type === 'sprout' && Number.isSafeInteger(details.towerId);
  if (action === 'target' && (!details.targetMode || details.targetMode === details.previousTargetMode)) return false;
  if (['select', 'target', 'upgrade'].includes(action)) return Number.isSafeInteger(tutorialTowerId) && details.towerId === tutorialTowerId;
  return true;
}

export function nextTutorialTask(task) {
  if (!Number.isInteger(task) || task < 0 || task >= TUTORIAL_ACTIONS.length) return task;
  return task + 1;
}

export function createTutorialPracticeState() {
  return { active:false, task:0, towerId:null };
}

export function beginTutorialPracticeState(state=createTutorialPracticeState()) {
  return { ...state, active:true, task:0, towerId:null };
}

export function resetTutorialPracticeState(state) {
  if(!state.active)return state;
  return { ...state, task:0, towerId:null };
}

export function finishTutorialPracticeState(state) {
  return { ...state, active:false, task:0, towerId:null };
}

export function advanceTutorialPracticeState(state,action,details={}) {
  if(!state.active||!tutorialActionMatches(state.task,action,details,state.towerId))return { state, advanced:false, completed:false };
  const towerId=action==='place'?details.towerId:state.towerId;
  const task=nextTutorialTask(state.task);
  return { state:{ ...state, task, towerId }, advanced:true, completed:task>=TUTORIAL_ACTIONS.length };
}
