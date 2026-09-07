# Phase 2 Operations and Privacy

## Product Boundaries

Phase 2 adds local preferences, shareable comparisons, calendar reminders, low-data behavior, and richer fan context. It does not require accounts, payments, public comments, betting, or persistent personal data.

## Local Preferences

- Favorites are stored only in the browser's local storage.
- The app must continue to work when storage is disabled, blocked, corrupt, or cleared.
- Users can remove a preference by toggling the relevant Follow control.
- Preferences do not determine server-side data correctness.

## Calendar Reminders

- Calendar export is user initiated.
- The generated event identifies Sepang Box Box as an unofficial fan project.
- Users should confirm current venue information before travel.
- The app does not send reminders or collect contact information through calendar export.

## Low-Data Mode

- Low-data mode is optional and stored locally.
- It is an optimization preference, not an offline guarantee.
- Cached or previously loaded data must not be represented as current live data.
- Weather and session state remain dependent on current upstream availability.

## Shareable URLs

- Comparison parameters must be validated against the current standings list.
- Shared pages must work without the sender's local preferences.
- Copy-link failure is non-blocking and should not prevent comparison use.
- Canonical metadata must use `NEXT_PUBLIC_SITE_URL` in production.

## Race-Weekend Checks

Before each race weekend:

1. Run `npm run verify:phase1`.
2. Run `npm run verify:phase2`.
3. Check comparison links with valid and invalid driver IDs.
4. Test Follow controls with storage disabled.
5. Test calendar export on a supported desktop and mobile browser.
6. Test low-data mode on home, schedule, standings, and Sepang pages.
7. Verify current session and weather provenance remain visible.

## Incident Handling

### Local storage failure

Treat as a client-only preference failure. Do not show an error page. Keep core data and navigation usable.

### Clipboard failure

Leave the comparison page usable. The user can copy the URL from the browser manually.

### Calendar download failure

Leave the schedule usable and retain the normal session links. Do not retry repeatedly or request additional permissions.

### Stale or unavailable data

Use the existing fallback and provenance rules. Local preferences and share controls must never hide an unavailable-data explanation.

## Privacy Review

- No account is required.
- No email address, ticket data, or location data is collected.
- Notification permission is not requested by the current Phase 2 MVP.
- Local preference keys are documented and non-sensitive.
- Any future analytics must be asynchronous, minimal, and separately reviewed.
