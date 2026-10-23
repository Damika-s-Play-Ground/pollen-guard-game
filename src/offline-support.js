export function registerOfflineSupport({ navigator = globalThis.navigator, window = globalThis.window, document = globalThis.document,
  canApplyUpdate = () => true, baseUrl = import.meta.url } = {}) {
  if (!navigator?.serviceWorker || !window || !document || !window.isSecureContext) return { supported: false };
  const status = document.getElementById('offlineStatus');
  const updateButton = document.getElementById('applyOfflineUpdate');
  const clearButton = document.getElementById('clearOfflineCache');
  const panel = document.getElementById('offlineTools');
  const refresh = registration => {
    const waiting = registration?.waiting;
    if (panel) panel.hidden = !navigator.serviceWorker.controller && !waiting;
    if (status) status.textContent = waiting ? (canApplyUpdate()
      ? 'A safe game update is ready. Apply it between runs.'
      : 'A game update is ready and will wait until this run ends.') : 'This game shell is available offline after it has been cached once.';
    if (updateButton) { updateButton.disabled = !waiting || !canApplyUpdate(); updateButton.hidden = !waiting; }
    if (clearButton) clearButton.disabled = !navigator.serviceWorker.controller || !canApplyUpdate();
  };
  const registrationPromise = navigator.serviceWorker.register(new URL('../service-worker.js', baseUrl), { scope: new URL('../', baseUrl).pathname });
  registrationPromise.then(registration => {
    refresh(registration);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') refresh(registration); });
    });
    window.setInterval(() => refresh(registration), 1000);
    updateButton?.addEventListener('click', () => {
      if (registration.waiting && canApplyUpdate()) registration.waiting.postMessage({ type: 'APPLY_UPDATE' });
    });
    clearButton?.addEventListener('click', () => {
      if (canApplyUpdate()) navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_GAME_CACHE' });
    });
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'GAME_CACHE_CLEARED' && status) status.textContent = 'Offline game files cleared. Load the game online once to cache them again.';
    });
  }).catch(() => { if (status) status.textContent = 'Offline caching is unavailable in this browser. The game still works online.'; });
  let reloadAfterUpdate = false;
  updateButton?.addEventListener('click', () => { reloadAfterUpdate = true; });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadAfterUpdate) window.location.reload(); });
  return { supported: true, registration: registrationPromise };
}
