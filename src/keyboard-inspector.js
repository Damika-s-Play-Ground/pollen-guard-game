export function focusInspectorBranch(root, { document:documentObject = globalThis.document, canvas, announce } = {}) {
  if (!(root?.querySelector?.('button[data-branch]:not(:disabled)'))) return false;
  const focus=()=>{
    const options=[...root.querySelectorAll('button[data-branch]:not(:disabled)')];
    if(!options.length){canvas?.focus?.({preventScroll:true});return;}
    const selected = options.findIndex(option => option.getAttribute('aria-pressed') === 'true');
    options[selected >= 0 ? selected : 0].focus?.({ preventScroll:true });
    announce?.('Choose an upgrade branch. Use Left and Right arrows to move between options, Enter to choose, or Escape to return to the battlefield.');
  };
  focus();
  return true;
}

export function bindInspectorBranchKeyboard(root, { canvas } = {}) {
  if (!root?.addEventListener) return () => {};
  const onKeyDown = event => {
    const options = [...root.querySelectorAll('button[data-branch]:not(:disabled)')];
    const current = options.indexOf(event.target);
    if (current < 0) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      canvas?.focus?.({ preventScroll:true });
      return;
    }
    if(event.key==='Enter'){
      event.preventDefault();
      event.stopPropagation();
      options[current]?.click?.();
      return;
    }
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    options[(current + direction + options.length) % options.length]?.focus?.({ preventScroll:true });
  };
  root.addEventListener('keydown', onKeyDown);
  return () => root.removeEventListener('keydown', onKeyDown);
}

export function bindEnterButtonKeyboard(button) {
  if(!button?.addEventListener)return()=>{};
  const onKeyDown=event=>{
    if(event.target!==button||event.key!=='Enter')return;
    event.preventDefault();event.stopPropagation();button.click?.();
  };
  button.addEventListener('keydown',onKeyDown);
  return()=>button.removeEventListener('keydown',onKeyDown);
}

export function bindInspectorButtonKeyboard(button, { canvas } = {}) {
  if(!button?.addEventListener)return()=>{};
  const unbindEnter=bindEnterButtonKeyboard(button);
  const onKeyDown=event=>{
    if(event.target!==button)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();canvas?.focus?.({preventScroll:true});return;
    }
  };
  button.addEventListener('keydown',onKeyDown);
  return()=>{unbindEnter();button.removeEventListener('keydown',onKeyDown);};
}
