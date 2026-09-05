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

`.svg`, `.png` and `.webp` are recognised.

After adding a logo, run:

    npm run logos:normalise

This matters more than it sounds, and does more than it used to. Supplied
logos are not comparable objects: the eleven here run from square (Ferrari) to
a 4.4:1 band (Aston Martin), some are compact symbols and some are full
lockups, and the ink they actually paint spans 16x. Fitting them into a shared
CSS box equalises the bounding box and nothing else — a dense disc and a pair
of hairline wings drawn to the same height do not weigh the same, and the row
looks arbitrary however the CSS is written.

So the script crops the transparent border, scales each mark to a common
optical weight, and centres it on one 400x200 canvas. It also measures each
mark and writes `src/lib/f1/team-logos.json`, which is where the component
learns whether that logo can be rendered in ink or has to keep its own colours.

Commit that manifest along with the image. `TeamLogo` imports it, so it is a
build input — a checkout without it fails to build, rather than just falling
back to no logos.

It is idempotent — a file already normalised is left untouched rather than
resampled again — and git keeps the originals.

A logo added without running it still appears, at whatever size and weight it
happens to be, and is inverted, which is the safer guess for an unmeasured
file: most supplied logos are black, and black is 1.18:1 against this canvas.

Ids for the 2026 grid: mercedes, ferrari, mclaren, red_bull, rb, alpine, haas,
audi, williams, aston_martin, cadillac.
