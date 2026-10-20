# V2-12-16 Accessibility audit (axe-core, real Chromium)

Tool: `scripts/a11y_audit.cjs` (axe-core 4.10, tags wcag2a/2aa/21a/21aa/best-practice) over 32 screens with sample data, Korean.
It changes nothing in the app. Status: **audit done; structure issues and text-colour contrast fixed (3 contrast nodes remain, see below).**

## Fixed (no visual change — before/after screenshots of 16 screens are pixel-identical apart from rendering noise ≤ 2/255)

- `landmark-no-duplicate-main`, `landmark-main-is-top-level` (24 screens): the app shell and each screen both had a `<main>`.
  The shell keeps the one `main`; the screens' own wrapper is now a `<section>` (46 files). No CSS selected the `main` tag.
- `aria-prohibited-attr` (#42 PIN dots): the dots have `aria-label` but no role → `role="img"`.
- `landmark-complementary-is-top-level` (#45 hint box): `<aside>` → `<div>`.

## Colour contrast — applied 2026-10-20 (owner chose "진하게")

Small secondary texts (hints, sub-lines, counters) were 2.0–4.3 : 1 against the 4.5 : 1 that WCAG AA asks for.
75 text colours were darkened, same hue and saturation, only as far as needed (`scripts/contrast_map.json`, applied to
`color:` declarations and `--*muted*`/`--*copy*` variables by `scripts/apply_contrast_fix.py`; backgrounds, borders and images
untouched). Audit: 146 failing text nodes → 3. A `var(--tc-x,#x)` text colour keeps its variable, so the other colour themes keep
their own recoloured value — **the audit and this change cover the default (lavender) theme only; coral/sage/mustard/sky not re-checked.**
Still below 4.5 : 1 (not text colours, so not touched): white text on the purple buttons "적용" (3.86) and the FAQ tab (3.92), and the
"라벤더" name in the theme picker (4.23).

## Not an issue / noted

- `page-has-heading-one` on the splash only (it is a 1.6 s logo image with `alt="Drawary"`).
- Screen reader names: buttons carry `aria-label`s in all three languages (checked with axe `button-name`, `label`, `image-alt`: no failures).
- Android TalkBack itself was not run (no device).
