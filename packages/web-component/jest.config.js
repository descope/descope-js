const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  clearMocks: true,

  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/lib/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 84,
      functions: 91,
      lines: 95,
      statements: 95,
    },
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
    BUILD_VERSION: '1.2.3',
  },

  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', 'src'],

  testTimeout: 5000,

  roots: ['src', 'test'],
};
