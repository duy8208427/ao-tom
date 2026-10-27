from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "public" / "ponds"
W, H = 960, 640


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def fill_sky_land(draw, land, water_edge):
    for y in range(H):
        t = y / H
        color = lerp((168, 196, 148), land, min(1, t * 1.15))
        draw.line([(0, y), (W, y)], fill=color)
    draw.rectangle((0, 0, W, 70), fill=water_edge)


def pond(draw, box, water, bank, ripple=18):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle((x0 - 10, y0 - 10, x1 + 10, y1 + 10), 18, fill=bank)
    draw.rounded_rectangle(box, 14, fill=water)
    for i in range(ripple):
        yy = y0 + 18 + i * ((y1 - y0 - 36) / max(ripple, 1))
        shade = lerp(water, (255, 255, 255), 0.08 + (i % 3) * 0.03)
        draw.arc((x0 + 16, yy, x1 - 16, yy + 22), 200, 340, fill=shade, width=2)


def dike(draw, pts, color):
    draw.line(pts, fill=color, width=10)


def save(name, paint):
    img = Image.new("RGB", (W, H), (90, 130, 80))
    draw = ImageDraw.Draw(img)
    paint(draw)
    img = img.filter(ImageFilter.SMOOTH)
    dest = ROOT / name
    img.save(dest, "JPEG", quality=88)
    print(name)


def soc_trang(draw):
    fill_sky_land(draw, (118, 156, 86), (86, 132, 72))
    pond(draw, (90, 110, 470, 430), (46, 126, 128), (168, 140, 92))
    pond(draw, (500, 80, 890, 300), (38, 118, 122), (160, 132, 86), 12)
    pond(draw, (500, 330, 890, 560), (52, 138, 132), (172, 146, 96), 14)
    dike(draw, [(40, 520), (920, 580)], (150, 122, 78))


def ben_tre(draw):
    fill_sky_land(draw, (142, 128, 72), (110, 108, 58))
    pond(draw, (70, 90, 430, 520), (72, 118, 78), (176, 148, 90), 22)
    pond(draw, (470, 140, 900, 360), (84, 126, 82), (168, 140, 84), 10)
    pond(draw, (470, 390, 900, 580), (64, 108, 86), (160, 132, 80), 9)
    dike(draw, [(20, 70), (40, 600)], (138, 116, 70))


def phu_tan(draw):
    fill_sky_land(draw, (72, 96, 58), (48, 72, 46))
    pond(draw, (80, 80, 520, 310), (28, 78, 86), (96, 86, 52), 16)
    pond(draw, (80, 340, 430, 580), (22, 70, 80), (90, 80, 48), 12)
    pond(draw, (470, 340, 900, 580), (34, 86, 90), (102, 90, 54), 11)
    pond(draw, (560, 70, 910, 300), (18, 64, 76), (88, 78, 46), 10)


def tra_vinh(draw):
    fill_sky_land(draw, (126, 164, 92), (92, 138, 78))
    pond(draw, (120, 90, 840, 540), (36, 154, 168), (186, 160, 104), 24)
    pond(draw, (40, 70, 180, 220), (48, 148, 156), (176, 150, 96), 6)
    pond(draw, (780, 430, 930, 590), (42, 142, 150), (172, 146, 92), 6)


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    save("st01.jpg", soc_trang)
    save("bt03.jpg", ben_tre)
    save("pt01.jpg", phu_tan)
    save("tvhtx.jpg", tra_vinh)
