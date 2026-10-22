export const DEFAULT_KEY_BINDINGS = Object.freeze({
  pause: 'Space', speed: 'KeyF', bloom: 'KeyB', snare: 'KeyI', startWave: 'KeyW',
  previousTower: 'BracketLeft', nextTower: 'BracketRight',
  tower1: 'Digit1', tower2: 'Digit2', tower3: 'Digit3', tower4: 'Digit4',
  tower5: 'Digit5', tower6: 'Digit6', tower7: 'Digit7', tower8: 'Digit8'
});

const BINDABLE_CODE = /^(?:Key[A-Z]|Digit[0-9]|BracketLeft|BracketRight|Comma|Period|Semicolon|Quote|Slash|Backslash|Minus|Equal)$/;

export function bindKey(bindings, action, code) {
  if (!Object.hasOwn(DEFAULT_KEY_BINDINGS, action) || (code !== 'Space' && !BINDABLE_CODE.test(code))) return { ok: false, reason: 'That key is reserved for browser or placement controls.' };
  const current = normalizeKeyBindings(bindings);
  const conflict = Object.keys(current).find(key => key !== action && current[key] === code);
  if (conflict) return { ok: false, reason: `That key is already assigned to ${conflict}.` };
  return { ok: true, bindings: { ...current, [action]: code } };
}

export function normalizeKeyBindings(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const normalized = {};
  const used = new Set();
  for (const [action, fallback] of Object.entries(DEFAULT_KEY_BINDINGS)) {
    const code = source[action];
    const candidate = typeof code === 'string' && BINDABLE_CODE.test(code) ? code : fallback;
    normalized[action] = used.has(candidate) ? fallback : candidate;
    if (used.has(normalized[action])) {
      normalized[action] = [...Array(26)].map((_, index) => `Key${String.fromCharCode(65 + index)}`).find(key => !used.has(key));
    }
    used.add(normalized[action]);
  }
  return normalized;
}

export function keyCodeLabel(code) {
  if (code === 'Space') return 'Space';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return ({ BracketLeft: '[', BracketRight: ']', Comma: ',', Period: '.', Semicolon: ';', Quote: "'", Slash: '/', Backslash: '\\', Minus: '-', Equal: '=' })[code] || code;
}
