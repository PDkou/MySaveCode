"""
Makes the theme versions of the accent-coloured artwork (UI icons, field-type
icons, bottom-nav parts): public/assets-theme/<theme>/<dir>/<file>.
Only pixels in the lavender hue family change (feathered at the edges), so
white, pink, yellow, skin and outlines stay exactly as approved. The originals
are never touched. The mascot, status illustrations, drawer category icons,
splash, app icon and store images are NOT recoloured (character / category colour / brand identity). The in-app header
logo (brand_lockup_horizontal, brand_symbol_flower_small, the search screen's brand.webp) is, at the owner's request.
Run from drawary-v2/:  python3 scripts/make_theme_assets.py
"""
import glob, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from theme_colors import THEMES

DIRS = ['ui-icons', 'field-types', 'nav']
# in-app header logos only: (folder, file)
SINGLE = [('brand', 'brand_lockup_horizontal.webp'), ('brand', 'brand_symbol_flower_small.webp'), ('global-search-approved', 'brand.webp')]
HUE_LO, HUE_HI, FEATHER = 235.0, 300.0, 14.0

def rgb_to_hls(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    l = (mx + mn) / 2
    d = mx - mn
    s = np.where(d == 0, 0, d / np.maximum(1 - np.abs(2 * l - 1), 1e-9))
    h = np.zeros_like(l)
    nz = d > 1e-9
    rc = nz & (mx == r); gc = nz & ~rc & (mx == g); bc = nz & ~rc & ~gc
    h[rc] = ((g - b)[rc] / d[rc]) % 6
    h[gc] = (b - r)[gc] / d[gc] + 2
    h[bc] = (r - g)[bc] / d[bc] + 4
    return h * 60, l, s

def hls_to_rgb(h, l, s):
    c = (1 - np.abs(2 * l - 1)) * s
    hp = (h % 360) / 60
    x = c * (1 - np.abs(hp % 2 - 1))
    z = np.zeros_like(c)
    sectors = [(c, x, z), (x, c, z), (z, c, x), (z, x, c), (x, z, c), (c, z, x)]
    idx = np.floor(hp).astype(int) % 6
    r = np.choose(idx, [t[0] for t in sectors]); g = np.choose(idx, [t[1] for t in sectors]); b = np.choose(idx, [t[2] for t in sectors])
    m = l - c / 2
    return np.stack([r + m, g + m, b + m], -1)

def ramp(x, lo, hi):
    return np.clip((x - lo) / (hi - lo), 0, 1)

def recolor(img, theme):
    dh, sr, lr = THEMES[theme]
    a = np.asarray(img.convert('RGBA')).astype(np.float64) / 255
    rgb, alpha = a[..., :3], a[..., 3]
    h, l, s = rgb_to_hls(rgb)
    # 1 inside the lavender window, falling to 0 over FEATHER degrees outside; needs real colour (saturation)
    w = ramp(h, HUE_LO - FEATHER, HUE_LO) * (1 - ramp(h, HUE_HI, HUE_HI + FEATHER)) * ramp(s, 0.06, 0.2)
    # same rule as theme_colors.shift(): strong accents take the theme's saturation/lightness ratio, light tints only change hue
    x = np.clip((0.90 - l) / 0.20, 0, 1)
    acc = x * x * (3 - 2 * x)
    h2 = (h + dh) % 360
    s2 = np.minimum(1, s * (1 + (sr - 1) * acc))
    l2 = np.minimum(1, l * (1 + (lr - 1) * acc))
    shifted = hls_to_rgb(h2, l2, s2)
    out = rgb * (1 - w[..., None]) + shifted * w[..., None]
    res = np.concatenate([out, alpha[..., None]], -1)
    return Image.fromarray(np.round(np.clip(res, 0, 1) * 255).astype(np.uint8), 'RGBA')

if __name__ == '__main__':
    n = 0
    for d in DIRS:
        for f in sorted(glob.glob(f'public/assets/{d}/*')):
            if not f.lower().endswith(('.webp', '.png')): continue
            src = Image.open(f)
            for theme in THEMES:
                dst = f'public/assets-theme/{theme}/{d}/{os.path.basename(f)}'
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                out = recolor(src, theme)
                if dst.endswith('.webp'): out.save(dst, 'WEBP', lossless=True, method=6)
                else: out.save(dst, 'PNG', optimize=True)
                n += 1
    for d, name in SINGLE:
        src = Image.open(f'public/assets/{d}/{name}')
        for theme in THEMES:
            dst = f'public/assets-theme/{theme}/{d}/{name}'
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            recolor(src, theme).save(dst, 'WEBP', lossless=True, method=6)
            n += 1
    print(n, 'files')
