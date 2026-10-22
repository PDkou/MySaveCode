#!/usr/bin/env python3
"""Builds the Android app icon set from the owner's icon illustration (a rounded-square picture on a white canvas).

  python3 -I scripts/make_app_icon.py <source.png> [--preview <dir>]

Writes (relative to the repo):
  android/app/src/main/res/mipmap-nodpi/ic_launcher_foreground.webp   108dp layer, the picture on transparent
  android/app/src/main/res/mipmap-nodpi/ic_launcher_background.webp   108dp layer, the picture's lavender, smooth
  android/app/src/main/res/drawable-nodpi/splash_launcher.webp        Android 10-11 splash: the icon as a circle
  release/store/play_icon_512.png                                     Play Store icon, full square (Play rounds it)
The picture is kept as drawn; only the white corners outside its rounded shape are replaced by a gradient taken from the picture's
own edge colours, so the icon is a full-bleed square that any phone's mask (circle, squircle, rounded square) can cut.
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_path = sys.argv[1]
preview = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None

src = Image.open(src_path).convert('RGB')
a = np.asarray(src).astype(np.int32)
H, W, _ = a.shape

# the picture = everything that is not the white canvas around it
white = a.min(axis=2) >= 244
lab, n = ndi.label(white)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
outside = np.isin(lab, list(border))
art_full = ndi.binary_fill_holes(~outside)
art = ndi.binary_erosion(art_full, iterations=9)       # drop the white anti-alias fringe
ys, xs = np.where(art)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
aw = (x1 - x0 + 1)
# feathered edge: the picture melts into the background, no visible frame
alpha = Image.fromarray((ndi.gaussian_filter(art.astype(np.float32), 2.0) * 255).astype(np.uint8))
art_rgba = src.convert('RGBA'); art_rgba.putalpha(alpha)

# Background: the picture's own colours continued outward. Everything outside the picture is filled by diffusion from its edge
# pixels (on a small grid), so the soft shading at the picture's rim carries on smoothly instead of ending in a visible frame.
def diffuse_background(size_small=216, pad=0.5):
    """Colours for a canvas that is (1 + 2*pad) times the picture's box, picture box in the middle."""
    box = int(max(x1 - x0, y1 - y0) + 1)
    full = int(round(box * (1 + 2 * pad)))
    canvas = np.zeros((full, full, 3), np.float32); known = np.zeros((full, full), bool)
    ox, oy = (full - (x1 - x0 + 1)) // 2, (full - (y1 - y0 + 1)) // 2
    sub = a[y0:y1 + 1, x0:x1 + 1].astype(np.float32); sk = art[y0:y1 + 1, x0:x1 + 1]
    canvas[oy:oy + sub.shape[0], ox:ox + sub.shape[1]] = sub; known[oy:oy + sub.shape[0], ox:ox + sub.shape[1]] = sk
    # the rim of the picture only (content inside is not wanted): blur the known region first so hair/leaves near the rim do not smear
    f = size_small / full
    cs = np.stack([ndi.zoom(canvas[..., i], f, order=1) for i in range(3)], -1)
    ks = ndi.zoom(known.astype(np.float32), f, order=1) > 0.99
    ks = ndi.binary_erosion(ks, iterations=2)
    # heavy blur of the known region's colours, then keep only the outermost ring as the boundary condition
    ring = ks & ~ndi.binary_erosion(ks, iterations=6)
    cs_b = np.stack([ndi.gaussian_filter(np.where(ks, cs[..., i], 0), 3) / np.maximum(ndi.gaussian_filter(ks.astype(np.float32), 3), 1e-3) for i in range(3)], -1)
    img = np.where(ks[..., None], cs_b, cs_b[ks].mean(axis=0))
    unknown = ~ks
    for _ in range(4000):                               # Jacobi diffusion into the unknown area
        nb = (np.roll(img, 1, 0) + np.roll(img, -1, 0) + np.roll(img, 1, 1) + np.roll(img, -1, 1)) / 4
        img = np.where(unknown[..., None], nb, img)
    return img, full, ox, oy

DIFF, DFULL, DOX, DOY = diffuse_background()

def gradient(size, art_frac):
    """Background for a size x size canvas whose picture is `art_frac` of the canvas wide (centred)."""
    box_w = x1 - x0 + 1
    px_per_canvas = box_w / (size * art_frac)            # picture pixels per canvas pixel
    s = (np.arange(size) - size / 2) * px_per_canvas      # canvas offset from centre, in picture pixels
    cx_d, cy_d = DOX + box_w / 2, DOY + (y1 - y0 + 1) / 2
    gx = (cx_d + s) * (DIFF.shape[1] / DFULL); gy = (cy_d + s) * (DIFF.shape[0] / DFULL)
    gx = np.clip(gx, 0, DIFF.shape[1] - 1); gy = np.clip(gy, 0, DIFF.shape[0] - 1)
    yy, xx = np.meshgrid(gy, gx, indexing='ij')
    out_ = np.stack([ndi.map_coordinates(DIFF[..., i], [yy, xx], order=1) for i in range(3)], -1)
    return Image.fromarray(np.clip(out_, 0, 255).astype(np.uint8))

def place(canvas_size, art_frac):
    """The picture centred on a transparent canvas, `art_frac` of the canvas wide."""
    scale = canvas_size * art_frac / aw
    crop = art_rgba.crop((int(x0 - 2), int(y0 - 2), int(x1 + 3), int(y1 + 3)))
    nw, nh = int(round(crop.width * scale)), int(round(crop.height * scale))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    layer.paste(crop, ((canvas_size - nw) // 2, (canvas_size - nh) // 2), crop)
    return layer

C = 1296                          # 108 dp at 12 px per dp, scaled down for the files
ART = 73 / 108                    # the picture's width inside the 108 dp adaptive canvas: about the visible 72 dp, so the picture's own rounded frame stays outside the phone's mask
fg = place(C, ART)
bg = gradient(C, ART)
comp = bg.convert('RGBA'); comp.alpha_composite(fg)

out = lambda rel: os.path.join(ROOT, rel)
fg.resize((648, 648), Image.LANCZOS).save(out('android/app/src/main/res/mipmap-nodpi/ic_launcher_foreground.webp'), quality=92, method=6)
bg.resize((648, 648), Image.LANCZOS).convert('RGB').save(out('android/app/src/main/res/mipmap-nodpi/ic_launcher_background.webp'), quality=92, method=6)

# Android 10-11 splash: the icon as the phone masks it (a circle over the 72 dp visible area), 432 px
vis = int(C * 72 / 108)
off = (C - vis) // 2
circle = comp.crop((off, off, off + vis, off + vis)).resize((432, 432), Image.LANCZOS)
m = Image.new('L', (1728, 1728), 0); ImageDraw.Draw(m).ellipse((0, 0, 1727, 1727), fill=255)
circle.putalpha(m.resize((432, 432), Image.LANCZOS))
circle.save(out('android/app/src/main/res/drawable-nodpi/splash_launcher.webp'), quality=92, method=6)

# Play Store icon: full square; Play rounds the corners itself, so keep the drawing well inside
S = 512
play = gradient(S, 1.03).convert('RGBA'); play.alpha_composite(place(S, 1.03))
os.makedirs(out('release/store'), exist_ok=True)
play.convert('RGB').save(out('release/store/play_icon_512.png'), optimize=True)

if preview:
    os.makedirs(preview, exist_ok=True)
    def masked(shape, size=400):
        img = comp.crop((off, off, off + vis, off + vis)).resize((size, size), Image.LANCZOS)
        mm = Image.new('L', (size * 4, size * 4), 0); d = ImageDraw.Draw(mm)
        if shape == 'circle': d.ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
        elif shape == 'squircle':
            n_ = 4.0; pts = []
            for i in range(721):
                th = i / 720 * 2 * np.pi
                cx_ = np.sign(np.cos(th)) * abs(np.cos(th)) ** (2 / n_); sy_ = np.sign(np.sin(th)) * abs(np.sin(th)) ** (2 / n_)
                pts.append((size * 2 + cx_ * (size * 2 - 1), size * 2 + sy_ * (size * 2 - 1)))
            d.polygon(pts, fill=255)
        else: d.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * .22), fill=255)
        img.putalpha(mm.resize((size, size), Image.LANCZOS)); return img
    sheet = Image.new('RGB', (400 * 3 + 80, 620), '#ece7fb')
    for i, sh in enumerate(('circle', 'squircle', 'rounded')):
        im = masked(sh); sheet.paste(im, (20 + i * 420, 20), im)
        for j, sz in enumerate((96, 48)):
            sm = im.resize((sz, sz), Image.LANCZOS); sheet.paste(sm, (20 + i * 420 + j * 120, 450), sm)
    sheet.save(os.path.join(preview, 'icon_masks.png'))
    comp.convert('RGB').resize((600, 600), Image.LANCZOS).save(os.path.join(preview, 'icon_full_canvas.png'))
    play.convert('RGB').save(os.path.join(preview, 'play_icon_512.png'))
    print('art box', x0, x1, y0, y1)
