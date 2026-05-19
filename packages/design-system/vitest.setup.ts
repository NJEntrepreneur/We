import '@testing-library/jest-dom';

// Radix UI components use these browser APIs not present in jsdom
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub;

// Radix Tooltip / Dropdown use PointerEvent
if (!globalThis.PointerEvent) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
    }
  };
}

// Suppress Radix animation warnings in test output
Element.prototype.scrollIntoView = (): void => {};
window.HTMLElement.prototype.hasPointerCapture = (): boolean => false;
window.HTMLElement.prototype.releasePointerCapture = (): void => {};
window.HTMLElement.prototype.setPointerCapture = (): void => {};
