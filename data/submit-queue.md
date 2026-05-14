# Submit Queue

Entries promoted from `data/pipeline.md` once they cross the
`queue-applications.mjs --threshold` cutoff. Each row carries a normalized
score (0-100) and the path to a pre-generated CV PDF, ready for the operator
to submit. Populated by:

```
node queue-applications.mjs --threshold 80
```

## Queued
