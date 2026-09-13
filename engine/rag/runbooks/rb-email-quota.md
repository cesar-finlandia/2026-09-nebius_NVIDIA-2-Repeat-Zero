---
id: rb-email-quota
title: Mailbox quota and mail sync failures
url: https://example.internal/runbooks/email-quota
taxonomy: email-quota
updated_at: 2026-08-14
---
# Mailbox quota and mail sync failures

Use this runbook when the mailbox is over quota, when mail sync fails on mobile, or when the archive policy blocks new mail.

The most common symptom is mailbox over quota with mail sync failing on the phone. Users also report archive policy blocked new mail after the mailbox over quota warning and mail sync error 0x8004010F in Outlook.

Steps:

1. Check the mailbox over quota usage in the admin console and confirm the quota limit.
2. Ask the user to empty deleted items and confirm the mailbox over quota percentage drops.
3. If mail sync still fails, remove and re-add the mobile mail sync profile.
4. When the archive policy blocked mail, run the archive job manually and confirm new mail flows.
5. For Outlook mail sync error cases, rebuild the local cache file and resync.
6. Confirm the mailbox is under quota and mail sync works on both desktop and phone.

Common follow-ups: confirm retention holds are not keeping the mailbox over quota, confirm the archive policy schedule, and confirm mail sync is not blocked by an old password.

Escalate to messaging engineering when the mailbox over quota flag is wrong, when mail sync fails for a whole department, or when the archive policy job errors three days in a row.

Keywords repeated for retrieval: mailbox over quota, mail sync, archive policy, mailbox quota, mail sync failing, quota warning, Outlook sync error, archive job, mailbox full, mail flow.
