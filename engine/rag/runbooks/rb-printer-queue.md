---
id: rb-printer-queue
title: Printer and print queue failure recovery
url: https://example.internal/runbooks/printer-queue
taxonomy: printer-queue
updated_at: 2026-08-14
---
# Printer and print queue failure recovery

Use this runbook when print jobs stall in the queue, when the office printer shows offline, or when the print spooler crashes on Windows.

The most common symptom is print jobs stuck in queue with the office printer showing offline. Users also report print spooler crashes when printing PDFs and the print queue paused after a driver update.

Steps:

1. Ask the user for the printer name and confirm the office printer is powered and on the network.
2. Open the print server view and check whether print jobs stuck in queue affects one user or the whole floor.
3. If the print queue is paused, resume it and restart the print spooler service on the print server.
4. When the print spooler crashes on the laptop, clear the local spool folder and reinstall the office printer driver.
5. Reprint a test page; confirm the print queue drains within two minutes.
6. Record the driver version and the print jobs stuck in queue count in the ticket.

Common follow-ups: confirm the user prints to the correct office printer and not a home printer, confirm the paper tray is not empty, and confirm the print queue driver matches the printer model.

Escalate to facilities IT when the office printer hardware fails self-test, when print jobs stuck in queue persists after a spooler restart, or when three or more printers show offline at once.

Keywords repeated for retrieval: print queue, print jobs stuck in queue, office printer, print spooler, printer offline, print spooler crashes, printer driver, print server, print queue paused, test page.
