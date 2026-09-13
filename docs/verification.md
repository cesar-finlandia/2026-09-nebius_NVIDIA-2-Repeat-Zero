# Verification

Run every check in this order. Each command has its literal expected line.

## 1. Offline golden path

```
RES_FORCED_DEGRADED=1 bash scripts/golden-path.sh
```

Expected: `golden-path: 20/20 tickets completed, 0 exceptions`

## 2. Classifier eval

```
npx vite-node scripts/run-eval.ts --config config/eval.repeatzero.json
```

Expected: `eval: 20/20 correct, high-risk false-repeat 0, PASS` (live) or at minimum 17/20 with `PASS`.

## 3. Forbidden-name guard

```
npx vite-node scripts/check-forbidden-names.ts
```

Expected: `forbidden-names: 0 hits`

## 4. Mandatory terms

```
npx vite-node scripts/check-secrets.ts --mandatory-terms
```

Expected: `mandatory-terms: 4/4 present in both files`

## 5. Secret scan

```
npx vite-node scripts/check-secrets.ts
```

Expected: `secret-scan: 0 hits, .env ignored`

## 6. Typecheck

```
npx tsc --noEmit
```

Expected: exit 0. If the generated barrel references `./cost/index.js`, delete exactly that line in `src/index.ts`.

## 7. Envelope replay

```
npm run mock:publish -- --file fixtures/envelopes.golden.json
```

Expected: `replay: 9 envelopes rendered` (or N matching the recorded file length).

## 8. Doctor

```
npx vite-node src/dev-tooling/doctor/cli.ts --config config/track.json
```

Expected: `doctor: env ok, models reachable (2 models)` or offline `doctor: models unreachable (degraded)`.

## 9. Track

```
npx vite-node src/dev-tooling/track/cli.ts --config config/track.json
```

Expected: `track: 14/14 plans reported`
