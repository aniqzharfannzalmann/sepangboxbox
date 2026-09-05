# Team logos

Empty on purpose.

Team logos are registered trademarks. No open dataset can license them however
its own repository is licensed, so none are committed here.

To add one, drop a file named after the Ergast/Jolpica constructor id:

    ferrari.svg
    red_bull.svg
    aston_martin.svg

The name must match the id exactly — `cadillac.png`, not `cadillac-logo.png`,
or the file is simply not found.

`.svg`, `.png` and `.webp` are recognised. PNGs are resized and converted by
next/image, so a large source file is fine: these render at 32-48px and the
originals here total 414 KB but transfer as about 50. The logo then appears on the teams
list and the team page automatically — see
`src/components/team/TeamLogo.tsx`. Without one, those pages fall back to the
team's colour stripe and name, which is how they read today.

Ids for the 2026 grid: mercedes, ferrari, mclaren, red_bull, rb, alpine, haas,
audi, williams, aston_martin, cadillac.
