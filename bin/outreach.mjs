#!/usr/bin/env node

/**
 * outreach — cold-message generator CLI.
 *
 * Thin argv shim. Real logic lives in src/outreach/index.mjs. CLI dispatcher
 * pattern matches PR #12 (negotiate): parseArgs throws on bad usage, the
 * shim translates well-known error codes to exit codes, everything else
 * exits with a generic 1.
 */

import { resolve } from 'node:path';
import { HELP, parseArgs, runOutreach } from '../src/outreach/index.mjs';

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
  if (!args.person || !args.jd) {
    process.stderr.write(`outreach: positional <person.json> <jd.json> are required\n${HELP}\n`);
    return 2;
  }

  try {
    const { message, outPath } = await runOutreach({
      personPath: resolve(args.person),
      jdPath: resolve(args.jd),
      root: resolve(args.root),
      outDirOverride: args.outDir ? resolve(args.outDir) : null,
      writeFile: args.write,
    });
    process.stdout.write(`${message}\n`);
    if (outPath) {
      process.stderr.write(`outreach: wrote ${outPath} (${message.length} chars)\n`);
    }
    return 0;
  } catch (e) {
    if (e.code === 'ENOPERSON' || e.code === 'ENOJD') {
      process.stderr.write(`outreach: ${e.message}\n`);
      return 2;
    }
    if (
      e.code === 'EPERSONJSON' ||
      e.code === 'EPERSONSHAPE' ||
      e.code === 'EPERSONNAME' ||
      e.code === 'EPERSONSIGNALS' ||
      e.code === 'EJDJSON' ||
      e.code === 'EJDSHAPE' ||
      e.code === 'EJDTITLE'
    ) {
      process.stderr.write(`outreach: ${e.message}\n`);
      return 2;
    }
    process.stderr.write(`outreach: ${e.stack ?? e.message ?? e}\n`);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0)).catch((e) => {
  process.stderr.write(`outreach: ${e?.stack ?? e}\n`);
  process.exit(1);
});
