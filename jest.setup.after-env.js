const { cleanup } = require('@testing-library/react');

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.useRealTimers();

  if (typeof window !== 'undefined') {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  }
});
