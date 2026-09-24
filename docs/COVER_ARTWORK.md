# Publication cover artwork

The canonical publication artwork is the pair of user-approved images supplied on 2026-09-24:

- `content/en/assets/Copertina.jpg` — the final user-supplied front cover artwork. It is used directly, without generative reconstruction or visual modification.
- `content/en/assets/ChatGPT Image Sep 24, 2026, 07_22_10 PM (1).png` — the final user-supplied back-cover artwork. It is used directly, without generative reconstruction or visual modification.

The repository keeps both original uploaded source files. The publication workflows pin the exact SHA256 digest, image format and dimensions of both assets so an accidental replacement or generated substitute fails CI.

The artwork itself is fixed. The Latin-script title, subtitle and author are live/selectable text overlaid by the publication system and localized for each language. The vertical Chinese inscription and red seal remain part of the approved front artwork.

This provenance note deliberately lives outside the translatable book source so a purely technical asset change does not invalidate otherwise current language editions.
