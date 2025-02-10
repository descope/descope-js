import typescript from '@rollup/plugin-typescript';
import autoExternal from 'rollup-plugin-auto-external';
import define from 'rollup-plugin-define';
import dts from 'rollup-plugin-dts';
// import { terser } from 'rollup-plugin-terser';
import del from 'rollup-plugin-delete';
// import swcPreserveDirectives from 'rollup-swc-preserve-directives';
import preserveDirectives from 'rollup-plugin-preserve-directives';
// import { swc } from 'rollup-plugin-swc3';
import { nodeResolve } from '@rollup/plugin-node-resolve';
// import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';

import packageJson from './package.json' assert { type: 'json' };

const nextSubPackages = [
	'next/server',
	'next/dynamic',
	'next/navigation',
	'next/router',
	'next/link',
	'next/headers'
];

// Common plugins for all configurations
const commonPlugins = (outputDir) => [
	define({
		replacements: {
			BUILD_VERSION: JSON.stringify(packageJson.version)
		}
	}),
	typescript({
		tsconfig: './tsconfig.json',
		declarationDir: outputDir
	}),
	// swcPreserveDirectives(),
	preserveDirectives({ supressPreserveModulesWarning: true }),
	nodeResolve(),
	// commonjs(),
	alias({
		entries: nextSubPackages.map((alias) => {
			// Append the `.js` suffix to Next.js sub-packages
			// to ensure compatibility with Node environments
			return { find: alias, replacement: `${alias}.js` };
		})
	}),
	autoExternal()
	// terser()
];

// Configurations for server, client and main entry
const configurations = ['server', 'client', ''].flatMap((entry) => {
	const inputPath = entry ? `src/${entry}/index.ts` : 'src/index.ts';
	const esmOutputDir = entry ? `dist/esm/${entry}` : 'dist/esm';
	const cjsOutputDir = entry ? `dist/cjs/${entry}` : 'dist/cjs';

	const baseConf = {
		input: inputPath,
		external: ['react', ...nextSubPackages.map((alias) => `${alias}.js`)],
		onwarn(warning, warn) {
			if (
				warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
				warning.message.includes(`'use client'`)
			) {
				return;
			}
			warn(warning);
		}
	};

	return [
		{
			...baseConf,
			output: {
				dir: cjsOutputDir,
				sourcemap: true,
				format: 'cjs',
				preserveModules: true,
				exports: 'auto'
			},
			plugins: commonPlugins(cjsOutputDir)
		},
		{
			...baseConf,
			output: {
				dir: esmOutputDir,
				sourcemap: true,
				format: 'esm',
				preserveModules: true
			},
			plugins: commonPlugins(esmOutputDir)
		}
	];
});

const endConfigurations = ['server', 'client', ''].flatMap((entry) => {
	// ESM input and output paths
	const esmInput = entry
		? `./dist/esm/src/${entry}/index.d.ts`
		: './dist/esm/src/index.d.ts';
	const esmOutput = entry
		? `dist/esm/${entry}/index.d.ts`
		: 'dist/esm/index.d.ts';
	const esmSrcDir = entry
		? `./dist/esm/${entry}/src`
		: './dist/esm/src';

	// CJS input and output paths
	const cjsInput = entry
		? `./dist/cjs/src/${entry}/index.d.ts`
		: './dist/cjs/src/index.d.ts';
	const cjsOutput = entry
		? `dist/cjs/${entry}/index.d.ts`
		: 'dist/cjs/index.d.ts';
	const cjsSrcDir = entry
		? `./dist/cjs/${entry}/src`
		: './dist/cjs/src';

	return [
		{
			input: esmInput,
			output: [{ file: esmOutput, format: 'esm' }],
			plugins: [
				dts(),
				del({
					hook: 'buildEnd',
					targets: esmSrcDir
				})
			]
		},
		{
			input: cjsInput,
			output: [{ file: cjsOutput, format: 'cjs' }],
			plugins: [
				dts(),
				del({
					hook: 'buildEnd',
					targets: cjsSrcDir
				})
			]
		}
	];
});

export default [...configurations, ...endConfigurations];
