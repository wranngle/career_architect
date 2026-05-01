# Modo: auto-pipeline — Pipeline Completo Automático

Cuando el usuario pega un JD (texto o URL) sin sub-comando explícito, ejecutar TODO el pipeline en secuencia:

## Paso 0 — Extraer JD

Si el input es una **URL** (no texto de JD pegado), seguir esta estrategia para extraer el contenido:

**Orden de prioridad:**

1. **Playwright (preferido):** La mayoría de portales de empleo (Lever, Ashby, Greenhouse, Workday) son SPAs. Usar `browser_navigate` + `browser_snapshot` para renderizar y leer el JD.
2. **WebFetch (fallback):** Para páginas estáticas (ZipRecruiter, WeLoveProduct, company career pages).
3. **WebSearch (último recurso):** Buscar título del rol + empresa en portales secundarios que indexan el JD en HTML estático.

**Si ningún método funciona:** Pedir al candidato que pegue el JD manualmente o comparta un screenshot.

**Si el input es texto de JD** (no URL): usar directamente, sin necesidad de fetch.

## Paso 0.5 — Hard pre-filters (deterministic gate before LLM)

Read `config/profile.yml` `hard_filters:` block. If ANY of these match, drop
the job immediately — write a SKIP entry to `data/applications.md` and exit.
DO NOT spend LLM tokens on a job that fails a hard filter.

Apply in order:
1. **`english_only: true`** → if JD body language ≠ English (detect by counting
   common English markers in first 500 chars), SKIP with reason `non-english JD`.
2. **`location_allowed: [...]`** → if non-empty, JD location must contain at
   least one allowed marker (case-insensitive substring). SKIP with `location not in allowlist`.
3. **`remote_required: true`** → JD must mention "remote" / "anywhere" / "wfh"
   / "work from home" / "distributed" in body OR location field. SKIP with
   `remote required, role is on-site`.
   **Ambiguity rule:** If the JD doesn't mention location at all (no body
   match AND empty location field), do NOT skip — proceed and add a WARN
   to Block G ("location ambiguous; remote_required filter not applied").
   This avoids dropping promising roles because the JD is poorly written
   rather than because it's actually on-site. Same robustness as the
   `min_pay_annual` rule — a missing signal is not a negative signal.
4. **`min_pay_annual` / `min_pay_hourly`** → if comp is mentioned in JD AND
   below threshold, SKIP with `comp below floor: ${seen} vs ${floor}`.
   If comp NOT mentioned, do NOT skip (don't penalize companies that withhold).
5. **`exclude_compensation_types`** → if JD body matches any of the patterns
   (commission only, MLM, etc.), SKIP with `excluded compensation type`.
6. **`seniority_min` / `seniority_max`** → if title contains a seniority word
   (junior, mid, senior, staff, principal, director, VP, head), enforce the
   bounds. SKIP with `seniority out of bounds`.
7. **`exclude_company_stages`** → if company stage is detectable from JD or
   company name (Series A/B/C/D, public, pre-seed) and matches an excluded
   stage, SKIP with `excluded company stage`.

If all filters pass, continue to Step 1.

## Paso 1 — Evaluación A-H
Ejecutar exactamente igual que el modo `oferta` (leer `modes/oferta.md` para todos los bloques A-F + Block G Posting Legitimacy + Block H 10-Dimension Score).

## Paso 2 — Guardar Report .md
Guardar la evaluación completa en `reports/{###}-{company-slug}-{YYYY-MM-DD}.md` (ver formato en `modes/oferta.md`).
Include Blocks G and H in the saved report. Add `**Legitimacy:** {tier}` to the report header.

## Paso 2.5 — HARD STOP at 4.0

Read the `score` from Block H (the 10-dim weighted score, NOT the narrative score).

- **score < 4.0** → Stop the pipeline. Skip Steps 3, 4, and 5. Instead:
  1. Append a SKIP entry to `data/applications.md`:
     `| {N} | {date} | {company} | {role} | {score}/5 | SKIP | ❌ | [report]({path}) | sub-4.0 — {top reason from Block H red_flags note} |`
  2. Tell the user: "Score {X}/5 — below the 4.0 hard-stop. Saved report for reference; skipping PDF/apply/tracker. Override with `--force` if you want to proceed anyway."
  3. EXIT.
- **4.0 ≤ score < 4.5** → Continue Steps 3 and 5. Skip Step 4 (apply answers).
- **score ≥ 4.5** → Continue all steps including Step 4.

**Override flag:** If user explicitly passed `--force` (or said "override the score gate"), proceed regardless. Log the override in the tracker note.

## Paso 3 — Generar PDF
Ejecutar el pipeline completo de `pdf` (leer `modes/pdf.md`).

## Paso 4 — Draft Application Answers (solo si score >= 4.5)

Si el score final es >= 4.5, generar borrador de respuestas para el formulario de aplicación:

1. **Extraer preguntas del formulario**: Usar Playwright para navegar al formulario y hacer snapshot. Si no se pueden extraer, usar las preguntas genéricas.
2. **Generar respuestas** siguiendo el tono (ver abajo).
3. **Guardar en el report** como sección `## H) Draft Application Answers`.

### Preguntas genéricas (usar si no se pueden extraer del formulario)

- Why are you interested in this role?
- Why do you want to work at [Company]?
- Tell us about a relevant project or achievement
- What makes you a good fit for this position?
- How did you hear about this role?

### Tono para Form Answers

**Posición: "I'm choosing you."** el candidato tiene opciones y está eligiendo esta empresa por razones concretas.

**Reglas de tono:**
- **Confiado sin arrogancia**: "I've spent the past year building production AI agent systems — your role is where I want to apply that experience next"
- **Selectivo sin soberbia**: "I've been intentional about finding a team where I can contribute meaningfully from day one"
- **Específico y concreto**: Siempre referenciar algo REAL del JD o de la empresa, y algo REAL de la experiencia del candidato
- **Directo, sin fluff**: 2-4 frases por respuesta. Sin "I'm passionate about..." ni "I would love the opportunity to..."
- **El hook es la prueba, no la afirmación**: En vez de "I'm great at X", decir "I built X that does Y"

**Framework por pregunta:**
- **Why this role?** → "Your [specific thing] maps directly to [specific thing I built]."
- **Why this company?** → Mencionar algo concreto sobre la empresa. "I've been using [product] for [time/purpose]."
- **Relevant experience?** → Un proof point cuantificado. "Built [X] that [metric]. Sold the company in 2025."
- **Good fit?** → "I sit at the intersection of [A] and [B], which is exactly where this role lives."
- **How did you hear?** → Honesto: "Found through [portal/scan], evaluated against my criteria, and it scored highest."

**Idioma**: Siempre en el idioma del JD (EN default). Aplicar `/tech-translate`.

## Paso 5 — Actualizar Tracker
Registrar en `data/applications.md` con todas las columnas incluyendo Report y PDF en ✅.

**Si algún paso falla**, continuar con los siguientes y marcar el paso fallido como pendiente en el tracker.
