# Sepang Box Box

A realtime F1 companion for the **2026 Bahrain Grand Prix in Malaysia** at
Sepang International Circuit, 2–4 October 2026 — Formula 1's first visit to
Sepang since 2017.

Standings, the weekend schedule in Malaysia Time, session timing, race and
qualifying results, and a driver head-to-head. Mobile-first, no accounts.

> Unofficial fan project. Not affiliated with Formula 1, the FIA, or Formula
> One Licensing B.V.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run verify:apis` | Contract test against the live upstream APIs |
| `npm run snapshot:sepang` | Regenerate the committed Sepang schedule fallback |

## Environment

Everything runs with no configuration. All four variables are optional.

| Variable | Default | Purpose |
|---|---|---|
| `OPENF1_API_KEY` | unset | Switches live timing on. Without it the app uses post-session classifications. |
| `JOLPICA_BASE_URL` | `https://api.jolpi.ca/ergast/f1` | Override the standings/schedule API. Point it at a dead host to exercise the fallback paths. |
| `OPENF1_BASE_URL` | `https://api.openf1.org/v1` | Override the live timing API. |

## Data sources

**Jolpica-F1** (`api.jolpi.ca`) — standings, schedule, race and qualifying
results. Free, no auth, 4 req/s and 500 req/hour. Pages revalidate every five
minutes, so a deployed instance makes roughly a dozen requests an hour
regardless of traffic.

**OpenF1** (`api.openf1.org`) — live session data. **Paid.** The free tier is
not a usable fallback: while any F1 session is running anywhere in the world it
returns `401` for *every* endpoint, including historical data from 2023. That
is precisely when this app matters, so live timing is all-or-nothing.

## How live timing is wired

Every number on `/live` arrives through the `LiveTimingSource` interface in
[`src/lib/f1/sources/`](src/lib/f1/sources/). The UI does not know which source
it is drawing.

- **`jolpica.source.ts`** — free, always available. Official classifications
  published after each session. Cannot show a car moving; what it shows is
  correct.
- **`openf1.source.ts`** — live, needs `OPENF1_API_KEY`.

Each source declares a `fidelity` and a `SourceCapabilities` record, and the UI
reads capabilities — not null values — to decide what to render. A source that
cannot report tyres hides the column; one that can, but has not yet, shows a
dash. Those are different states and the reader can tell them apart.

Adding the key is the only change needed to go live.

### `openf1.source.ts` is unverified

It has never run against the real API, because there is no way to exercise it
without paying. The auth header in particular is a guess. Before trusting it on
a race weekend, confirm the header and the field names on `/position`,
`/intervals`, `/laps`, `/stints`, `/pit`, `/race_control` and `/weather`.

Its per-endpoint cache windows are load-bearing, not politeness: the sponsor
tier allows 60 requests/minute and polling all seven endpoints at 5s would be
84/minute and would be throttled mid-race.

## Degrading gracefully

The schedule is the most important thing this app shows during race week, and
it is fixed, so a snapshot of it is committed at
[`src/lib/f1/sepang.static.json`](src/lib/f1/sepang.static.json). If Jolpica is
unreachable the times still render — the page just says where they came from.

Standings deliberately have **no** snapshot. They change through the season, so
stale points would be worse than an honest "unavailable".

To exercise all of this:

```bash
JOLPICA_BASE_URL=http://127.0.0.1:9 npm run build
```

Every page must still render. None may be empty, and none may invent data.

## Notes for anyone editing this

- **Design tokens live only in [`src/app/globals.css`](src/app/globals.css).**
  Never write a hex value in a component. The system is documented in
  [`docs/design.md`](docs/design.md).
- **Times are always Malaysia Time.** Everything user-facing goes through
  [`src/lib/f1/time.ts`](src/lib/f1/time.ts), which uses `Intl` with
  `Asia/Kuala_Lumpur` — never a hardcoded +8.
- **Components must not call `Date.now()`.** React purity forbids it. The clock
  reading is taken in the data layer and travels on `WithOrigin.fetchedAtMs`,
  so every row on a page agrees on what "now" means.
- **Do not add a `loading.tsx` above a route that can call `notFound()`.** A
  Suspense boundary makes Next stream the response, which commits HTTP 200
  before the body runs — silently turning a 404 into a 200. See the note in
  [`src/components/ui/Skeleton.tsx`](src/components/ui/Skeleton.tsx).
- Run `npm run verify:apis` before shipping. It asserts the Sepang round still
  resolves to `sepang`, still starts 15:00 MYT, and still has no sprint — the
  upstream changes that would quietly break the schedule.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript. Deploys to
Vercel; no database, no accounts, no backend of its own.
