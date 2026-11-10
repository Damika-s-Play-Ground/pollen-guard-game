const ICONS=Object.freeze({
  petal:'<path d="M12 21C7.5 17.5 4 14.4 4 10.2 4 7.7 5.8 6 8 6c1.7 0 3.1 1 4 2.5C12.9 7 14.3 6 16 6c2.2 0 4 1.7 4 4.2C20 14.4 16.5 17.5 12 21Z"/><path d="M12 19V9"/>',
  health:'<path d="M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z"/><path d="M12 9v6m-3-3h6"/>',
  pause:'<path d="M7 5h3v14H7zM14 5h3v14h-3z"/>',
  play:'<path d="m7 4 12 8-12 8z"/>',
  range:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/>'
});

export function uiIconSvg(name,className='ui-icon'){
  const paths=ICONS[name];
  if(!paths)throw new RangeError(`Unknown UI icon: ${name}`);
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

export function petalAmountMarkup(amount){return `${amount} <span class="petal-amount-icon">${uiIconSvg('petal')}</span>`;}

export function petalTextMarkup(text){
  const escaped=String(text).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  return escaped.replaceAll('✿',`<span class="petal-amount-icon">${uiIconSvg('petal')}</span>`);
}
