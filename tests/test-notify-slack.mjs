import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(TESTS_DIR, '..');
const SCRIPT = join(REPO_DIR, 'notify-slack.mjs');
const FIXTURES = join(TESTS_DIR, 'fixtures/notify-slack');
const REPORT_HIGH = join(FIXTURES, 'eval-high.md');
const REPORT_LOW = join(FIXTURES, 'eval-low.md');

function runAsync(args, env = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, SLACK_WEBHOOK_URL: '', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', (c) => { stdout += c.toString(); });
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, 8000);
    child.on('exit', (status, signal) => {
      clearTimeout(timer);
      resolveRun({ status, signal, stdout, stderr });
    });
  });
}

function startMockWebhook() {
  const received = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c.toString(); });
    req.on('end', () => {
      received.push({
        method: req.method,
        contentType: req.headers['content-type'] ?? '',
        body,
      });
      res.writeHead(200, { 'content-type': 'application/json', connection: 'close' });
      res.end('{"ok":true}');
    });
  });
  return new Promise((resolveReady) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolveReady({
        url: `http://127.0.0.1:${port}/webhook`,
        received,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

test('notify-slack: posts JSON payload with role, score, cv path, url to webhook', async () => {
  const hook = await startMockWebhook();
  try {
    const res = await runAsync([
      '--report', REPORT_HIGH,
      '--cv-path', 'output/cv-acme.pdf',
      '--threshold', '4.0',
    ], { SLACK_WEBHOOK_URL: hook.url });
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstderr: ${res.stderr}\nstdout: ${res.stdout}`);
    assert.equal(hook.received.length, 1, 'webhook should have received exactly one POST');
    const req = hook.received[0];
    assert.equal(req.method, 'POST');
    assert.match(req.contentType, /application\/json/);
    const payload = JSON.parse(req.body);
    assert.equal(payload.role, 'Acme Synthworks -- Voice Engineer', 'role name extracted from report H1');
    assert.equal(payload.score, 4.6, 'numeric score extracted from report');
    assert.equal(payload.scoreOutOf, 5);
    assert.equal(payload.cvPath, 'output/cv-acme.pdf', 'tailored CV path forwarded');
    assert.equal(payload.url, 'https://example.com/jobs/acme-voice-engineer', 'job URL forwarded');
    assert.ok(Array.isArray(payload.blocks) && payload.blocks.length >= 1, 'slack blocks present');
    assert.match(payload.text, /Voice Engineer/, 'text summary mentions role');
  } finally {
    await hook.close();
  }
});

test('notify-slack: gracefully skips (exit 0, no POST) when SLACK_WEBHOOK_URL is unset', async () => {
  const hook = await startMockWebhook();
  try {
    const res = await runAsync([
      '--report', REPORT_HIGH,
      '--cv-path', 'output/cv-acme.pdf',
    ]);
    assert.equal(res.status, 0, `expected exit 0, got ${res.status}\nstderr: ${res.stderr}`);
    assert.match(res.stdout, /SLACK_WEBHOOK_URL unset/i, 'should announce the skip reason');
    assert.equal(hook.received.length, 0, 'must not POST when webhook is unset');
  } finally {
    await hook.close();
  }
});

test('notify-slack: below threshold = exit 0, no POST', async () => {
  const hook = await startMockWebhook();
  try {
    const res = await runAsync([
      '--report', REPORT_LOW,
      '--cv-path', 'output/cv-bravo.pdf',
      '--threshold', '4.0',
    ], { SLACK_WEBHOOK_URL: hook.url });
    assert.equal(res.status, 0);
    assert.match(res.stdout, /below threshold/i);
    assert.equal(hook.received.length, 0, 'low-fit roles must not POST');
  } finally {
    await hook.close();
  }
});

test('notify-slack: --dry-run prints payload without POSTing', async () => {
  const hook = await startMockWebhook();
  try {
    const res = await runAsync([
      '--role', 'Synth Role',
      '--score', '4.8',
      '--cv-path', 'output/cv.pdf',
      '--url', 'https://example.com/x',
      '--dry-run',
    ], { SLACK_WEBHOOK_URL: hook.url });
    assert.equal(res.status, 0);
    const payload = JSON.parse(res.stdout);
    assert.equal(payload.role, 'Synth Role');
    assert.equal(payload.score, 4.8);
    assert.equal(payload.cvPath, 'output/cv.pdf');
    assert.equal(hook.received.length, 0, 'dry-run must not POST');
  } finally {
    await hook.close();
  }
});

test('notify-slack: non-2xx webhook response = exit 1', async () => {
  const server = createServer((req, res) => {
    res.writeHead(500, { connection: 'close' }); res.end('boom');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  try {
    const res = await runAsync([
      '--role', 'X', '--score', '4.5', '--cv-path', 'out/x.pdf',
    ], { SLACK_WEBHOOK_URL: `http://127.0.0.1:${port}/` });
    assert.equal(res.status, 1, 'should exit 1 on 5xx webhook response');
    assert.match(res.stderr, /500/);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
