"""
One-off (kept for reference): wraps every lavender-family colour in src CSS as
`var(--tc-rrggbb, #rrggbb)` / `rgba(var(--tr-R-G-B, R,G,B), a)` so a theme can
re-define it. With no theme active the fallbacks are the original values, so
the approved lavender look is byte-for-byte the same colours.
Skipped on purpose: ThemeSettingsScreen.css (its own swatches), the Stats
tiles named `--lavender` (a category colour, not the theme), the #47 backup
spinner screen (approved as-is), and 3-digit/other non-accent colours.
"""
import glob, re, sys
from theme_colors import is_accent

SKIP_FILES = ('ThemeSettingsScreen.css', 'BackupProgressScreen.css', 'themes.css')
# `var(--tc-…,#…)` is already wrapped: matched first and left alone, so the tool can be run again after adding colours
HEX = re.compile(r'var\(--t[cr]-[^)]*\)|#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGB = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?=[,)])')

def expand(h):
    h = h.lower().lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return h

def hex_rep(m):
    if m.group(0).startswith('var('): return m.group(0)
    h = expand(m.group(0))
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    if not is_accent(r, g, b): return m.group(0)
    if len(h) == 8:
        a = round(int(h[6:8], 16) / 255, 3)
        return f'rgba(var(--tr-{r}-{g}-{b},{r},{g},{b}),{a})'
    return f'var(--tc-{h},#{h})'

def rgb_rep(m):
    r, g, b = (int(x) for x in m.groups())
    if not is_accent(r, g, b): return m.group(0)
    head = m.group(0)[:m.group(0).index('(') + 1]
    return f'{head}var(--tr-{r}-{g}-{b},{r},{g},{b})'

def convert(text, in_lavender_block=False):
    out = []
    # rule-by-rule so Stats' `--lavender` blocks can be left alone
    for chunk in re.split(r'(?<=\})', text):
        if '--lavender' in chunk.split('{')[0]:
            out.append(chunk); continue
        chunk = RGB.sub(rgb_rep, chunk)
        chunk = HEX.sub(hex_rep, chunk)
        out.append(chunk)
    return ''.join(out)

if __name__ == '__main__':
    for f in glob.glob('src/**/*.css', recursive=True):
        if f.endswith(SKIP_FILES): continue
        s = open(f).read()
        n = convert(s)
        if n != s:
            open(f, 'w').write(n); print('changed', f)
