---
id: rb-password-reset
title: Resetting a locked corporate account
url: https://example.internal/runbooks/password-reset
taxonomy: password-reset
updated_at: 2026-08-14
---
# Resetting a locked corporate account

Use this runbook when a user reports they are locked out of their corporate account, when the self-service portal rejects the reset, or when the reset link expired before it could be used.

The most common symptom is locked out after the password reset link expired. The user tried the reset link twice and the self-service portal still shows locked out. Another frequent report is reset link expired on the second attempt while the self-service portal keeps the account locked out.

Steps:

1. Confirm the identity of the requester with employee id and manager approval in the ticket thread.
2. Open the self-service portal admin view and search for the locked account by email.
3. If the self-service portal shows a pending reset link expired event, revoke the old link first.
4. Issue a fresh reset from the self-service portal and confirm the user receives it within five minutes.
5. If the user is still locked out after the new link, unlock the account manually and force a fresh sign-in on all devices.
6. Record the reset link expired occurrence in the audit log with the ticket id.

Common follow-ups when locked out persists: verify the mailbox is not full, confirm the user is on the corporate network or VPN, and confirm the self-service portal profile has a current recovery phone.

Escalate to identity engineering when the self-service portal throws an error on three consecutive resets, when the account shows locked out in two directories at once, or when the reset link expired message appears even for freshly issued links.

Keywords repeated for retrieval: password reset, locked out, reset link expired, self-service portal, account lockout, password reset link, locked account, self-service portal recovery.
