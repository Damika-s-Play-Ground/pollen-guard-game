export const TUTORIAL_STEPS = Object.freeze([
  Object.freeze(['Welcome to the meadow', 'Place defenders on open grass beside the trail. Their range preview helps you cover long stretches.']),
  Object.freeze(['Choose a defender', 'Sprout Slinger is a simple first pick. You can filter defenders by attack, support, or economy role.']),
  Object.freeze(['Plan each wave', 'Preview enemy counts, place defenders, then launch when your garden is ready. Mission kit is optional: the Meadow Guardian can move over safe grass and slow nearby ground pests, while Pollen Ward adds two starting seeds. Sudden Death with Ward is labeled as a three-seed variant. Core missions work without either kit.']),
  Object.freeze(['Inspect and specialize', 'Select a placed tower to change its target priority, choose an upgrade branch, and use its ability.'])
]);

export function buildTutorialStepView(step) {
  const index = Number.isInteger(step) ? Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, step)) : 0;
  const [title, description] = TUTORIAL_STEPS[index];
  return {
    index,
    count: TUTORIAL_STEPS.length,
    title,
    description,
    progress: `MEADOW GUIDE · ${index + 1} / ${TUTORIAL_STEPS.length}`,
    backDisabled: index === 0,
    nextLabel: index === TUTORIAL_STEPS.length - 1 ? 'Start practice' : 'Next'
  };
}

export function renderTutorialStep(elements, step, document) {
  const view = buildTutorialStepView(step);
  elements.title.textContent = view.title;
  elements.description.textContent = view.description;
  elements.progress.textContent = view.progress;
  elements.back.disabled = view.backDisabled;
  elements.next.textContent = view.nextLabel;
  const dots = Array.from({ length: view.count }, (_, index) => {
    const dot = document.createElement('i');
    if (index === view.index) dot.className = 'active';
    dot.setAttribute('aria-hidden', 'true');
    return dot;
  });
  elements.dots.replaceChildren(...dots);
  return view;
}

const TUTORIAL_COACH_TASKS = Object.freeze([
  Object.freeze({text:'Practice 1/6 · Place your Sprout Slinger on open grass beside the trail.',focusSelector:'#towerList [data-type="sprout"]'}),
  Object.freeze({text:'Practice 2/6 · Select the Sprout Slinger you planted.',focusMap:true}),
  Object.freeze({text:'Practice 3/6 · Change its target priority.',focusSelector:'#targetModeSelect'}),
  Object.freeze({text:'Practice 4/6 · Choose a branch, then confirm the upgrade.',focusSelector:'#branchChoices'}),
  Object.freeze({text:'Practice 5/6 · Launch wave 1.',focusSelector:'#startBtn'}),
  Object.freeze({text:'Practice 6/6 · Use Ivy Snare while enemies are on the trail.',focusSelector:'#snareBtn'})
]);

export function buildTutorialCoachView({active,task}) {
  if(!active)return {visible:false,text:'',focusSelector:null,focusMap:false};
  const current=Number.isInteger(task)&&task>=0?TUTORIAL_COACH_TASKS[task]:null;
  return {visible:true,text:current?.text||'Practice complete.',focusSelector:current?.focusSelector||null,focusMap:Boolean(current?.focusMap)};
}

export function clearTutorialCoach({coach,board,document}) {
  coach.hidden=true;
  document.querySelectorAll('.tutorial-focus').forEach(element=>element.classList.remove('tutorial-focus'));
  board.classList.remove('tutorial-focus-map');
}

export function renderTutorialCoach({coach,text,exit,board,document,view,onEndPractice}) {
  document.querySelectorAll('.tutorial-focus').forEach(element=>element.classList.remove('tutorial-focus'));
  board.classList.remove('tutorial-focus-map');
  coach.hidden=!view.visible;
  if(!view.visible){exit.onclick=null;return view;}
  text.textContent=view.text;
  if(view.focusMap)board.classList.add('tutorial-focus-map');
  else if(view.focusSelector)document.querySelectorAll(view.focusSelector).forEach(element=>element.classList.add('tutorial-focus'));
  exit.onclick=onEndPractice;
  return view;
}
