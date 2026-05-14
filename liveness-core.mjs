import { appendFile, mkdir } from 'fs/promises';
import { dirname, isAbsolute, resolve } from 'path';

const HARD_EXPIRED_PATTERNS = [
  /job (is )?no longer available/i,
  /job.*no longer open/i,
  /position has been filled/i,
  /this job has expired/i,
  /job posting has expired/i,
  /no longer accepting applications/i,
  /this (position|role|job) (is )?no longer/i,
  /this job (listing )?is closed/i,
  /job (listing )?not found/i,
  /the page you are looking for doesn.t exist/i,
  /diese stelle (ist )?(nicht mehr|bereits) besetzt/i,
  /offre (expirée|n'est plus disponible)/i,
];

const LISTING_PAGE_PATTERNS = [
  /\d+\s+jobs?\s+found/i,
  /search for jobs page is loaded/i,
];

const EXPIRED_URL_PATTERNS = [
  /[?&]error=true/i,
];

const APPLY_PATTERNS = [
  /\bapply\b/i,
  /\bsolicitar\b/i,
  /\bbewerben\b/i,
  /\bpostuler\b/i,
  /submit application/i,
  /easy apply/i,
  /start application/i,
  /ich bewerbe mich/i,
];

const MIN_CONTENT_CHARS = 300;

function firstMatch(patterns, text = '') {
  return patterns.find((pattern) => pattern.test(text));
}

function hasApplyControl(controls = []) {
  return controls.some((control) => APPLY_PATTERNS.some((pattern) => pattern.test(control)));
}

export function classifyLiveness({ status = 0, finalUrl = '', bodyText = '', applyControls = [] } = {}) {
  if (status === 404 || status === 410) {
    return { result: 'expired', reason: `HTTP ${status}` };
  }

  const expiredUrl = firstMatch(EXPIRED_URL_PATTERNS, finalUrl);
  if (expiredUrl) {
    return { result: 'expired', reason: `redirect to ${finalUrl}` };
  }

  const expiredBody = firstMatch(HARD_EXPIRED_PATTERNS, bodyText);
  if (expiredBody) {
    return { result: 'expired', reason: `pattern matched: ${expiredBody.source}` };
  }

  if (hasApplyControl(applyControls)) {
    return { result: 'active', reason: 'visible apply control detected' };
  }

  const listingPage = firstMatch(LISTING_PAGE_PATTERNS, bodyText);
  if (listingPage) {
    return { result: 'expired', reason: `pattern matched: ${listingPage.source}` };
  }

  if (bodyText.trim().length < MIN_CONTENT_CHARS) {
    return { result: 'expired', reason: 'insufficient content — likely nav/footer only' };
  }

  return { result: 'uncertain', reason: 'content present but no visible apply control found' };
}

const DEFAULT_JSONL_PATH = 'logs/liveness.jsonl';

function ecsOutcome(result) {
  if (result === 'active') return 'success';
  if (result === 'expired') return 'failure';
  return 'unknown';
}

export function buildLivenessEvent({ url, result, reason, status, finalUrl, timestamp } = {}) {
  const event = {
    '@timestamp': timestamp ?? new Date().toISOString(),
    event: {
      action: 'liveness.check',
      category: ['web'],
      kind: 'event',
      outcome: ecsOutcome(result),
    },
    url: { full: url },
    labels: { liveness_result: result },
  };
  if (reason) event.message = reason;
  if (typeof status === 'number' && status > 0) {
    event.http = { response: { status_code: status } };
  }
  if (finalUrl && finalUrl !== url) {
    event.url.final = finalUrl;
  }
  return event;
}

export async function appendLivenessEvent(event, { logPath = DEFAULT_JSONL_PATH, cwd = process.cwd() } = {}) {
  const target = isAbsolute(logPath) ? logPath : resolve(cwd, logPath);
  await mkdir(dirname(target), { recursive: true });
  await appendFile(target, JSON.stringify(event) + '\n', 'utf-8');
  return target;
}

export async function logLivenessCheck({ url, classification, status, finalUrl, logPath, cwd } = {}) {
  const event = buildLivenessEvent({
    url,
    result: classification?.result,
    reason: classification?.reason,
    status,
    finalUrl,
  });
  await appendLivenessEvent(event, { logPath, cwd });
  return event;
}
