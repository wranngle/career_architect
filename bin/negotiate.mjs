#!/usr/bin/env node

/**
 * negotiate — offer negotiation script generator CLI.
 *
 * Thin argv shim. Real logic lives in src/negotiate/index.mjs. CLI dispatcher
 * pattern matches PR #4 (morning brief): parseArgs throws on bad usage, the
 * shim translates well-known error codes to exit codes, everything else exits
 * with a generic 1.
 */

import { resolve } from 'node:path';
import { HELP, parseArgs, runNegotiate } from '../src/negotiate/index.mjs';

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
  if (!args.offer) {
    process.stderr.write(`negotiate: positional <offer.json> is required\n${HELP}\n`);
    return 2;
  }

  try {
    const { outPath, slug, anchor } = await runNegotiate({
      offerPath: resolve(args.offer),
      root: resolve(args.root),
      outDirOverride: args.outDir ? resolve(args.outDir) : null,
    });
    process.stdout.write(`negotiate: wrote ${outPath} (slug=${slug}, anchor=$${anchor.toLocaleString('en-US')})\n`);
    return 0;
  } catch (e) {
    if (e.code === 'ENOOFFER') {
      process.stderr.write(`negotiate: offer file not found.\n  ${e.message}\n`);
      return 2;
    }
    if (e.code === 'EOFFERJSON' || e.code === 'EOFFERSHAPE' || e.code === 'EOFFERBASE') {
      process.stderr.write(`negotiate: ${e.message}\n`);
      return 2;
    }
    process.stderr.write(`negotiate: ${e.stack ?? e.message ?? e}\n`);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0)).catch((e) => {
  process.stderr.write(`negotiate: ${e?.stack ?? e}\n`);
  process.exit(1);
});
