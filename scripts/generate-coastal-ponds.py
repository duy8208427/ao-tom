from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "public" / "ponds"
W, H = 960, 640


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def fill_base(draw, land, sea_edge=None):
    for y in range(H):
        t = y / H
        color = lerp(land[0], land[1], t)
        draw.line([(0, y), (W, y)], fill=color)
    if sea_edge:
        draw.rectangle((0, 0, W, 90), fill=sea_edge)


def pond(draw, box, water, bank, ripple=16):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle((x0 - 10, y0 - 10, x1 + 10, y1 + 10), 18, fill=bank)
    draw.rounded_rectangle(box, 14, fill=water)
    for i in range(ripple):
        yy = y0 + 16 + i * ((y1 - y0 - 32) / max(ripple, 1))
        shade = lerp(water, (255, 255, 255), 0.08 + (i % 3) * 0.03)
        draw.arc((x0 + 14, yy, x1 - 14, yy + 20), 200, 340, fill=shade, width=2)


def save(name, paint):
    img = Image.new("RGB", (W, H), (90, 130, 80))
    draw = ImageDraw.Draw(img)
    paint(draw)
    img = img.filter(ImageFilter.SMOOTH)
    dest = ROOT / name
    img.save(dest, "JPEG", quality=88)
    print(name)


def do_son(draw):
    fill_base(draw, ((110, 150, 88), (86, 120, 70)), (62, 118, 150))
    pond(draw, (70, 120, 460, 420), (36, 122, 148), (168, 144, 96))
    pond(draw, (500, 100, 900, 340), (42, 130, 152), (160, 136, 90), 12)
    pond(draw, (500, 370, 900, 580), (48, 138, 158), (172, 148, 98), 10)


def nghi_loc(draw):
    fill_base(draw, ((126, 148, 78), (98, 118, 62)))
    pond(draw, (80, 90, 440, 520), (28, 108, 118), (156, 132, 84), 20)
    pond(draw, (480, 120, 900, 360), (34, 118, 124), (164, 140, 88), 11)
    pond(draw, (480, 390, 900, 580), (40, 126, 128), (150, 128, 80), 9)


def tuy_phuoc(draw):
    fill_base(draw, ((148, 136, 78), (118, 108, 62)), (48, 110, 140))
    pond(draw, (60, 100, 500, 320), (54, 142, 148), (176, 150, 98), 14)
    pond(draw, (60, 350, 420, 580), (46, 132, 140), (168, 142, 92), 12)
    pond(draw, (460, 350, 910, 580), (60, 148, 152), (180, 154, 102), 11)
    pond(draw, (540, 80, 910, 300), (38, 120, 132), (160, 136, 86), 10)


def ninh_hoa(draw):
    fill_base(draw, ((92, 128, 86), (68, 98, 66)), (36, 96, 132))
    pond(draw, (100, 80, 860, 520), (22, 138, 154), (186, 160, 108), 22)
    pond(draw, (40, 80, 170, 230), (30, 128, 144), (170, 146, 96), 6)
    pond(draw, (780, 430, 930, 590), (34, 134, 148), (174, 150, 100), 6)


def phan_thiet(draw):
    fill_base(draw, ((168, 148, 92), (132, 118, 72)), (54, 124, 156))
    pond(draw, (70, 110, 430, 430), (70, 148, 132), (188, 164, 110), 15)
    pond(draw, (470, 90, 900, 300), (62, 140, 128), (180, 156, 104), 11)
    pond(draw, (470, 330, 900, 560), (78, 156, 138), (192, 168, 112), 12)


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    save("doson.jpg", do_son)
    save("nghiloc.jpg", nghi_loc)
    save("tuyphuoc.jpg", tuy_phuoc)
    save("ninhhoa.jpg", ninh_hoa)
    save("phanthiet.jpg", phan_thiet)
