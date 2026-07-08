# dashboard/ — Career Architect terminal UI

A `bubbletea` + `lipgloss` TUI for the local pipeline (tracker, reports, scan
progress). Inherited from upstream
[`santifer/career-ops`](https://github.com/santifer/career-ops) — see the root
[`UPSTREAM.md`](../UPSTREAM.md) for attribution detail.

> **Related web view.** The local files are rendered for the web at
> [`/admin`](../src/app/admin) on the local Next.js app (`npm run dev` —
> nothing is deployed). Shared surfaces:
> Pipeline and Progress; the TUI adds a Report viewer, the web view adds
> Scans and Profile. Use whichever fits the task. The TUI reads
> `applications.md` or `data/applications.md`; the web view reads
> `data/applications.md` when present and clearly marks sample fallback data.

## Build & run

```bash
cd dashboard
go build -o ../career-dashboard .
../career-dashboard                 # auto-detect light/dark, Catppuccin theme
../career-dashboard --theme=wranngle # branded Wranngle palette (light/dark auto)
```

Inside the project root (the Go module lives in `dashboard/`, there is no root
`go.mod`):

```bash
(cd dashboard && go run .)
```

## Flags

| Flag       | Default | Notes |
|------------|---------|-------|
| `--path`   | `.`     | Career data directory to read: the folder containing `applications.md` (or `data/applications.md`) and `reports/`. |
| `--theme`  | `auto`  | Palette selection — see the table below. |

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

The TUI reads `applications.md` or `data/applications.md`, plus `reports/`,
directly off disk. It does not write back except for explicit state changes
(e.g. status updates via `c`), which are persisted by re-writing the tracker
atomically. See `dashboard/internal/data/career.go` for the parsing and
serialization layer.
