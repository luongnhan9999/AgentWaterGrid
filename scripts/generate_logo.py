#!/usr/bin/env python3
"""
Generate high-resolution logo and social banner for AgentWaterGrid:
Autonomous Desalination & Groundwater Depletion Parametric Water-Rights Escrow.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def create_logo():
    width, height = 1200, 630
    img = Image.new("RGBA", (width, height), (8, 14, 26, 255))  # Deep Hydro Slate #080E1A
    draw = ImageDraw.Draw(img)

    # Ambient radial glow
    for i in range(320, 0, -4):
        alpha = int(40 * (1 - i / 320))
        draw.ellipse(
            [600 - i * 1.6, 280 - i, 600 + i * 1.6, 280 + i],
            fill=(6, 182, 212, alpha)  # Aquatic Cyan
        )

    # Secondary deep blue aura
    for i in range(200, 0, -5):
        alpha = int(30 * (1 - i / 200))
        draw.ellipse(
            [600 - i * 1.2, 280 - i, 600 + i * 1.2, 280 + i],
            fill=(59, 130, 246, alpha)  # Blue
        )

    # Center water droplet with aquifer concentric rings & grid waves
    cx, cy = 600, 210

    # Concentric aquifer boundary rings
    draw.arc([cx - 150, cy - 80, cx + 150, cy + 90], start=180, end=360, fill=(6, 182, 212, 160), width=3)
    draw.arc([cx - 150, cy - 80, cx + 150, cy + 90], start=0, end=180, fill=(16, 185, 129, 140), width=2)

    draw.arc([cx - 180, cy - 100, cx + 180, cy + 110], start=210, end=330, fill=(6, 182, 212, 100), width=2)
    draw.arc([cx - 180, cy - 100, cx + 180, cy + 110], start=30, end=150, fill=(16, 185, 129, 80), width=2)

    # Water droplet polygon shape
    droplet_outer = [
        (cx, cy - 100),
        (cx + 42, cy - 30),
        (cx + 70, cy + 25),
        (cx + 50, cy + 80),
        (cx, cy + 98),
        (cx - 50, cy + 80),
        (cx - 70, cy + 25),
        (cx - 42, cy - 30),
    ]
    draw.polygon(droplet_outer, fill=(6, 182, 212, 255))  # Bright Cyan Droplet

    # Inner Core Droplet
    droplet_inner = [
        (cx, cy - 60),
        (cx + 25, cy - 10),
        (cx + 40, cy + 30),
        (cx, cy + 70),
        (cx - 40, cy + 30),
        (cx - 25, cy - 10),
    ]
    draw.polygon(droplet_inner, fill=(14, 116, 144, 255))  # Deep Cyan

    # Groundwater wave shimmer inside droplet
    draw.arc([cx - 25, cy + 15, cx + 25, cy + 45], start=0, end=180, fill=(165, 243, 252, 255), width=3)
    draw.arc([cx - 15, cy + 35, cx + 15, cy + 55], start=0, end=180, fill=(207, 250, 254, 255), width=2)

    # Telemetry sensor nodes
    node_coords = [
        (cx - 150, cy + 5),
        (cx + 150, cy + 5),
        (cx - 90, cy - 70),
        (cx + 90, cy - 70),
        (cx, cy + 130),
    ]
    for nx, ny in node_coords:
        draw.ellipse([nx - 6, ny - 6, nx + 6, ny + 6], fill=(16, 185, 129, 255))
        draw.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=(255, 255, 255, 255))

    # Grid lines representing DePIN infrastructure
    draw.line([(cx - 150, cy + 5), (cx - 70, cy + 25)], fill=(6, 182, 212, 180), width=2)
    draw.line([(cx + 150, cy + 5), (cx + 70, cy + 25)], fill=(6, 182, 212, 180), width=2)
    draw.line([(cx, cy + 98), (cx, cy + 130)], fill=(16, 185, 129, 200), width=2)

    # Brand Title
    draw.text((600, 375), "AgentWaterGrid", fill=(255, 255, 255, 255), anchor="mm")
    draw.text(
        (600, 425),
        "Autonomous Desalination & Groundwater Depletion Parametric Water-Rights Escrow",
        fill=(186, 230, 253, 255),
        anchor="mm"
    )
    draw.text(
        (600, 468),
        "CleanTech DePIN • AI Hydrological Oracles • USGS & Copernicus Telemetry Consensus",
        fill=(6, 182, 212, 255),
        anchor="mm"
    )
    draw.text(
        (600, 528),
        "GENLAYER STUDIONET (CHAIN ID: 61999 / 0xF22F) • ZERO-LEAK INDEMNITY PROTOCOL",
        fill=(148, 163, 184, 255),
        anchor="mm"
    )

    out_path = Path(__file__).parent.parent / "logo.png"
    img.save(out_path, "PNG")
    print(f"[+] Saved logo to {out_path}")


if __name__ == "__main__":
    create_logo()
