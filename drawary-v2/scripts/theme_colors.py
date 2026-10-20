"""
Shared by the theme tools: what counts as an "accent" colour (the lavender
family) and how it is moved to another theme.

The five main colours are the approved ones from DRAWARY_THEME_GRADIENT_SPEC
(2026-10-20). A lavender accent keeps its place relative to the lavender main
colour: hue moves by (theme hue - lavender hue); strong accents (lightness
below ~.7) also take on the theme's saturation and lightness *relative to
lavender's*, fading out for light tints (above ~.9), which only change hue so
they stay light pastels. So the main button colour lands on the theme's main
colour and every shade around it keeps its relationship (text / fill / tint /
border) from the approved design.
"""
import colorsys

MAIN = {
    'lavender': '#7657DF',
    'coral':    '#DF7C72',
    'sage':     '#6F9F7A',
    'mustard':  '#C89739',
    'sky':      '#5D9BD3',
}

def _rgb(hexs):
    return tuple(int(hexs[i:i + 2], 16) for i in (1, 3, 5))

def hls(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return h * 360, l, s

_LAV = hls(*_rgb(MAIN['lavender']))
LAVENDER_HUE = _LAV[0]

def _params(theme):
    h, l, s = hls(*_rgb(MAIN[theme]))
    return h - _LAV[0], s / _LAV[2], l / _LAV[1]   # hue shift, saturation ratio, lightness ratio

THEMES = {t: _params(t) for t in MAIN if t != 'lavender'}
TINT_RGB = {t: _rgb(MAIN[t]) for t in MAIN}

def accent_weight(l):
    """1 for strong accents, fading to 0 for light tints (smoothstep between .70 and .90)."""
    x = min(1.0, max(0.0, (0.90 - l) / 0.20))
    return x * x * (3 - 2 * x)

def is_accent(r, g, b):
    h, l, s = hls(r, g, b)
    return 235 <= h <= 300 and s >= 0.12 and not (s < 0.2 and l < 0.3)

def shift(r, g, b, theme):
    dh, sr, lr = THEMES[theme]
    h, l, s = hls(r, g, b)
    a = accent_weight(l)
    h = (h + dh) % 360
    s = min(1.0, s * (1 + (sr - 1) * a))
    l = min(1.0, l * (1 + (lr - 1) * a))
    r2, g2, b2 = colorsys.hls_to_rgb(h / 360, l, s)
    return round(r2 * 255), round(g2 * 255), round(b2 * 255)
