# PRD: Sepang Box Box

**A realtime F1 companion web app for the 2026 Gulf Air Bahrain GP in Malaysia (Sepang, 2–4 Oct 2026)**

Owner: Aniq / Jombina
Status: Draft v1
Target launch: before 2 Oct 2026 (race weekend)

---

## 1. Background & Context

Formula 1 is returning to Sepang International Circuit for the first time since 2017, hosting the rescheduled Bahrain GP (officially "Formula 1 Gulf Air Bahrain Grand Prix in Malaysia") from **2–4 October 2026**. There is no dedicated, Malaysia-flavoured realtime companion app for local fans — this is the gap Sepang Box Box fills.

Inspiration: [boxbox.club](https://boxbox.club) — an iOS widget app for F1 live standings, schedules, and driver/team stats. Sepang Box Box is the web equivalent, focused on the Sepang weekend but usable all season.

## 2. Goals

- Show **realtime session data** during FP1–3, Qualifying, Sprint (if applicable), and the Race: live positions, gaps, lap times, tyre stints, pit stops, race control flags.
- Show **championship context**: current driver & constructor standings, so a casual fan understands who's fighting for what going into Sepang.
- Show the **Sepang race weekend schedule** in Malaysia Time (MYT) with a countdown.
- Be fast, mobile-first (most traffic will be phones at the circuit or on the couch), and free to run at low traffic cost.

## 3. Non-Goals (v1)

- No user accounts / login
- No push notifications (can be a v2 feature via web push)
- No betting/prediction games (boxbox-adjacent apps like Pitbrain do this — explicitly out of scope for v1)
- No car telemetry deep-dive (throttle/brake/gear traces) — nice-to-have, not MVP

## 4. Data Sources

Two complementary free/public APIs. Neither requires backend infra from F1 itself — both are third-party, unofficial, and should carry a disclaimer (see §9).

### 4.1 Jolpica-F1 (Ergast-compatible successor) — season & standings data
- Base: `https://api.jolpi.ca/ergast/f1/`
- No auth required.
- Use for:
  - `/current/driverStandings.json` — driver championship standings
  - `/current/constructorStandings.json` — constructor championship standings
  - `/current.json` — season race calendar
  - `/current/last/results.json` — most recent race result
- Update cadence: after each session is classified (not live-live). Fine for standings — these don't change mid-session anyway.
- Rate limits: reasonable for polling every few minutes; cache aggressively (see §6).

### 4.2 OpenF1 — live session data
- Base: `https://api.openf1.org/v1/`
- Historical data (2023+) confirmed free, no auth.
- **Open risk:** real-time/live data access may now require a paid tier — verify current terms at openf1.org before committing to the live architecture below. If live access requires payment, budget for it or fall back to short-interval polling of whatever tier is available.
- Key endpoints:
  - `/sessions?meeting_key=latest` — resolve the active session
  - `/position?session_key=X` — driver track positions
  - `/intervals?session_key=X` — gap to leader / car ahead
  - `/laps?session_key=X` — lap times, sector times
  - `/stints?session_key=X` — tyre compound & stint length
  - `/pit?session_key=X` — pit stop events
  - `/race_control?session_key=X` — flags, safety car, penalties
  - `/weather?session_key=X` — track/air temp, rain
  - MQTT feed at `mqtt.openf1.org` is available as an alternative to polling (lower latency, used by projects like Pitbrain) — evaluate if polling proves too slow.

## 5. Tech Stack

Consistent with existing Jombina tooling:

- **Frontend:** Next.js 14 (App Router), Tailwind CSS
- **Realtime transport:** Supabase Realtime (broadcast channel — no need to persist every tick to a table)
- **Data cache:** Supabase Postgres table for standings/schedule (refreshed every few minutes via cron), so page loads don't hit external APIs directly
- **Live polling worker:** Vercel Cron Job or Edge Function, active only during race weekend session windows, polling OpenF1 every 3–5s and broadcasting via Supabase Realtime
- **Hosting:** Vercel

### Why cache standings but broadcast live data?
Standings/schedule change at most once per session — ISR (revalidate every few minutes) or a cached Supabase table is enough, and avoids hammering Jolpica. Live session data changes every few seconds and needs to reach many concurrent clients — a broadcast channel is cheaper and lower-latency than each client polling OpenF1 directly.

## 6. Architecture

```
                     ┌─────────────────────┐
                     │   Jolpica-F1 API     │  (standings, schedule)
                     └──────────┬───────────┘
                                │ polled every few min
                                ▼
                     ┌─────────────────────┐
                     │  Supabase Postgres   │  (cache table)
                     └──────────┬───────────┘
                                │ ISR fetch
                                ▼
┌───────────────┐   ┌─────────────────────┐
│   OpenF1 API   │──▶│  Polling worker      │──broadcast──┐
│ (live session) │   │ (cron/edge function) │             ▼
└───────────────┘   └─────────────────────┘   ┌─────────────────────┐
                                               │ Supabase Realtime    │
                                               │  (broadcast channel) │
                                               └──────────┬───────────┘
                                                           │ subscribe
                                                           ▼
                                               ┌─────────────────────┐
                                               │   Next.js client     │
                                               │  (browser, no login) │
                                               └─────────────────────┘
```

The polling worker only needs to run during actual session windows (known in advance from the schedule) — no need to poll 24/7.

## 7. Pages & Features

### 7.1 Home / Live Hub
- If a session is currently live: full-width live leaderboard (position, driver, gap, last lap, tyre) — this is the hero view during race weekend.
- If no session is live: countdown to next Sepang session + current championship standings snapshot.

### 7.2 Standings
- Driver championship table (position, driver, team, points, points behind leader)
- Constructor championship table
- Sourced from cached Jolpida data, ISR revalidate ~5 min

### 7.3 Live Timing (session view)
- Position list with live gap-to-leader and gap-to-car-ahead
- Tyre compound + stint age per car
- Pit stop log (who pitted, when, duration)
- Race control feed (flags, SC/VSC, penalties) as a scrolling ticker

### 7.4 Schedule
- Sepang weekend sessions (FP1, FP2, FP3, Quali, Race) in MYT with countdown per session
- Optionally extend to full season calendar (cheap, since Jolpica already gives this)

### 7.5 Compare Drivers
- Pick 2 drivers → side-by-side current-season stats (points, wins, podiums, avg finish)

## 8. Non-Functional Requirements

- Mobile-first layout — most usage expected to be phones, possibly on patchy stadium wifi at Sepang itself
- Graceful degradation: if OpenF1 live data is unavailable (rate-limited, session not classified yet, paid-tier lockout), fall back to "standings only" view with a visible status message — never show a broken/empty page
- Malaysia Time (MYT, UTC+8) as the default timezone for all schedule displays

## 9. Legal / Disclaimer

Neither Jolpica-F1 nor OpenF1 is an official F1/FIA data source. Footer must state: *"Sepang Box Box is an unofficial fan project and is not affiliated with Formula 1, the FIA, or Formula One Licensing B.V."* — same posture boxbox.club takes.

## 10. Open Questions / Risks

1. **OpenF1 live-tier access** — confirm free vs paid before committing engineering time to the live architecture (§4.2).
2. **Session classification lag** — race control / final classification can lag the actual chequered flag by minutes; live leaderboard should be clearly labeled "provisional" during this window.
3. **Traffic spike planning** — race weekend traffic will be spiky (concentrated around session start times); Vercel + Supabase free/hobby tiers should be checked against expected concurrent viewers before race day.

## 11. Suggested Build Phases (given ~4 week runway to 2 Oct)

- **Phase 1 (this week):** Standings + Schedule pages only, static/ISR, no realtime yet. Validates data pipeline end-to-end.
- **Phase 2:** Add Supabase Realtime + polling worker, tested against a past/replayed session (OpenF1 historical data supports this).
- **Phase 3:** Live Timing UI polish + Compare Drivers page.
- **Phase 4 (last week before race):** Load-test, fallback states, disclaimer/legal copy, mobile QA.