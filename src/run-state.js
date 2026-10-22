function phaseOf(state) {
  if (state.basePhase === 'won' || state.basePhase === 'lost') return state.basePhase;
  if (state.hidden) return 'hidden-paused';
  if (state.dialogOpen) return 'modal-paused';
  return state.basePhase;
}

function withPhase(state, changes = {}) {
  const next = { ...state, ...changes };
  next.phase = phaseOf(next);
  return next;
}

export function createRunState(saved = {}) {
  let basePhase = Object.keys(saved).length ? 'planning' : 'menu';
  let resumePhase = null;
  if (saved.gameOver) basePhase = saved.outcome === 'won' ? 'won' : 'lost';
  else if (saved.paused) { basePhase = 'user-paused'; resumePhase = saved.running ? 'running' : 'planning'; }
  else if (saved.running) basePhase = 'running';
  return withPhase({ basePhase, resumePhase, dialogOpen: false, hidden: false, phase: 'planning' });
}

export function transitionRunState(state, event) {
  switch (event.type) {
    case 'START_WAVE':
      return state.basePhase === 'menu' || state.basePhase === 'planning' ? withPhase(state, { basePhase: 'running' }) : state;
    case 'BEGIN_PLANNING':
      return state.basePhase === 'menu' ? withPhase(state, { basePhase: 'planning' }) : state;
    case 'WAVE_CLEAR':
      return state.basePhase === 'running' ? withPhase(state, { basePhase: 'planning', resumePhase: null }) : state;
    case 'TOGGLE_USER_PAUSE':
      if (state.basePhase === 'running' || state.basePhase === 'planning') {
        return withPhase(state, { basePhase: 'user-paused', resumePhase: state.basePhase });
      }
      if (state.basePhase === 'user-paused') return withPhase(state, { basePhase: state.resumePhase || 'planning', resumePhase: null });
      return state;
    case 'WIN':
      return withPhase(state, { basePhase: 'won' });
    case 'LOSE':
      return withPhase(state, { basePhase: 'lost' });
    case 'RESET':
      return withPhase(state, { basePhase: 'planning', resumePhase: null, dialogOpen: false, hidden: false });
    case 'RESTORE':
      return createRunState(event.saved);
    case 'DIALOG_OPEN':
      return withPhase(state, { dialogOpen: true });
    case 'DIALOG_CLOSE':
      return withPhase(state, { dialogOpen: false });
    case 'TAB_HIDDEN':
      return withPhase(state, { hidden: true });
    case 'TAB_VISIBLE':
      return withPhase(state, { hidden: false });
    default:
      return state;
  }
}

export function runStateSaveFlags(state) {
  return {
    running: state.basePhase === 'running' || (state.basePhase === 'user-paused' && state.resumePhase === 'running'),
    paused: state.basePhase === 'user-paused'
  };
}

export function runStateStopsClock(state) {
  return state.phase === 'user-paused' || state.phase === 'modal-paused' ||
    state.phase === 'hidden-paused' || state.phase === 'won' || state.phase === 'lost';
}
