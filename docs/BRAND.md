# Investor Property — brand reference

Source: `PDF Guideline.pdf` (Fiverr logo maker, designed by `tal_ni`). Captured here so the
values survive outside the PDF and are usable directly from code.

## Logo

Dark navy square tile. A gold line-art building cluster sits above a horizontal rule, with
`INVESTOR PROPERTY` set below it in light-weight off-white caps, letter-spaced.

The current in-repo logomark (`src/app/page.tsx`) is an **SVG approximation** drawn from the
guideline image, not the original vector artwork. If the source vector (SVG/AI/EPS) is
available from the designer, it should replace the approximation.

## Typeface

**Poppins 300 (Light).** This is the brand weight — headings and body both sit light rather
than bold. Heavier weights (400/500/600) are loaded for UI affordances like buttons, but
display text should stay at 300 to match the identity.

Loaded via `next/font/google` in `src/app/layout.tsx`.

## Colours

| Token | Hex | RGB | Use |
|---|---|---|---|
| Navy | `#26415E` | 38, 65, 94 | Primary brand colour — hero sections, logo tile, body text on light |
| Shell | `#F5F3F2` | 245, 243, 242 | Page background, text on navy |
| Navy deep | `#1A2E44` | — | Not in the guideline; derived darker navy for dark-mode backgrounds and button text |

## Gold gradient

A metallic sweep rather than a flat colour — it reads as brushed gold because it cycles light
→ dark → light. Stops from the guideline, in order:

`#E4C07E` → `#DFBB79` → `#D0AD6B` → `#B79653` → `#B39350` → `#B19252` → `#A98F57` →
`#B2965D` → `#CAAA6C` → `#E4C07E`

Implemented as `--gradient-gold` in `src/app/globals.css`, with two helper classes:

- `.text-gold-gradient` — gradient-filled text (used on the hero headline)
- `.rule-gold` — gradient hairlines and dividers

For flat gold fills (buttons, icons) use the `--brand-gold` / `--brand-gold-light` /
`--brand-gold-deep` tokens rather than the gradient, since a gradient on a small element just
reads as muddy.

## Applying it

All tokens are declared on `:root` in `globals.css` and exposed to Tailwind via `@theme inline`,
so they're available as utility classes: `bg-navy`, `text-shell`, `bg-gold`, `text-gold-light`,
`text-gold-deep`.
