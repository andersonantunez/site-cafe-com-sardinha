from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
BASE_DIR = Path(__file__).resolve().parent / "source"
OUT_DIR = ROOT / "src/assets/images/products"
LOGO_PATH = Path(r"C:\Users\Admin\Desktop\3c0590d7-ea48-4c22-ab8c-02d6ee7fd187.png")

PRODUCTS = {
    "caneca": {
        "files": {
            "caneca-marrom.png": "#493326",
            "caneca-laranja.png": "#d77b20",
            "caneca-azul-claro.png": "#72a9c2",
            "caneca-azul-marinho.png": "#173d65",
        },
        "logo_width": 390,
        "center": (575, 650),
        "angle": -2,
    },
    "bone": {
        "files": {
            "bone-marrom.png": "#4a3325",
            "bone-azul-marinho.png": "#142f50",
        },
        "logo_width": 365,
        "center": (635, 580),
        "angle": 1,
    },
    "moletom": {
        "files": {
            "moletom-marrom.png": "#3b2b21",
            "moletom-azul-marinho.png": "#152e4d",
        },
        "logo_width": 390,
        "center": (627, 660),
        "angle": 0,
    },
    "camiseta": {
        "files": {
            "camiseta-marrom.png": "#3c2d25",
            "camiseta-azul.png": "#315d83",
            "camiseta-laranja.png": "#d56e25",
        },
        "logo_width": 390,
        "center": (627, 650),
        "angle": 0,
    },
}


def hex_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def tint_product(source, color):
    image = Image.open(source).convert("RGBA")
    rgb = image.convert("RGB")
    gray = ImageEnhance.Contrast(rgb.convert("L")).enhance(1.08)
    target = hex_rgb(color)
    pixels = []
    for level in gray.getdata():
        # Preserve the photographed highlights and folds while replacing hue.
        shadow = max(0.18, level / 178)
        highlight = max(0, level - 188) / 67
        pixels.append(tuple(min(255, round(channel * shadow + (255 - channel) * highlight * .72)) for channel in target))
    tinted = Image.new("RGB", image.size)
    tinted.putdata(pixels)
    # Chroma-key removal can leave a faint veil around the canvas. Normalize
    # alpha so the catalogue cards remain genuinely transparent.
    alpha = image.getchannel("A").point(
        lambda value: 0 if value <= 96 else round((value - 96) * 255 / 159)
    )
    tinted.putalpha(alpha)
    return tinted


def prepare_logo(width, angle=0):
    logo = Image.open(LOGO_PATH).convert("RGBA")
    bbox = logo.getchannel("A").getbbox()
    logo = logo.crop(bbox)
    height = round(logo.height * width / logo.width)
    logo = logo.resize((width, height), Image.Resampling.LANCZOS)
    if angle:
        logo = logo.rotate(angle, Image.Resampling.BICUBIC, expand=True)
    return logo


def add_logo(product, logo, center):
    # A tiny soft shadow integrates the supplied artwork into the product photo.
    alpha = logo.getchannel("A")
    shadow = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(3)).point(lambda a: round(a * .20)))
    x = round(center[0] - logo.width / 2)
    y = round(center[1] - logo.height / 2)
    product.alpha_composite(shadow, (x + 3, y + 5))
    product.alpha_composite(logo, (x, y))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for kind, config in PRODUCTS.items():
        logo = prepare_logo(config["logo_width"], config["angle"])
        for filename, color in config["files"].items():
            product = tint_product(BASE_DIR / f"{kind}.png", color)
            add_logo(product, logo, config["center"])
            product.save(OUT_DIR / filename, optimize=True)
            print(filename)


if __name__ == "__main__":
    main()
