# Pixel wallpaper 2560x1440

Animated pixel-art desktop wallpaper. Full plan lives in the doc "Анимированные пиксельные обои 2560x1440":
https://claude.ai/artifact/Trr6ADdzD9TcU5Q4UYNCLX (read it via the Claude Docs connector, not web fetch).

## Key decisions

- **Canvas 512x288, integer scale x5** → 2560x1440. Scale must be integer and equal on both axes.
- **Layered scene**: static background + separate animated sprite sheets on top. No single full-screen animation, no video-model pipeline.
- **Background** = 2 PixelLab generations: #1 at 400x288 (main scene, important stuff in the left 400px), then outpaint the right 112px with a 16–32px overlap mask. Clean up in Aseprite, reduce to one 16–32 color palette, export `assets/bg.png` exactly 512x288.
- PixelLab limits: Tier 1 up to 320x320, Tier 2 up to 400x400 (needed for 400x288). If no non-square size in the web UI — generate 400x400 and crop. Fallback: 320x180 x8 in one generation.
- **Animated elements** are drawn at canvas scale (not screen scale), each its own sprite sheet (frames in a row). Same palette as the background. Seamless loops, 6–12 fps.
- Rain / snow / particles are procedural in canvas, not generated.
- **Lights, fire, glowing windows, neon are animated layers** — never bake them into the background.

## Scene (current)

Partially destroyed city at night:
- Top ~40% of the canvas: clean night sky, reserved for elements added later (keep it empty in the background — no moon, stars, clouds baked in).
- Middle: ruined skyline, all lights off.
- Bottom: flat foreground platform/ground where several figures (~32x32 sprites) will be placed.

## Project structure (planned)

```
index.html        # canvas 512x288 + render loop, no build step, no deps
scene.json        # layer config: one entry per element
assets/bg.png     # 512x288
assets/*.png      # sprite sheets
LivelyInfo.json   # Lively Wallpaper metadata
```

Rendering rules: `image-rendering: pixelated` on the canvas, `ctx.imageSmoothingEnabled = false`, `Math.round` on every draw coordinate.

Runtime: Windows + Lively Wallpaper (HTML wallpaper).
