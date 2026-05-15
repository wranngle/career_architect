#!/usr/bin/env node

/**
 * timeline — application calendar CLI.
 *
 * Thin argv shim; the real work lives in src/timeline/index.mjs. Pattern
 * matches PR #10–#13 (rehearse/tailor/negotiate/outreach): parseArgs
 * throws EUSAGE for bad flags, the shim translates that into exit 2 and
 * dumps HELP; everything else exits 1 with a stack.
 */

import { resolve } from 'node:path';
import { HELP, parseArgs, runTimeline, isoToday } from '../src/timeline/index.mjs';

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

  try {
    const root = resolve(args.root);
    const outPathOverride = args.out ? resolve(args.out) : null;
    const today = args.today ?? isoToday();
    const result = runTimeline({
      root,
      outPath: outPathOverride,
      today,
      include: args.include,
      writeFile: !args.stdout,
    });

    if (args.stdout) {
      process.stdout.write(result.document);
      return 0;
    }
    process.stdout.write(
      `timeline: wrote ${result.outPath} (${result.tasks.length} in-flight of ${result.rows.length} tracked)\n`,
    );
    return 0;
  } catch (e) {
    if (e.code === 'EUSAGE') {
      process.stderr.write(`timeline: ${e.message}\n${HELP}\n`);
      return 2;
    }
    process.stderr.write(`timeline: ${e.stack ?? e.message ?? e}\n`);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0)).catch((e) => {
  process.stderr.write(`timeline: ${e?.stack ?? e}\n`);
  process.exit(1);
});
