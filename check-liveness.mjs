#!/usr/bin/env node

/**
 * check-liveness.mjs — Playwright job link liveness checker
 *
 * Tests whether job posting URLs are still active or have expired.
 * Uses the same detection logic as scan.md step 7.5.
 * Zero Claude API tokens — pure Playwright.
 *
 * Usage:
 *   node check-liveness.mjs <url1> [url2] ...
 *   node check-liveness.mjs --file urls.txt
 *
 * Exit code: 0 if all active, 1 if any expired or uncertain
 */

import { chromium } from 'playwright';
import { readFile } from 'fs/promises';
import { classifyLiveness } from './liveness-core.mjs';

// Greenhouse boards render the JD client-side; the boards-api gives a
// reliable fast-path to the same data. Try the API first for any
// job-boards.greenhouse.io URL and short-circuit if it 200s.
async function checkGreenhouseApi(url) {
  const m = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
  if (!m) return null;
  const [, board, jobId] = m;
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (res.status === 404) return { result: 'expired', reason: 'greenhouse-api: 404 not found' };
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.title && json?.content) return { result: 'active', reason: `greenhouse-api: "${json.title}"` };
    return null;
  } catch {
    return null;
  }
}

async function checkUrl(page, url) {
  // Greenhouse short-circuit (avoids client-render race that flagged active
  // jobs as "expired" — see audit BUG 7).
  const ghCheck = await checkGreenhouseApi(url);
  if (ghCheck) return ghCheck;

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const status = response?.status() ?? 0;

    // Wait for SPAs (Ashby, Lever, Workday) to hydrate. Use networkidle as
    // primary; if it doesn't settle within 5s, fall back to the old 2s
    // static delay so we still produce a verdict.
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      await page.waitForTimeout(2000);
    }

    const finalUrl = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    const applyControls = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll('a, button, input[type="submit"], input[type="button"], [role="button"]')
      );

      return candidates
        .filter((element) => {
          if (element.closest('nav, header, footer')) return false;
          if (element.closest('[aria-hidden="true"]')) return false;

          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          if (!element.getClientRects().length) return false;

          return Array.from(element.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0);
        })
        .map((element) => {
          const label = [
            element.innerText,
            element.value,
            element.getAttribute('aria-label'),
            element.getAttribute('title'),
          ]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          return label;
        })
        .filter(Boolean);
    });

    return classifyLiveness({ status, finalUrl, bodyText, applyControls });

  } catch (err) {
    return { result: 'expired', reason: `navigation error: ${err.message.split('\n')[0]}` };
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    const stream = args[0] === '--help' || args[0] === '-h' ? 'log' : 'error';
    console[stream]('Usage: node check-liveness.mjs <url1> [url2] ...');
    console[stream]('       node check-liveness.mjs --file urls.txt');
    process.exit(args.length === 0 ? 1 : 0);
  }

  let urls;
  if (args[0] === '--file') {
    const text = await readFile(args[1], 'utf-8');
    urls = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  } else {
    urls = args;
  }

  console.log(`Checking ${urls.length} URL(s)...\n`);

  const launchOpts = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  const browser = await chromium.launch(launchOpts);
  // ignoreHTTPSErrors handles sandboxes that proxy HTTPS through a
  // self-signed CA that the bundled chromium doesn't trust.
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  let active = 0, expired = 0, uncertain = 0;

  // Sequential — project rule: never Playwright in parallel
  for (const url of urls) {
    const { result, reason } = await checkUrl(page, url);
    const icon = { active: '✅', expired: '❌', uncertain: '⚠️' }[result];
    console.log(`${icon} ${result.padEnd(10)} ${url}`);
    if (result !== 'active') console.log(`           ${reason}`);
    if (result === 'active') active++;
    else if (result === 'expired') expired++;
    else uncertain++;
  }

  await browser.close();

  console.log(`\nResults: ${active} active  ${expired} expired  ${uncertain} uncertain`);
  if (expired > 0 || uncertain > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
