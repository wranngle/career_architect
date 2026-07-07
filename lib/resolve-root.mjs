/**
 * lib/resolve-root.mjs — split-repo data-root resolution.
 *
 * The runtime (these scripts) may live in this repo while the user's career
 * data (cv.md, config/profile.yml, data/applications.md) lives in a separate
 * directory. Scripts resolve user-layer paths against the *data root*: the
 * invocation CWD when it looks like a career data dir, otherwise the runtime
 * repo itself (single-repo layout). System assets (templates/, fonts/,
 * sibling scripts) always resolve against REPO_ROOT.
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/** Root of the runtime repo (the directory containing the .mjs scripts). */
export const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Markers that identify a directory as a career data dir. Specific files
 * (not a bare `data/` dir) so an unrelated project with a data/ folder is
 * never mistaken for one.
 */
const DATA_MARKERS = [
  'cv.md',
  'config/profile.yml',
  'data/applications.md',
  'data/pipeline.md',
];

/**
 * Resolve the root for user-layer files (cv.md, config/, data/, reports/,
 * output/): `cwd` when it carries any data marker, otherwise REPO_ROOT.
 */
export function resolveDataRoot(cwd = process.cwd()) {
  return DATA_MARKERS.some((m) => existsSync(join(cwd, m))) ? cwd : REPO_ROOT;
}
