#!/usr/bin/env node

/**
 * rehearse — 5-turn mock recruiter call CLI.
 *
 * See src/rehearse/index.mjs for the orchestration logic. This file is a
 * thin argv shim that wires either stdin or a fixture's scripted answers
 * into the rehearsal loop and reports the output path.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HELP,
  parseArgs,
  runRehearsal,
  mockLlmClient,
} from '../src/rehearse/index.mjs';

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
  if (!args.company) {
    process.stderr.write(`rehearse: --company is required\n${HELP}\n`);
    return 2;
  }
  const root = resolve(args.root);

  let llm;
  let getAnswer;
  if (args.mock) {
    const fixturePath = resolve(args.mock);
    llm = mockLlmClient(fixturePath);
    getAnswer = (turnIndex) => {
      const a = llm.scriptedAnswers[turnIndex];
      if (typeof a !== 'string') throw new Error(`mock: no scripted answer for turn ${turnIndex}`);
      return a;
    };
  } else {
    process.stderr.write(
      'rehearse: live LLM client is not yet wired — re-run with --mock <fixture.json>.\n',
    );
    return 2;
  }

  try {
    const { outPath, score } = await runRehearsal({
      company: args.company,
      root,
      turns: args.turns,
      llm,
      getAnswer,
    });
    process.stdout.write(`rehearse: wrote ${outPath} (score ${score.total}/${score.max})\n`);
    return 0;
  } catch (e) {
    if (e.code === 'ENORECON') {
      process.stderr.write(`rehearse: recon brief not found for ${args.company}.\n`);
      process.stderr.write(`  Run: node recon-brief.mjs ${args.company} --root ${root}\n`);
      return 2;
    }
    process.stderr.write(`rehearse: ${e.stack ?? e.message ?? e}\n`);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code ?? 0)).catch((e) => {
  process.stderr.write(`rehearse: ${e?.stack ?? e}\n`);
  process.exit(1);
});
