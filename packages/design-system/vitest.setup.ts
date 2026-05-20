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
  class PointerEventStub extends MouseEvent {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
    }
  }
  Object.defineProperty(globalThis, 'PointerEvent', {
    value: PointerEventStub,
    writable: true,
    configurable: true,
  });
}

// Suppress Radix animation warnings in test output
Element.prototype.scrollIntoView = (): void => {};
window.HTMLElement.prototype.hasPointerCapture = (): boolean => false;
window.HTMLElement.prototype.releasePointerCapture = (): void => {};
window.HTMLElement.prototype.setPointerCapture = (): void => {};
