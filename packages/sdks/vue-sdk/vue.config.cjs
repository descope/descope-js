const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
	transpileDependencies: true,
	indexPath: './example',
	chainWebpack: (config) => {
		config.entry('app').clear().add('./example/main.ts').end();
		config.module
			.rule('vue')
			.use('vue-loader')
			.tap((options) => {
				options.compilerOptions = {
					...options.compilerOptions,
					isCustomElement: (tag) => tag.startsWith('descope-')
				};
				return options;
			});

		config.plugin('define').tap((definitions) => {
			definitions[0] = Object.assign(definitions[0], {
				BUILD_VERSION: JSON.stringify(require('./package.json').version)
			});
			return definitions;
		});
    // config.resolve.symlinks(true)
	}
});
