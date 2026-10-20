"""Applies scripts/contrast_map.json: darkens (same hue) the text colours that fail WCAG AA 4.5:1.
Only `color:` declarations and `--*muted*` / `--*copy*` custom properties in src/**/*.css (not the generated themes.css) change;
backgrounds, borders and images are untouched. A var(--tc-x,#x) wrapper keeps its variable name, so the other colour
themes keep their own recoloured value; only the default (lavender) text becomes darker.
Usage: python3 scripts/apply_contrast_fix.py   (revert with: git checkout -- src)
"""
import glob, json, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MAP = json.load(open(os.path.join(ROOT, 'scripts', 'contrast_map.json')))
DECL = re.compile(r'((?<![-\w])color|--[\w-]*(?:muted|copy)[\w-]*)(\s*:\s*)([^;}\n]*)')
HEX = re.compile(r'#[0-9a-fA-F]{6}\b')
changed = 0
for f in glob.glob(os.path.join(ROOT, 'src', '**', '*.css'), recursive=True):
    if f.endswith('themes.css'):
        continue
    s = open(f, encoding='utf8').read()
    def fix(m):
        global changed
        val = HEX.sub(lambda h: MAP.get(h.group(0).lower(), h.group(0)), m.group(3))
        if val != m.group(3):
            changed += 1
        return m.group(1) + m.group(2) + val
    t = DECL.sub(fix, s)
    if t != s:
        open(f, 'w', encoding='utf8').write(t)
print('declarations changed:', changed)
