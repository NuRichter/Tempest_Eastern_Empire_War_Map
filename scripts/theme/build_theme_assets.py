"""
Tensura-themed interface assets.

    Sources of Truth/Tensura Theme/raw/*   (downloaded from the Tensura wiki; see manifest.json)
        ->  public/assets/theme/wallpapers/vol-NN-desktop.jpg   1920 x 1080
        ->  public/assets/theme/wallpapers/vol-NN-phone.jpg     1170 x 2532
        ->  public/assets/theme/wallpapers/thumb/vol-NN.webp    previews for the About panel
        ->  public/assets/theme/chibi/<name>.webp               transparent stickers
        ->  public/assets/theme/cursor/rimuru-32.png (+ -pointer) cursor images

Artwork © Fuse, Mitz Vah, Taiki Kawakami, Kodansha, Micro Magazine and the
Tensura production committee. Used in this fan project at the owner's
decision (licence "Open", as for the photocards), with the source of every
file recorded in the manifest. Re-run after changing the selection:

    python scripts/theme/build_theme_assets.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent.parent
RAW = ROOT / 'Sources of Truth' / 'Tensura Theme' / 'raw'
OUT = ROOT / 'public' / 'assets' / 'theme'

VOLUMES = {
    12: 'The march of 940,000',
    13: 'Into the Great Jura Forest',
    14: 'The labyrinth and the return',
    15: 'The long night at Dwargon',
    16: 'The summit and the peace',
}

CHIBI = {
    # name: (source file, white background to remove?)
    'slime-calm': ('Rimuru_Slime_Anime.png', False),
    'slime-alert': ('Rimuru_Slime_Anime_Alert.png', False),
    'slime-mitz-vah': ('Slime_Rimuru_Mitz_Vah.png', True),
    'slime-leaves': ('Rimuru_Tempest_Slime_KLN.png', True),
}


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    for name in (['georgiab.ttf', 'seguisb.ttf', 'arialbd.ttf'] if bold else ['georgia.ttf', 'segoeui.ttf', 'arial.ttf']):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def cover_fill(im: Image.Image, w: int, h: int) -> Image.Image:
    s = max(w / im.width, h / im.height)
    r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (r.width - w) // 2
    y = (r.height - h) // 2
    return r.crop((x, y, x + w, y + h))


def backdrop(im: Image.Image, w: int, h: int) -> Image.Image:
    bg = cover_fill(im, w, h).filter(ImageFilter.GaussianBlur(radius=max(w, h) // 40))
    shade = Image.new('RGB', (w, h), (8, 12, 16))
    return Image.blend(bg, shade, 0.55)


def shadowed(canvas: Image.Image, fg: Image.Image, x: int, y: int) -> None:
    sh = Image.new('RGBA', (fg.width + 80, fg.height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle((40, 40, 40 + fg.width, 40 + fg.height), fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    canvas.paste(sh, (x - 40 + 10, y - 40 + 16), sh)
    canvas.paste(fg, (x, y))


def wallpapers() -> None:
    out = OUT / 'wallpapers'
    (out / 'thumb').mkdir(parents=True, exist_ok=True)
    for vol, subtitle in VOLUMES.items():
        cover = Image.open(RAW / f'Light_Novel_Volume_{vol}_JP.jpg').convert('RGB')
        # Desktop: the cover on the right, the arc's title on the left.
        W, H = 1920, 1080
        d = backdrop(cover, W, H)
        ch = int(H * 0.86)
        fg = cover.resize((round(cover.width * ch / cover.height), ch), Image.LANCZOS)
        shadowed(d, fg, W - fg.width - 150, (H - ch) // 2)
        dr = ImageDraw.Draw(d)
        dr.text((150, 380), 'TEMPEST–EASTERN EMPIRE WAR', font=font(30), fill=(212, 171, 87))
        dr.text((146, 430), f'Volume {vol}', font=font(96), fill=(240, 242, 243))
        dr.text((150, 560), subtitle, font=font(40, bold=False), fill=(200, 206, 208))
        dr.text((150, H - 110), 'Campaign Atlas · fan-made · tempestwar.vercel.app', font=font(22, bold=False), fill=(150, 160, 165))
        dr.text((150, H - 76), 'Cover art © Fuse, Mitz Vah / Micro Magazine', font=font(18, bold=False), fill=(120, 130, 135))
        d.save(out / f'vol-{vol}-desktop.jpg', quality=86, optimize=True, progressive=True)
        # Phone: the cover full width, centred, over its own blur.
        W, H = 1170, 2532
        p = backdrop(cover, W, H)
        cw = int(W * 0.84)
        fg = cover.resize((cw, round(cover.height * cw / cover.width)), Image.LANCZOS)
        y = (H - fg.height) // 2 + 60
        shadowed(p, fg, (W - cw) // 2, y)
        dr = ImageDraw.Draw(p)
        dr.text((W // 2, y - 150), f'Volume {vol}', font=font(72), fill=(240, 242, 243), anchor='mm')
        dr.text((W // 2, y - 80), 'TEMPEST–EASTERN EMPIRE WAR', font=font(28), fill=(212, 171, 87), anchor='mm')
        dr.text((W // 2, H - 120), 'Cover art © Fuse, Mitz Vah / Micro Magazine', font=font(24, bold=False), fill=(130, 140, 145), anchor='mm')
        p.save(out / f'vol-{vol}-phone.jpg', quality=84, optimize=True, progressive=True)
        t = cover.copy()
        t.thumbnail((180, 256), Image.LANCZOS)
        t.save(out / 'thumb' / f'vol-{vol}.webp', 'WEBP', quality=80, method=6)


def knock_out_white(im: Image.Image) -> Image.Image:
    """White paper -> transparent, keeping line art; then a white sticker outline."""
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            lum = (r + g + b) / 3
            if lum > 242 and max(r, g, b) - min(r, g, b) < 18:
                px[x, y] = (r, g, b, 0)
            elif lum > 215 and max(r, g, b) - min(r, g, b) < 18:
                px[x, y] = (r, g, b, int(a * (242 - lum) / 27))
    return im


def sticker(im: Image.Image, pad: int = 6) -> Image.Image:
    alpha = im.getchannel('A')
    grown = alpha.filter(ImageFilter.MaxFilter(pad * 2 + 1))
    base = Image.new('RGBA', im.size, (255, 255, 255, 0))
    base.putalpha(grown)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.alpha_composite(base)
    out.alpha_composite(im)
    return out


def chibi() -> None:
    out = OUT / 'chibi'
    out.mkdir(parents=True, exist_ok=True)
    for stale in out.glob('*.webp'):
        if stale.stem not in CHIBI:
            stale.unlink()
    for name, (src, white) in CHIBI.items():
        im = Image.open(RAW / src).convert('RGBA')
        if white:
            im = knock_out_white(im)
        bbox = im.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
        if bbox:
            im = im.crop(bbox)
        canvas = Image.new('RGBA', (im.width + 20, im.height + 20), (0, 0, 0, 0))
        canvas.paste(im, (10, 10), im)
        canvas = sticker(canvas, 5)
        canvas.thumbnail((320, 320), Image.LANCZOS)
        canvas.save(out / f'{name}.webp', 'WEBP', quality=88, method=6)


def cursor() -> None:
    out = OUT / 'cursor'
    out.mkdir(parents=True, exist_ok=True)
    im = Image.open(RAW / 'Rimuru_Slime_Anime.png').convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    for size in (32, 48):
        c = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        s = im.copy()
        s.thumbnail((size - 4, size - 4), Image.LANCZOS)
        c.paste(s, ((size - s.width) // 2, size - s.height - 2), s)
        c.save(out / f'rimuru-{size}.png', optimize=True)
    # A pointer variant: the surprised slime, for links and buttons.
    im = Image.open(RAW / 'Rimuru_Slime_Anime_Alert.png').convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    c = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    im.thumbnail((30, 30), Image.LANCZOS)
    c.paste(im, ((32 - im.width) // 2, 32 - im.height - 1), im)
    c.save(out / 'rimuru-pointer-32.png', optimize=True)


if __name__ == '__main__':
    wallpapers()
    chibi()
    cursor()
    total = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    print(f'theme assets -> {OUT.relative_to(ROOT)} ({total / 1024:.0f} KB)')
