# V2-12-16 Accessibility audit (axe-core, real Chromium)

Tool: `scripts/a11y_audit.cjs` (axe-core 4.10, tags wcag2a/2aa/21a/21aa/best-practice) over 32 screens with sample data, Korean.
It changes nothing in the app. Status: **audit done; structure issues fixed; colour contrast NOT changed (design is locked).**

## Fixed (no visual change — before/after screenshots of 16 screens are pixel-identical apart from rendering noise ≤ 2/255)

- `landmark-no-duplicate-main`, `landmark-main-is-top-level` (24 screens): the app shell and each screen both had a `<main>`.
  The shell keeps the one `main`; the screens' own wrapper is now a `<section>` (46 files). No CSS selected the `main` tag.
- `aria-prohibited-attr` (#42 PIN dots): the dots have `aria-label` but no role → `role="img"`.
- `landmark-complementary-is-top-level` (#45 hint box): `<aside>` → `<div>`.

## Left as is, needs a decision: colour contrast (`color-contrast`, 146 text nodes on 29 screens)

Small secondary texts (hints, sub-lines, counters) in the approved pale grey-blue/grey-purple on cream/white are
2.0–4.3 : 1; WCAG AA asks 4.5 : 1 for text under 18 px. 89 distinct colour pairs, worst: `#b0b4c7` on cream (1.98, help footnote),
`#a0a7b7` (2.41), `#9b95af` on pink/lavender KPI cards (2.49), `#aaa5ae` (2.32). Also white-on-purple buttons (3.86–3.92) and
small purple labels on pale purple (3.7–4.3). Run `scripts/a11y_audit.cjs` for the full list per screen.
Changing them changes the approved look, so nothing was touched. Option if wanted: one small global step darker for the
~12 secondary text colours (same hue), previewed on a few screens first.

## Not an issue / noted

- `page-has-heading-one` on the splash only (it is a 1.6 s logo image with `alt="Drawary"`).
- Screen reader names: buttons carry `aria-label`s in all three languages (checked with axe `button-name`, `label`, `image-alt`: no failures).
- Android TalkBack itself was not run (no device).
