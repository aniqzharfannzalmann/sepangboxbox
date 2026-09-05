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
 * How much of the crop sits below the shoulder line, as a multiple of the
 * head-to-shoulder distance, and how much air is left above the crown.
 *
 * Tuned so the square holds head and shoulders rather than a floating head:
 * portraits that crop tight to the jaw look like mugshots, and ones that
 * include the chest lose the face at 32px in a standings row.
 */
const BELOW_SHOULDER = 0.45;
const ABOVE_CROWN = 0.18;

/** The row extent that says shoulders have started, as a multiple of head width. */
const SHOULDER_RATIO = 1.6;

const IMAGE = /\.(png|jpe?g|webp)$/i;

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
 * So: take the head's width from the topmost rows, which contain only head.
 * Then walk down until a row is meaningfully wider than that, which is where
 * the shoulders begin. Head width and the head-to-shoulder distance together
 * give both the centre and the scale, and neither depends on the body below.
 *
 * What defeats it, in order of likelihood: a raised arm level with the head,
 * which widens the top rows so the head reads wider than it is; a busy
 * background, which makes everything subject; and a hand held above the head,
 * which moves the crown. All three are visible instantly on the contact sheet
 * and fixable with an entry in driver-crops.json.
 */
function findHeadCrop(rows, width, height) {
  const present = rows
    .map((r, y) => (r ? { ...r, y } : null))
    .filter((r) => r !== null);
  if (present.length === 0) return null;

  const top = present[0].y;
  const bottom = present[present.length - 1].y;
  const subjectHeight = bottom - top + 1;

  // The head's own width, from rows near the crown. A slice rather than one
  // row, because the very top row of a head is a few pixels of hair.
  const sampleDepth = Math.max(3, Math.round(subjectHeight * 0.04));
  const sample = present
    .filter((r) => r.y >= top && r.y < top + sampleDepth)
    .map((r) => r.width)
    .sort((a, b) => a - b);
  if (sample.length === 0) return null;
  const headWidth = sample[Math.floor(sample.length / 2)];

  // Walk down to the shoulders. Capped at a third of the subject: past that
  // something has gone wrong and a proportional fallback is safer than a
  // confident wrong answer.
  const limit = top + Math.round(subjectHeight * 0.33);
  let shoulderY = null;
  for (const r of present) {
    if (r.y <= top + sampleDepth) continue;
    if (r.y > limit) break;
    if (r.width > headWidth * SHOULDER_RATIO) {
      shoulderY = r.y;
      break;
    }
  }
  const headToShoulder = (shoulderY ?? top + Math.round(subjectHeight * 0.2)) - top;

  // Centre on the head, not the body.
  const headRows = present.filter((r) => r.y >= top && r.y <= top + headToShoulder);
  const headLeft = Math.min(...headRows.map((r) => r.left));
  const headRight = Math.max(...headRows.map((r) => r.right));
  const centreX = (headLeft + headRight) / 2;

  const size = Math.round(headToShoulder * (1 + BELOW_SHOULDER + ABOVE_CROWN));
  const cropTop = Math.round(top - headToShoulder * ABOVE_CROWN);
  const cropLeft = Math.round(centreX - size / 2);

  return clampBox(
    { left: cropLeft, top: cropTop, size },
    width,
    height,
    shoulderY === null ? "proportional" : "measured",
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
