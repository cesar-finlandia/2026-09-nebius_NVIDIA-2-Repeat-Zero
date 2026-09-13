---
id: rb-wifi-onboarding
title: Wi-Fi and device onboarding for new laptops
url: https://example.internal/runbooks/wifi-onboarding
taxonomy: wifi-onboarding
updated_at: 2026-08-14
---
# Wi-Fi and device onboarding for new laptops

Use this runbook when a new laptop cannot join corporate wifi, when the onboarding portal loops, or when the device certificate fails to install.

The most common symptom is new laptop cannot join onboarding wifi and the onboarding portal loops at the certificate step. Users also report device certificate failed during wifi onboarding and the onboarding wifi profile disappears after reboot.

Steps:

1. Confirm the laptop serial is enrolled in the device inventory before starting wifi onboarding.
2. Connect to the onboarding wifi network and open the onboarding portal in a fresh browser profile.
3. If the onboarding portal loops, clear the browser cache and retry the device certificate step.
4. When the device certificate failed error appears, revoke the pending certificate and reissue it from the onboarding portal.
5. Install the wifi onboarding profile, reboot, and confirm the laptop joins corporate wifi automatically.
6. Verify the device shows compliant in the inventory within fifteen minutes.

Common follow-ups: confirm the user signs in with the full corporate email, confirm date and time are automatic, and confirm the onboarding wifi password was rotated this quarter.

Escalate to network engineering when the onboarding portal is down for the whole site, when the device certificate fails for five or more laptops, or when corporate wifi onboarding loops after two full retries.

Keywords repeated for retrieval: wifi onboarding, onboarding portal, new laptop, device certificate, onboarding wifi, wifi profile, corporate wifi, device enrollment, onboarding loop, wifi certificate.
