#!/usr/bin/env node
/**
 * Crop driver portraits out of full-body images.
 *
 *   npm run drivers:normalise
 *
 * Images arrive full-body. What the app needs is a head-and-shoulders square,
 * the same size for every driver, so a row of them reads as one set rather
 * than as 23 differently-framed photographs — the same problem the team logos
 * had, where fitting different shapes into a shared CSS box equalised the
 * bounding box and nothing else.
 *
 * Originals in assets/drivers are never modified and never served. This reads
 * them, writes a small square to public/drivers, and records what it did in
 * src/lib/f1/driver-portraits.json. Keeping the originals is the point: the
 * crop is a heuristic, and a bad one has to be fixable without asking for the
 * photograph again.
 *
 * No face detection. That would mean a model and a dependency, and this is a
 * deliberately zero-cost project. What it does instead is described at
 * findHeadCrop below, along with what defeats it.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = path.join(process.cwd(), "assets", "drivers");
const OUT_DIR = path.join(process.cwd(), "public", "drivers");
const MANIFEST = path.join(process.cwd(), "src", "lib", "f1", "driver-portraits.json");
const OVERRIDES = path.join(process.cwd(), "scripts", "driver-crops.json");
const SHEET = path.join(process.cwd(), "driver-crops-contact-sheet.png");

/** The square that ships. Drawn at 96px at most, so this is generous at 2x. */
const OUT_SIZE = 320;

/**
 * A pixel counts as subject rather than background.
 *
 * Alpha where the image has one — a cut-out is the ideal input. Failing that,
 * distance from the background colour sampled at the corners, which handles a
 * flat studio backdrop and gives up honestly on a busy one.
 */
const ALPHA_MIN = 0.5;
const COLOUR_DISTANCE = 40;

/**
 * How much of the square the head itself should fill, and how much air sits
 * above the crown as a fraction of head height.
 *
 * Framing a portrait by the head means the head is the same size in every one
 * of them, which is the whole point of doing this rather than resizing whole
 * pictures. Around 60% holds head and shoulders: tighter reads as a mugshot,
 * looser loses the face at 36px in a standings row.
 */
const HEAD_IN_FRAME = 0.62;
const ABOVE_CROWN = 0.12;

/**
 * A row this much narrower than the head at its widest is the neck.
 *
 * Below this and the narrowing is just jawline; the neck on these is a little
 * over half head width.
 */
const NECK_RATIO = 0.85;

/** avif included because that is what the supplied cut-outs arrived as. */
const IMAGE = /\.(png|jpe?g|webp|avif)$/i;

function readOverrides() {
  if (!existsSync(OVERRIDES)) return {};
  try {
    return JSON.parse(readFileSync(OVERRIDES, "utf8"));
  } catch (error) {
    throw new Error(`${OVERRIDES} is not valid JSON: ${error.message}`);
  }
}

/**
 * Per-row horizontal extent of the subject.
 *
 * Returns, for every row, the leftmost and rightmost subject pixel, or null
 * for a row that is entirely background.
 */
function rowExtents({ data, info }) {
  const { width, height, channels } = info;
  const hasAlpha = channels === 4;

  // Background colour, for images without alpha: the median of the four
  // corners, so a single odd corner cannot define it.
  const corner = (x, y) => {
    const o = (y * width + x) * channels;
    return [data[o], data[o + 1], data[o + 2]];
  };
  const corners = [
    corner(0, 0),
    corner(width - 1, 0),
    corner(0, height - 1),
    corner(width - 1, height - 1),
  ];
  const bg = [0, 1, 2].map((i) => {
    const values = corners.map((c) => c[i]).sort((a, b) => a - b);
    return (values[1] + values[2]) / 2;
  });

  const rows = [];
  for (let y = 0; y < height; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const subject = hasAlpha
        ? data[o + 3] / 255 >= ALPHA_MIN
        : Math.hypot(data[o] - bg[0], data[o + 1] - bg[1], data[o + 2] - bg[2]) >
          COLOUR_DISTANCE;
      if (!subject) continue;
      if (left === -1) left = x;
      right = x;
    }
    rows.push(left === -1 ? null : { left, right, width: right - left + 1 });
  }
  return rows;
}

/**
 * Find the head, and a square around it.
 *
 * The full bounding box will not do. Its horizontal centre is the centre of
 * the whole body — spread arms or a wide stance move it well off the head —
 * and its top is the crown, which says nothing about how far down to cut.
 *
 * So it finds the neck. Reading down from the crown, a row's width grows to
 * the widest part of the head, narrows to the neck, then grows again into the
 * shoulders — and that narrowest point is the bottom of the head. Crown to
 * neck is the head's height, and the rows above the neck are the only ones
 * that describe where the head is horizontally.
 *
 * Anchoring on the shoulders instead does not work, which is what this first
 * did: a widening test fires somewhere down the deltoid rather than at the
 * joint, so the box came out half again too big, and averaging in the shoulder
 * rows dragged the centre off the face towards whichever arm was further out.
 *
 * What defeats it, in order of likelihood: a raised arm level with the head,
 * which widens the top rows; a busy background, which makes everything
 * subject; and a hand above the head, which moves the crown. All three are
 * obvious on the contact sheet and fixable in driver-crops.json.
 */
function findHeadCrop(rows, width, height) {
  const present = rows
    .map((r, y) => (r ? { ...r, y } : null))
    .filter((r) => r !== null);
  if (present.length === 0) return null;

  const top = present[0].y;
  const bottom = present[present.length - 1].y;
  const subjectHeight = bottom - top + 1;

  // Everything of interest is in the upper third. Past that is torso, and a
  // second narrowing at the waist would be mistaken for a neck.
  const window = present.filter(
    (r) => r.y >= top && r.y <= top + Math.round(subjectHeight * 0.33),
  );
  if (window.length < 3) return null;

  /*
   * Smooth before reading any of this off. Row width is noisy at the pixel
   * scale — a few strands of hair, a collar, an antialiased edge — and both
   * the peak and the trough below are found by comparing neighbours, so
   * unsmoothed widths find a "peak" three pixels down the parting. Averaging
   * over 1% of subject height is far below the head-to-neck distance and well
   * above that noise.
   */
  const span = Math.max(2, Math.round(subjectHeight * 0.01));
  const smooth = window.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - span); j <= Math.min(window.length - 1, i + span); j++) {
      sum += window[j].width;
      n++;
    }
    return sum / n;
  });

  /*
   * The head's widest point is the FIRST peak, not the widest row here — the
   * shoulders are always wider than the head, so a plain maximum finds them
   * and leaves no neck below to find. Read down from the crown until the width
   * has fallen appreciably off its running peak.
   *
   * Starting a little below the crown, because the top of a head is a couple
   * of pixels of hair and is not a width worth comparing against.
   */
  let peak = window.findIndex((r) => r.y > top + subjectHeight * 0.02);
  if (peak < 0) peak = 0;
  for (let i = peak; i < smooth.length; i++) {
    if (smooth[i] > smooth[peak]) peak = i;
    else if (smooth[i] < smooth[peak] * 0.9) break;
  }

  // The neck: the trough below that peak, confirmed by the shoulders widening
  // again afterwards.
  let neck = null;
  for (let i = peak + 1; i < smooth.length; i++) {
    if (neck === null || smooth[i] < smooth[neck]) neck = i;
    if (smooth[i] > smooth[neck] * 1.2) break;
  }

  const measured = neck !== null && smooth[neck] <= smooth[peak] * NECK_RATIO;
  const headBottom = measured
    ? window[neck].y
    : top + Math.round(subjectHeight * 0.14);
  const headHeight = Math.max(1, headBottom - top);

  // Horizontal centre from the head's own rows only.
  const headRows = present.filter((r) => r.y >= top && r.y <= headBottom);
  const headLeft = Math.min(...headRows.map((r) => r.left));
  const headRight = Math.max(...headRows.map((r) => r.right));
  const centreX = (headLeft + headRight) / 2;

  const size = Math.round(headHeight / HEAD_IN_FRAME);
  const cropTop = Math.round(top - headHeight * ABOVE_CROWN);
  const cropLeft = Math.round(centreX - size / 2);

  return clampBox(
    { left: cropLeft, top: cropTop, size },
    width,
    height,
    measured ? "measured" : "proportional",
  );
}

/** Keep the square inside the image, shrinking it only if it cannot fit. */
function clampBox({ left, top, size }, width, height, basis) {
  const edge = Math.min(size, width, height);
  return {
    left: Math.max(0, Math.min(left, width - edge)),
    top: Math.max(0, Math.min(top, height - edge)),
    size: edge,
    basis,
  };
}

if (!existsSync(SOURCE_DIR)) {
  console.log(`No ${path.relative(process.cwd(), SOURCE_DIR)} — nothing to do.`);
  process.exit(0);
}

const overrides = readOverrides();
const files = readdirSync(SOURCE_DIR).filter((f) => IMAGE.test(f)).sort();

mkdirSync(OUT_DIR, { recursive: true });

const manifest = {};
const tiles = [];

if (files.length > 0) {
  console.log("driver            source        crop                  from");
}

for (const file of files) {
  const id = path.basename(file, path.extname(file));
  const full = path.join(SOURCE_DIR, file);

  const image = sharp(full);
  const meta = await image.metadata();
  const raw = await image.raw().toBuffer({ resolveWithObject: true });

  const override = overrides[id];
  const box = override
    ? clampBox(override, meta.width, meta.height, "override")
    : findHeadCrop(rowExtents(raw), meta.width, meta.height);

  if (!box) {
    console.log(`${id.padEnd(18)}${`${meta.width}x${meta.height}`.padEnd(14)}no subject found — give it a box in driver-crops.json`);
    continue;
  }

  const out = await sharp(full)
    .extract({ left: box.left, top: box.top, width: box.size, height: box.size })
    .resize(OUT_SIZE, OUT_SIZE, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  writeFileSync(path.join(OUT_DIR, `${id}.webp`), out);
  tiles.push({ id, buffer: out });

  manifest[id] = {
    crop: { left: box.left, top: box.top, size: box.size },
    source: { width: meta.width, height: meta.height },
    basis: box.basis,
  };

  console.log(
    id.padEnd(18) +
      `${meta.width}x${meta.height}`.padEnd(14) +
      `${box.left},${box.top} ${box.size}px`.padEnd(22) +
      box.basis,
  );
}

writeFileSync(
  MANIFEST,
  `${JSON.stringify(
    {
      $comment:
        "Generated by npm run drivers:normalise. Do not edit by hand — see scripts/normalise-drivers.mjs.",
      size: OUT_SIZE,
      portraits: Object.fromEntries(Object.entries(manifest).sort()),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (tiles.length === 0) {
  console.log(
    `No images in ${path.relative(process.cwd(), SOURCE_DIR)} yet — wrote an empty manifest.\n` +
      "Drivers render their initials until one is added; see that folder's README.",
  );
  process.exit(0);
}

/*
 * A contact sheet, because this cannot be checked by numbers.
 *
 * Every crop at the size it ships, in one image. A head cropped through the
 * chin, or a portrait centred on someone's shoulder, is obvious here and
 * invisible in the table above.
 */
const COLS = 8;
const TILE = 120;
const rows = Math.ceil(tiles.length / COLS);
const composited = await Promise.all(
  tiles.map(async (t, i) => ({
    input: await sharp(t.buffer).resize(TILE, TILE).toBuffer(),
    left: (i % COLS) * TILE,
    top: Math.floor(i / COLS) * TILE,
  })),
);

await sharp({
  create: {
    width: COLS * TILE,
    height: rows * TILE,
    channels: 4,
    background: { r: 24, g: 24, b: 24, alpha: 1 },
  },
})
  .composite(composited)
  .png()
  .toFile(SHEET);

console.log(
  `\n${tiles.length} portrait${tiles.length === 1 ? "" : "s"} written to ` +
    `${path.relative(process.cwd(), OUT_DIR)}\n` +
    `manifest: ${path.relative(process.cwd(), MANIFEST)}\n` +
    `contact sheet: ${path.relative(process.cwd(), SHEET)} — look at it`,
);
