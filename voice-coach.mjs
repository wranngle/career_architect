#!/usr/bin/env node

/**
 * Voice-coach.mjs — Provision a personal ElevenLabs voice job-coach agent.
 *
 * Reads your career_architect profile + CV (and optionally a target JD) and
 * creates a Conversational AI agent on your ElevenLabs workspace, with your
 * documents attached as a RAG knowledge base. Each provisioning is a fresh
 * agent; the script writes the resulting agent_id to data/voice-coach-agent.json
 * so subsequent runs can reference it.
 *
 * Requires:
 *   - ELEVENLABS_API_KEY in your environment (https://elevenlabs.io/app/settings/api-keys)
 *
 * Usage:
 *   node voice-coach.mjs                                                # uses config/profile.yml + cv.md
 *   node voice-coach.mjs --target-company ElevenLabs \
 *                       --target-role "Automations Engineer"           # override target
 *   node voice-coach.mjs --jd reports/elevenlabs-automations.md        # attach a specific JD
 *   node voice-coach.mjs --demo                                        # public-style demo, no personal KB
 *   node voice-coach.mjs --dry-run                                     # print payload without calling the API
 *   node voice-coach.mjs --voice-id <voice_id>                         # pick an ElevenLabs voice
 *   node voice-coach.mjs --coach-name "Coach Riley"                    # override coach persona name
 */

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, statSync,
} from 'node:fs';
import {basename, resolve} from 'node:path';
import yaml from 'js-yaml';

// ── Constants ───────────────────────────────────────────────────────

const API_BASE = 'https://api.elevenlabs.io/v1/convai';
const PROMPT_TEMPLATE_PATH = 'templates/voice-coach-system-prompt.md';
const PROFILE_PATH = 'config/profile.yml';
const CV_PATH = 'cv.md';
const AGENT_RECORD_PATH = 'data/voice-coach-agent.json';
const DEFAULT_VOICE_ID = 'pFZP5JQG7iQjIQuC4Bku'; // ElevenLabs "Lily" — warm, conversational
const DEFAULT_COACH_NAME = 'Coach Avery';
const DEFAULT_LLM = 'claude-opus-4-7';

// ── CLI parsing ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {jds: []};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--demo': {
        args.demo = true;
        break;
      }
      case '--dry-run': {
        args.dryRun = true;
        break;
      }
      case '--target-company': {
        args.targetCompany = next();
        break;
      }
      case '--target-role': {
        args.targetRole = next();
        break;
      }
      case '--target-location': {
        args.targetLocation = next();
        break;
      }
      case '--candidate-name': {
        args.candidateName = next();
        break;
      }
      case '--coach-name': {
        args.coachName = next();
        break;
      }
      case '--comp-anchor': {
        args.compAnchor = next();
        break;
      }
      case '--comp-target': {
        args.compTarget = next();
        break;
      }
      case '--comp-floor': {
        args.compFloor = next();
        break;
      }
      case '--voice-id': {
        args.voiceId = next();
        break;
      }
      case '--llm': {
        args.llm = next();
        break;
      }
      case '--jd': {
        args.jds.push(next());
        break;
      }
      case '--help':
      case '-h': {
        args.help = true;
        break;
      }
      default: {
        if (a.startsWith('--')) {
          console.warn(`Unknown flag: ${a}`);
        }
      }
    }
  }
  return args;
}

function printHelp() {
  console.log(readFileSync(new URL(import.meta.url).pathname, 'utf8')
    .split('\n').slice(0, 26).join('\n').replaceAll(/^.{0,3}/gm, ''));
}

// ── Profile loading ─────────────────────────────────────────────────

function loadProfile(args) {
  if (args.demo) {
    return {
      candidate: {full_name: 'Demo Candidate'},
      narrative: {headline: 'AI agents engineer building voice + automation systems'},
      target_roles: {primary: ['AI Automations Engineer'], archetypes: [{name: 'AI Automations Engineer'}]},
      compensation: {target_range: '$200K–$260K'},
    };
  }
  if (!existsSync(PROFILE_PATH)) {
    throw new Error(`Missing ${PROFILE_PATH}. Copy config/profile.example.yml → config/profile.yml ` +
      'and fill it in, OR run with --demo for a generic agent.');
  }
  return yaml.load(readFileSync(PROFILE_PATH, 'utf8'));
}

function pickArchetypes(profile) {
  const arch = profile?.target_roles?.archetypes ?? [];
  if (arch.length === 0) {
    return profile?.target_roles?.primary?.join(', ') ?? '(unspecified)';
  }
  return arch.slice(0, 4).map(a => a.name + (a.fit ? ` (${a.fit})` : '')).join(', ');
}

function pickCompTarget(profile, args) {
  // Prefer explicit args, then profile.salary_target.base_*, then profile.compensation.target_range
  const out = {
    anchor: args.compAnchor ?? null,
    target: args.compTarget ?? null,
    floor: args.compFloor ?? null,
  };
  const st = profile?.salary_target;
  if (st && typeof st === 'object') {
    out.anchor = out.anchor ?? (st.base_target ? `$${formatComp(st.base_target)}` : null);
    out.target = out.target ?? (st.base_target ? `$${formatComp(st.base_target)}` : null);
    out.floor = out.floor ?? (st.base_min ? `$${formatComp(st.base_min)}` : null);
  }
  const tr = profile?.compensation?.target_range;
  if (tr && (!out.anchor || !out.target || !out.floor)) {
    out.anchor = out.anchor ?? tr;
    out.target = out.target ?? tr;
    out.floor = out.floor ?? tr;
  }
  out.anchor = out.anchor ?? '(set in config/profile.yml or via --comp-anchor)';
  out.target = out.target ?? out.anchor;
  out.floor = out.floor ?? out.anchor;
  return out;
}

function formatComp(n) {
  return Number(n).toLocaleString('en-US');
}

// ── KB upload ───────────────────────────────────────────────────────

async function uploadKbFile(apiKey, filePath, displayName) {
  const buf = readFileSync(filePath);
  const blob = new Blob([buf], {type: 'text/markdown'});
  const form = new FormData();
  form.append('file', blob, basename(filePath));
  form.append('name', displayName);
  const res = await fetch(`${API_BASE}/knowledge-base/file`, {
    method: 'POST',
    headers: {'xi-api-key': apiKey},
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`KB upload failed for ${filePath} (${res.status}): ${text}`);
  }
  const json = JSON.parse(text);
  return {
    type: 'file', id: json.id, name: displayName, usage_mode: 'auto',
  };
}

// ── Prompt substitution ─────────────────────────────────────────────

function renderPrompt(template, vars) {
  return template.replaceAll(/{{(\w+)}}/g, (_, key) => {
    if (vars[key] === undefined) {
      console.warn(`Prompt template variable {{${key}}} not provided — leaving placeholder.`);
      return `{{${key}}}`;
    }
    return String(vars[key]);
  });
}

// ── Agent payload ───────────────────────────────────────────────────

function buildConversationConfig({prompt, voiceId, llm, knowledgeBase, candidateName, coachName, targetRole, targetCompany}) {
  return {
    asr: {
      quality: 'high',
      provider: 'scribe_realtime',
      user_input_audio_format: 'pcm_48000',
      keywords: ['interview', 'negotiation', targetCompany, targetRole].filter(Boolean),
    },
    turn: {
      turn_timeout: 10,
      silence_end_call_timeout: 60,
      soft_timeout_config: {timeout_seconds: 6, message: 'Mhm…', use_llm_generated_message: true},
      mode: 'turn',
      turn_eagerness: 'normal',
      spelling_patience: 'auto',
      speculative_turn: true,
      retranscribe_on_turn_timeout: true,
      turn_model: 'turn_v2',
      interruption_ignore_terms: [],
    },
    tts: {
      model_id: 'eleven_v3_conversational',
      voice_id: voiceId,
      expressive_mode: true,
      agent_output_audio_format: 'pcm_48000',
      optimize_streaming_latency: 2,
      stability: 0.3,
      speed: 0.98,
      similarity_boost: 0.95,
      text_normalisation_type: 'elevenlabs',
    },
    conversation: {
      text_only: false,
      max_duration_seconds: 1800,
      client_events: [
        'audio',
        'interruption',
        'user_transcript',
        'agent_response',
        'agent_response_correction',
        'agent_response_metadata',
        'agent_chat_response_part',
        'agent_tool_request',
        'agent_tool_response',
        'vad_score',
        'agent_response_complete',
        'guardrail_triggered',
      ],
      file_input: {enabled: true, max_files_per_conversation: 10},
      monitoring_enabled: false,
      source_attribution: false,
    },
    agent: {
      first_message: `Hey ${candidateName.split(/\s+/)[0]}, ${coachName} here. Mock interview, story drilling, JD prep, negotiation rehearsal, or open coaching — what are we working on today?`,
      language: 'en',
      dynamic_variables: {dynamic_variable_placeholders: {}},
      disable_first_message_interruptions: true,
      max_conversation_duration_message: '',
      prompt: {
        prompt,
        llm,
        temperature: 0.7,
        max_tokens: 999,
        tool_ids: [],
        native_mcp_server_ids: [],
        mcp_server_ids: [],
        knowledge_base: knowledgeBase,
        ignore_default_personality: true,
        rag: {
          enabled: knowledgeBase.length > 0,
          embedding_model: 'e5_mistral_7b_instruct',
          optional_rag_enabled: false,
          max_vector_distance: 0.6,
          max_documents_length: 50_000,
          max_retrieved_rag_chunks_count: 20,
        },
        backup_llm_config: {preference: 'override', order: ['qwen35-397b-a17b', 'glm-45-air-fp8']},
      },
    },
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    return printHelp();
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY missing. Get one at https://elevenlabs.io/app/settings/api-keys');
    process.exit(1);
  }

  if (!existsSync(PROMPT_TEMPLATE_PATH)) {
    throw new Error(`Missing ${PROMPT_TEMPLATE_PATH} — re-clone or restore from git.`);
  }
  const template = readFileSync(PROMPT_TEMPLATE_PATH, 'utf8');

  const profile = loadProfile(args);
  const candidateName = args.candidateName ?? profile?.candidate?.full_name ?? profile?.name ?? 'Candidate';
  const coachName = args.coachName ?? DEFAULT_COACH_NAME;
  const targetCompany = args.targetCompany ?? profile?.target_companies?.[0] ?? 'your target company';
  const targetRole = args.targetRole ?? profile?.target_roles?.primary?.[0] ?? 'your target role';
  const targetLocation = args.targetLocation ?? 'Remote';
  const headline = profile?.narrative?.headline ?? profile?.narrative ?? '(see CV)';
  const archetypes = pickArchetypes(profile);
  const comp = pickCompTarget(profile, args);

  const promptVars = {
    coach_name: coachName,
    candidate_name: candidateName,
    candidate_headline: typeof headline === 'string' ? headline.split('\n')[0] : '(see CV)',
    candidate_archetypes: archetypes,
    target_role: targetRole,
    target_company: targetCompany,
    target_location: targetLocation,
    comp_anchor: comp.anchor,
    comp_target: comp.target,
    comp_floor: comp.floor,
  };
  const prompt = renderPrompt(template, promptVars);

  // KB candidates
  const kbCandidates = [];
  if (!args.demo) {
    if (existsSync(CV_PATH)) {
      kbCandidates.push({path: CV_PATH, name: `${candidateName} — CV`});
    }
    if (existsSync(PROFILE_PATH)) {
      kbCandidates.push({path: PROFILE_PATH, name: `${candidateName} — career profile`});
    }
  }
  for (const jd of args.jds) {
    if (!existsSync(jd)) {
      console.warn(`--jd path not found, skipping: ${jd}`);
      continue;
    }
    kbCandidates.push({path: jd, name: `JD — ${basename(jd, '.md')}`});
  }

  const voiceId = args.voiceId ?? DEFAULT_VOICE_ID;
  const llm = args.llm ?? DEFAULT_LLM;

  if (args.dryRun) {
    console.log('── Dry run ──');
    console.log({
      candidateName, coachName, targetRole, targetCompany, targetLocation, comp, voiceId, llm, kb: kbCandidates,
    });
    console.log('Prompt characters:', prompt.length);
    return;
  }

  const knowledgeBase = [];
  for (const k of kbCandidates) {
    process.stdout.write(`uploading KB: ${k.name} (${k.path}) ... `);
    const entry = await uploadKbFile(apiKey, k.path, k.name);
    console.log(entry.id);
    knowledgeBase.push(entry);
  }

  const conversationConfig = buildConversationConfig({
    prompt, voiceId, llm, knowledgeBase, candidateName, coachName, targetRole, targetCompany,
  });

  const agentLabel = args.demo
    ? 'Career Architect — Voice Coach (demo)'
    : `Career Architect — ${coachName} for ${candidateName} (${targetCompany})`;

  const body = {
    name: agentLabel,
    conversation_config: conversationConfig,
    tags: ['career-architect', 'voice-coach', args.demo ? 'demo' : 'personal'],
  };

  const res = await fetch(`${API_BASE}/agents/create`, {
    method: 'POST',
    headers: {'xi-api-key': apiKey, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Agent create failed (${res.status}): ${text}`);
    process.exit(1);
  }
  const json = JSON.parse(text);

  mkdirSync('data', {recursive: true});
  const record = {
    agent_id: json.agent_id,
    name: agentLabel,
    created_at: new Date().toISOString(),
    target_company: targetCompany,
    target_role: targetRole,
    candidate_name: candidateName,
    coach_name: coachName,
    voice_id: voiceId,
    llm,
    knowledge_base: knowledgeBase.map(({id, name}) => ({id, name})),
    demo: Boolean(args.demo),
  };
  let history = [];
  if (existsSync(AGENT_RECORD_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(AGENT_RECORD_PATH, 'utf8'));
      history = Array.isArray(prev) ? prev : [prev];
    } catch {}
  }
  history.unshift(record);
  writeFileSync(AGENT_RECORD_PATH, JSON.stringify(history, null, 2));

  console.log('');
  console.log(`✓ Agent created: ${json.agent_id}`);
  console.log(`  Dashboard: https://elevenlabs.io/app/conversational-ai/agents/${json.agent_id}`);
  console.log(`  Recorded:  ${AGENT_RECORD_PATH}`);
  console.log('');
  console.log('Open the dashboard URL and click \'Test agent\' to start a coaching call.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}
