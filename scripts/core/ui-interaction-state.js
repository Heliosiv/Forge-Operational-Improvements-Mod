export function isDisabledInteractionElement(element) {
  if (!element) return true;
  if (element.matches?.(":disabled, [disabled], [aria-disabled='true']")) return true;
  return element.closest?.("[disabled], [aria-disabled='true']") != null;
}