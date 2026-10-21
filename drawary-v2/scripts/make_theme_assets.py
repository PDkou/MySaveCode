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

def compose_logo(base, theme, symbol_only=False):
    """The in-app logo in a theme: the wordmark recoloured, and the lavender flower replaced by that theme's own approved flower
    (assets/theme/theme_flower_<theme>.webp) with the same white sticker outline. symbol_only: just the flower (brand_symbol_flower_small)."""
    from PIL import ImageFilter
    base = base.convert('RGBA')
    W, H = base.size
    alpha = np.asarray(base)[..., 3]
    flower = Image.open(f'public/assets/theme/theme_flower_{theme}.webp').convert('RGBA')
    flower = flower.crop(flower.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
    if symbol_only:
        x0 = W
    else:
        cols = (alpha > 20).sum(0)
        lo, hi = int(W * 0.12), int(W * 0.34)
        x0 = lo + int(np.argmin(cols[lo:hi]))        # the gap between the flower and the "D"
    ys, xs = np.where(alpha[:, :x0] > 20)
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    halo = max(2, round(0.075 * H)) if not symbol_only else max(2, round(0.07 * H))
    box_w, box_h = bx1 - bx0 + 1 - 2 * halo, by1 - by0 + 1 - 2 * halo
    # the same footprint as the lavender flower it replaces: as tall as its box, or as wide as the gap before the "D" allows
    k = min(box_h / flower.height, (box_w + halo) / flower.width)
    fw, fh = max(1, round(flower.width * k)), max(1, round(flower.height * k))
    flower = flower.resize((fw, fh), Image.LANCZOS)
    cx, cy = (bx0 + bx1) // 2, (by0 + by1) // 2
    px, py = cx - fw // 2, cy - fh // 2
    # white sticker outline: the flower's shape grown by `halo` with a round (not square) reach, corners softened
    from scipy import ndimage
    mask = Image.new('L', (W, H), 0)
    mask.paste(flower.getchannel('A'), (px, py))
    solid = np.asarray(mask) > 40
    dist = ndimage.distance_transform_edt(~solid)
    grown = np.clip(halo + 0.5 - dist, 0, 1)
    grown = ndimage.gaussian_filter(grown, halo * 0.3)                  # rounds the corners left by flat-cut artwork
    grown = np.clip((grown - 0.5) * 3 + 0.5, 0, 1)                       # back to a crisp but anti-aliased edge
    grown = Image.fromarray(np.round(grown * 255).astype(np.uint8), 'L')
    sticker = Image.merge('RGBA', (Image.new('L', (W, H), 255),) * 3 + (grown,))
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    layer.paste(flower, (px, py))
    if symbol_only:
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    else:
        out = recolor(base, theme)
        arr = np.asarray(out).copy(); arr[:, :x0, 3] = 0       # drop the old flower, keep the wordmark and its outline
        out = Image.fromarray(arr, 'RGBA')
    out.alpha_composite(sticker)
    out.alpha_composite(layer)
    return out

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
            compose_logo(src, theme, symbol_only=name.startswith('brand_symbol')).save(dst, 'WEBP', lossless=True, method=6)
            n += 1
    print(n, 'files')
