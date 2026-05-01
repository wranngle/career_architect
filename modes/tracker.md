# Modo: tracker — Tracker de Aplicaciones

Lee y muestra `data/applications.md`.

**Formato del tracker:**
```markdown
| # | Fecha | Empresa | Rol | Score | Estado | PDF | Report |
```

Estados posibles: `Evaluada` → `Aplicado` → `Respondido` → `Contacto` → `Entrevista` → `Oferta` / `Rechazada` / `Descartada` / `NO APLICAR`

- `Aplicado` = el candidato envió su candidatura
- `Respondido` = Un recruiter/empresa contactó y el candidato respondió (inbound)
- `Contacto` = El candidato contactó proactivamente a alguien de la empresa (outbound, ej: LinkedIn power move)

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
