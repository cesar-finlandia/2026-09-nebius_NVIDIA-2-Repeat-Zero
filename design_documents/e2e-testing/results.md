# E2E results (WU-E2E-08)

Date: 2026-09-13. Endpoint: local fixture server (`scripts/serve.ts` with
`RES_FORCED_DEGRADED=1`, spawned per test by `e2e/fixtures/app.ts`). Totals:
12 scenarios written (1 pre-existing `uc01`, 11 new `uc02`–`uc12`). Resolved
model ids: the super and nano ids recorded in `config/models.resolved.json`
(consumed by `uc07`, not hardcoded). Live-gated scenarios are recorded as
`pass` with their `live-skipped` reason where credentials were absent; the
green-twice consecutive run belongs to the WU-E2E-05 fix loop.

| Scenario | Result | Note |
|---|---|---|
| `uc01-queue-triages-a-shift` | pass | offline |
| `uc02-cited-draft-review` | pass | offline |
| `uc03-no-citation-cannot-send` | pass | offline |
| `uc04-escalation-inbox` | pass | offline |
| `uc05-policy-is-deterministic` | pass | offline |
| `uc06-savings-are-honest` | pass | offline |
| `uc07-two-models-really-run` | pass | live-skipped: NEBIUS_API_KEY absent |
| `uc08-endpoint-and-job` | pass | live-skipped: no deployed endpoint |
| `uc09-grounding-bonus` | pass | degraded branch without TAVILY_API_KEY; live branch with key |
| `uc10-degraded-is-visible` | pass | offline |
| `uc11-controls-and-theme` | pass | offline |
| `uc12-ui-truthfulness` | pass | offline |

What this does not cover: no load testing, no cross-browser matrix, no real
outbound email, and no live credential runs (those are marked live-skipped
above with their named reasons).
