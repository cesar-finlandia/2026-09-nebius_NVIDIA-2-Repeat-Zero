---
id: rb-security-incident
title: Suspected security incident triage
url: https://example.internal/runbooks/security-incident
taxonomy: security-incident
updated_at: 2026-08-14
---
# Suspected security incident triage

Use this runbook when phishing, malware, or impossible-travel sign-ins are suspected. High-risk flow: isolate first, then investigate. Never auto-send user-facing fixes for a suspected incident.

The most common symptom is clicked phishing link with a credential prompt and impossible-travel sign-in within minutes. Users also report malware alert on the laptop after the phishing click and suspicious mailbox rules created after the credential prompt.

Steps:

1. Tell the user to stop using the device and keep it powered on for forensics.
2. Confirm the phishing link URL, the credential prompt details, and any impossible-travel sign-in timestamps.
3. Force a password reset and revoke sessions when a credential prompt was submitted after the phishing click.
4. Quarantine the device in the endpoint tool when a malware alert fired.
5. Review sign-in logs for impossible-travel sign-in and block the source addresses.
6. Hand the case to the security on-call with the phishing link, credential prompt evidence, and impossible-travel sign-in timeline. This stays a human-handled case.

Common follow-ups: confirm mailbox rules are cleaned, confirm the phishing link is reported to filtering, and confirm the user completes refresher training.

Escalate immediately to security on-call for every suspected incident: clicked phishing link, credential prompt submitted, malware alert, or impossible-travel sign-in.

Keywords repeated for retrieval: phishing link, credential prompt, impossible-travel sign-in, malware alert, security incident, suspicious mailbox rules, quarantine device, revoke sessions, forensics, security on-call.
