"""
Rebuilds the bottom nav's four icon pictures and its "+" button at 4x resolution.
The approved nav ships them as 1x pictures (a 41 x 58 icon, a 55 px button), which look soft on phone screens (2.6-3x pixel
density). The same icons exist at ~150 px in public/assets/ui-icons; here each of them is placed into the very same box the
old small picture filled, so nothing moves or changes shape.
  neutral_{home,search,stats,settings}_cluster.png  (same file names, now 4x; CSS shows them at the old size)
  plus_button_hires.png                             (drawn over the "+" button of the 1x footer picture)
Run from drawary-v2/ (then python3 scripts/make_theme_assets.py for the theme copies):  python3 scripts/make_nav_hires.py
Needs the ORIGINAL small clusters: it reads them from git (HEAD) if the working files are already 4x.
"""
import io, subprocess
import numpy as np
from PIL import Image

S = 4
ICONS = {'home': 'icon_home', 'search': 'icon_search', 'stats': 'icon_grid', 'settings': 'icon_flower'}

def original(path):
    data = Image.open(path)
    if data.height >= 58 * 2:      # already rebuilt: take the 1x picture from the first commit that has it
        rev = subprocess.run(['git', 'log', '--diff-filter=A', '--format=%H', '--', path], capture_output=True, text=True).stdout.split()[-1]
        raw = subprocess.run(['git', 'show', f'{rev}:drawary-v2/{path}'], capture_output=True).stdout
        data = Image.open(io.BytesIO(raw))
    return data.convert('RGBA')

def bbox(im, thresh=20, rows=None):
    a = np.asarray(im.getchannel('A'))
    if rows: a = a[:rows]
    ys, xs = np.where(a > thresh)
    return xs.min(), ys.min(), xs.max(), ys.max()

for tab, icon in ICONS.items():
    path = f'public/assets/nav/neutral_{tab}_cluster.png'
    old = original(path)
    x0, y0, x1, y1 = bbox(old, rows=36)             # the icon part of the old picture (the lower part was the label, clipped away)
    ui = Image.open(f'public/assets/ui-icons/{icon}.webp').convert('RGBA')
    ui = ui.crop(ui.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
    bw, bh = (x1 - x0 + 1) * S, (y1 - y0 + 1) * S
    k = min(bw / ui.width, bh / ui.height)
    ui = ui.resize((round(ui.width * k), round(ui.height * k)), Image.LANCZOS)
    out = Image.new('RGBA', (old.width * S, old.height * S), (0, 0, 0, 0))
    out.paste(ui, (x0 * S + (bw - ui.width) // 2, y0 * S + (bh - ui.height) // 2), ui)
    out.save(path, 'PNG', optimize=True)

# "+" button: measured on the footer picture (purple disc), drawn from the approved add icon
base = np.asarray(Image.open('public/assets/nav/footer_background_plus_only.webp').convert('RGB')).astype(int)
m = (base[..., 2] > 200) & (base[..., 0] < 200) & (base[..., 1] < 190)
ys, xs = np.where(m)
px0, py0, px1, py1 = xs.min(), ys.min(), xs.max(), ys.max()
ui = Image.open('public/assets/ui-icons/icon_add.webp').convert('RGBA')
ui = ui.crop(ui.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
GROW = 1                                              # px (at 1x) the disc is drawn larger than the measured one, so the soft edge of the 1x picture is covered
size = (px1 - px0 + 1 + 2 * GROW) * S
ui = ui.resize((size, size), Image.LANCZOS)
# the add icon's outermost ring is a darker rim; take it off so the disc matches the footer picture's soft look
from scipy import ndimage
a = np.asarray(ui.getchannel('A')).astype(float) / 255
inside = a > 0.5
dist = ndimage.distance_transform_edt(inside)
a2 = np.clip((dist - 3.0) / 1.5, 0, 1) * a
ui.putalpha(Image.fromarray(np.round(a2 * 255).astype(np.uint8), 'L'))
out = Image.new('RGBA', (390 * S, 94 * S), (0, 0, 0, 0))
out.paste(ui, ((px0 - GROW) * S, (py0 - GROW) * S), ui)
out = out.crop(((px0 - GROW) * S - 8, (py0 - GROW) * S - 8, (px0 - GROW) * S + size + 8, (py0 - GROW) * S + size + 8))     # a little air around the disc
out.save('public/assets/nav/plus_button_hires.png', 'PNG', optimize=True)
print('plus box', px0, py0, px1, py1)
