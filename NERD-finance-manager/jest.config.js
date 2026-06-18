/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/backend', '<rootDir>/frontend', '<rootDir>/shared'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^@shared$': '<rootDir>/shared/src/index.ts',
    '^@shared/(.*)$': '<rootDir>/shared/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  passWithNoTests: true,
  collectCoverageFrom: [
    'backend/src/**/*.ts',
    'frontend/src/**/*.ts',
    'shared/src/**/*.ts',
    // Entry points / IO glue are exercised via integration, not unit tests.
    '!backend/src/server.ts',
    '!frontend/src/main.ts',
    '!frontend/src/api.ts',
    '!frontend/src/chart.ts',
    '!**/*.d.ts',
  ],
};
