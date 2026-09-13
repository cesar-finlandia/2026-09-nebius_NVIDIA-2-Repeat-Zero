# RepeatZero — demo video script (stage fallback, superseded by DP-SCRIPT for submission)

Target 170s — hard cap 180s

| t | on screen | audio must say |
|---|---|---|
| 0:00–0:15 | The live queue at `http://127.0.0.1:8787`; a real ticket `T-0007` arrives with subject visible. No title card. | RepeatZero triages repeat IT tickets for support leads: it finds the known fix, cites it, and either sends or escalates. [MANDATORY: product] |
| 0:15–0:50 | The trace timeline: `retrieve` → `classify` → `ground` chips turning green; top runbook id visible; Tavily result snippets appearing. | Nemotron 3 Super on Nebius Token Factory classifies the ticket [MANDATORY: Token Factory + Nemotron family]; a live Tavily call grounds it [MANDATORY: Tavily] — every claim links to a source. |
| 0:50–1:25 | The draft review pane with two visible citations, then the Approve click and the `dispatch` event. | No citation, no send — a deterministic policy engine decides, not the model. Confidence 0.91 clears 0.85, risk is low, two citations present, so it auto-sends. |
| 1:25–1:50 | A second ticket `T-0018` (novel VPN case) escalating with full context bundle: classification, candidates, empty citations. | This escalation is the product working. Novel means no runbook, so it escalates with everything the human needs — nothing was guessed. |
| 1:50–2:20 | The savings dashboard from `GET /api/savings`: deflection rate, USD per ticket, hours saved. | Our estimate: about 40 percent deflection saves roughly 12 minutes per ticket — figures from the local ledger snapshot, quoted as estimates. |
| 2:20–2:45 | The deployed URL panel plus the nightly job log line `reindex: 12 docs, 340 terms`. | Served on a Nebius Serverless Endpoint, re-indexed nightly by a Nebius Serverless Job [MANDATORY: Nebius Serverless]. |
| 2:45–2:50 | Close card: repo URL, `Apache-2.0`, track name. | Code, Apache-2.0 license, and run guide are in the repo. RepeatZero for Best Apps and Agents. |

## Audio (full paragraphs)

Beat 1: RepeatZero triages repeat IT tickets for support leads. It finds the known fix, cites it, and either sends the reply or escalates with full context.

Beat 2: Nemotron 3 Super on Nebius Token Factory classifies the ticket, and a live Tavily call grounds it. Every claim links to a source you can open.

Beat 3: No citation, no send. A deterministic policy engine decides, not the model. Confidence clears the threshold, risk is low, citations are present, so it auto-sends.

Beat 4: This escalation is the product working. A novel ticket means no runbook matches, so it escalates with everything the human needs. Nothing was guessed.

Beat 5: Our estimate from the local ledger snapshot: about 40 percent deflection, about 12 minutes saved per ticket, USD per ticket from the savings endpoint. All quoted as estimates.

Beat 6: Served on a Nebius Serverless Endpoint and re-indexed nightly by a Nebius Serverless Job. The same container image validated locally runs the demo.

Beat 7: Code, Apache-2.0 license, and run guide are in the repo. RepeatZero for Best Apps and Agents.
