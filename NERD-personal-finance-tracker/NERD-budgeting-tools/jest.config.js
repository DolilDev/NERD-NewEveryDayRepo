/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/frontend/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'frontend/src/**/*.ts',
    // Entry point and IO/render glue are exercised manually, not unit-tested.
    '!frontend/src/main.ts',
    '!frontend/src/api.ts',
    '!frontend/src/chart.ts',
    '!frontend/src/types.ts',
    '!**/*.d.ts',
  ],
};
