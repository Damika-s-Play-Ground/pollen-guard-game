function canRestoreFocus(target, documentObject) {
  return Boolean(target && target !== documentObject?.body && target.isConnected !== false
    && !target.disabled && (!target.getClientRects || target.getClientRects().length > 0));
}

export function createPauseFocusController({ resumeButton, fallbackFocus, document:documentObject = globalThis.document } = {}) {
  let returnFocus = null;

  return {
    enter(origin = documentObject?.activeElement) {
      returnFocus = origin;
      resumeButton?.focus?.({ preventScroll:true });
    },
    exit() {
      const target = canRestoreFocus(returnFocus, documentObject) ? returnFocus : fallbackFocus;
      returnFocus = null;
      target?.focus?.({ preventScroll:true });
    }
  };
}
