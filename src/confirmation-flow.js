function canRestoreFocus(target) {
  return Boolean(target?.isConnected && !target.disabled && target.getClientRects().length);
}

export function createConfirmationFlow({ dialog, title, message, accept, document, fallbackFocus, onOpen, onHudUpdate }) {
  let pendingAction = null;
  let returnFocus = null;

  function restoreFocus() {
    pendingAction = null;
    const target = returnFocus;
    returnFocus = null;
    (canRestoreFocus(target) ? target : fallbackFocus)?.focus({ preventScroll: true });
  }

  dialog.addEventListener('close', restoreFocus);

  return {
    request(nextTitle, nextMessage, action, acceptLabel = 'Continue') {
      returnFocus = document.activeElement;
      pendingAction = action;
      title.textContent = nextTitle;
      message.textContent = nextMessage;
      accept.textContent = acceptLabel;
      dialog.showModal();
      onOpen?.();
    },
    cancel() {
      pendingAction = null;
      dialog.close();
      onHudUpdate?.();
    },
    accept() {
      const action = pendingAction;
      pendingAction = null;
      dialog.close();
      action?.();
      onHudUpdate?.();
    }
  };
}
