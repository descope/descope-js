module.exports = {
	root: true,
	env: {
		node: true,
		'vue/setup-compiler-macros': true
	},
	extends: [
		'plugin:vue/vue3-essential',
		'eslint:recommended',
		'@vue/typescript/recommended',
		'prettier'
	],
	ignorePatterns: [
		'.eslintrc',
		'jest.config.js',
		'babel.config.js',
		'build/*',
		'dist/*',
		'webpack.config.js',
		'bundle/*',
		'coverage/*',
		'testUtils/*'
	],
	plugins: ['prettier'],
	parserOptions: {
		ecmaVersion: 2020
	},
	rules: {
		'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
	},
	overrides: [
		{
			files: [
				'**/__tests__/*.{j,t}s?(x)',
				'**/tests/unit/**/*.spec.{j,t}s?(x)'
			],
			env: {
				jest: true
			}
		}
	]
};
