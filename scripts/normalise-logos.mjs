#!/usr/bin/env node
/**
 * Trim and downscale the team logos in public/teams.
 *
 *   npm run logos:normalise
 *
 * Supplied logos arrive on wildly different canvases. Some are tight to the
 * mark; others are square images holding a wide, thin logo — McLaren's fills
 * 22% of its canvas height and Cadillac's 28%. Fitted into a shared box those
 * render a few pixels tall while a tightly-cropped mark next to them fills it,
 * and the row looks arbitrary however the CSS is written. The fix has to
 * happen to the image.
 *
 * So: crop the fully transparent border, then cap the longest edge, since
 * these are drawn at 132px at the very largest.
 *
 * Idempotent — running it on already-trimmed files changes nothing. The
 * originals stay recoverable from git.
 */

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public", "teams");
const MAX_EDGE = 400;

const files = readdirSync(DIR).filter((f) => /\.(png|webp)$/i.test(f)).sort();
if (files.length === 0) {
  console.log("No logos in public/teams — nothing to do.");
  process.exit(0);
}

console.log("file              before            after             saved");

let before = 0;
let after = 0;

for (const file of files) {
  const full = path.join(DIR, file);
  const startBytes = statSync(full).size;
  const meta = await sharp(full).metadata();

  // threshold 1 crops only what is fully transparent, so a logo with a dark
  // mark on transparency keeps every pixel of the mark itself.
  let pipeline = sharp(full).trim({ threshold: 1 });

  const { info: trimmed } = await pipeline
    .clone()
    .toBuffer({ resolveWithObject: true });

  if (Math.max(trimmed.width, trimmed.height) > MAX_EDGE) {
    pipeline = pipeline.resize({
      width: trimmed.width >= trimmed.height ? MAX_EDGE : undefined,
      height: trimmed.height > trimmed.width ? MAX_EDGE : undefined,
      fit: "inside",
    });
  }

  const out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  const { info } = await sharp(out).toBuffer({ resolveWithObject: true });

  // Write only once the new buffer exists, so a failure cannot truncate the
  // file it was reading from.
  await sharp(out).toFile(full);

  before += startBytes;
  after += out.length;

  console.log(
    `${file.padEnd(17)}` +
      `${`${meta.width}x${meta.height}`.padEnd(12)}${`${(startBytes / 1024).toFixed(0)}KB`.padStart(6)}` +
      `  ${`${info.width}x${info.height}`.padEnd(12)}${`${(out.length / 1024).toFixed(0)}KB`.padStart(6)}` +
      `   ${(100 - (out.length / startBytes) * 100).toFixed(0)}%`,
  );
}

console.log(
  `\n${files.length} logos: ${(before / 1024).toFixed(0)} KB to ${(after / 1024).toFixed(0)} KB`,
);
