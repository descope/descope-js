module.exports = {
	clearMocks: true,

	collectCoverage: true,
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],

	transform: {
		'^.+\\.ts?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json'
			}
		]
	},

	preset: 'ts-jest',
	testEnvironment: 'jsdom'
};
