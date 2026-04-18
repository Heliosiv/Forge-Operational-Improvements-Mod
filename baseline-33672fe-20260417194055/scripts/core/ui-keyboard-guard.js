function getKeyboardGuardRoot(rootLike) {
  if (!rootLike?.querySelector) return null;
  return rootLike.closest?.(".window-app, .application") ?? rootLike;
}

function shouldAllowKeyboardEventToBubble(event) {
  if (!(event instanceof KeyboardEvent)) return true;
  return event.key === "Escape";
}

function releaseFoundryKeyboardState() {
  try {
    game.keyboard?.releaseKeys?.();
  } catch {
    // Ignore keyboard manager availability mismatches across Foundry versions.
  }
}

export function bindCanvasKeyboardSuppression(rootLike) {
  const root = getKeyboardGuardRoot(rootLike);
  if (!(root instanceof HTMLElement)) return null;
  if (root.dataset.poKeyboardGuardBound === "1") return root;
  root.dataset.poKeyboardGuardBound = "1";

  root.addEventListener("focusin", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    target.dataset.keyboardFocus = "true";
    releaseFoundryKeyboardState();
  });

  root.addEventListener("focusout", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    delete target.dataset.keyboardFocus;
  });

  const stopCanvasKeyboardPropagation = (event) => {
    if (shouldAllowKeyboardEventToBubble(event)) return;
    event.stopPropagation();
  };

  root.addEventListener("keydown", stopCanvasKeyboardPropagation);
  root.addEventListener("keyup", stopCanvasKeyboardPropagation);
  return root;
}
