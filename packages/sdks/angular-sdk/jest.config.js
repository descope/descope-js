module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  roots: ['<rootDir>/projects/angular-sdk', '<rootDir>/projects/demo-app'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['projects/**/*.{js,ts}'],
  transform: {
    '^.+\\.(ts|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: './projects/angular-sdk/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  }
};
