# Sepang Box Box

A companion for the **2026 Bahrain Grand Prix in Malaysia** at Sepang
International Circuit, 2–4 October 2026 — Formula 1's first visit to Sepang
since 2017.

The weekend schedule in Malaysia Time, what the weather does to this circuit,
every Malaysian Grand Prix from 1999 to 2017, the 2026 championship, and a
driver head-to-head. Mobile-first, no accounts, no API keys, nothing to pay
for.

Two things here are specific to Sepang rather than general F1:

- **Rain falls in 36% of early-October afternoons at the circuit** — measured
  across 270 of them since 2011, not asserted from reputation. Three of the
  five sessions run in that window and the race starts at 15:00 local.
  `/sepang` shows the recorded conditions for these dates until the race comes
  within forecast range, then switches to the forecast, and says which of the
  two you are looking at.
- **Nine years away.** The circuit's whole F1 history is on one page, from
  Irvine in 1999 to Verstappen in 2017.

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
| `npm run snapshot:season` | Regenerate the committed season schedule fallback |

## Environment

Everything runs with no configuration, and there is no key to obtain for any of
it. Deploying is `git push`.

| Variable | Default | Purpose |
|---|---|---|
| `JOLPICA_BASE_URL` | `https://api.jolpi.ca/ergast/f1` | Override the standings/schedule API. Point it at a dead host to exercise the fallback paths. |

## Data sources

**Jolpica-F1** (`api.jolpi.ca`) — standings, schedule, race and qualifying
results. Free, no auth, 4 req/s and 500 req/hour. Pages revalidate every five
minutes, so a deployed instance makes roughly a dozen requests an hour
regardless of traffic.

**Open-Meteo** (`api.open-meteo.com`) — weather at the circuit. Free, no key,
no account. Forecasts reach 16 days, so for most of the build the race is
beyond them; the Sepang page shows the historical record for these dates until
a forecast exists, and says which of the two it is showing.

**No live timing.** Second-by-second timing is only sold. OpenF1's free tier is
not a fallback either — while any session is running anywhere in the world it
returns `401` for *every* endpoint, including 2023 history, which is precisely
when it would matter. This project is deliberately zero-cost, so it works from
the official classifications published after each session and says so on the
page rather than implying it is live.

## How live timing is wired

Every number on `/live` arrives through the `LiveTimingSource` interface in
[`src/lib/f1/sources/`](src/lib/f1/sources/). The UI does not know which source
it is drawing.

- **`jolpica.source.ts`** — free, always available. Official classifications
  published after each session. Cannot show a car moving; what it shows is
  correct.

Each source declares a `fidelity` and a `SourceCapabilities` record, and the UI
reads capabilities — not null values — to decide what to render. A source that
cannot report tyres hides the column; one that can, but has not yet, shows a
dash. Those are different states and the reader can tell them apart.

There is one implementation, and the seam is still worth keeping: it is what
lets `/live/preview/[round]` drive the real timing view against a completed
round, and it is the one function a free live source would arrive through.

An OpenF1 adapter used to sit here behind an API-key check. It was deleted
rather than left dormant, because it had never once run — there is no way to
exercise OpenF1 without paying, so it was an untested integration one
environment variable away from production on a race weekend. Git history has it
if it is ever wanted.

## Sepang history

`/sepang` carries every Malaysian Grand Prix held at the circuit between 1999
and 2017 — winners, pole sitters, the lap record and the 2017 finish — from
four Jolpica queries cached for a day, since none of it will ever change.

Three things the data layer in
[`src/lib/f1/sepang-history.ts`](src/lib/f1/sepang-history.ts) is careful about,
all covered by `npm run verify:apis`:

- **Tallies key on `driverId`, never on family name.** Sepang was won by
  Michael Schumacher three times and by Ralf Schumacher once; counting by name
  produces a four-time winner who does not exist.
- **Pole data only exists from 2002.** The three earliest races render as
  "pole not recorded" rather than blank.
- **The 2026 running is excluded.** It appears in the circuit's race list but
  has no result, and must never be counted as a win.

## Teams

`/teams` and `/teams/[id]` cover the eleven constructors of the 2026 grid.
Career records are imported from F1DB by `npm run import:teams` into
[`src/lib/f1/team-stats.json`](src/lib/f1/team-stats.json).

Each team is shown twice: as the entity racing under that name today, and
including every entry it continues. F1DB records Aston Martin with zero wins,
which is true since 2021 and misleading alone — the entry it continues won at
Spa in 1998 as Jordan and at Sakhir in 2020 as Racing Point. Both figures are
imported and the page labels each.

### Colours and logos

Livery colours live in
[`src/lib/f1/team-colours.ts`](src/lib/f1/team-colours.ts) and appear as a
stripe beside rows in the standings and timing tables. They are used as a rule
rather than as text on purpose: several fall below 4.5:1 against the canvas and
would fail as body text, while a decorative stripe carries no contrast
requirement. Audi and Cadillac are new for 2026 and their values are flagged
`provisional` in that file.

On the teams list the stripe is drawn wider than in the tables, because there
it is what you scan by: four of the eleven liveries are neighbouring blues, and
a 3px hairline does not separate them at a glance.

Logos, where supplied, are normalised by `npm run logos:normalise` before they
are drawn. Supplied logos are not comparable objects — these eleven run from
square to 4.4:1, and their ink, the area actually painted, spans 16x — so
fitting them into a shared CSS box equalises the bounding box and nothing else.
The script instead scales each mark to a common *optical weight*, a blend of
ink area and longest edge, and centres it on one 400x200 canvas; the component
then draws the set at a consistent size with a single `object-contain`. Weight
spread across the eleven falls from 16x to 1.26x.

It also measures each mark and records, in
[`src/lib/f1/team-logos.json`](src/lib/f1/team-logos.json), whether it can be
rendered in ink. That is measured rather than judged by eye because judging it
by eye got it wrong: inverting drives every opaque pixel to white, so Mercedes
— a silver disc with the star cut into it by colour rather than by
transparency — rendered as a plain white circle. A mark keeps its own colours
only if it passes all three tests: already legible on the canvas, carrying more
than one tone, and still holding those tones apart once resampled to the size
it ships at. The third is what separates Mercedes from Red Bull, which has more
tones than any other mark here but spends them on type that does not resolve at
48px.

That manifest is generated, **and committed**. It is a build input, not build
output — `TeamLogo` imports it, so a checkout without it fails to build rather
than merely losing its logos. `npm run logos:normalise` needs `sharp`, which is
a devDependency for that reason; it used to be reachable only as an optional
transitive dependency of Next.

None of this makes a logo identify a team at row size; the ones supplied as
full lockups have a wordmark four pixels tall there. The colour and the name do
that, and the logo is a supporting mark.

**No team logos are shipped.** They are registered trademarks, and no open
dataset can license them however its own repository is licensed. To add your
own, drop a file at `public/teams/<constructorId>.svg` — see
[`public/teams/README.md`](public/teams/README.md). It then appears
automatically; without one the pages fall back to the colour stripe and name.

## Circuit profiles

`/circuits/[id]` covers all 23 rounds: races held, lap record, most successful
drivers and constructors, and four characteristics measured from results rather
than copied from published ratings — see
[`src/lib/f1/circuit-stats.ts`](src/lib/f1/circuit-stats.ts) for why they are
windowed to roughly the last twenty races rather than a circuit's whole history.

### Track outlines

```bash
npm run maps:circuits
```

Two sources, each for what it is best at, both CC BY 4.0, both imported into
[`src/lib/f1/circuit-maps.json`](src/lib/f1/circuit-maps.json) and committed —
nothing is fetched at request time.

- **[F1DB](https://github.com/f1db/f1db)** for metadata: length, turns,
  direction, type, and which layout is currently in use (`effective: true`).
- **[julesr0y/f1-circuits-svg](https://github.com/julesr0y/f1-circuits-svg)**
  for the artwork. Its `detailed` set draws the start line and start marker as
  well as the outline; the outline itself is the same lineage as F1DB's. It
  covers 25 layouts, which includes all 23 on the 2026 calendar.

The assets' own colours are dropped on import. The track takes Rosso Corsa and
the start markings take ink, so they read against it rather than into it.

An earlier version traced outlines from OpenStreetMap and reached only 15 of
23: street circuits are tagged there as ordinary roads, and Silverstone and
COTA are split into eighty-odd ways named per corner that would not reassemble.
F1DB also replaced a table of circuit lengths that had been typed from memory.

**The mapping is the dangerous part.** F1DB circuit ids are not Ergast ids
(`albert_park` → `melbourne`, `americas` → `austin`, `vegas` → `las-vegas`), and
matching them automatically on coordinates pairs Las Vegas with `caesars-palace`
— the 1981 car park circuit, 3.65 km — because both sit in the same city and the
wrong one is nearer the published coordinate. The mapping is therefore written
out explicitly and every entry is checked two ways: coordinates must agree on
the city, and F1DB's `totalRacesHeld` must agree with Jolpica's race count to
within one. A correct pairing differs by 0 or 1; Caesars Palace differs by 2 and
is rejected. `npm run verify:apis` asserts the result.

Attribution is required by CC BY 4.0 and appears on the map caption and in the
footer.

## Previewing the timing view

Sepang is round 16 and has not run, so `/live` shows a countdown and the
timing table never renders. To drive the real view against a completed round:

```
/live/preview/12                          race classification
/live/preview/12?session=quali            just after the flag: provisional
/live/preview/12?session=quali&at=during  mid-session: the live branch
/live/preview/12?session=fp1&at=during    running practice with no rows,
                                          which is what Friday at Sepang looks
                                          like on the free source
```

It renders the same `LiveView` component through the same source class — a
preview built from different components would prove nothing. Not indexed, and
not linked from the app.

Between them these cover every state the live page has: before the weekend,
session running with and without rows, provisional, and finished.

## Degrading gracefully

The schedule is the most important thing this app shows during a race week, and
the published times barely move, so the whole calendar is committed at
[`src/lib/f1/season.static.json`](src/lib/f1/season.static.json). If Jolpica is
unreachable, every page still renders the right times — it just says so.

This used to cover the Sepang weekend alone. The app now follows whichever race
is next, so any round can be the one a reader needs and all 23 are snapshotted.

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
- **The app follows the next race, not a fixed round.** `pickActiveWeekend` in
  [`src/lib/f1/weekend.ts`](src/lib/f1/weekend.ts) chooses whichever weekend is
  running or still to come; home, `/live` and `/schedule` all read it. Sepang
  keeps a highlight of its own on the home page. Pinning to Sepang left every
  page stale for the rounds around it and dead once it had run.
- **Times are always Malaysia Time**, which is also Singapore time — both UTC+8. Everything user-facing goes through
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
