/**
 * lib/states.mjs — canonical tracker states, loaded from templates/states.yml.
 *
 * states.yml is the source of truth (id, label, aliases, dashboard_group);
 * new states only need to be added there. A hardcoded fallback of the eight
 * upstream states keeps the scripts working if the YAML is missing or
 * unparseable. Legacy aliases that predate states.yml are merged in so old
 * tracker data still canonicalizes.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

import { REPO_ROOT, resolveDataRoot } from './resolve-root.mjs';

const FALLBACK_STATES = [
  { id: 'evaluated', label: 'Evaluated', aliases: ['evaluada'], dashboard_group: 'evaluated' },
  { id: 'applied', label: 'Applied', aliases: ['aplicado', 'enviada', 'aplicada', 'sent'], dashboard_group: 'applied' },
  { id: 'responded', label: 'Responded', aliases: ['respondido'], dashboard_group: 'responded' },
  { id: 'interview', label: 'Interview', aliases: ['entrevista'], dashboard_group: 'interview' },
  { id: 'offer', label: 'Offer', aliases: ['oferta'], dashboard_group: 'offer' },
  { id: 'rejected', label: 'Rejected', aliases: ['rechazado', 'rechazada'], dashboard_group: 'rejected' },
  { id: 'discarded', label: 'Discarded', aliases: ['descartado', 'descartada', 'cerrada', 'cancelada'], dashboard_group: 'discarded' },
  { id: 'skip', label: 'SKIP', aliases: ['no_aplicar', 'no aplicar', 'monitor'], dashboard_group: 'skip' },
];

// Aliases that predate states.yml (evaluation notes, geo blocks, …).
const LEGACY_ALIASES = {
  'condicional': 'evaluated',
  'hold': 'evaluated',
  'evaluar': 'evaluated',
  'verificar': 'evaluated',
  'geo blocker': 'skip',
};

/**
 * Progression order of dashboard groups, least → most advanced. Terminal
 * lanes rank lowest so dedup keeps active statuses over closed ones
 * (Applied beats Rejected: an open application outranks a dead one).
 */
const GROUP_ORDER = ['skip', 'discarded', 'rejected', 'evaluated', 'applied', 'responded', 'interview', 'offer'];

function statesFile() {
  return [
    join(resolveDataRoot(), 'templates/states.yml'),
    join(resolveDataRoot(), 'states.yml'),
    join(REPO_ROOT, 'templates/states.yml'),
    join(REPO_ROOT, 'states.yml'),
  ].find(existsSync);
}

/** Raw state entries from states.yml, or the hardcoded fallback. */
export function loadStates() {
  const file = statesFile();
  if (file) {
    try {
      const doc = yaml.load(readFileSync(file, 'utf-8'));
      const states = (doc?.states ?? []).filter((s) => s?.id && s?.label);
      if (states.length > 0) return states;
    } catch {
      // Unparseable YAML — the hardcoded fallback stands.
    }
  }
  return FALLBACK_STATES;
}

/**
 * Build lookup tables from the state entries:
 *   labelById   — canonical id → display label ('screen' → 'Screen')
 *   aliasToId   — lowercase alias/label/id → canonical id
 *   rankById    — id → progression rank (higher = more advanced; generic
 *                 states like 'interview' rank below their named sub-stages)
 *   idsByGroup  — dashboard_group → [ids]
 */
export function buildStatusIndex(states = loadStates()) {
  const labelById = {};
  const aliasToId = { ...LEGACY_ALIASES };
  const rankById = {};
  const idsByGroup = {};
  for (const s of states) {
    const id = String(s.id).toLowerCase();
    const group = String(s.dashboard_group ?? id).toLowerCase();
    labelById[id] = s.label;
    aliasToId[id] = id;
    aliasToId[String(s.label).toLowerCase()] = id;
    for (const a of s.aliases ?? []) aliasToId[String(a).toLowerCase()] = id;
    (idsByGroup[group] ??= []).push(id);
    const groupIdx = GROUP_ORDER.indexOf(group);
    const within = id === group ? 0 : idsByGroup[group].length;
    rankById[id] = (groupIdx === -1 ? GROUP_ORDER.length : groupIdx) * 10 + within;
  }
  return { states, labelById, aliasToId, rankById, idsByGroup };
}

/** Shared index over the states.yml on disk, built once per process. */
export const STATUS_INDEX = buildStatusIndex();

/**
 * Strip bold/trailing-date noise from a raw status cell and resolve it to a
 * canonical id ('screen', 'applied', …), or null when unknown.
 */
export function canonicalId(raw, index = STATUS_INDEX) {
  const clean = String(raw ?? '')
    .replace(/\*\*/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .trim();
  return index.aliasToId[clean] ?? null;
}

/**
 * Like canonicalId but returns the display label ('Screen', 'SKIP', …),
 * or null when unknown.
 */
export function canonicalLabel(raw, index = STATUS_INDEX) {
  const id = canonicalId(raw, index);
  return id ? index.labelById[id] : null;
}
