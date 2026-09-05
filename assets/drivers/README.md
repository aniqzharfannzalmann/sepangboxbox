# Driver images (originals)

Empty on purpose. Driver photographs are somebody's copyright, so none are
committed here.

**This is where full-body originals go.** They are never served: the build
reads them, crops a portrait out of each, and writes the small square that
ships to `public/drivers/`. Keeping the originals means a bad crop can be
redone without asking for the picture again — which matters, because the crop
is found by a heuristic and will get some wrong.

Name each file after the Ergast/Jolpica driver id:

    hamilton.png
    max_verstappen.png
    arvid_lindblad.png

`.png`, `.jpg` and `.webp` are recognised. The name must match the id exactly
or the file is not found — there is no warning; the driver simply keeps showing
initials.

The 23 ids for 2026:

    antonelli       russell         hamilton        norris
    leclerc         max_verstappen  piastri         hadjar
    lawson          gasly           arvid_lindblad  colapinto
    bearman         bortoleto       hulkenberg      sainz
    albon           ocon            alonso          tsunoda
    stroll          bottas          perez

Two carry underscores — `max_verstappen` and `arvid_lindblad` — and they are
the two that get misnamed.

## Then run

    npm run drivers:normalise

It finds the head in each image, crops a square around head and shoulders, and
scales every driver to the same size, so a row of them reads as one set rather
than as 23 differently-framed photographs.

The portraits land in `public/drivers/` and must be committed — the deploy
builds from the repository and does not run this script. It also writes
`src/lib/f1/driver-portraits.json`, recording the crop it chose for each
driver. That file is a record, not a build input: nothing imports it, and it
exists so a crop can be audited and overridden rather than taken on trust.

It works best on a cut-out with a transparent background, and copes with a
plain flat background. A busy photographic background will defeat the subject
detection — crop that one by hand first, or give it an explicit box below.

## When it crops badly

It will sometimes. A raised arm beside the head is the usual cause: the arm
widens the top rows, so the head reads as wider than it is and the crop pulls
back too far.

The script prints the path to a contact sheet showing every crop at shipping
size. Look at it — a head cropped through the chin passes every numeric check
there is.

For any it misses, add an explicit box to `scripts/driver-crops.json`:

```json
{
  "max_verstappen": { "left": 420, "top": 90, "size": 380 }
}
```

Coordinates are pixels in the original, `size` is the square's edge. An entry
there wins over the heuristic, and the manifest records which of the two was
used for every driver.
