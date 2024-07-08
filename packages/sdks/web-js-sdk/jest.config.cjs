const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  clearMocks: true,

  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 93.5,
      lines: 93.5,
      statements: 93.5,
    },
  },
  // A set of global variables that need to be available in all test environments
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
    BUILD_VERSION: 'one.two.three',
  },

  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', 'src'],

  testTimeout: 2000,

  roots: ['src', 'test'],
};
