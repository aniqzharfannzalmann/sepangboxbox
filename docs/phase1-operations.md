# Phase 1 Race-Weekend Operations

## Purpose

This runbook supports the race-weekend experience without implying official affiliation or live-timing access. It covers session state, weather, results, venue guidance, and common degraded states.

## Source Boundaries

- Jolpica-F1 supplies schedule, standings, and published classifications.
- Open-Meteo supplies forecast and weather context.
- Committed snapshots supply schedule and historical fallback data.
- The app does not provide second-by-second timing, ticket sales, hospitality access, or official venue instructions.

## Pre-Weekend Checklist

- Verify `npm run verify:phase1` passes.
- Verify `npm run verify:apis` manually before launch and after upstream changes.
- Confirm the 2026 schedule and Sepang round identity.
- Check Malaysia Time formatting on schedule, countdowns, and results.
- Check all official venue and ticket links used by editorial content.
- Review hospitality and transport copy for expiration or changed policies.
- Confirm `NEXT_PUBLIC_SITE_URL` is set in production.
- Confirm error monitoring and uptime monitoring are active.
- Confirm one primary and one backup operator are available during sessions.

## Session-Day Checks

Before each session:

- Confirm the expected session label and start time.
- Confirm the next-session countdown.
- Confirm weather provenance: forecast or historical.
- Confirm the live page states that classification data is post-session.
- Check the home page, `/live`, `/schedule`, and `/sepang` on a mobile viewport.

After each session:

- Check whether classification data has appeared.
- Confirm provisional wording where applicable.
- Confirm result links and standings freshness.
- Check the next session countdown.
- Record any upstream delay or mismatch in the incident log.

## Incident Handling

### Schedule unavailable

Expected response: the app displays the committed schedule snapshot with a visible warning. Do not manually replace the snapshot during a live session unless the published schedule has materially changed and the snapshot script has been reviewed.

### Classification delayed

Expected response: keep the session state visible and explain that official classification has not been published. Do not label the page as final and do not invent timing rows.

### Weather unavailable

Expected response: retain the schedule, timing, and venue guide. Remove or label the weather panel as temporarily unavailable. Historical context may remain if it is clearly labeled as historical.

### Incorrect venue information

1. Verify the official source.
2. Remove or correct the affected statement.
3. Record the correction time and source.
4. Deploy the smallest safe change.
5. Review related transport, access, and hospitality copy.

### Traffic spike or elevated latency

1. Check route response time and error rate.
2. Check upstream request failures and cache behavior.
3. Avoid unnecessary deployments during the session.
4. Preserve the static schedule and circuit content.
5. If required, disable non-essential enhancements while retaining session status and results.

## User-Facing Principles

- State what is known.
- State what is estimated.
- State what is unavailable.
- State whether data is live, post-session, provisional, forecast, historical, or fallback.
- Link to official venue information for tickets, entry, transport, facilities, and hospitality.
- Never imply affiliation with Formula 1, the FIA, the circuit operator, or hospitality providers.
