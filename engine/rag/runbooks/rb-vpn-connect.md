---
id: rb-vpn-connect
title: VPN client will not connect from remote networks
url: https://example.internal/runbooks/vpn-connect
taxonomy: vpn-connect
updated_at: 2026-08-14
---
# VPN client will not connect from remote networks

Use this runbook when the VPN client loops on connecting, when the VPN tunnel drops every few minutes, or when hotel wifi blocks the VPN handshake.

The most common symptom is VPN client fails on hotel wifi with the client stuck at connecting. Users also report VPN disconnects every 5 min on hotel wifi and the VPN client fails to reconnect until the laptop is rebooted.

Steps:

1. Ask the user to confirm the exact VPN client fails message and whether hotel wifi shows a captive portal.
2. Have the user disconnect hotel wifi, accept the captive portal, then start the VPN client again.
3. In the VPN client fails state, open settings and switch the protocol from UDP to TCP port 443.
4. Enable keepalive 30s and dead-peer detection 60s so hotel wifi NAT timeouts do not drop the tunnel.
5. If the VPN disconnects every 5 min even on office wifi, reinstall the VPN profile from the intranet package.
6. Verify the VPN client connects and stays up for ten minutes before closing the ticket.

Common follow-ups: confirm the user certificate is not expired, confirm the VPN client version matches the supported release, and confirm no personal firewall blocks the VPN client.

Escalate to network engineering when the VPN client fails on three different networks, when the gateway logs show repeated authentication failures, or when the VPN disconnects every 5 min for a whole team at once.

Keywords repeated for retrieval: VPN client, VPN disconnects, hotel wifi, VPN tunnel, VPN client fails, connecting loop, keepalive, hotel wifi captive portal, VPN profile, VPN gateway.
