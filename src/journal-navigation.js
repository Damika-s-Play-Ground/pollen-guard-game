export const JOURNAL_DESTINATIONS=Object.freeze(['play','collection','workshop','help']);

export function setJournalDestination(root,destination){
  if(!JOURNAL_DESTINATIONS.includes(destination))return false;
  const buttons=[...root.querySelectorAll('[data-journal-view]')],sections=[...root.querySelectorAll('[data-journal-section]')];
  if(!buttons.some(button=>button.dataset.journalView===destination))return false;
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.journalView===destination)));
  sections.forEach(section=>{section.hidden=section.dataset.journalSection!==destination;});
  if('scrollTop' in root)root.scrollTop=0;
  return true;
}

export function handleJournalNavigationKey(event,root){
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return false;
  const buttons=[...root.querySelectorAll('[data-journal-view]')];
  if(!buttons.length)return false;
  const index=Math.max(0,buttons.indexOf(root.ownerDocument.activeElement));
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  event.preventDefault();
  setJournalDestination(root,buttons[next].dataset.journalView);
  buttons[next].focus();
  return true;
}
