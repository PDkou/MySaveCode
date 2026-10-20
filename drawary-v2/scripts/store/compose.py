"""Store screenshots, step 2: puts capture.cjs's app captures into the approved empty phone frames
(public/assets/store/store_screenshot_bg_candidate_{a..e}.webp), adds the caption overlay, writes
release/store/<KR|JP|EN>/screenshot_0N_*.png at 1080 x 1920.
Usage: python3 compose.py <captureDir>
Only the white inside of the phone screen is replaced (flood fill), so the mascot / decorations that overlap the
phone edge stay on top of the capture.
"""
import sys, os
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
CAP = sys.argv[1]
SIZE = (1080, 1920)
NAMES = {'A': 'home', 'B': 'new_drawer', 'C': 'search', 'D': 'drawer', 'E': 'backup'}
RECT = (184, 394, 757, 1527)  # phone screen in the 941 x 1672 frame (x0, y0, x1, y1)


def interior_mask(frame: Image.Image) -> np.ndarray:
    a = np.array(frame.convert('RGB')).astype(int)
    white = a.min(axis=2) >= 250
    h, w = white.shape
    x0, y0, x1, y1 = RECT
    seen = np.zeros_like(white)
    # seed on every white pixel of the middle row band so a mascot over the middle cannot cut the fill off
    q = deque()
    for y in range(y0 + 40, y1 - 40, 40):
        for x in range(x0 + 40, x1 - 40, 40):
            if white[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if y0 <= ny < y1 and x0 <= nx < x1 and white[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


for lang, folder in (('KR', 'KR'), ('JP', 'JP'), ('EN', 'EN')):
    os.makedirs(os.path.join(ROOT, 'release', 'store', folder), exist_ok=True)
    for i, s in enumerate('ABCDE', 1):
        frame = Image.open(os.path.join(ROOT, 'public/assets/store', f'store_screenshot_bg_candidate_{s.lower()}.webp')).convert('RGB')
        mask = interior_mask(frame)
        sx = SIZE[0] / frame.width
        big = frame.resize(SIZE, Image.LANCZOS)
        m = Image.fromarray((mask * 255).astype('uint8')).resize(SIZE, Image.LANCZOS)
        x0, y0, x1, y1 = RECT
        box = (round(x0 * sx), round(y0 * sx), round(x1 * sx), round(y1 * sx))
        cap = Image.open(os.path.join(CAP, f'{lang}_{s}.png')).convert('RGB').resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
        layer = Image.new('RGB', SIZE, (255, 255, 255))
        layer.paste(cap, box[:2])
        big.paste(layer, (0, 0), m)
        text = Image.open(os.path.join(CAP, f'{lang}_{s}_caption.png')).convert('RGBA')
        out = big.convert('RGBA'); out.alpha_composite(text)
        path = os.path.join(ROOT, 'release', 'store', folder, f'screenshot_0{i}_{NAMES[s]}.png')
        out.convert('RGB').save(path, optimize=True)
        print(path, out.size)
