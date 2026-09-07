# Phase 4 Editorial Operations

## Scope

Phase 4 adds deterministic, data-backed "What to watch" context before sessions and session recaps after published classifications. The features do not provide live commentary and do not replace official results.

## Before a Session

- Confirm the current session and next session.
- Confirm driver and constructor standings freshness.
- Label weather as forecast or historical context.
- Label sprint-weekend context only when a sprint exists in the schedule.
- Avoid unsupported predictions or championship claims.

## After a Session

- Race and sprint recaps use their matching result endpoint.
- Qualifying recaps identify the pole sitter, not a race winner.
- Practice sessions remain unavailable when the current source publishes no official classification.
- Provisional classifications must remain labeled provisional.
- Biggest movers require valid numeric grid and finish positions.
- Championship points language must be based only on available result data.

## Data Failure

Editorial cards must not block the schedule, timing or results page. If standings, weather or classification data is missing, show the available content and a concise warning. Never render an empty card or infer missing values.

## Content Review

Review the generated copy for:

- Factual driver and constructor names.
- Correct session labels.
- Historical versus predictive weather wording.
- Provisional versus official status.
- Correct next-session links.
- No implication of official F1, FIA or circuit affiliation.

## Race-Weekend Checklist

1. Run `npm run verify:phase4`.
2. Run the Phase 1, Phase 2 and Phase 3 verification scripts.
3. Review the home-page pre-session context.
4. Review a qualifying recap and a race recap fixture.
5. Review a provisional classification.
6. Confirm unavailable practice behavior.
7. Confirm API failure does not produce empty editorial cards.
