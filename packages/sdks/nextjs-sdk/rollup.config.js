import typescript from '@rollup/plugin-typescript';
import autoExternal from 'rollup-plugin-auto-external';
import define from 'rollup-plugin-define';
import dts from 'rollup-plugin-dts';
// import { terser } from 'rollup-plugin-terser';
import del from 'rollup-plugin-delete';
// const packageJson = require('./package.json');
// import swcPreserveDirectives from 'rollup-swc-preserve-directives';
import preserveDirectives from 'rollup-plugin-preserve-directives';
// import { swc } from 'rollup-plugin-swc3';
import { nodeResolve } from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';

const nextSubPackages = [
  'next/server',
  'next/dynamic',
  'next/navigation',
  'next/router',
  'next/link',
  'next/headers',
]

// Common plugins for all configurations
const commonPlugins = (outputDir) => [
	define({
		replacements: {
			BUILD_VERSION: JSON.stringify(require('./package.json').version)
		}
	}),
	typescript({
		tsconfig: './tsconfig.json',
		declarationDir: `${outputDir}/dts` // dynamically set declarationDir
	}),
	// swcPreserveDirectives(),
	preserveDirectives({ supressPreserveModulesWarning: true }),
	nodeResolve(),
	// commonjs(),
  alias({
    entries: nextSubPackages.map((alias) => {
      // Append the `.js` suffix to Next.js sub-packages
      // to ensure compatibility with Node environments
      return { find: alias, replacement: `${alias}.js` }
    })
  }),
	autoExternal(),
	// terser()
];

// Configurations for server, client and main entry
const configurations = ['server', 'client', ''].map((entry) => {
	const inputPath = entry ? `src/${entry}/index.ts` : 'src/index.ts';
	// const outputPath = entry ? `dist/${entry}/index.js` : 'dist/index.js';
	const outputDir = entry ? `dist/${entry}` : 'dist';

	return {
		input: inputPath,
		external: [
      'react',
			...nextSubPackages.map((alias) => `${alias}.js`)
		],
		onwarn(warning, warn) {
			if (
				warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
				warning.message.includes(`'use client'`)
			) {
				return;
			}
			warn(warning);
		},
		// externals: ['./shared'],
		output: [
			// {
			//   // file: outputPath,
			// 	dir: outputDir,
			//   sourcemap: true,
			//   format: 'cjs',
			// 	preserveModules: true
			// },
			{
				// file: outputPath.replace('.js', '.mjs'),
				dir: outputDir,
				sourcemap: true,
				format: 'esm',
				preserveModules: true
			}
		],
		plugins: commonPlugins(outputDir)
	};
});

const endConfigurations = ['server', 'client', ''].map((entry) => {
	const input = entry
		? `./dist/dts/src/${entry}/index.d.ts`
		: './dist/dts/src/index.d.ts';
	const outputFile = entry ? `dist/${entry}/index.d.ts` : 'dist/index.d.ts';
	const srcDir = entry ? `./dist/${entry}/src` : './dist/src';
	return {
		input: input,
		output: [{ file: outputFile, format: 'esm' }],
		plugins: [
			dts(),
			del({
				hook: 'buildEnd',
				targets: srcDir
			}),
      // replace({
      //   'next/dynamic': 'next/dynamic.js',
      //   // 'process.env.NODE_ENV': JSON.stringify('production'),
      //   // __buildDate__: () => JSON.stringify(new Date()),
      //   // __buildVersion: 15,
      // })
		]
	};
});

export default [...configurations, ...endConfigurations];
