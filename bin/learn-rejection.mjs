#!/usr/bin/env node

/**
 * learn-rejection — rejection-feedback learner CLI.
 *
 * Thin argv shim; real work lives in src/learn-rejection/index.mjs.
 * Pattern matches PR #10–#14 (rehearse / tailor / negotiate / outreach /
 * timeline): parseArgs throws EUSAGE for bad flags, the shim translates
 * that into exit 2 + HELP; everything else exits 1 with a stack.
 */

import { resolve } from 'node:path';
import { HELP, parseArgs, runLearn, isoToday } from '../src/learn-rejection/index.mjs';

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
    const lessonsPath = args.lessons ? resolve(args.lessons) : null;
    const today = args.today ?? isoToday();
    const emailPath = resolve(args.email);
    const result = await runLearn({
      emailPath,
      root,
      lessonsPath,
      today,
      stdout: Boolean(args.stdout),
    });

    if (args.stdout) {
      process.stdout.write(result.document);
      return 0;
    }
    const verb = result.added ? 'added' : 'merged';
    process.stdout.write(
      `learn-rejection: ${verb} lesson [${result.lesson.kind}] from ${result.lesson.company} → ${result.outPath} (${result.totalLessons} total)\n`,
    );
    return 0;
  } catch (e) {
    if (e.code === 'EUSAGE') {
      process.stderr.write(`learn-rejection: ${e.message}\n${HELP}\n`);
      return 2;
    }
    process.stderr.write(`learn-rejection: ${e.stack ?? e.message ?? e}\n`);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0)).catch((e) => {
  process.stderr.write(`learn-rejection: ${e?.stack ?? e}\n`);
  process.exit(1);
});
