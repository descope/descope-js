module.exports = {
	preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
	globals: {
		BUILD_VERSION: '123'
	},
	clearMocks: true,

	collectCoverage: true,
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx,vue}'],
	testMatch: ['**/tests/**/*.test.ts'],
	setupFiles: ['./setupJest.js']
};
