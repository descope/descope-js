module.exports = {
	clearMocks: true,

	collectCoverage: true,
	coverageDirectory: 'coverage',
	// Asaf - check how to merge coverage from multiple repo
	collectCoverageFrom: ['index.ts'],

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
