# Pixel wallpaper 2560x1440

Animated pixel-art desktop wallpaper. Full plan lives in the doc "Анимированные пиксельные обои 2560x1440":
https://claude.ai/artifact/Trr6ADdzD9TcU5Q4UYNCLX (read it via the Claude Docs connector, not web fetch).

**This file is the project's source of truth: update it in the same step as any change to layout, pipeline, decisions or learnings, and tick the Status list.**

## Key decisions

- **Canvas 512x288, integer scale x5** → 2560x1440. Scale must be integer and equal on both axes.
- **Layered scene**: static background + separate animated sprite sheets on top. No single full-screen animation, no video-model pipeline.
- **Background** = one `create_image_pixen` call at 512x288 via MCP (confirmed 2026-10-01 on the free trial, 1 generation, ~85s; no outpaint needed). Clean up in Aseprite, reduce to one 16–32 color palette, export exactly 512x288. Shared background → `shared/assets/bg.png`, drafts → `shared/assets/drafts/`.
- Pixen has no negative prompt; "no X" phrasing in the description only partly works (faint stars still appeared). Free trial ran 1 job at a time; Tier 1 accepted 4 concurrent pixen jobs (~50–100s each).
- Prompt learnings: "the upper half is only empty night sky" + "the skyline is low and occupies only the lower half" gives enough sky (v2); without it buildings eat the sky (v1). Pixen draws the sky gradient as hard horizontal bands.
- v3 prompt (2026-10-02): "the bottom 30% of the image is a thick wide flat foreground platform … seen from the side with a visible front face, level horizontal top edge, open empty walking surface, small debris only at the far left and right edges" → platforms 35–60px. Best: **seed2002** (platform top y≈238, sky ~35%) and **seed5005** (platform ~60px, sky ~40%, great leaning tower). Faint stars still appear in most. Remove them with `scripts/despeckle.ps1 in.png out.png -MaxY 150 -FlatAboveY 62` (isolated-pixel fix + flat-fills the solid top sky rows).
- **Head / big character sprites**: `create_image_pro` at <=170px per side returns 4 candidates for 25 gens and draws a floating head with no neck. Pixen at 208x120 (1 gen) gives scarier faces but always adds neck and shoulders. Pro at >170px returns only 1 candidate. Round-2 head prompt that worked: "Realistic human face with normal human proportions … very pale white-grey skin … short messy tangled black hair … insanely wide stretched grin that splits the cheeks and reaches almost to the ears … teeth are long thin straight needles like knitting needles, very many, packed tightly with almost no gaps". Editing one feature: `inpaint_image` with a rectangle mask beats `edit_image_pixen` (pixen edits redraw the whole face, add artifacts like a vertical seam, and spread veins over the grin). Inpainted eyes come out pinkish — make them glow with an engine `glow` layer, not by prompting. But the user preferred the *pixen* edit 7302 for its intensity — show both kinds of result, don't discard the wild one.
- **Animated elements** are drawn at canvas scale (not screen scale), each its own sprite sheet (frames in a row). Same palette as the background. Seamless loops, 6–12 fps.
- Rain / snow / particles are procedural in canvas, not generated.
- **Lights, fire, glowing windows, neon are animated layers** — never bake them into the background.

## Wallpaper #1: "ruined-city"

Folder: `wallpapers/ruined-city/`. Partially destroyed city at night:
- Top ~40% of the canvas: clean night sky, reserved for elements added later (keep it empty in the background — no moon, stars, clouds baked in).
- Middle: ruined skyline, all lights off.
- Bottom: flat foreground platform/ground where several figures (~32x32 sprites) will be placed.

## Project structure

One repo, several wallpapers sharing one engine. Each wallpaper is self-contained enough to be zipped into Lively.

```
engine/
  engine.js                     # renderer; layer types + options documented in its header comment
  style.css                     # black page, centered canvas, image-rendering: pixelated
shared/assets/                  # assets reused by several wallpapers
  bg.png                        #   ruined-city background, 512x288 (v3 seed2002, stars removed, 40 colors)
  drafts/                       #   background candidates (bg_v<N>_seed<S>.png)
wallpapers/<name>/
  index.html                    # loads scene.js, then ../../engine/engine.js + style.css
  scene.js                      # window.SCENE = { canvas, maxFps, layers: [...] }
  assets/                       # this wallpaper's own sprite sheets
    drafts/                     #   candidates (<what>_<model>_<WxH>_seed<S>[_c<i>].png)
  refs/                         # sketches, references (not shipped)
  LivelyInfo.json               # Lively metadata
scripts/                        # git-sync.ps1, mcp-headers.ps1, screenshot.ps1, despeckle.ps1, contact-sheet.ps1 (tile candidates at 3x for comparison)
```

Current wallpapers: `ruined-city` (#1), `burning-city-grin` (#2). Scene is `scene.js` (not JSON) so pages work from `file://` without a server — `fetch` of local JSON is blocked there. Asset paths in scene.js are relative to the wallpaper's index.html (shared bg = `../../shared/assets/...`). Missing images render as magenta rects, so scenes can reference assets before they exist; `rect` layers are explicit placeholders.
Engine: integer scale = floor(min(screenW/512, screenH/288)), letterboxed (1080p → x3); frame cap `maxFps` (default 30); `?grid` URL flag draws a 16px grid + layer outlines.
**Verify visually** with `scripts/screenshot.ps1 <name> [out.png] [-Grid]` (headless Edge, 2560x1440), then Read the PNG. The script waits for Edge (Start-Process -Wait); an all-black PNG means the page didn't render. `-Query "head=264&veil=fog"` passes URL params for scene variants.
TODO: Lively bundling — Lively imports one folder, so the `../../` paths must be flattened by a bundle script into `dist/<name>/`.

Rendering rules: `image-rendering: pixelated` on the canvas, `ctx.imageSmoothingEnabled = false`, `Math.round` on every draw coordinate.

Runtime: Windows + Lively Wallpaper (HTML wallpaper).

## Status (update as work progresses)

Account: PixelLab **Tier 1 active** (2000 gens, resets 2026-11-02).
- [x] Per-wallpaper layout (2026-10-02)
- [x] Engine on placeholders (2026-10-02): both wallpapers render with bg_v3_seed2002 + rect placeholders
- [x] Background (2026-10-02): user picked **v3 seed2002**; stars removed → `shared/assets/bg.png`, used by both scenes. Optional later: `reduce_colors` from 40 to ≤32 colors together with the sprites, so they share one palette.
- [ ] #1 figures: what they are is still undecided (placeholders fig1–3 at y=232)
- [ ] Lively bundle script
- [~] #2 head size (2026-10-02): user wants the head **bigger**; eyes may be sacrificed to the veil. Upscaled redraws of 7302 (look preserved): `head4_pixen_224x140/264x164/320x200` via `edit_image_pixen` with larger width/height (1 gen each — it re-renders, not rescales; output area <= 256x256) and `head4_pro_256x160` via `create_image_pro` with 7302 as reference (20 gens, 1 candidate, cleaner). scene.js picks via `?head=168|224|264|pro256|320` (default 264); geometry table (bbox, eyes, eye rows) drives head position, eye glow and veil shape. Comparison: `refs/heads_compare.png`. **Waiting for the user's pick.** History: base head2 seed7202_c3, eyes edit 7302 = favourite.
- [x] #2 eye glow: two `glow` layers (r 9, #ff2a1a, alpha 0.75, lighter, pulse 0.5Hz) at **z 13, above the veil**, so they burn through the smoke.
- [x] #2 veil: `haze` layer (domain-warped fbm smoke, dome over cx 256, 3 tones, edge dither, 15fps). User didn't like churning smoke → modes via `?veil=fog|static|smoke` (default **fog** = curl 0, slides 1.5px/s; static = drawn once). Solid to 2px above the eyes, gone ~2px below the eye middle.
- [ ] Move final head out of drafts → `assets/head.png` once nothing else changes
- [ ] #2 fire / smoke loops (PixMiniMax)

## PixelLab MCP

`.mcp.json` registers the PixelLab MCP server with `Authorization: Bearer ${PIXELLAB_API_KEY}`. The token's source of truth is `.env` (gitignored); `scripts/mcp-headers.ps1` copies it into the Windows user env var — re-run it after changing the token, then fully restart VS Code. (`headersHelper` was tried and silently ignored by the VS Code extension → 401; the tool list loads without auth, so a "connected" server doesn't prove auth works — test with `get_balance`.) Never commit `.env` or paste the token into tracked files.
**Before using PixelLab MCP tools or changing the MCP config, check https://api.pixellab.ai/mcp/docs** for current tool names, parameters, size limits and setup — don't rely on memory.
Per the MCP docs (checked 2026-10-01): `create_image_pixflux` / `create_image_pixen` cost 1 generation, `create_image_pro` / `inpaint_image` / `edit_image` cost 20–40. Max canvas 512x512, or 688x384 for 16:9 — 512x288 via pixen confirmed. Jobs are async: tools return job ids, poll with `get_*`.
Free trial (web): 40 fast generations, then 5 slow/day (store up to 20), web UI max 200x200. **Web UI size limits do NOT apply to API/MCP** — pixen 512x288 worked on the trial via MCP.

## PixelLab pricing (checked 2026-10-02, pixellab.ai/pricing + /pixellab-api)

Two currencies: **generations** (subscription allowance, monthly, used first) and **credits** (prepaid USD, 1 credit = $1, fallback after generations run out). The plan doc's "Tier 2 = 400x400" is stale — now 512x512.

| Plan | Price | Gens/mo | $/gen | Unlocks |
|---|---|---|---|---|
| Free | 0 | 40 (+5/day slow) | — | 1 concurrent job, web ≤200px, no map tools |
| Tier 1 Apprentice | $12 (loyalty → $9) | 2000 | 0.006 | web ≤320px, maps, **PixMiniMax + skeleton v3 (API, Tier 1+ only)** |
| Tier 2 Artisan | $24 (→ $22) | 5000 | 0.0048 | web ≤512px, priority, 10 concurrent |
| Tier 3 Architect | $50 | 10000 | 0.005 | 20 concurrent |
| Credits | pay-as-you-go | — | see below | everything except Tier-1-gated models |

Credit prices (estimates, vary with GPU time): pixen 512x512 $0.017, pixflux 400x400 $0.013, animate-with-text-v3 $0.022–0.042, PixMiniMax 40 frames $0.079, Pro tools (20/25/40 gens) $0.095/$0.125/$0.185, Pro Flash image 256 $0.04, prompt enhance $0.002.
Rule of thumb: cheap 1-gen tools cost ~1.5–3x more on credits than on a subscription; **Pro tools cost the same either way** (~$0.0046/gen).
- **Credits** when: one-off scene, < ~$10/mo of usage, no need for PixMiniMax/skeleton v3, 1 concurrent job is fine. Credits are a buffer, not a plan.
- **Tier 1 for one month** when: actively producing a scene with animations (need PixMiniMax for long seamless loops / skeleton v3), or usage > ~$10/mo. Cancel after.
- **Tier 2+** only for batch work (parallel jobs) or web UI at 512px. Not needed for MCP-driven work.

## Wallpaper #2: "burning-city-grin" (planned 2026-10-02)

Folder: `wallpapers/burning-city-grin/`, sketch: `refs/sketch.png`. Reuses the ruined-city background (v2 composition, sky top ~40%).
- Night, city burning: fire + smoke are **animated layers** (sprites), never baked. Orange underglow on the sky = procedural gradient in canvas with flicker, not in bg.png.
- Sky: huge semi-transparent head, focus on a very wide grin with long needle-like fangs; glowing red eyes; upper head + eyes half-hidden by a black veil.
- Head sprite ~160x96 canvas px (~30% width), generated on transparent bg at native scale. Transparency = canvas `globalAlpha` or **ordered dither** (keeps pure palette; preferred for pixel look).
- Eyes glow = separate small layer, additive (`lighter`) pulsing. Veil = procedural noise/gradient or a looping smoke sprite over the forehead.
- Prompts: describe the teeth generically; **don't name Mortal Kombat characters** in prompts (model may draw the character itself).
- Rough budget: ~60–120 calls, $3–8 on credits; Tier 1 month covers it with huge margin and unlocks PixMiniMax.
