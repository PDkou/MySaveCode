"""Fits the owner's new high-resolution mascot pictures (2026-10-21 zip) into the app's existing picture slots.
Each is trimmed to its visible area, scaled to about 3x the size it is shown at (crisp on 3x phones), and saved as WebP.
Usage: python3 scripts/make_new_art.py <folder holding 1.png ... 9.png> [<second folder holding 1.png ... 4.png>]"""
import sys
import numpy as np
from PIL import Image

SRC = sys.argv[1]
A = 'public/assets/'

def load(n):
    return Image.open(f'{SRC}/{n}.png').convert('RGBA')

def trim(im, pad=0):
    a = np.asarray(im.getchannel('A')) > 12
    ys, xs = np.where(a)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))

def fit(im, max_w, max_h):
    k = min(max_w / im.width, max_h / im.height)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)

def save(im, path, q=92):
    im.save(A + path, 'WEBP', quality=q, method=6)
    print(path, im.size)

# 1 -> onboarding intro (366 x 226 shown, picture covers the width, 3x)
im = trim(load(1), 8)
art = fit(im, 1100 - 40, 678 - 20)
bg = Image.new('RGBA', (1100, 678), (255, 253, 248, 255))
bg.alpha_composite(art, ((1100 - art.width) // 2, (678 - art.height) // 2 + 6))
save(bg.convert('RGB'), 'onboarding/final/intro.webp')

# 2 -> empty home mascot (placed on a cream 390x844 sheet at 3x; the logo is a real image now) and the "lean on drawer" mascot
m = trim(load(2), 6)
sheet = Image.new('RGBA', (1170, 2532), (255, 250, 240, 255))
w = round(210 * 3)
mm = fit(m, w, 10000)
sheet.alpha_composite(mm, (1170 // 2 - mm.width // 2, round(318 * 3) - mm.height))
save(sheet.convert('RGB'), 'home/home_empty_art.webp')
save(fit(m, 640, 640), 'mascot/mascot_lean_on_drawer.webp')

# 3 -> help mascot (105 x 119 shown)
save(fit(trim(load(3), 6), 480, 480), 'mascot/mascot_help_approved.webp')
# 5 -> creation complete (214 wide shown)
save(fit(trim(load(5), 6), 700, 700), 'mascot/mascot_celebrate.webp')
# 6 -> warning (191 x 156 shown)
save(fit(trim(load(6), 6), 640, 640), 'states/generic/state_generic_warning.webp')
# 8 -> the big "+" (72 x 72 shown)
save(fit(trim(load(8), 2), 288, 288), 'ui-icons/ui_add.webp')
# 9 -> backup progress (about 260 wide shown)
save(fit(trim(load(9), 6), 780, 780), 'mascot/mascot_backup_progress.webp')
# 7 -> guide step 3 (181 x 138 shown, picture covers the box)
g = trim(load(7), 4)
r = 181 / 138
cw, ch = (g.width, round(g.width / r)) if g.width / g.height < r else (round(g.height * r), g.height)
canvas = Image.new('RGBA', (cw, ch), (255, 249, 234, 255))
canvas.alpha_composite(g, ((cw - g.width) // 2, (ch - g.height) // 2))
save(canvas.resize((724, 552), Image.LANCZOS).convert('RGB'), 'guide/guide_step3_focus.webp')

# second delivery (same day): 1 warning triangle, 2 pink speech bubble (feedback icons), 3 guide step 2, 4 guide step 4
if len(sys.argv) > 2:
    SRC2 = sys.argv[2]
    def load2(n):
        return Image.open(f'{SRC2}/{n}.png').convert('RGBA')
    save(fit(trim(load2(1), 2), 160, 160), 'ui-icons/feedback_error_from_approved.webp', 94)
    save(fit(trim(load2(2), 2), 160, 160), 'ui-icons/feedback_other_from_approved.webp', 94)
    def step(n, shown_w, shown_h, bgc, out):
        g = trim(load2(n), 4)
        r = shown_w / shown_h
        cw, ch = (g.width, round(g.width / r)) if g.width / g.height < r else (round(g.height * r), g.height)
        cv = Image.new('RGBA', (cw, ch), bgc + (255,))
        cv.alpha_composite(g, ((cw - g.width) // 2, (ch - g.height) // 2))
        save(cv.resize((round(shown_w * 4), round(shown_h * 4)), Image.LANCZOS).convert('RGB'), out)
    step(3, 180, 132, (255, 253, 248), 'guide/guide_step2_focus.webp')
    step(4, 186, 130, (255, 250, 245), 'guide/guide_step4_focus.webp')
