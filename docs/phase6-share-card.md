# Phase 6 Shareable Result Card

## Scope

The result card is a server-generated 1200x630 PNG for completed race results. It is suitable for Open Graph previews, WhatsApp/X link previews, and browser download. Instagram sharing uses download or the native share sheet where supported.

## Data Rules

- Race results come through the normalized gateway.
- The card uses the schedule's canonical circuit name.
- Winner and podium require classified numeric positions.
- Fastest lap is shown only when a valid lap time is present.
- Biggest mover requires valid grid and finish positions.
- The card always carries the unofficial-project and Jolpica-F1 disclaimer.
- Missing data produces an honest unavailable section; it is never invented.
- The status label has three states, never two. A round with no classified
  finisher is `unpublished` and reads RESULT NOT PUBLISHED YET; a round
  classified within the last 60 minutes is `provisional`; only a settled
  classification is `official`. The 60-minute window is
  `isClassificationProvisional`, shared with the live view.

## Performance

- The image route is server-only and revalidates every five minutes.
- Result fetching uses the existing Next/server fetch cache.
- The result page does not fetch the image during normal rendering.
- Social crawlers and downloads reuse the cached image route.
- Card failures do not prevent the text result page from rendering.

## Race-Finish Checklist

1. Run `npm run verify:phase6`.
2. Open a completed `/results/[round]` route.
3. Confirm the share action and download link.
4. Open `/results/[round]/share-image` directly.
5. Confirm winner, podium, fastest lap, biggest mover, circuit and disclaimer.
6. Check Open Graph and Twitter metadata.
7. Test a missing-result round and an invalid round. A round that has not run
   must not claim an official classification, and `/results/<unknown>` must
   answer 404 — run `npm run verify:routing`.
8. Test provider failure and confirm the result page remains available.
