export function getRenderableElementRoot(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (Array.isArray(html) && html[0] instanceof HTMLElement) return html[0];
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (typeof html?.get === "function") {
    const node = html.get(0);
    if (node instanceof HTMLElement) return node;
  }
  return null;
}
