#!/usr/bin/env python3
"""从 assets/logo.svg 生成 PWA 所需 PNG 图标"""

import os
from pathlib import Path


def main():
    base = Path(os.getcwd())
    svg_path = base / 'assets' / 'logo.svg'
    if not svg_path.exists():
        print('assets/logo.svg 不存在，跳过 PWA 图标生成')
        return

    svg_content = svg_path.read_text(encoding='utf-8')

    sizes = [('icon-192.png', 192), ('icon-512.png', 512)]

    try:
        import cairosvg
    except ImportError:
        print('cairosvg 未安装，跳过 PWA 图标生成')
        return

    for name, size in sizes:
        png_path = base / 'assets' / name
        cairosvg.svg2png(
            bytestring=svg_content.encode('utf-8'),
            write_to=str(png_path),
            output_width=size,
            output_height=size,
        )
        print(f'✓ assets/{name} ({size}x{size})')

    print('PWA 图标生成完成')


if __name__ == '__main__':
    main()
