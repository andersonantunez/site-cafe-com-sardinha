from colorsys import rgb_to_hsv, hsv_to_rgb
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
PRODUCTS = ROOT / "src/assets/images/products"
LOGO = ROOT / "src/assets/images/logo4.png"

# Every family has one photographic master. Variants inherit all of its pixels,
# changing only pixels belonging to the product's base material.
FAMILIES = [
    {
        "master": "caneca-azul-marinho.png",
        "source_hue": 0.60,
        "logo_box": (290, 420, 910, 885),
        "variants": {
            "caneca-marrom.png": "#493326",
            "caneca-laranja.png": "#d77b20",
            "caneca-azul-claro.png": "#72a9c2",
        },
    },
    {
        "master": "bone-marrom.png",
        "source_hue": 0.07,
        "logo_box": (410, 295, 900, 663),
        "variants": {"bone-azul-marinho.png": "#142f50"},
    },
    {
        "master": "moletom-azul-marinho.png",
        "source_hue": 0.62,
        "logo_box": (365, 370, 815, 708),
        "variants": {"moletom-marrom.png": "#3b2b21"},
    },
    {
        "master": "camiseta-laranja.png",
        "source_hue": 0.075,
        "logo_box": (335, 285, 855, 675),
        "variants": {
            "camiseta-marrom.png": "#3c2d25",
            "camiseta-azul.png": "#315d83",
        },
    },
]


def circular_hue_distance(a, b):
    delta = abs(a - b)
    return min(delta, 1 - delta)


def parse_color(value):
    value = value.removeprefix("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4))


def recolor(master, target_hex, source_hue, logo_box):
    target_hue, target_sat, target_val = rgb_to_hsv(*parse_color(target_hex))
    result = master.copy()
    pixels = result.load()
    x1, y1, x2, y2 = logo_box
    # Derive the print mask from the actual master photo. Pixels unlike the
    # product's base color are logo details; dilation joins letters and outlines
    # without preserving a rectangular patch of the original fabric.
    protected = Image.new("L", master.size, 0)
    protected_seed = protected.load()
    master_pixels = master.load()
    for py in range(y1, y2):
        for px in range(x1, x2):
            red, green, blue, alpha = master_pixels[px, py]
            if alpha == 0:
                continue
            hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
            base_like = saturation >= 0.13 and circular_hue_distance(hue, source_hue) <= 0.13
            if not base_like:
                protected_seed[px, py] = 255
    protected = protected.filter(ImageFilter.MaxFilter(3))
    protected_pixels = protected.load()

    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0 or protected_pixels[x, y] >= 80:
                continue

            hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
            if saturation < 0.16 or circular_hue_distance(hue, source_hue) > 0.15:
                continue

            # Keep highlights, shadows, seams and texture from the master photo.
            new_sat = min(1, target_sat * (0.76 + saturation * 0.30))
            brightness_ratio = value / max(0.12, 0.52)
            new_val = min(1, max(0.035, target_val * brightness_ratio))
            nr, ng, nb = hsv_to_rgb(target_hue, new_sat, new_val)
            pixels[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), alpha)

    # Reapply the official transparent artwork so recoloring never changes the
    # blue, gold, brown or red brand colors.
    official = Image.open(LOGO).convert("RGBA")
    official = official.crop(official.getchannel("A").getbbox())
    official = official.resize((x2 - x1, y2 - y1), Image.Resampling.LANCZOS)
    result.alpha_composite(official, (x1, y1))
    return result


for family in FAMILIES:
    master = Image.open(PRODUCTS / family["master"]).convert("RGBA")
    for filename, color in family["variants"].items():
        output = recolor(master, color, family["source_hue"], family["logo_box"])
        output.save(PRODUCTS / filename, optimize=True)
        print(f"{filename} <- {family['master']}")
