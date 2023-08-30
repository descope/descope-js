const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  clearMocks: true,

  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/lib/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 82,
      functions: 91,
      lines: 94,
      statements: 94,
    },
  },
  globals: {
    BUILD_VERSION: '1.2.3',
  },
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', 'src'],

  testTimeout: 5000,

  roots: ['src', 'test'],
};
