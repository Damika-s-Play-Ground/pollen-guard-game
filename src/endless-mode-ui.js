import { ENDLESS_CHOICES } from './endless-mode.js';

export function renderEndlessChoices(container, { visible = false, selected = null, onChoose = () => {}, focusFallback = null, document = globalThis.document } = {}) {
  if(!container)return;
  const renderKey=`${Boolean(visible)}:${visible?selected??'choose':''}`;
  if(container.dataset.endlessRenderKey===renderKey)return;
  container.dataset.endlessRenderKey=renderKey;
  container.hidden=!visible;
  if(!visible){if(container.contains?.(document.activeElement))focusFallback?.focus?.({preventScroll:true});container.replaceChildren();return;}
  const heading=document.createElement('h3');heading.textContent='Choose the next garden pressure';
  const note=document.createElement('p');note.textContent='This choice shapes waves until the next five-wave checkpoint. Bosses return every five waves; pressure has a fixed cap.';
  const status=document.createElement('p');status.className='endless-choice-status';status.setAttribute('role','status');
  if(selected){status.textContent=`Current pressure: ${ENDLESS_CHOICES[selected]?.label??'none'}. Choose again at the next checkpoint.`;status.tabIndex=-1;container.replaceChildren(heading,note,status);status.focus?.({preventScroll:true});return;}
  const group=document.createElement('div');group.className='endless-choice-options';group.setAttribute('role','group');group.setAttribute('aria-label','Choose one Endless wave modifier');
  for(const [id,choice] of Object.entries(ENDLESS_CHOICES)){
    const button=document.createElement('button');button.type='button';button.dataset.endlessChoice=id;button.setAttribute('aria-label',`${choice.label}. ${choice.description}`);
    const title=document.createElement('strong');title.textContent=choice.label;const description=document.createElement('span');description.textContent=choice.description;button.append(title,description);
    button.addEventListener('click',()=>onChoose(id));group.append(button);
  }
  container.replaceChildren(heading,note,group);
}
