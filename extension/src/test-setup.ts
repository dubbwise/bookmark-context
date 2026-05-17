import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom does not implement matchMedia; used by theme system preference
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("dark") ? false : true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom does not implement ResizeObserver; mock it for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// vaul uses PointerEvent; jsdom stubs it
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
    }
  }
  global.PointerEvent = PointerEvent as typeof PointerEvent;
}

// vaul calls setPointerCapture/releasePointerCapture on elements; jsdom doesn't implement these
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

// vaul's getTranslate reads getComputedStyle(el).transform; jsdom returns undefined for
// vendor-prefixed transform properties, causing a crash. Patch to return 'none' as fallback.
const _getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  const style = _getComputedStyle(elt, pseudoElt);
  return new Proxy(style, {
    get(target, prop: string) {
      const val = Reflect.get(target, prop);
      if ((prop === "webkitTransform" || prop === "mozTransform") && val === undefined) {
        return "none";
      }
      return typeof val === "function" ? val.bind(target) : val;
    },
  });
};
