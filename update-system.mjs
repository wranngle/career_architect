#!/usr/bin/env node

/**
 * update-system.mjs — neutered for the wranngle/CareerArchitect hard fork
 *
 * Upstream Career-Ops shipped this script to pull updates from
 * santifer/career-ops. In a hard fork that doesn't sync from upstream,
 * running `apply` would silently clobber fork-side changes — actively
 * dangerous. This stub keeps the CLAUDE.md contract (emits structured
 * JSON to stdout) but never touches files.
 *
 * If you ever DO want to re-enable upstream sync, restore the original
 * via `git log --diff-filter=D --all -- update-system.mjs` and pick the
 * pre-neuter blob.
 */

const cmd = process.argv[2] || 'check';

switch (cmd) {
  case 'check':
    // CLAUDE.md "Update Check" contract: silent path is "up-to-date".
    // We always emit that so the agent says nothing on session start.
    console.log(JSON.stringify({ status: 'up-to-date', note: 'fork-detached' }));
    break;
  case 'apply':
    console.error('apply is disabled in this hard fork — see update-system.mjs comment');
    process.exit(1);
  case 'rollback':
    console.error('rollback is disabled in this hard fork');
    process.exit(1);
  case 'dismiss':
    console.log(JSON.stringify({ status: 'dismissed' }));
    break;
  default:
    console.error(`unknown command: ${cmd}`);
    process.exit(1);
}
