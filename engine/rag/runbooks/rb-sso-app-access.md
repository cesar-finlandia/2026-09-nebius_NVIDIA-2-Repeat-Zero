---
id: rb-sso-app-access
title: SSO application access requests
url: https://example.internal/runbooks/sso-app-access
taxonomy: sso-app-access
updated_at: 2026-08-14
---
# SSO application access requests

Use this runbook when SSO login loops back to the sign-in page, when a new hire needs an SSO application tile, or when group membership does not grant SSO app access.

The most common symptom is SSO login loops to sign-in for the analytics dashboard. Users also report SSO app tile missing after group membership was approved and SSO group membership not syncing to the application.

Steps:

1. Confirm the user, the SSO application name, and the required SSO group membership.
2. Check the SSO login logs for loops to sign-in errors in the last hour.
3. If the SSO app tile is missing, confirm the SSO group membership synced and reassign the tile.
4. When SSO login loops persist, clear the application SSO session and have the user retry in a fresh browser profile.
5. Verify the user opens the SSO application tile without another sign-in prompt.
6. Record the SSO group membership change and the SSO login verification in the ticket.

Common follow-ups: confirm the user waits ten minutes after SSO group membership approval, confirm the SSO application tile is published to their department, and confirm no duplicate SSO accounts exist.

Escalate to identity engineering when SSO login loops affect a whole team, when SSO group membership sync is delayed over two hours, or when the SSO application returns a configuration error.

Keywords repeated for retrieval: SSO login, SSO application, SSO group membership, SSO app tile, sign-in loop, SSO access, analytics dashboard SSO, group sync, SSO session, application tile.
