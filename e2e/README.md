# E2E

Browser scenarios run against the real server. Offline scenarios need no
credentials (`RES_FORCED_DEGRADED=1`); live scenarios need `NEBIUS_API_KEY`
and `TAVILY_API_KEY` and degrade to `live-skipped` without them.

Run:

```
npx playwright test -c e2e/playwright.config.ts
```

Smoke (also used as the deploy gate):

```
BASE_URL=<url> npx playwright test -c e2e/playwright.config.ts smoke
```

Expected: `smoke-ok <url> <n> <m>`.
