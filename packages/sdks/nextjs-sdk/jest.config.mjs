import { defaults } from 'jest-config';
export default {
	...defaults,
	collectCoverage: true,
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
	setupFiles: ['./jest.setup.js'],
	transform: {
		'^.+\\.(js|jsx|ts|tsx|mjs)$': [
			'babel-jest',
			{ configFile: './babel.config.cjs' }
		]
	},
	globals: {
		'ts-jest': {
			tsconfig: 'tsconfig.json'
		},
		BUILD_VERSION: 'one.two.three'
	},
	testEnvironment: 'jsdom',
	// transformIgnorePatterns: ['node_modules/(?!(jose)/)'],
	moduleNameMapper: {
		jose: '<rootDir>/mockModule.js',
		'@descope/web-component': '<rootDir>/mockModule.js',
		'@descope/user-management-widget': '<rootDir>/mockModule.js',
		'@descope/role-management-widget': '<rootDir>/mockModule.js',
		'@descope/access-key-management-widget': '<rootDir>/mockModule.js',
		'@descope/audit-management-widget': '<rootDir>/mockModule.js',
		'@descope/user-profile-widget': '<rootDir>/mockModule.js'
	}
};
