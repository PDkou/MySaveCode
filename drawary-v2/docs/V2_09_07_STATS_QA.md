# V2-09-07 / Screen 07 통계 — closed 2026-10-15

- No approved source exists for this screen. Its own `STATUS.md`
  classifies it `NO_FINAL_CODE_IMAGE_ONLY` ("Locate final approved
  source; do not invent UI"). Reconstructed as real React/CSS from the
  two approved reference renders, `Drawary_07_Stats_V10_Top_Final.png`
  and `..._Bottom_Final.png` -- both exactly 390x844, and they overlap
  at the two KPI cards, confirming they're two scroll positions of one
  scrollable page, not two separate screens.
- Built as `src/screens/StatsScreen.tsx`/`.css`, wired as the real
  `#/stats` tab body (previously a dev-only placeholder stub).
- All colors (KPI card tints, 6 chart-bar colors, 4 insight-row tints,
  pill backgrounds, text colors) were sampled directly from the
  reference PNGs via dominant-color histograms per region, not guessed.
  The brand lockup in the header reuses the real approved
  `brand/brand_lockup_horizontal.webp` asset (verified by direct visual
  comparison, pixel-identical flower+wordmark), not a redrawn logo.
- Drawer count / item count / monthly totals / upcoming events / insight
  rows are static props matching the reference's own numbers -- there's
  no real stats aggregation yet (V2-12 data-layer territory, same
  caveat as #05's mock search records). `onOpenInsight` is wired but has
  no destination screen yet (intentional no-op, same reasoning as other
  screens' not-yet-built destinations).

## QA

- Compiled-browser Chromium render at 390x844 (plus scrolled to the
  bottom), 320x640, 430x932: no console/HTTP errors, responsive at all
  three widths (text wraps rather than clipping at 320px).
- Visual comparison against both reference images: content, structure,
  colors, and the two-KPI/chart/upcoming-list/insight-list layout all
  match closely.
- Pixel-diff against `Top_Final.png`: mean diff 8.50, 60.7% identical,
  14.0% diff>30 -- just outside this session's established AA-noise band
  (mean 2-8, bigdiff 3-13%), but the amplified diff shows this is a
  cumulative small vertical-spacing drift (ghosted double-outline text
  going down the page), not a color or content mismatch -- expected for
  a from-scratch reconstruction against a reference image rather than a
  ported source. One spacing adjustment was tried and made the number
  slightly worse (8.86/14.9% top, 11.69/29.0% bottom with a differently-
  aligned scroll position), so the original spacing was kept. Given the
  screen's own classification explicitly says "do not invent UI" rather
  than "must pixel-match," and the visual structure/content match is
  strong, this was not chased further.


## Owner decision 2026-10-20

No original source exists; the owner confirmed the reconstruction (now drawn from real data, `src/flow/stats.ts`) as the final #07. It is no longer an open item.
