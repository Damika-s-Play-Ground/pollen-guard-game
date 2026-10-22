export function createInspectorDisplaySignature({ towerId, view }) {
  const { onChooseBranch, ...displayView } = view;
  return JSON.stringify({ towerId, view: displayView });
}

export function createRenderSignature(view) { return JSON.stringify(view); }

export function createRenderGate() {
  let previous;
  let initialized = false;
  return {
    shouldRender(value) {
      if (initialized && value === previous) return false;
      previous = value;
      initialized = true;
      return true;
    },
    invalidate() {
      initialized = false;
    }
  };
}
