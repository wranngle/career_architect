# dashboard/ — Career Architect terminal UI

A `bubbletea` + `lipgloss` TUI for the local pipeline (tracker, reports, scan
progress). Inherited from upstream
[`santifer/career-ops`](https://github.com/santifer/career-ops) — see the root
[`UPSTREAM.md`](../UPSTREAM.md) for attribution detail.

> **Web equivalent.** The same data model is rendered for the web at
> [`/admin`](../src/app/admin) on the deployed Next.js site. Same surfaces:
> Pipeline, Progress, Scans. Use whichever fits the task — they share the same
> tracker.md / reports/ data layer.

## Build & run

```bash
cd dashboard
go build -o ../career-dashboard ./...
../career-dashboard                 # auto-detect light/dark, Catppuccin theme
../career-dashboard --theme=wranngle # branded Wranngle palette (light/dark auto)
```

Inside the project root:

```bash
go run ./dashboard
```

## Themes

| `--theme=` value     | Notes |
|----------------------|-------|
| `auto` (default)     | Catppuccin Latte/Mocha auto-detected from terminal bg. |
| `catppuccin-latte`   | Upstream Catppuccin light. |
| `catppuccin-mocha`   | Upstream Catppuccin dark. |
| `wranngle`           | Wranngle brand palette, auto light/dark. |
| `wranngle-light`     | Wranngle brand, forced light (sand-50 page). |
| `wranngle-dark`      | Wranngle brand, forced dark (night-950 page). |

The Wranngle theme maps the existing slot names (Blue/Mauve/Sky/Peach/etc.)
onto the canonical Wranngle palette (sunset / wviolet / sand / night) so all
TUI surfaces inherit the brand without code changes elsewhere. Source:
[`~/.agents/DESIGN.md`](https://github.com/wranngle/.dotfiles/blob/main/wranngle-DESIGN.md)
and the vendored [`tokens/tokens.css`](../tokens/tokens.css).

## Data

The TUI reads tracker.md and `reports/` directly off disk. It does not write
back. State changes (e.g. status updates via `c`) are persisted by re-writing
tracker.md atomically. See `dashboard/internal/data/career.go` for the parsing
and serialization layer.
