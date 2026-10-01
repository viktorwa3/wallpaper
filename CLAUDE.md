# Pixel wallpaper 2560x1440

Animated pixel-art desktop wallpaper. Full plan lives in the doc "Анимированные пиксельные обои 2560x1440":
https://claude.ai/artifact/Trr6ADdzD9TcU5Q4UYNCLX (read it via the Claude Docs connector, not web fetch).

## Key decisions

- **Canvas 512x288, integer scale x5** → 2560x1440. Scale must be integer and equal on both axes.
- **Layered scene**: static background + separate animated sprite sheets on top. No single full-screen animation, no video-model pipeline.
- **Background** = one `create_image_pixen` call at 512x288 via MCP (confirmed 2026-10-01 on the free trial, 1 generation, ~85s; no outpaint needed). Clean up in Aseprite, reduce to one 16–32 color palette, export `assets/bg.png` exactly 512x288. Drafts go to `assets/drafts/`.
- Free trial runs 1 job at a time — queue generations sequentially. Pixen has no negative prompt; "no X" phrasing in the description only partly works (faint stars still appeared).
- Prompt learnings: "the upper half is only empty night sky" + "the skyline is low and occupies only the lower half" gives enough sky (v2); without it buildings eat the sky (v1). Pixen draws the sky gradient as hard horizontal bands.
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

## PixelLab MCP

`.mcp.json` registers the PixelLab MCP server with `Authorization: Bearer ${PIXELLAB_API_KEY}`. The token's source of truth is `.env` (gitignored); `scripts/mcp-headers.ps1` copies it into the Windows user env var — re-run it after changing the token, then fully restart VS Code. (`headersHelper` was tried and silently ignored by the VS Code extension → 401; the tool list loads without auth, so a "connected" server doesn't prove auth works — test with `get_balance`.) Never commit `.env` or paste the token into tracked files.
**Before using PixelLab MCP tools or changing the MCP config, check https://api.pixellab.ai/mcp/docs** for current tool names, parameters, size limits and setup — don't rely on memory.
Per the MCP docs (checked 2026-10-01): `create_image_pixflux` / `create_image_pixen` cost 1 generation, `create_image_pro` / `inpaint_image` / `edit_image` cost 20–40. Max canvas 512x512, or 688x384 for 16:9 — so **512x288 may be possible in one generation without outpaint**; verify on the first call. Jobs are async: tools return job ids, poll with `get_*`.
Free trial (web, per the plan doc): 40 fast generations, max 200x200 — use it to iterate the prompt at 200x144 before paying for the 400x288 final.
