import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { REPO_ROOT, resolveDataRoot } from '../lib/resolve-root.mjs';

test('REPO_ROOT points at the runtime repo (contains package.json and lib/)', () => {
  assert.ok(existsSync(join(REPO_ROOT, 'package.json')));
  assert.ok(existsSync(join(REPO_ROOT, 'lib', 'resolve-root.mjs')));
});

test('resolveDataRoot: cwd with cv.md is a data root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'career-data-'));
  try {
    writeFileSync(join(dir, 'cv.md'), '# CV\n');
    assert.equal(resolveDataRoot(dir), dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveDataRoot: cwd with config/profile.yml is a data root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'career-data-'));
  try {
    mkdirSync(join(dir, 'config'));
    writeFileSync(join(dir, 'config', 'profile.yml'), 'name: Test\n');
    assert.equal(resolveDataRoot(dir), dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveDataRoot: cwd with data/applications.md is a data root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'career-data-'));
  try {
    mkdirSync(join(dir, 'data'));
    writeFileSync(join(dir, 'data', 'applications.md'), '# Applications Tracker\n');
    assert.equal(resolveDataRoot(dir), dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveDataRoot: a bare data/ directory is NOT a marker (falls back to repo)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unrelated-'));
  try {
    mkdirSync(join(dir, 'data'));
    assert.equal(resolveDataRoot(dir), REPO_ROOT);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveDataRoot: unrelated cwd falls back to REPO_ROOT', () => {
  const dir = mkdtempSync(join(tmpdir(), 'unrelated-'));
  try {
    assert.equal(resolveDataRoot(dir), REPO_ROOT);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
