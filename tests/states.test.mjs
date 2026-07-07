import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadStates,
  buildStatusIndex,
  STATUS_INDEX,
  canonicalId,
  canonicalLabel,
} from '../lib/states.mjs';

test('loadStates: reads the 12 states from templates/states.yml', () => {
  const states = loadStates();
  const ids = states.map((s) => String(s.id).toLowerCase());
  for (const expected of ['evaluated', 'applied', 'responded', 'screen', 'tech', 'onsite', 'interview', 'offer', 'rejected', 'ghosted', 'discarded', 'skip']) {
    assert.ok(ids.includes(expected), `missing state id: ${expected}`);
  }
});

test('canonicalId: resolves ids, labels, yml aliases, and legacy aliases', () => {
  assert.equal(canonicalId('Screen'), 'screen');
  assert.equal(canonicalId('recruiter_screen'), 'screen');
  assert.equal(canonicalId('entrevista'), 'interview');
  assert.equal(canonicalId('no aplicar'), 'skip');
  assert.equal(canonicalId('hold'), 'evaluated'); // legacy alias
  assert.equal(canonicalId('geo blocker'), 'skip'); // legacy alias
  assert.equal(canonicalId('totally-unknown'), null);
});

test('canonicalId: strips markdown bold and trailing dates', () => {
  assert.equal(canonicalId('**Applied**'), 'applied');
  assert.equal(canonicalId('Applied 2026-01-15 follow-up'), 'applied');
});

test('canonicalLabel: returns display labels', () => {
  assert.equal(canonicalLabel('tech_screen'), 'Tech');
  assert.equal(canonicalLabel('aplicada'), 'Applied');
  assert.equal(canonicalLabel('no_aplicar'), 'SKIP');
  assert.equal(canonicalLabel('nope'), null);
});

test('rankById: terminal lanes rank below active ones; sub-stages above generic', () => {
  const r = STATUS_INDEX.rankById;
  // Terminal < evaluated < applied < responded < interview lanes < offer
  assert.ok(r.skip < r.rejected, 'skip < rejected');
  assert.ok(r.rejected < r.evaluated, 'rejected < evaluated');
  assert.ok(r.evaluated < r.applied, 'evaluated < applied');
  assert.ok(r.applied < r.responded, 'applied < responded');
  assert.ok(r.responded < r.interview, 'responded < interview');
  assert.ok(r.offer > r.onsite, 'offer > onsite');
  // Named interview sub-stages outrank the generic catch-all and each other
  assert.ok(r.interview < r.screen, 'generic interview < screen');
  assert.ok(r.screen < r.tech, 'screen < tech');
  assert.ok(r.tech < r.onsite, 'tech < onsite');
  // Ghosted sits in the rejected lane
  assert.ok(r.ghosted < r.evaluated && r.ghosted >= r.rejected, 'ghosted ranks with rejected');
});

test('idsByGroup: interview group carries the sub-stages', () => {
  const g = STATUS_INDEX.idsByGroup.interview;
  for (const id of ['screen', 'tech', 'onsite', 'interview']) {
    assert.ok(g.includes(id), `interview group missing ${id}`);
  }
});

test('buildStatusIndex: works on custom state sets', () => {
  const idx = buildStatusIndex([
    { id: 'foo', label: 'Foo', aliases: ['f'], dashboard_group: 'applied' },
  ]);
  assert.equal(canonicalId('f', idx), 'foo');
  assert.equal(idx.labelById.foo, 'Foo');
});
