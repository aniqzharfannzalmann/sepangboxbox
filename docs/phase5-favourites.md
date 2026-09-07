# Phase 5 Favourites Operations

## Behavior

Following a driver or constructor stores only its stable ID in browser `localStorage`. The home page reads the current standings from the server and uses those IDs to show a current snapshot in **Your favourites**.

## Safety Rules

- No account or database is required.
- Points and positions are never stored locally.
- Invalid or corrupt storage becomes an empty preference set.
- Storage-disabled browsers continue to render core pages.
- Missing current standings do not erase saved IDs.
- Only the first three followed drivers and constructors appear on home.

## Race-Weekend Checks

1. Follow a driver on `/standings`.
2. Open home and confirm **Your favourites** appears.
3. Follow a constructor on `/teams`.
4. Confirm both snapshots show current points and positions.
5. Unfollow and confirm the item disappears without a full refresh.
6. Refresh and confirm preferences persist.
7. Test with storage disabled or corrupt JSON.
8. Confirm no hydration warning appears in development.

## Data Boundaries

The home highlight is a current standings snapshot, not a live timing feed. It must retain the source and fallback behavior of the standings pages and must never show locally cached points as current.
