# V2-12-17 Punctuation / whitespace sweep (checked 2026-10-20)

All 832 KR/JA/EN text entries scanned (double spaces, space before punctuation, leading/trailing space, ASCII vs full-width
punctuation in Japanese, final punctuation of sentences, ellipsis, KR↔JA↔EN period agreement).

- Fixed: Korean spacing of helper verbs, one rule app-wide: `해 주세요` (106 uses; 3 were `해주세요`) and `해보세요` (10 uses; 1 was `해 보세요`).
- Japanese: no ASCII commas / periods / `?!`; no English or Korean full-width marks; no double or edge spaces anywhere.
- Left as is: 22 short Korean lines without a final period (headings, labels, status lines such as "백업하고 있어요", "{interval}{unit}마다") — they are
  titles/labels, not sentences; `.zip` / `.json` file names keep their leading dot by design.
- Not checked: text baked into approved images (it cannot be changed by code).
