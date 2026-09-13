---
id: rb-data-access-request
title: Data and share permission changes
url: https://example.internal/runbooks/data-access-request
taxonomy: data-access-request
updated_at: 2026-08-14
---
# Data and share permission changes

Use this runbook when access to a finance share is requested, when a permission change needs data-owner approval, or when access reviews revoke a share. High-risk flow: data-owner approval is mandatory.

The most common symptom is need finance share access with data-owner approval pending. Users also report share permission change stuck after the data-owner approval was granted and finance share access revoked during the quarterly review.

Steps:

1. Confirm the share path, the requested permission level, and the data-owner approval ticket reference.
2. Verify data-owner approval is recorded; without data-owner approval do not change the finance share.
3. Apply the share permission change in the access tool and confirm the user sees the finance share.
4. When a share permission change is stuck, force a permission sync and recheck within one hour.
5. If finance share access was revoked by review, require a fresh data-owner approval before restoring.
6. Record the data-owner approval, the share path, and the permission level in the ticket.

Common follow-ups: confirm group-based access instead of direct grants, confirm the data-owner approval covers subfolders, and confirm quarterly review dates.

Escalate to data governance when data-owner approval cannot be reached in two business days, when finance share access spans restricted data, or when a share permission change affects more than twenty users.

Keywords repeated for retrieval: finance share, data-owner approval, share permission, data access, permission change, access review, finance share access, data owner, share path, permission sync.
