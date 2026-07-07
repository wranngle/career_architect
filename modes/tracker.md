# Modo: tracker — Tracker de Aplicaciones

Lee y muestra `data/applications.md`.

**Formato del tracker:**
```markdown
| # | Fecha | Empresa | Rol | Score | Estado | PDF | Report |
```

Estados posibles (canónicos en inglés, fuente de verdad `templates/states.yml`):
`Evaluated` → `Applied` → `Responded` → `Screen` → `Tech` → `Onsite` →
`Interview` (genérico) → `Offer`, con salidas terminales `Rejected` /
`Ghosted` / `Discarded` / `SKIP`.

- `Applied` = el candidato envió su candidatura
- `Responded` = la empresa respondió (aún sin entrevista)
- `Screen` / `Tech` / `Onsite` = etapas de entrevista con detalle; `Interview`
  es el genérico cuando la etapa no está clara
- El outreach proactivo (LinkedIn power move) se registra en la columna de
  notas y en `data/follow-ups.md`, no como estado del tracker

Si el usuario pide actualizar un estado, editar la fila correspondiente.

Mostrar también estadísticas:
- Total de aplicaciones
- Por estado
- Score promedio
- % con PDF generado
- % con report generado

## Memory MCP usage (cross-session continuity)

If the `memory` MCP server is running (configured in `.mcp.json`), mirror
tracker writes into the knowledge graph so future ephemeral cloud-sandbox
sessions can pick up where the last one left off without re-reading
`applications.md` from scratch:

- After each tracker append/update, write or update an
  `Application:{company}::{role}` entity with observations
  `[score, status, last_action_date, report_path, pdf_path]`.
- After each follow-up touch (per `modes/followup.md`), append an
  observation `followup_sent_{date}` to the same entity.
- After each interview-prep session, link
  `Application:{company}::{role} → InterviewPrep:{company}::{role}`.
- Before showing the tracker overview, query
  `search_nodes("Application:")` to surface any entities the file
  doesn't yet have (e.g. when the tracker file was reset but the
  graph survived).

`data/applications.md` remains the source of truth on disk; the graph
is a session-resilient cache.
