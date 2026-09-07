# Phase 3 Operations and Scalability

## Scope

Phase 3 centralizes provider access behind the F1 gateway while preserving the current server-rendered and snapshot-first architecture. It does not introduce accounts, a database, or a paid live-timing provider by default.

## Gateway Responsibilities

- Normalize provider responses before UI consumption.
- Apply timeouts and runtime checks through the provider modules.
- Return source, origin, quality, timestamp, and warnings.
- Keep provider-specific behavior out of route components.
- Preserve fallback and unavailable states when providers fail.

## Operational Checks

Before a race weekend:

1. Run `npm run verify:phase1`.
2. Run `npm run verify:phase2`.
3. Run `npm run verify:phase3`.
4. Run `npm run verify:apis` manually before deployment or after an upstream change.
5. Confirm provider rate limits and current terms.
6. Confirm the production site URL and error monitoring.
7. Confirm schedule and historical snapshots are present.

## Provider Outage

The intended response is graceful degradation:

- Schedule uses the validated committed snapshot.
- Historical pages use committed data where available.
- Standings and newly published results show an unavailable or delayed state.
- Weather is treated as an enhancement and does not block core pages.
- The UI must never substitute stale provider data without a visible provenance label.

Record the provider, endpoint, timestamp, user-visible impact, and recovery time in the incident log.

## Capacity and Rate Limits

Monitor:

- Route response time.
- Provider request volume.
- Provider latency and timeouts.
- Fallback frequency.
- Data freshness.
- Build and deployment failures.

Do not add client-side polling or a new provider without checking the request budget and cache behavior.

## Live-Data Decision Gate

The current source remains classification-only. A richer live provider requires separate approval for:

- Redistribution rights.
- Cost and rate limits.
- Historical replay fixtures.
- Adapter and capability tests.
- Reconnect and backpressure behavior.
- User-visible fidelity and freshness labels.

If any requirement is unresolved, retain the classification-only experience.

## Security and Privacy

- Provider credentials must remain server-side.
- Do not log raw provider payloads unnecessarily.
- Do not expose debug or operator controls publicly.
- Keep local user preferences separate from gateway data.
- Any durable cache or user data requires a separate retention and access review.

## Release and Rollback

- Deploy gateway changes through the normal CI checks.
- Run Phase 1, Phase 2, and Phase 3 verification gates.
- Test the dead-host fallback build before release.
- Keep the previous deployment available for rollback.
- If the gateway causes a data regression, disable the affected route/provider path and restore the previous deployment rather than applying an unreviewed live fix.
