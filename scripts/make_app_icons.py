"""Rebuild the app icon, adaptive icon, splash and favicon from the clay assets.

    pip install pillow
    python scripts/make_app_icons.py apps/mobile/assets apps/mobile/assets/images [preview.png]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

# Jed's ScreenBackdrop gradient: sky blue -> lavender -> mint.
STOPS = [(0.0, (0xD9, 0xEB, 0xFF)), (0.5, (0xED, 0xE7, 0xFC)), (1.0, (0xE4, 0xF8, 0xEE))]
BG = '#EAF4FF'  # colors.bg


def gradient(size):
    w, h = size
    img = Image.new('RGBA', size)
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (0.65 * y / (h - 1)) + (0.35 * x / (w - 1))
            for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
                if t <= t1:
                    k = (t - t0) / (t1 - t0)
                    px[x, y] = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1)) + (255,)
                    break
    # Soft white clay clouds and the sun from Jed's Bikol landscape (blended, not overwritten).
    over = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    s = w / 1024
    for cx, cy, r in [(830, 170, 74), (748, 196, 54), (900, 200, 54)]:
        d.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=(255, 255, 255, 215))
    cx, cy, r = 205, 205, 88
    d.ellipse([(cx - r - 22) * s, (cy - r - 22) * s, (cx + r + 22) * s, (cy + r + 22) * s], fill=(0xFF, 0xF0, 0xBD, 255))
    d.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=(0xFF, 0xE1, 0x94, 255))
    return Image.alpha_composite(img, over)


girl = Image.open(ASSETS / 'clay-girl.png').convert('RGBA')
girl = girl.crop(girl.getchannel('A').getbbox())
# Head and shoulders (with the tablet): the top ~62% of the figure, squared.
gw, gh = girl.size
bust = girl.crop((int(gw * 0.02), 0, int(gw * 0.98), int(gh * 0.58)))


def place(canvas, art, box_w, box_h, anchor_bottom=True, cx=0.5):
    art = art.copy()
    art.thumbnail((box_w, box_h), Image.LANCZOS)
    W, H = canvas.size
    x = int(W * cx - art.width / 2)
    y = H - art.height if anchor_bottom else (H - art.height) // 2
    canvas.alpha_composite(art, (x, y))
    return canvas


# 1. icon.png (1024): full-bleed gradient + bust rising from the bottom.
icon = place(gradient((1024, 1024)), bust, 1010, 1000)
icon.save(OUT / 'icon.png')

# 2. Adaptive icon (512): background gradient; foreground inside the 66% safe circle.
bg = gradient((1024, 1024)).resize((512, 512), Image.LANCZOS)
bg.save(OUT / 'android-icon-background.png')
fg = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
art = bust.copy()
art.thumbnail((372, 372), Image.LANCZOS)
# Bottom edge sits below the visible area (it ends ~427px), so the mask trims it softly.
fg.alpha_composite(art, ((512 - art.width) // 2, 452 - art.height))
fg.save(OUT / 'android-icon-foreground.png')

# 3. Monochrome (432): white silhouette of the same art (Android themed icons).
mono = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
m = bust.copy()
m.thumbnail((250, 250), Image.LANCZOS)
white = Image.new('RGBA', m.size, (255, 255, 255, 255))
white.putalpha(m.getchannel('A'))
mono.alpha_composite(white, ((432 - m.width) // 2, (432 - m.height) // 2))
mono.save(OUT / 'android-icon-monochrome.png')

# 4. Splash: the whole girl (shown on colors.bg).
splash = girl.copy()
splash.thumbnail((600, 600), Image.LANCZOS)
splash.save(OUT / 'splash-icon.png')

# 5. Favicon: the books-and-sprout logo from the asset sheet.
sheet = Image.open(ASSETS / 'pastel-asset-sheet.png').convert('RGBA')
books = sheet.crop((1021, 15, 1021 + 135, 15 + 143))
fav = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
books.thumbnail((46, 46), Image.LANCZOS)
fav.alpha_composite(books, ((48 - books.width) // 2, (48 - books.height) // 2))
fav.save(OUT / 'favicon.png')

# Preview sheet: icon, adaptive icon as a circle mask, monochrome on dark, splash.
prev = Image.new('RGBA', (1500, 420), (40, 44, 52, 255))
prev.alpha_composite(icon.resize((380, 380)), (20, 20))
adaptive = Image.alpha_composite(bg, fg).crop((85, 85, 427, 427)).resize((380, 380))
mask = Image.new('L', (380, 380), 0)
ImageDraw.Draw(mask).ellipse([0, 0, 379, 379], fill=255)
circle = Image.new('RGBA', (380, 380), (0, 0, 0, 0))
circle.paste(adaptive, (0, 0), mask)
prev.alpha_composite(circle, (420, 20))
prev.alpha_composite(mono.resize((380, 380)), (820, 20))
sp = Image.new('RGBA', (260, 380), BG)
s2 = splash.copy()
s2.thumbnail((200, 200))
sp.alpha_composite(s2, ((260 - s2.width) // 2, (380 - s2.height) // 2))
prev.alpha_composite(sp, (1220, 20))
if len(sys.argv) > 3:  # optional: a preview sheet to check the result
    prev.save(sys.argv[3])
print('wrote', sorted(p.name for p in OUT.iterdir()))
