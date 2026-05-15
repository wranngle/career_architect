#!/usr/bin/env node

/**
 * tailor — per-JD CV variant CLI.
 *
 * Thin argv shim. Real logic lives in src/tailor/index.mjs.
 */

import { resolve } from 'node:path';
import { HELP, parseArgs, runTailor } from '../src/tailor/index.mjs';

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`${e.message}\n${HELP}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (!args.jd) {
    process.stderr.write(`tailor: positional <jd.md> is required\n${HELP}\n`);
    return 2;
  }

  try {
    const { outPath, slug, title } = await runTailor({
      jdPath: resolve(args.jd),
      root: resolve(args.root),
      cvPath: args.cv,
      outDirOverride: args.outDir ? resolve(args.outDir) : null,
    });
    process.stdout.write(`tailor: wrote ${outPath} (slug=${slug}, title="${title}")\n`);
    return 0;
  } catch (e) {
    if (e.code === 'ENOJD') {
      process.stderr.write(`tailor: JD file not found.\n  ${e.message}\n`);
      return 2;
    }
    if (e.code === 'ENOJDTITLE') {
      process.stderr.write(`tailor: ${e.message}\n`);
      return 2;
    }
    if (e.code === 'ENOCV') {
      process.stderr.write(`tailor: CV source missing.\n  ${e.message}\n`);
      return 2;
    }
    process.stderr.write(`tailor: ${e.stack ?? e.message ?? e}\n`);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0)).catch((e) => {
  process.stderr.write(`tailor: ${e?.stack ?? e}\n`);
  process.exit(1);
});
