module.exports = {
  clearMocks: true,

  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  coverageThreshold: {
    global: {
      branches: 67,
      functions: 92,
      lines: 94,
      statements: 94,
    },
  },
  // A set of global variables that need to be available in all test environments
  globals: {
    BUILD_VERSION: 'one.two.three',
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

  testTimeout: 2000,

  roots: ['src', 'test'],
};
