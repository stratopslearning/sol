export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

/** Element → imperative animation handle (for parent button/link press & hover). */
export const iconHandles = new WeakMap<HTMLElement, AnimatedIconHandle>();

export function startIconsIn(root: Element | null) {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("[data-animated-icon]").forEach((el) => {
    iconHandles.get(el)?.startAnimation();
  });
}

export function stopIconsIn(root: Element | null, { force = false } = {}) {
  if (!root) return;
  root.querySelectorAll<HTMLElement>("[data-animated-icon]").forEach((el) => {
    if (!force && el.dataset.iconActive === "true") return;
    iconHandles.get(el)?.stopAnimation();
  });
}

const TRIGGER_SELECTOR =
  "button, a, [role='button'], [data-icon-trigger], summary";

export function closestIconTrigger(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest(TRIGGER_SELECTOR);
}
