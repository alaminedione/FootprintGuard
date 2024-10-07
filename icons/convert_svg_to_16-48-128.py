import cairosvg

sizes = [16, 48, 128]
for size in sizes:
    cairosvg.svg2png(
        url="logo.svg",
        write_to=f"icon{size}.png",
        output_width=size,
        output_height=size,
    )
