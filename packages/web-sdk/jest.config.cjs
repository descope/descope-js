module.exports = {
	clearMocks: true,

	collectCoverage: true,
	coverageDirectory: 'coverage',
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
