import typescript from '@rollup/plugin-typescript';
import autoExternal from 'rollup-plugin-auto-external';
import define from 'rollup-plugin-define';
import preserveDirectives from 'rollup-plugin-preserve-directives';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import alias from '@rollup/plugin-alias';
import noEmit from 'rollup-plugin-no-emit';

import packageJson from './package.json' with { type: 'json' };

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
		declaration: false
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

export default [
	...configurations,
	{
		input: 'src/index.ts',
		output: [{ dir: './dist', format: 'esm' }],
		plugins: [
			typescript({
				tsconfig: './tsconfig.json',
				compilerOptions: {
					rootDir: './src',
					declaration: true,
					declarationDir: './dist/types'
				}
			}),
			noEmit({ match: (file) => file.endsWith('.js') })
		]
	}
];
