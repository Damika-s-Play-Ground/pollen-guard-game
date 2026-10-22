import { DEFAULT_KEY_BINDINGS } from './keyboard-bindings.js';

export function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height
  };
}

export function findTowerAtPoint(towers, point, radius = 20) {
  return [...towers].reverse().find(tower => Math.hypot(tower.x - point.x, tower.y - point.y) < radius) || null;
}

export function findTowersAtPoint(towers, point, radius = 20) {
  return [...towers].reverse().filter(tower => Math.hypot(tower.x - point.x, tower.y - point.y) < radius);
}

export function worldRadiusForCssPixels(cssPixels, canvas) {
  const rect = canvas.getBoundingClientRect();
  return cssPixels * canvas.width / Math.max(1, rect.width);
}

export function movePlacementCursor(point, direction, width, height, step = 18, candidate = null) {
  const origin = point?.inside ? point : { x: width / 2, y: height / 2 };
  const delta = { Up: [0, -step], Down: [0, step], Left: [-step, 0], Right: [step, 0] }[direction] || [0, 0];
  const moved = {
    x: Math.max(12, Math.min(width - 12, origin.x + delta[0])),
    y: Math.max(12, Math.min(height - 12, origin.y + delta[1])),
    inside: true
  };
  return { pointer: moved, candidate: candidate ? { x: moved.x, y: moved.y } : null };
}

export function bindCanvasPointerInput(canvas, handlers) {
  let touchStart = null;
  const activeTouchIds = new Set();
  const onMove = event => handlers.move(canvasPoint(event, canvas), event);
  const onLeave = event => handlers.leave(event);
  const onDown = event => {
    if (event.pointerType === 'touch') {
      const pointerId = event.pointerId ?? 0;
      activeTouchIds.add(pointerId);
      if (activeTouchIds.size > 1) {
        touchStart = null;
        handlers.cancelGesture?.();
        return;
      }
      touchStart = { pointerId, x: event.clientX, y: event.clientY };
      return;
    }
    handlers.press(canvasPoint(event, canvas), event);
  };
  const onUp = event => {
    const pointerId = event.pointerId ?? 0;
    if (!activeTouchIds.has(pointerId)) return;
    const start = touchStart;
    if (start?.pointerId === pointerId && activeTouchIds.size === 1) {
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) handlers.press(canvasPoint(event, canvas), event);
      else handlers.cancelGesture?.();
    }
    if (start?.pointerId === pointerId) touchStart = null;
    activeTouchIds.delete(pointerId);
  };
  const onCancel = event => {
    const pointerId = event.pointerId ?? 0;
    if (!activeTouchIds.has(pointerId)) return;
    if (touchStart?.pointerId === pointerId) { touchStart = null; handlers.cancelGesture?.(); }
    activeTouchIds.delete(pointerId);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  return () => {
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
  };
}

function targetMatches(event, selector) {
  return typeof event.target?.matches === 'function' && event.target.matches(selector);
}

export function resolveKeyboardCommand(event, { dialogOpen = false, placementActive = false, guardianMoveActive = false, towerTypes = [], bindings = DEFAULT_KEY_BINDINGS } = {}) {
  if (targetMatches(event, 'input,select,textarea,[contenteditable="true"]') || dialogOpen) return null;
  if (targetMatches(event, 'button,summary') && (event.code === 'Space' || event.key === 'Enter')) return null;
  if (event.code === 'Space' && bindings.pause === 'Space') return { type: 'toggle-pause', preventDefault: true };
  if (guardianMoveActive && event.key === 'Escape') return { type: 'cancel-guardian-move', preventDefault: true };
  if (guardianMoveActive && /^Arrow(Up|Down|Left|Right)$/.test(event.key)) return { type: 'move-guardian-cursor', direction: event.key.slice(5), preventDefault: true };
  if (guardianMoveActive && event.key === 'Enter') return { type: 'commit-guardian-move', preventDefault: true };
  if (event.key === 'Escape') return placementActive ? { type: 'cancel-placement', preventDefault: true } : null;
  if (placementActive && /^Arrow(Up|Down|Left|Right)$/.test(event.key)) return { type: 'move-placement-cursor', direction: event.key.slice(5), preventDefault: true };
  if (placementActive && event.key === 'Enter') return { type: 'keyboard-placement', preventDefault: true };

  const action = Object.entries(bindings).find(([, code]) => code === event.code)?.[0];
  if (action === 'pause') return { type: 'toggle-pause', preventDefault: true };
  if (action === 'speed') return { type: 'toggle-speed' };
  if (action === 'bloom') return { type: 'bloom' };
  if (action === 'snare') return { type: 'snare' };
  if (action === 'startWave') return { type: 'start-wave' };
  if (action === 'previousTower') return { type: 'cycle-tower', direction: -1 };
  if (action === 'nextTower') return { type: 'cycle-tower', direction: 1 };
  const towerIndex = action?.match(/^tower([1-8])$/)?.[1];
  if (towerIndex) {
    const towerType = towerTypes[Number(towerIndex) - 1];
    return towerType ? { type: 'select-tower', towerType } : null;
  }
  return null;
}

export function bindKeyboardInput(documentObject, getState, onCommand) {
  const onKeyDown = event => {
    const command = resolveKeyboardCommand(event, getState());
    if (!command || (event.repeat && !['move-placement-cursor', 'move-guardian-cursor'].includes(command.type))) return;
    if (command.preventDefault) event.preventDefault();
    onCommand(command);
  };
  documentObject.addEventListener('keydown', onKeyDown);
  return () => documentObject.removeEventListener('keydown', onKeyDown);
}

