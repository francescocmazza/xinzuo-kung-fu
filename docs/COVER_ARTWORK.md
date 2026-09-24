# Publication cover artwork

The canonical publication artwork is the pair of user-approved images supplied on 2026-09-24:

- `content/en/assets/CoverFront.webp` — the approved kitchen still-life front cover with the knife, peppers, basil, vertical Chinese inscription and red seal.
- `content/en/assets/CoverBack.webp` — the approved matching dark-wood background.

The repository stores lossless WebP conversions of those source PNGs. The conversion is pixel-identical in RGB; it changes only the technical file format. The publication workflows pin the exact SHA256 digest and dimensions of both assets so an accidental replacement or generated substitute fails CI.

The artwork itself is fixed. The Latin-script title, subtitle and author are live/selectable text overlaid by the publication system and localized for each language. The vertical Chinese inscription and red seal remain part of the approved front artwork.

This provenance note deliberately lives outside the translatable book source so a purely technical asset change does not invalidate otherwise current language editions.
