#!/usr/bin/env node
/**
 * Fails the build when a fenced JavaScript sample in an SDK README does not parse.
 *
 * Every checked block is written to a temporary file with an `.mjs` extension and
 * handed to `node --check`. The extension is load-bearing: with a `.js` extension
 * Node parses the block as CommonJS first, and a top-level `import` makes that
 * attempt fail for the *wrong* reason -- the ESM retry path then swallows the real
 * error and `node --check` exits 0 on a block that is genuinely broken.
 *
 * (the `*\/` below is an unbalanced comment terminator, escaped so this comment survives)
 *
 *   $ printf "import x from 'y';\nconst a = 1;\n*\/\n" > g.js  && node --check g.js  # exit 0
 *   $ printf "import x from 'y';\nconst a = 1;\n*\/\n" > g.mjs && node --check g.mjs # exit 1
 *
 * Usage:
 *   node tools/scripts/checkReadmeSamples.mjs                 # the allowlist below
 *   node tools/scripts/checkReadmeSamples.mjs path/to/README.md
 *
 * A block that is deliberately not standalone can be exempted by putting
 * `<!-- readme-check: skip <reason> -->` on the last non-blank line above its
 * opening fence. A reason is mandatory so every exemption stays reviewable.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../..');

/**
 * READMEs whose JavaScript samples must parse.
 *
 * Deliberately narrow for now. Deferred, because their `js`-tagged blocks are JSX
 * or TypeScript and need a JSX/TS-aware parser rather than `node --check`:
 * react-sdk, nextjs-sdk, angular-sdk, vue-sdk, web-component.
 */
const CHECKED_READMES = [
  'packages/sdks/core-js-sdk/README.md',
  'packages/sdks/web-js-sdk/README.md',
];

/** Fence info strings treated as plain JavaScript. `ts`/`tsx`/`jsx` are out of scope. */
const JS_LANGUAGES = new Set(['js', 'javascript', 'mjs']);

const SKIP_DIRECTIVE = /^<!--\s*readme-check:\s*skip\s*(.*?)\s*-->$/;

/**
 * A block that must be rejected. Guards the `.mjs` detail above: switch the
 * temporary files back to `.js` and this snippet starts passing, which would
 * turn the whole gate into a no-op without failing anything.
 */
const CANARY = "import x from 'y';\nconst a = 1;\n*/\n";

const FENCE = /^([ \t]*)```([^\n`]*)\n([\s\S]*?)^\1```[ \t]*$/gm;

/** @returns {{ lang: string, code: string, startLine: number, skipReason: string | null }[]} */
const parseBlocks = (markdown) => {
  const lines = markdown.split('\n');
  const blocks = [];

  for (let match = FENCE.exec(markdown); match; match = FENCE.exec(markdown)) {
    const [, , info, code] = match;
    // 1-based line of the opening fence.
    const startLine = markdown.slice(0, match.index).split('\n').length;
    // Walk back past blank lines to the nearest preceding content line.
    let cursor = startLine - 2;
    while (cursor >= 0 && !(lines[cursor] ?? '').trim()) cursor -= 1;
    const directive = SKIP_DIRECTIVE.exec((lines[cursor] ?? '').trim());

    if (directive && !directive[1]) {
      throw new Error(
        `line ${cursor + 1}: \`readme-check: skip\` needs a reason`,
      );
    }

    blocks.push({
      lang: info
        .trim()
        .split(/[\s{,:]/)[0]
        .toLowerCase(),
      code,
      startLine,
      skipReason: directive ? directive[1] : null,
    });
  }

  return blocks;
};

/**
 * @returns {string | null} the parse error, with block-relative line numbers
 *   rewritten to README line numbers, or null when the block parses.
 */
const parseError = (block, readmePath, scratchDir) => {
  const blockFile = join(scratchDir, `block-${block.startLine}.mjs`);
  writeFileSync(blockFile, block.code);

  try {
    execFileSync(process.execPath, ['--check', blockFile], { stdio: 'pipe' });
    return null;
  } catch (error) {
    return String(error.stderr)
      .split('\n')
      .filter((line) => !/^\s+at\s|^Node\.js v/.test(line))
      .join('\n')
      .trim()
      .replace(
        new RegExp(
          `${blockFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`,
          'g',
        ),
        // +1 for the opening fence, so the number points at the README line.
        (_, line) => `${readmePath}:${block.startLine + Number(line)}`,
      );
  }
};

const checkReadme = (readmePath, scratchDir) => {
  const failures = [];
  const skipped = [];
  let checked = 0;

  for (const block of parseBlocks(
    readFileSync(join(REPO_ROOT, readmePath), 'utf8'),
  )) {
    if (!JS_LANGUAGES.has(block.lang)) continue;

    if (block.skipReason) {
      skipped.push(`${readmePath}:${block.startLine} -- ${block.skipReason}`);
      continue;
    }

    checked += 1;
    const error = parseError(block, readmePath, scratchDir);
    if (error) failures.push(error);
  }

  return { checked, failures, skipped };
};

const main = () => {
  const targets = process.argv.slice(2);
  const readmes = targets.length
    ? targets.map((target) => relative(REPO_ROOT, resolve(target)))
    : CHECKED_READMES;

  const scratchDir = mkdtempSync(join(tmpdir(), 'readme-samples-'));
  let checked = 0;
  const failures = [];
  const skipped = [];

  try {
    const canary = { code: CANARY, startLine: 0 };
    if (!parseError(canary, '<canary>', scratchDir)) {
      console.error(
        'self-check failed: the canary block parsed, so this gate cannot fail.',
      );
      process.exitCode = 1;
      return;
    }

    for (const readme of readmes) {
      const result = checkReadme(readme, scratchDir);
      checked += result.checked;
      failures.push(...result.failures);
      skipped.push(...result.skipped);
    }
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }

  for (const skip of skipped) console.log(`skipped ${skip}`);

  if (failures.length) {
    console.error(
      `\n${failures.length} of ${
        checked + failures.length
      } JavaScript README sample(s) do not parse:\n`,
    );
    for (const failure of failures) console.error(`${failure}\n`);
    console.error(
      'Fix the sample, or exempt the block with `<!-- readme-check: skip <reason> -->`.',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `${checked} JavaScript README sample(s) parse across ${readmes.length} file(s).`,
  );
};

main();
