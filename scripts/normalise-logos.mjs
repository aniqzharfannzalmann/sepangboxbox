#!/usr/bin/env node
/**
 * Normalise the team logos in public/teams so they read as one set.
 *
 *   npm run logos:normalise
 *
 * Supplied logos are not comparable objects. Measured across the eleven here,
 * they range from square (Ferrari 0.72:1) to a thin band (Aston Martin 4.44:1),
 * and their ink — the alpha-weighted area actually painted — spans 16x. Some
 * are compact symbols, some are full lockups carrying a wordmark. Fitting them
 * all into one CSS box equalises the *bounding box* and nothing else, which is
 * why the row still looked arbitrary after that was done: a dense disc and a
 * hairline pair of wings drawn to the same height do not weigh the same.
 *
 * So this normalises three things the CSS cannot reach, and records a fourth.
 *
 *   1. Crop. Remove the transparent border, so what follows measures the mark
 *      and not its packaging.
 *   2. Scale. Give every mark the same optical weight (see WEIGHT below), then
 *      centre it on a shared canvas. Downstream, one `object-contain` box now
 *      renders the whole set at a consistent visual size.
 *   3. Cap. The longest edge never exceeds the canvas; these draw at 48px wide.
 *   4. Measure. Decide per logo whether it can be rendered in ink, and write
 *      the finding to src/lib/f1/team-logos.json for the component to read.
 *
 * Idempotent, and cheaply so: a file already on the canvas at the right weight
 * is left untouched rather than resampled again.
 */

import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "teams");
const MANIFEST = path.join(process.cwd(), "src", "lib", "f1", "team-logos.json");

/**
 * The shared canvas every mark is centred on, in source pixels.
 *
 * 2:1 suits this set: most of these marks are compact, and the wide ones sit
 * shorter within it rather than forcing everything else to shrink. It is also
 * the ratio the CSS box uses, so `object-contain` wastes no space.
 */
const CANVAS = { width: 400, height: 200 };

/**
 * Optical weight: a blend of how much ink a mark carries and how much room it
 * takes up.
 *
 *   weight = ink^(A/2) * longestEdge^(1-A)
 *
 * The two extremes are both wrong, and measurably so. At A=0 this is the old
 * behaviour — fit the longest edge — and ink spreads 16x, so the solid
 * Williams W bullies the hairline Aston Martin wings. At A=1 ink is equalised
 * exactly, but then a thin mark has to grow enormous to carry the same ink as
 * a dense one: bounding boxes spread 4x and the Mercedes star shrinks to 12px.
 * A=0.6 splits it — ink 3.0x, edge 2.3x — and, judged on a rendered contact
 * sheet rather than on these numbers, it is the one where nothing looks
 * conspicuously heavy or conspicuously faint.
 */
const A = 0.6;
const weightOf = (ink, w, h) => ink ** (A / 2) * Math.max(w, h) ** (1 - A);

/**
 * The weight every mark is scaled to.
 *
 * Pinned rather than derived from whatever is in the directory, for two
 * reasons: a percentile of the current set would drift on each run and break
 * idempotency, and adding a twelfth logo should scale that logo to match the
 * eleven, not re-scale the eleven. The value is the 20th percentile of this
 * set measured at the canvas — low enough that almost nothing has to be capped.
 */
const TARGET_WEIGHT = 162;

/** Within this much of target counts as already normalised. */
const TOLERANCE = 0.02;

/** The page these are drawn on — docs/design.md, --color-canvas in globals.css. */
const PAGE = [0x18, 0x18, 0x18];

const channel = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (r, g, b) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const PAGE_LUM = luminance(...PAGE);
const contrast = (l) =>
  (Math.max(l, PAGE_LUM) + 0.05) / (Math.min(l, PAGE_LUM) + 0.05);

/**
 * What a mark is made of: how much of it is painted, how much of that is
 * already visible on the page, and how many distinct tones it uses.
 */
async function measure(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let ink = 0;
  let visible = 0;
  let weighted = 0;
  const tones = new Array(10).fill(0);

  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * info.channels;
    const alpha = data[o + 3] / 255;
    if (alpha === 0) continue;
    ink += alpha;

    // Tone statistics describe the mark, so only pixels solid enough to be
    // read as the mark should vote. Antialiased edges are not a second colour.
    if (alpha < 0.5) continue;
    const l = luminance(data[o], data[o + 1], data[o + 2]);
    weighted += l * alpha;
    if (contrast(l) >= 3) visible += alpha;
    tones[Math.min(9, Math.floor(Math.sqrt(l) * 10))] += alpha;
  }

  const solid = tones.reduce((a, b) => a + b, 0) || 1;
  return {
    ink,
    width: info.width,
    height: info.height,
    visible: visible / solid,
    tones: tones.filter((t) => t / solid >= 0.05).length,
    contrast: contrast(weighted / solid),
    spread: await spreadAtDrawnSize(buffer),
  };
}

/**
 * The width a row logo is actually painted at: 48 CSS px on a 2x screen.
 */
const DRAWN_WIDTH = 96;

/**
 * How much luminance structure survives being seen at the size it ships.
 *
 * Counting tones in the source file is not enough to tell a mark worth keeping
 * in colour from one that only looks busy. Both Mercedes and Red Bull carry
 * several tones, but Mercedes carries two large shapes and Red Bull carries a
 * lockup of small ones, and small ones average away as the image is resampled
 * down. So resample first, then ask how far apart the tones still are.
 *
 * Reported as the 10th-to-90th percentile spread rather than a variance, so a
 * few stray antialiased pixels cannot carry the answer.
 */
async function spreadAtDrawnSize(buffer) {
  const { data, info } = await sharp(buffer)
    .resize({ width: DRAWN_WIDTH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const values = [];
  for (let i = 0; i < info.width * info.height; i++) {
    const o = i * info.channels;
    if (data[o + 3] < 128) continue;
    values.push(luminance(data[o], data[o + 1], data[o + 2]));
  }
  if (values.length === 0) return 0;

  values.sort((a, b) => a - b);
  const at = (q) => values[Math.min(values.length - 1, Math.floor(values.length * q))];
  return at(0.9) - at(0.1);
}

/**
 * A mark has to span at least half the luminance range, once resampled, to
 * count as genuinely two-tone rather than merely tinted.
 *
 * Not a delicate threshold: measured across these eleven, Mercedes spreads
 * 0.99 and the next mark down (McLaren) spreads 0.37, so anything from about
 * 0.4 to 0.9 selects the same set.
 */
const COARSE_ENOUGH = 0.5;

/**
 * Whether to render this mark in ink (white) rather than its own colours.
 *
 * Inverting is not free: `brightness(0)` drives every opaque pixel to a single
 * value, so any structure the mark drew as a second tone is flattened away.
 * Mercedes is the cautionary case — 76% pure white, 22% near-black, i.e. a
 * silver disc with the three-pointed star cut into it by colour rather than by
 * transparency. Inverted, the star vanishes and it renders as a plain white
 * circle.
 *
 * So leave a mark alone only where inverting would destroy something a reader
 * can actually see: it must already be legible on the page, carry more than
 * one tone, and keep those tones apart at the size it is drawn. Everything
 * else is inverted, which for a single-tone black mark costs nothing and takes
 * it from 1.18:1 to 17.79:1.
 *
 * The third test is what separates Mercedes from Red Bull. Red Bull has the
 * most tones of any mark here — four — but they are the Oracle wordmark, the
 * bulls and two lines of type, none of which resolve at 48px. Keeping them
 * costs the set its coherence and buys a reader nothing.
 */
const shouldMono = (m) =>
  !(m.visible >= 0.5 && m.tones > 1 && m.spread >= COARSE_ENOUGH);

const files = readdirSync(DIR)
  .filter((f) => /\.(png|webp)$/i.test(f))
  .sort();

if (files.length === 0) {
  console.log("No logos in public/teams — nothing to do.");
  process.exit(0);
}

console.log("file            source      normalised  weight  ink    tones  render");

const manifest = {};
let before = 0;
let after = 0;

for (const file of files) {
  const id = path.basename(file, path.extname(file));
  const full = path.join(DIR, file);
  const startBytes = statSync(full).size;
  const source = await sharp(full).metadata();

  // threshold 1 crops only what is fully transparent, so a dark mark on a
  // transparent ground keeps every pixel of the mark itself.
  const trimmed = await sharp(full).trim({ threshold: 1 }).png().toBuffer();
  const m = await measure(trimmed);

  const ceiling = Math.min(CANVAS.width / m.width, CANVAS.height / m.height);
  // Weight is linear in scale, whatever A is: scaling by s takes ink to
  // ink*s^2 and the longest edge to edge*s, so the two exponents — A/2 applied
  // to s^2, and 1-A applied to s — sum back to exactly one.
  const wanted = TARGET_WEIGHT / weightOf(m.ink, m.width, m.height);
  const scale = Math.min(wanted, ceiling);
  const capped = wanted > ceiling;

  const width = Math.max(1, Math.round(m.width * scale));
  const height = Math.max(1, Math.round(m.height * scale));
  const mono = shouldMono(m);

  const settled =
    source.width === CANVAS.width &&
    source.height === CANVAS.height &&
    Math.abs(scale - 1) <= TOLERANCE;

  if (!settled) {
    const resized = await sharp(trimmed)
      .resize(width, height, { fit: "fill" })
      .toBuffer();

    // Build the new image fully before writing, so a failure part-way cannot
    // truncate the file it is reading from.
    const out = await sharp({
      create: {
        width: CANVAS.width,
        height: CANVAS.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, gravity: "center" }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    await sharp(out).toFile(full);
    after += out.length;
  } else {
    after += startBytes;
  }
  before += startBytes;

  const final = await measure(
    await sharp(full).trim({ threshold: 1 }).png().toBuffer(),
  );

  manifest[id] = {
    mono,
    // Kept so the decision above can be re-read rather than taken on trust.
    visible: Number(final.visible.toFixed(3)),
    tones: final.tones,
    contrast: Number(final.contrast.toFixed(2)),
    spread: Number(final.spread.toFixed(3)),
    capped,
  };

  console.log(
    id.padEnd(16) +
      `${source.width}x${source.height}`.padEnd(12) +
      `${width}x${height}`.padEnd(12) +
      weightOf(final.ink, final.width, final.height).toFixed(0).padEnd(8) +
      `${((final.ink / (CANVAS.width * CANVAS.height)) * 100).toFixed(1)}%`.padEnd(7) +
      `${final.tones}`.padEnd(7) +
      (mono ? "ink" : "own colours") +
      (capped ? "  (capped)" : ""),
  );
}

writeFileSync(
  MANIFEST,
  `${JSON.stringify(
    {
      $comment:
        "Generated by npm run logos:normalise. Do not edit by hand — see scripts/normalise-logos.mjs.",
      canvas: CANVAS,
      logos: Object.fromEntries(Object.entries(manifest).sort()),
    },
    null,
    2,
  )}\n`,
);

console.log(
  `\n${files.length} logos: ${(before / 1024).toFixed(0)} KB to ${(after / 1024).toFixed(0)} KB` +
    `\nmanifest: ${path.relative(process.cwd(), MANIFEST)}`,
);
