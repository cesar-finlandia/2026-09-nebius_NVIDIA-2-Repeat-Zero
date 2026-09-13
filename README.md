# RepeatZero — cited repeat-ticket triage

## Prerequisites
- Node 20 (see `.nvmrc`)
- Python 3 (see `.python-version`)

## Environment
- `NEBIUS_API_KEY` — required at runtime, get via Token Factory promo form
- `NEBIUS_BASE_URL` — default `https://api.tokenfactory.us-central1.nebius.com/v1/`
- `TAVILY_API_KEY` — required for bonus, absent means grounding returns `[]` and everything escalates
- `RES_FORCED_DEGRADED=1` — offline mode
- `DEPLOY_PROVIDER=docker` — Nebius Serverless Endpoint image
- `REPEATZERO_LEDGER_PATH` — default `artifacts/cost-store.json`
Do not commit secrets.

## Install
```
npm ci
pip install -e .
```

## Offline (no keys)
```
RES_FORCED_DEGRADED=1 npm run golden:path
```
Works with zero credentials.

## Live run
Requires both keys.
```
npm run triage:demo
```

## Deploy
```
DEPLOY_PROVIDER=docker npm run deploy
```

## Nightly job
```
npm run reindex:job
```

## Models
Nemotron 3 Super nvidia/nemotron-3-super-120b-a12b for classification and cited drafting; Nemotron 3 Nano nvidia/nemotron-3-nano-30b-a3b for pings and follow-ups; Nebius Token Factory OpenAI-compatible chat-completions API; Nebius Serverless Endpoint; Nebius Serverless Job; functional runtime Tavily call.

## Unit economics (local estimate, not billing)
- tickets: 0 (local estimate, not billing)
- auto_sent: 0 (local estimate, not billing)
- escalated: 0 (local estimate, not billing)
- deflection_rate: 0 (local estimate, not billing)
- usd_per_ticket: 0 (local estimate, not billing)
- hours_saved: 0 (local estimate, not billing)

Demo: https://demo.example.invalid (live and free through judging)
Repo: https://github.com/example/repeatzero

Submission deadline: 2026-10-30 17:00 UTC (10:00 PDT).
