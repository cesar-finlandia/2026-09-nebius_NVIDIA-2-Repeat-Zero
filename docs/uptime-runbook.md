# Uptime runbook

## Redeploy

1. `pnpm install --frozen-lockfile`
2. `npm run build:ui`
3. `await runDeploy("docker")` and record the new URL.

## Health confirmation

Run `curl -s $URL/healthz`. It must contain `ok` and a `nemotron` model id.

## Rollback

Run `await runRollback("docker")`, then re-run the smoke curl above.

## Weekly checks through 2026-12-15 20:00 UTC

| Done | Date | Owner | Result |
|---|---|---|---|
| [ ] | 2026-10-30 | on-call | pending |
| [ ] | 2026-11-06 | on-call | pending |
| [ ] | 2026-11-13 | on-call | pending |
| [ ] | 2026-11-20 | on-call | pending |
| [ ] | 2026-11-27 | on-call | pending |
| [ ] | 2026-12-04 | on-call | pending |
| [ ] | 2026-12-11 | on-call | pending |
| [ ] | 2026-12-15 | on-call | pending |
