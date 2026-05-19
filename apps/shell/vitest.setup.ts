import '@testing-library/jest-dom';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub;

Element.prototype.scrollIntoView = (): void => {};
window.HTMLElement.prototype.hasPointerCapture = (): boolean => false;
window.HTMLElement.prototype.releasePointerCapture = (): void => {};
window.HTMLElement.prototype.setPointerCapture = (): void => {};
