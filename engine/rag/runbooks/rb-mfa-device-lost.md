---
id: rb-mfa-device-lost
title: MFA device lost or replaced
url: https://example.internal/runbooks/mfa-device-lost
taxonomy: mfa-device-lost
updated_at: 2026-08-14
---
# MFA device lost or replaced

Use this runbook when a user loses the phone with the authenticator, when MFA push never arrives, or when a replacement device needs enrollment. High-risk flow: verify identity over two channels before any MFA reset.

The most common symptom is lost phone with authenticator and MFA push never arrives on the replacement. Users also report new phone needs MFA enrollment after the old device was lost with the authenticator still registered.

Steps:

1. Verify identity over two channels: employee id plus manager confirmation in the ticket. Never reset MFA on a single email request.
2. Confirm the lost phone with authenticator is reported and suspend its sessions.
3. Revoke the old MFA device registration so the lost phone with authenticator cannot approve sign-ins.
4. Enroll the new phone with a fresh MFA enrollment link valid for fifteen minutes.
5. Confirm MFA push arrives on the replacement and the user completes a test sign-in.
6. Record the MFA device lost event with ticket id and verifier names. This stays a human-handled case even when the steps match.

Common follow-ups: confirm backup codes are stored, confirm the old device is wiped remotely, and confirm MFA push is allowed through the phone firewall.

Escalate to identity security when the user cannot complete two-channel verification, when MFA push is approved from an unknown location, or when the lost phone with authenticator is later found and reused.

Keywords repeated for retrieval: MFA device, lost phone, authenticator, MFA push, MFA enrollment, replacement device, MFA reset, two-channel verification, backup codes, MFA registration.
