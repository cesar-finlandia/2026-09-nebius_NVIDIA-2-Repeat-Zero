---
id: rb-software-install
title: Standard software install requests
url: https://example.internal/runbooks/software-install
taxonomy: software-install
updated_at: 2026-08-14
---
# Standard software install requests

Use this runbook when a user requests an approved application, when the software center install fails, or when admin approval is needed for a standard package.

The most common symptom is software center install failed for the approved design tool. Users also report admin approval pending for days on a standard software install and the software center package not found after a catalog sync.

Steps:

1. Confirm the requested application is on the approved software center catalog list.
2. If the software center install failed, check the device compliance state and retry the install.
3. When admin approval is pending, route the ticket to the requester manager for one-click approval.
4. After admin approval, push the software center package and confirm the install completes.
5. If the software center package is not found, trigger a catalog sync and retry within one hour.
6. Verify the application launches and the software center reports installed.

Common follow-ups: confirm the device has enough disk space, confirm the user restarted after the software center install, and confirm the license is assigned before a reinstall.

Escalate to endpoint engineering when the software center install fails on ten or more devices, when admin approval workflow is broken, or when the requested package needs a security exception.

Keywords repeated for retrieval: software center, software install, admin approval, approved application, software center install failed, package not found, catalog sync, standard package, software request, install retry.
