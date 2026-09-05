# Fonts for generated images

Two static Inter weights, latin subset, 31 KB each.

These exist for `src/app/opengraph-image.tsx` and nothing else. The site itself
loads Inter through `next/font/google` and does not read these.

They have to be committed. `ImageResponse` needs real font data, and what
`next/font/google` leaves in `.next` is hash-named **woff2**, which satori
cannot read and whose filenames are not stable enough to look up anyway. The
alternatives were shipping the card in a generic sans on a design-led entry, or
fetching from Google Fonts during `next build` — which would put a network call
on the deploy path for a project that is deliberately zero-cost and offline-safe.

Inter is licensed under the SIL Open Font License 1.1, which permits
redistribution. Taken from the `@fontsource/inter` package (v5.1.0), which
repackages the upstream fonts from https://github.com/rsms/inter.
