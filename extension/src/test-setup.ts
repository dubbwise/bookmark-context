import "@testing-library/jest-dom";

// jsdom does not implement ResizeObserver; mock it for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
