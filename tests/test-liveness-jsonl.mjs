import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildLivenessEvent,
  appendLivenessEvent,
  logLivenessCheck,
} from '../liveness-core.mjs';

const FIXTURE_URLS = [
  { url: 'https://boards.greenhouse.io/acme/jobs/1', result: 'active', reason: 'visible apply control detected' },
  { url: 'https://example.com/closed', result: 'expired', reason: 'HTTP 404' },
  { url: 'https://jobs.lever.co/foo/2', result: 'uncertain', reason: 'content present but no visible apply control found' },
  { url: 'https://ashbyhq.com/bar/jobs/3', result: 'active', reason: 'greenhouse-api: "Senior AI Engineer"' },
  { url: 'https://workday.example.com/role/4', result: 'expired', reason: 'pattern matched: \\d+\\s+jobs?\\s+found' },
];

test('buildLivenessEvent: required ECS fields on all 5 fixtures', () => {
  for (const { url, result, reason } of FIXTURE_URLS) {
    const event = buildLivenessEvent({ url, result, reason });
    assert.match(event['@timestamp'], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, '@timestamp is ISO-8601');
    assert.equal(event.event.action, 'liveness.check');
    assert.equal(event.url.full, url);
    assert.ok(['success', 'failure', 'unknown'].includes(event.event.outcome));
  }
});

test('buildLivenessEvent: outcome mapping is correct', () => {
  assert.equal(buildLivenessEvent({ url: 'x', result: 'active' }).event.outcome, 'success');
  assert.equal(buildLivenessEvent({ url: 'x', result: 'expired' }).event.outcome, 'failure');
  assert.equal(buildLivenessEvent({ url: 'x', result: 'uncertain' }).event.outcome, 'unknown');
});

test('buildLivenessEvent: status and finalUrl populate optional ECS fields', () => {
  const event = buildLivenessEvent({
    url: 'https://a/1',
    result: 'expired',
    reason: 'HTTP 404',
    status: 404,
    finalUrl: 'https://a/1?error=true',
  });
  assert.equal(event.http.response.status_code, 404);
  assert.equal(event.url.final, 'https://a/1?error=true');
});

test('appendLivenessEvent: writes one JSON object per line under custom log path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'liveness-jsonl-'));
  const target = join(dir, 'logs', 'liveness.jsonl');
  try {
    for (const { url, result, reason } of FIXTURE_URLS) {
      const event = buildLivenessEvent({ url, result, reason });
      await appendLivenessEvent(event, { logPath: target });
    }
    const text = await readFile(target, 'utf-8');
    const lines = text.split('\n').filter(Boolean);
    assert.equal(lines.length, 5, 'one line per fixture URL');
    for (const [i, line] of lines.entries()) {
      const parsed = JSON.parse(line);
      assert.equal(parsed.event.action, 'liveness.check');
      assert.equal(parsed.url.full, FIXTURE_URLS[i].url);
      assert.ok(parsed['@timestamp']);
      assert.ok(parsed.event.outcome);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('logLivenessCheck: end-to-end emits JSONL with classification', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'liveness-jsonl-e2e-'));
  try {
    const event = await logLivenessCheck({
      url: 'https://example.com/role/42',
      classification: { result: 'active', reason: 'visible apply control detected' },
      cwd: dir,
    });
    assert.equal(event.event.outcome, 'success');
    const text = await readFile(join(dir, 'logs', 'liveness.jsonl'), 'utf-8');
    const parsed = JSON.parse(text.trim());
    assert.equal(parsed.url.full, 'https://example.com/role/42');
    assert.equal(parsed.event.action, 'liveness.check');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
