/**
 * Jest test setup file
 * Runs before each test suite
 */

// Export to make this an ES module
export {};

// Extend Jest matchers if needed
expect.extend({
  toBeValidAddress(received: string) {
    const pass = /^0x[a-fA-F0-9]{40}$/.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid Ethereum address`
          : `expected ${received} to be a valid Ethereum address`,
      pass,
    };
  },
  toBeValidHash(received: string) {
    const pass = /^0x[a-fA-F0-9]{64}$/.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid hash`
          : `expected ${received} to be a valid hash`,
      pass,
    };
  },
});

// Add custom matchers to TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAddress(): R;
      toBeValidHash(): R;
    }
  }
}

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
