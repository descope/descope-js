import typescript from '@rollup/plugin-typescript';
import autoExternal from 'rollup-plugin-auto-external';
import define from 'rollup-plugin-define';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';
import withSolid from 'rollup-preset-solid';
import fs from 'fs';
import packageJson from './package.json' with { type: 'json' };

const solidConfig = withSolid({
  input: 'src/index.tsx',
  targets: ['esm', 'cjs'],
  printInstructions: false,
});

const dtsConfig = {
  input: 'src/index.tsx',
  output: [{ dir: './dist', format: 'esm' }],
  plugins: [
    define({
      replacements: {
        BUILD_VERSION: JSON.stringify(packageJson.version),
      },
    }),
    typescript({
      tsconfig: './tsconfig.json',
      compilerOptions: {
        rootDir: './src',
        declaration: true,
        declarationDir: './dist/types',
      },
    }),
    dts(),
    cjsPackage(),
    {
      name: 'noEmit',
      generateBundle(_, bundle) {
        for (const file in bundle) {
          if (file.endsWith('.js')) {
            delete bundle[file];
          }
        }
      },
    },
  ],
};

export default [
  ...(Array.isArray(solidConfig) ? solidConfig : [solidConfig]),
  dtsConfig,
];

function cjsPackage() {
  return {
    name: 'cjsPackage',
    buildEnd: () => {
      if (!fs.existsSync('./dist/cjs')) {
        fs.mkdirSync('./dist/cjs', { recursive: true });
      }
      fs.writeFileSync(
        './dist/cjs/package.json',
        JSON.stringify({ type: 'commonjs' }),
      );
    },
  };
}
