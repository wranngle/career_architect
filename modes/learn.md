# Modo: learn — Outcome-based scoring calibration

The "feedback loop" half of the system. After the user marks applications
as Applied, Interview, Offer, or Rejected in `data/applications.md`, this
mode reads the outcomes alongside the original reports' Block H 10-dim
scores and produces a calibration insight: "your weight on tech_stack_overlap
is overcontributing — the dimensions that actually predicted Interview /
Offer were comp and mission_fit."

## When to run

After ~10+ applications have terminal states (Interview / Offer / Rejected /
Ghosted). Less than that and the signal is too noisy.

```
/career-ops learn
```

## Routine

### Paso 1 — Pull outcomes
Read `data/applications.md`. Group by status:
- POSITIVE: Interview, Onsite, Offer
- NEGATIVE: Rejected, Ghosted
- NEUTRAL: Evaluated, Applied, Screen (too early to call)

### Paso 2 — Pull score breakdowns
For each application with a report link, read the report's Block H JSON.
Extract the per-dimension scores.

### Paso 3 — Correlate
For each of the 10 dimensions, compute:
- Mean dimension score for POSITIVE outcomes
- Mean dimension score for NEGATIVE outcomes
- Predictive lift: (POS_mean - NEG_mean) / NEG_mean
- Direction: dimensions with positive lift were predictive of success;
  near-zero lift = noise; negative lift = anti-predictive

### Paso 4 — Suggest weight adjustments
Output a calibration table:

```markdown
| Dimension | Current weight | POS mean | NEG mean | Lift | Suggested weight |
|---|---|---|---|---|---|
| role_match | 0.20 | 4.6 | 4.2 | +9% | 0.20 (keep) |
| comp | 0.10 | 4.8 | 3.5 | +37% | 0.18 (raise) |
| tech_stack_overlap | 0.15 | 4.0 | 4.1 | -2% | 0.05 (drop hard) |
| ...
```

Re-normalize so weights sum to 1.0.

### Paso 5 — Write proposal
Save calibration to `data/calibration-{YYYY-MM-DD}.md` with:
- The table above
- Plain-English summary: "Your scoring undervalues comp and overvalues tech
  stack — three of your last five rejections were high-stack-match,
  low-comp roles. Consider raising comp weight."
- A YAML snippet ready to paste into `config/profile.yml`:
  ```yaml
  scoring_weights:
    role_match: 0.20
    comp: 0.18
    tech_stack_overlap: 0.05
    ...
  ```

### Paso 6 — Never auto-apply
Calibration is a SUGGESTION. The user reviews and decides whether to
update `config/profile.yml`. Do NOT silently change weights.

## Edge cases

- **Sample too small** (< 10 terminal outcomes): print warning, do NOT
  produce calibration. Recommend more data first.
- **All outcomes one direction** (all rejected, no interviews): can't
  compute lift. Suggest user broaden filters or revisit profile.
- **Missing Block H** in old reports: skip those rows, note in output
  how many were excluded.
