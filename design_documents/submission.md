# RepeatZero

Cited repeat-ticket triage for internal IT leads.

---

# Track: Best Apps and Agents

A triage tool an internal IT lead would use daily, inside the chat workflow they already live in.

---

# What it does

- classify repeat-vs-novel
- ground repeat candidates with live web search
- draft cited resolution
- deterministic policy gate auto-send vs escalate

---

# How we built it

Nemotron 3 Super nvidia/nemotron-3-super-120b-a12b for classification and cited drafting; Nemotron 3 Nano nvidia/nemotron-3-nano-30b-a3b for pings and follow-ups; Nebius Token Factory OpenAI-compatible chat-completions API; Nebius Serverless Endpoint; Nebius Serverless Job; functional runtime Tavily call.

---

# Token Factory acceleration

One OpenAI-compatible endpoint let a heavy reasoner and a cheap model share a code path, so routing became a config value rather than a second integration.

---

# Non-obvious use

Reasoning-budget routing plus no-citation-no-send: the model proposes, a deterministic policy engine disposes.

---

# Unit economics

- tickets: 0 (local estimate, not billing)
- auto_sent: 0 (local estimate, not billing)
- escalated: 0 (local estimate, not billing)
- deflection_rate: 0 (local estimate, not billing)
- usd_per_ticket: 0 (local estimate, not billing)
- hours_saved: 0 (local estimate, not billing)

---

# Tavily bonus

Functional runtime POST https://api.tavily.com/search with TAVILY_API_KEY; 2 citations on the example query "vpn client error 629 fix".

---

# Uniqueness vs entry 1

Different product (repeat-ticket triage vs merge-readiness), different track, different repository, different video, different evidence trail. The multiple-submission rule allows two entries only if each is unique and substantially different.

---

# Feedback

## Token Factory

The Token Factory OpenAI-compatible endpoint let one code path serve both the Super reasoner and the Nano pinger; model choice stayed a config value.

## Nebius AI Cloud

Nebius AI Cloud hosting keeps the demo URL live and free through judging with the same container image validated locally.

## NVIDIA models

Nemotron 3 Super handles classification and cited drafting while Nemotron 3 Nano handles short pings; the policy gate decides sends, never the model.

---

# Demo and repo

Demo: https://demo.example.invalid (live and free through judging)
Repo: https://github.com/example/repeatzero

Submission deadline: 2026-10-30 17:00 UTC (10:00 PDT).
