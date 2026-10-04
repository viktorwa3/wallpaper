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
- **Loop recipe** (2026-10-02): pixen still (`no_background`, 1 gen) → `animate_image_pixminimax` with `first_frame_url` = `last_frame_url` = the still (8 frames at 32x48 / 16 at 48x88 = 1 gen, ~1.5–3 min) → `get_image` gives frame_count+1 frames, index 0 = input, the last ≈ input → use frames 0..N-1 → `scripts/sprite-sheet.ps1 out.png f0.png f1.png …`. Pass caption fields (subject_description, initial_pose, view, direction) yourself. To animate a cropped still, pass it as a `data:image/png;base64,…` URL. Pixen fire tends to add a glowing ember disc or logs at the base, and smoke tends to come out as cartoon puffs/mushroom clouds or with a building at the base — "thin wispy plume … slightly transparent looking … low detail" gave usable wisps (crop the base off).
- **Animated elements** are drawn at canvas scale (not screen scale), each its own sprite sheet (frames in a row). Same palette as the background. Seamless loops, 6–12 fps.
- Rain / snow / particles are procedural in canvas, not generated.
- **Lights, fire, glowing windows, neon are animated layers** — never bake them into the background.

## The wallpaper: "burning-city-grin"

**One wallpaper** (2026-10-03: "ruined-city" #1 and "burning-city-grin" #2 were merged — the user: "it's the same wallpaper"). Folder `wallpapers/burning-city-grin/`. Ruined city at night (shared bg): a huge semi-transparent grinning head in the sky, distant smoke columns, falling ash, orange underglow; on the foreground platform two battered heroes face a four-armed demon. Details in the Status list and the section at the bottom.

## Project structure

One repo, several wallpapers sharing one engine. Each wallpaper is self-contained enough to be zipped into Lively.

```
engine/
  engine.js                     # renderer; layer types + options documented in its header comment
  style.css                     # black page, centered canvas, image-rendering: pixelated
shared/assets/                  # assets reused by several wallpapers
  bg.png                        #   ruined-city background, 512x288 (v3 seed2002, stars removed, 40 colors)
  bg_fg.png                     #   bg with the sky cut out — drawn over "far" layers so they pass behind the ruins
  drafts/                       #   background candidates (bg_v<N>_seed<S>.png)
wallpapers/<name>/
  index.html                    # loads scene.js, then ../../engine/engine.js + style.css
  scene.js                      # window.SCENE = { canvas, maxFps, layers: [...] }
  assets/                       # this wallpaper's own sprite sheets
    drafts/                     #   candidates (<what>_<model>_<WxH>_seed<S>[_c<i>].png)
  refs/                         # sketches, references (not shipped)
  LivelyInfo.json               # Lively metadata
scripts/                        # git-sync.ps1, mcp-headers.ps1, screenshot.ps1, despeckle.ps1, contact-sheet.ps1 (tile candidates at 3x for comparison), sprite-sheet.ps1 (frames → 1-row sheet), fg-cutout.ps1 (bg minus sky → bg_fg.png), hole-mask.ps1 (layer mask from dark openings in bg), strip-grey.ps1 (remove baked-in smoke from a fire sheet), bundle.ps1 (Lively folder + zip), png_index.py / snap.py / finish.py (python+zlib PNG helpers: indexed re-encode for inline MCP uploads, palette snap after downscaling, row cut + speck removal)
```

Current wallpapers: `burning-city-grin` (ruined-city was merged into it); `rooftop-clash` planned (only `refs/` exists, see its section). Scene is `scene.js` (not JSON) so pages work from `file://` without a server — `fetch` of local JSON is blocked there. Asset paths in scene.js are relative to the wallpaper's index.html (shared bg = `../../shared/assets/...`). Missing images render as magenta rects, so scenes can reference assets before they exist; `rect` layers are explicit placeholders.
Engine: integer scale = floor(min(screenW/512, screenH/288)), letterboxed (1080p → x3); frame cap `maxFps` (default 30); `?grid` URL flag draws a 16px grid + layer outlines.
**Verify visually** with `scripts/screenshot.ps1 <name> [out.png] [-Grid]` (headless Edge, 2560x1440), then Read the PNG. The script waits for Edge (Start-Process -Wait); an all-black PNG means the page didn't render. `-Query "head=264&lift=40"` passes URL params for scene variants, `-Dist` renders the bundle in dist/.
Lively imports one folder: `scripts/bundle.ps1 <name>` flattens the `../../` paths into `dist/<name>/` + a zip to drop into Lively.

Rendering rules: `image-rendering: pixelated` on the canvas, `ctx.imageSmoothingEnabled = false`, `Math.round` on every draw coordinate.

Runtime: Windows + Lively Wallpaper (HTML wallpaper).

## Status (update as work progresses)

Account: PixelLab **Tier 1 active** (2000 gens, resets 2026-11-02).
- [x] Per-wallpaper layout (2026-10-02)
- [x] Engine on placeholders (2026-10-02)
- [x] Background (2026-10-02): user picked **v3 seed2002**; stars removed → `shared/assets/bg.png`, used by the scene. Optional later: `reduce_colors` from 40 to ≤32 colors together with the sprites, so they share one palette.
- [x] Fighters (2026-10-03; moved into burning-city-grin on the merge, assets in its `assets/drafts/`, layers z 19–22): user's brief — a battered man in a black business suit, black hair, with a sword; a girl melee mage (designed as: short crimson ponytail, dark combat jacket, bandaged forearms, flaming fists); facing them a white demon with yellow eyes and four arms. All three have a **breathing** idle loop.
  - `create_character` mode v3, view side (2 gens each): suit + mage 48px, demon 64px. Used the **3/4 rotations** (heroes south-east, demon south-west): the pure side (east) view of the suit lost the sword. Demon came out bone-white/beige.
  - Breathing: PixMiniMax on the rotation URL, first = last frame, 8 frames (1 gen each) → `assets/drafts/{suit,mage}_breath_48x8.png`, `demon_breath_64x7.png` (frame 6 dropped: dark blotches). fps 5–6.
  - scene.js: `stand(c, x, ground)` puts the soles (sprite's lowest opaque row `feet`) on a ground row; mage x 104 / ground 252 (a step behind), suit 148 / 258, demon 318 / 258. Size approved by the user. Contact shadows = engine `shadow` layer (flat pixel ellipse, #05070d alpha 0.6, ry 2, centred on each sprite's `feetX`; per-character `shadowDy`/`shadowRy` — the demon's wide 3/4 stance has the rear foot ~5px higher, so its shadow is taller (ry 3) and raised 3px, otherwise the rear foot floats). Demon eyes = two yellow `glow` layers (#ffc21a, lighter, pulse 0.4Hz): near eye at sprite (26,16) r 7, the far eye hidden by the 3/4 profile gets a weak r 4 glow at (22,16). Character ids: suit 8185d519…, mage 639bdc13…, demon 7e22632d… (more animations can be queued on them).
- [x] Lively bundle script (2026-10-03): `scripts/bundle.ps1 burning-city-grin [-Title] [-Desc]` → `dist/<name>/` + `dist/<name>.zip` (gitignored). Copies engine + shared PNGs + the wallpaper's assets (minus `frames/`), rewrites `../../` paths, writes `LivelyInfo.json` (Type 1 = web), renders the bundle itself for `thumbnail.png` (480x270) / `preview.png`, and regenerates `dist/preview.html` (all bundles live in iframes + full-screen / zip links). Check a bundle with `screenshot.ps1 <name> -Dist`. Gotcha: read/write text as explicit UTF-8 — PowerShell 5 `Get-Content` reads ANSI and mangled scene.js → black page.
- [x] head size (2026-10-02): user wanted the head **bigger**; eyes may be sacrificed to the veil. Upscaled redraws of 7302 (look preserved): `head4_pixen_224x140/264x164/320x200` via `edit_image_pixen` with larger width/height (1 gen each — it re-renders, not rescales; output area <= 256x256) and `head4_pro_256x160` via `create_image_pro` with 7302 as reference (20 gens, 1 candidate, cleaner). scene.js picks via `?head=168|224|264|pro256|320` (default 320); geometry table (bbox, eyes, eye rows) drives head position and eye glow. Comparison: `refs/heads_compare.png`. History: base head2 seed7202_c3, eyes edit 7302 = favourite.
- [x] eye glow: two `glow` layers (r 9, #ff2a1a, alpha 0.75, lighter, pulse 0.5Hz) at z 13, above the head.
- [x] veil (2026-10-02): the procedural smoke veil (`haze` layer) was **rejected** — the user meant the head sinking into the **black upper sky band** of bg.png (rows 0..~62), not smoke. Final (user-approved): image layer `fade: [36, 72]` (dithered, transparent above row 36, fully visible from row 72), head alpha **0.2**, eyes 40px above the band edge (row ~22) — inside the hidden zone, only the glow layers show them. Tunable via `?lift=N&alpha=0.x`. `haze` stays in the engine but is unused.
- [x] Head bob (2026-10-03): engine `bob: { amp, period, phase }` (whole-pixel vertical sway); head + both eye glows share `{ amp: 2, period: 5 }` (user: 7 s was a bit slow) so the glows stay on the eyes; `?bob=N` for amplitude (0 = still). The head's dithered fade mask moves with the head (fine at ±2 px).
- [x] head (2026-10-02): user picked **320** (`head4_pixen_320x200_seed7403`) → `assets/head.png`, default in scene.js. Other sizes still selectable via `?head=` from drafts.
- [x] fire: **dropped** (2026-10-03, user: "fire is out, we can't get it right"). 8 rounds tried — pixen+PixMiniMax sprites (identical copies, floating on roofs, square when masked into a window, plasma-blob single tongue), inpaint into a bg crop (drew a new framed window), procedural `flames` (wind sheared it into wedges; without wind + turb/taper better but still rejected). The engine keeps `flames`, `mask`, `clip`, `tint`, `edgeFade`; `assets/window_mask.png`, `window_holes.png` and all fire sheets in `assets/drafts/` are unused now. The orange sky underglow (`gradient` layer) stays.
- [x] smoke: only the **distant smoke** stays (user liked it); near smoke (window column, roof wisp) went with the fire.
  - **Distant smoke** (kept): 3x 8601 (alpha 0.25–0.35, smooth edgeFade) at z 2 behind `shared/assets/bg_fg.png` (z 3, `scripts/fg-cutout.ps1`: sky removed, lavender distant city kept). Bases end at y 172–176, above the light horizon strip. Rebuild bg_fg whenever bg.png changes.
  - Fire learnings (for a future attempt): A wide solid sprite (8402) looks square whatever mask cuts it: the cut line becomes the flame edge. Masks should only trim irregular window edges, never shape the flame.
  - Learnings: dither fades look like noise on semi-transparent smoke → `edgeFade.smooth`. Irregular openings → `mask` from bg pixels, not rect `clip`. A flame sprite's flat base always shows → hide it (behind a roof line via clip, or dissolve it into a window glow). Keep one smoke style; tint instead of mixing drawing styles.
  - Unused (all fire sprites): 8101, 8501, 8801 (plasma blob), 8402 / 8402_nosmoke (square-looking in the window), 8802/8803 stills (thin loop / drew a window frame), fire 8102, 8702 (roof cluster, floated), smoke 8201/8202 (cartoon puffs), stills 8401/8701/8703. All in `assets/drafts/`, raw frames in `assets/drafts/frames/`.

## Side task: full-body head character (2026-10-04) — **base chosen: v9 → `wallpapers/burning-city-grin/assets/grin_body.png`** (256x372)

Separate from the wallpaper: a full-height version of the grin head, same face/expression; battered black business suit + long coat, torn sleeves, hands fully pitch-black with sharp spindly fingers (prompted generically, no franchise names). Source face: `head7302_crop_80x100.png` (7302 cropped to its bbox). Three routes, comparison `refs/body_compare.png`:
- `edit_image_pixen` of the head crop → 128x448 (1 gen, `body_pixenedit_128x448_seed9301`): **face kept exactly**, suit/vest/coat/torn sleeves/black claws, but a huge head (~3.5 heads tall).
- `create_image_pro` 96x170 with the head as reference (25 gens, 4 candidates `body_pro_96x170_seed9201_c0..3`): good proportions and clothes, c1 has the best long spindly black fingers; the face is ~20 px, only the red eyes survive, the grin is barely readable.
- `create_image_pixen` 96x192 from the text face prompt (1 gen each, seeds 9401/9402): nice figures but a different face, hands look like black gloves.
- **Head swap** (user's pick): Pro c1 body + 7302 face. Clear c1's head (x 36..61, rows 6..40), paste the face downscaled with HighQualityBicubic (not nearest), then `correct_pixelart` (0.1 gen) to bring it back on-grid. Two sizes: native 96x170 (face 27x34, grin barely readable) and **2x** 192x340 (c1 upscaled nearest, face 54x68 — grin, needle teeth, eyes all readable). Only the 96x112 head strip of the 2x is sent to correct_pixelart (inline-size limit) and pasted back. Results `body_swap_192x340_fix03/fix06` (strength 0.3 / 0.6, nearly identical), `body_swap_96x170_fix04`; comparison `refs/body_swap_compare.png`. Script: scratchpad `headswap.ps1` (not in repo).
- **Tall body around the untouched head** (2026-10-04, `body_tall_final_256x456.png`, ~33 gens): 7302 head 80x100 kept pixel-perfect at the top, body inpainted below. `inpaint_image` at 256x512 and 256x320 both fail with "Tier 2 is required" (failed jobs are not billed) → **Pro Flash inpaint** (`inpaint_image_pro_flash`, ≤256x256 per call, 9 gens per 256² tile): tile 1 = head + torso (mask from row 106), tile 2 = rows 200..455 with tile 1's bottom 56 rows on top and the rest **empty** (with the stretched c1 sketch in the mask the model kept its blocky pixels), then a 128x96 neck patch (6 gens) — tile 1 had put the head on a flat shoulder block. Result: ~4.5 heads tall, thin long legs, the coat ends at the waist. Comparison `refs/body_tall_compare.png`.
- **v2** (`body_tall_v2_256x404.png`, +15 gens) after feedback "no neck, legs too long, arms too short": recomposed by cutting/moving pixels (scratchpad `recompose.ps1`): a 14px empty strip under the chin, hands moved 40px lower, 66 rows cut out of the straight thighs; then two Pro Flash inpaints only into the holes — neck (128x96 crop, prompt "long thin pale grey neck, clearly visible bare skin between the chin and the collar") and forearms (256x128 crop with a two-rectangle `mask_image`). Lesson: the model won't invent a neck or longer limbs on its own — make the gap geometrically first, then fill it. Comparison `refs/body_tall_v2_compare.png`.
- **v3** (`body_tall_v3_256x387.png`, 0.1 gen) after "head a bit smaller, neck a bit shorter": head scaled to 88% (80x104 → 70x92, HighQualityBicubic), snapped to the original 7302 palette with binary alpha (`scripts/snap.py`), `correct_pixelart` 0.25 (barely changes anything after the snap — `body_tall_v3_snaponly.png` is nearly identical); 5 rows cut from the straight neck. The face is no longer pixel-identical but stays readable. Comparison `refs/body_tall_v3_compare.png`.
- **v4** (`body_tall_v4.png` 256x384, +9 gens) after "ugly seam, neck even shorter, remove the floating junk": Pro Flash inpaint of the coat-hem/leg-top band (rows 228..276, x 80..176 — the legs had started with a flat horizontal edge at row 252), 3 more rows cut from the neck (93..95), 8-connected islands < 25 px removed (62 px of specks left from moving the hands). `scripts/finish.py` does the cut + speck removal. Always run speck removal after cut/paste recompositions. Comparison `refs/body_tall_v4_compare.png`.
- **v6** (`body_tall_v6.png`, +5 gens, then hand-painted) after "ugly head-neck transition, neck a bit narrower, add black veins": neck narrowed geometrically to x 122..133, Pro Flash inpaint of the chin/neck (gave a flat grey block, no veins — 12x8 px is too small for the model), then **hand-painted** in the existing palette (scratchpad `paint_neck.py`): soft mid-tone instead of the dark line under the chin, outline + left shading, two diverging black veins continuing the chin's cracks. Small details (< ~16 px) are faster and better painted by hand than inpainted. Zoom `refs/body_tall_v6_neck_zoom.png`.
- **v7** (`body_tall_v7.png` 256x382, 0 gens) after "neck a bit shorter, veins should go under the shirt": 2 more neck rows cut (from v5, then repainted with scratchpad `paint_neck_v7.py`), veins continued over the skin wedge inside the open collar down to the tie knot (only skin-coloured pixels repainted). Zoom `refs/body_tall_v7_neck_zoom.png`.
- **v8** (`body_tall_v8.png` 256x380, 0 gens) after "even shorter": 4 neck rows cut from v5 in total (neck = 3 rows, 92..94, collar from 95), same hand-painted shading + veins continuing into the collar V. Zoom `refs/body_tall_v8_neck_zoom.png`.
- **v9** (`body_tall_v9.png` 256x372, 0.1 gen) after "head a bit smaller again": head re-scaled **from the original 7302 pixels** (v2 crop 80x104 → 64x84 = 80%, never from an already-scaled head), palette snap + `correct_pixelart` 0.25, body of v8 pulled up 8 rows. **Chosen as the base** (user: "we keep this one as the base for now") → `assets/grin_body.png`. Comparison `refs/body_tall_v9_compare.png`.
- Inline image gotcha: MCP truncates base64 around ~8k chars ("keyframe image is incomplete") → re-encode as an indexed PNG (`scripts/png_index.py`, pure python+zlib; needs ≤256 colours — run `scripts/snap.py` first if a crop has more): 256x256 tiles drop to 2–4k chars.

## Next wallpaper: "rooftop-clash" (PLANNED 2026-10-04, reviewed + corrected 2026-10-04, in progress)

Folder (to create): `wallpapers/rooftop-clash/` (same layout as burning-city-grin). Composition reference: `wallpapers/rooftop-clash/refs/composition_ref.jpg` (an anime poster, **layout only**: never feed it to PixelLab, never describe its franchise/characters in prompts).

**Brief (user):** high camera looking down at a steep angle. **Demon on the LEFT, grin character on the RIGHT**, clashing diagonally mid-fight (demon lunges in from the left, grin counter-attacks; arms meet near the centre). They visibly **stand on a building rooftop**, a burning city far below, partly covered in smoke. FX: flying glass shards, debris, sparks, embers, dust.
Characters reused: grin = `wallpapers/burning-city-grin/assets/grin_body.png` (v9, 256x372). Demon = create_character id `7e22632d…` (64px, 3/4 south-west), sheets in `burning-city-grin/assets/drafts/demon_*`.

### Review corrections (2026-10-04, from this session's verified experience — override the text below where they conflict)
- **Costs are much lower than the USD-derived estimates:** pixen = 1 gen per call at any size up to 512x288; create_character v3 = 2 gens at 48–64px (2–9 by size); PixMiniMax = 1–2 gens per loop (48x88x16 and 64x128x16 were 1 gen); Pro Flash inpaint = 9 gens per 256² tile, 6 for 128x96; correct_pixelart = 0.1. Realistic total **~150–250 gens**, not 420–480.
- **skeleton-v3 via MCP = a template animation posed onto a PixelLab character** (`animate_character(mode="skeleton-v3", template_animation_id=...)`, e.g. `cross-punch`, `lead-jab`, `surprise-uppercut`, `fight-stance-idle-8-frames`), 2–4 gens/direction. No free joint-fraction poses through MCP, and it needs a character_id → step 9/10 first.
- **Tier 1 size gates:** `inpaint_image` fails "Tier 2 is required" at 256x320 and 256x512 (failed jobs are not billed); `edit_image_pixen` output ≤ 256² area; Pro Flash ≤ 256x256 per call. `create_image_pro` at 256x256 and pixflux at 512x288 are unverified on Tier 1 → check at step 0/2 (cheap: failures are free).
- **Fighter size: 170–200 px tall** on the 512x288 canvas (not 100–130): at 100–130 the grin's head is ~30 px and the needle grin turns to mush (seen at 96x170; readable at 192x340).
- **Downscale the grin only once:** generate at the target size and carry the face over from the original 7302 pixels (as in body v9), not 372 → 256 → 130.
- **Fire (default chosen, user can veto):** far-city fires = small static glows baked into the far-city background + procedural flicker/glow on top; **no animated fire sprites** (step 15 dropped — 8 failed fire rounds on burning-city-grin).
- **Step 0 findings (live MCP schema, 2026-10-04):** `create_image_pixflux` is **max 400 px per side** (area ≤ 400²) → no 512x288 pixflux backdrop; and its `init_image_strength` is **how much of the init is PRESERVED** (500 barely changes it, 300 subtle, 150 real edit, ~50 keeps only the composition) — the research's "300–400 = rough blobs" is inverted. Consequence: far city = Pixen 512x288 from the prompt alone; rooftop = separate Pixen layer (no_background); the hand blockout is a layout guide for placement/cropping, and a pixflux init (strength ~50–100) only for ≤400 px layers.
- **Smoke:** reuse the distant-smoke sheet 8601 (user liked it), `tint` for darker near smoke, `edgeFade.smooth` (dither fades read as noise). New smoke bands only if 8601 doesn't fit the top-down view.

### Progress
- 2026-10-04 step 1: `refs/blockout.png` (layout guide, scratchpad blockout.ps1). Steps 2–3 round 1 (5 gens): far city Pixen 512x288 high top-down seeds 10101/10102 (strong converging streets, but fires drawn as meteor-like streaks), **10103** (best depth, endless grid to the horizon, small fire glows as agreed; a big black diagonal pole artifact on the left); roof textures Pixen 512x160 10201 (isometric slab with puddles reflecting fire, a façade strip on the left, vent + dome structures) / 10202 (huge cartoon flagstones, rejected). Roof cut along the parapet diagonal with an orange rim → `assets/drafts/roof_cut.png`; composites `refs/bg_previews_round1.png`.
- 2026-10-04 **brief change (user): the fighters stand on the building's WALL, not its roof — "the building has to be rotated"** (toppled skyscraper lying on its side; its window façade is the floor). Straight-on façade textures (Pixen 576x192 `side`, seeds 10301/10302) column-sheared under the edge diagonal still read as an upright wall (no foreshortening) → rejected. Prompting the façade as a floor works: Pixen 512x160 `high top-down` "the side wall of a toppled skyscraper lying flat like a floor … grid of windows recedes in perspective toward the top" → **10402** reads as a lying wall (broken windows with fire reflections); 10401 looks like a tower seen from below. Placed with scratchpad `facadeshear.ps1` (whole-pixel column shift, corner band + orange rim, `-TexOffset 16`) → `assets/drafts/wall_cut_10402o.png`, preview `refs/bg_preview_wall.png` (city 10103). Open: dark texture corners under the edge (left, far right), the black pole in city 10103. Gens so far for rooftop-clash: 9.

### Research summary (sources at the end)
- **The official MCP docs could not be read from the cloud session** (egress allowlist). Tool facts below come from pixellab.ai/pixellab-api, /mcp, /docs + third-party schema mirrors. **Step 0 = list the live MCP tools + `get_balance`, and fix names/params here before spending gens.**
- **Camera:** `view` controls perspective only weakly: `high top-down` ≈ 35° down, `low top-down` ≈ 20°, `side`. Nothing gives the poster's steep bird's-eye angle → use `high top-down` + prompt wording ("seen from very high above, looking steeply down") + an init-image blockout for layout.
- **Tool choice:**
  - `create_image_pixen`: best for full scenes, but **no init/reference/style input**, crops tight, default detail "highly detailed" over-renders (use `medium`/`low detail` for smoke). Area ≤ 512x512, sides divisible by 4. **688x384 is slightly over 512² (264192 px²); 680x384 is the largest safe 16:9.** 512x288 is fine.
  - `create_image_pixflux`: area ≤ 400x400 (512x288 = 147k px² fits). Has **`init_image` (strength 0–1000) + `color_image` (forced palette)** → the only text-to-image route with composition control at full canvas size. Init strength bands: 0–300 colour hint, **300–400 rough blobs/shapes (what we want)**, 400–600 variations, 600–900 detailing.
  - `create_image_pro`: up to **4 labelled `reference_images`** + style image → the only tool that can draw both fighters **interlocked in one sprite**. ≥171px = 1 candidate for 20 gens, 342–512px = 40 gens. `no_background` unreliable (opaque strips) → generate on solid black, key out locally.
  - `create_character` v3: reference mode = "rotates this exact character" from a **south-facing ≤256px reference**; `view` default `low top-down`. It may keep the side-on pose — then fall back to Pro.
  - Animate with **skeleton v3**: 3–15 frames, priced per frame count (not size), joints as image fractions → scripted lunge/counter poses.
  - `animate_image_pixminimax`: 4–40 frames (steps of 4), first = last frame for loops, same price at any size ≤256. Output = frame_count+1 (index 0 = input) → drop the duplicate.
  - Image-to-image depth: web/Aseprite only, Tier 1 max 160x160 → no use for the background.
  - Upscaled pixel art confuses all models → **run any reference through unzoom / native scale first** (grin_body.png is native, OK).
- Benchmark (pixellab-pip, 124 gens, weak stats): Pixen wins scenes, Pixflux wins subject-less backdrops, Pixflux≈Pixen for transparent parallax bands, Pro worst at parallax, best at isolated VFX + reference style matching.
- **Pixel-art composition** (SLYNYRD, Saint11):
  - Frame: top 0–15% red/black sky + giant shadow shapes + smoke ceiling; 15–55% city far below (rooftops seen mostly from the top, façades thin foreshortened slivers, streets as a converging grid); 55–100% rooftop slab, its far edge (parapet) a **diagonal from ~(0%, 62%) to (100%, 48%)**; fighters on the slab.
  - Looking down = 3-point perspective, verticals converge downward. In pixel art fake it with a subtle consistent lean (1px per 6–10px).
  - Sell the drop: bright orange rim on the parapet edge + big value jump (rooftop near-black/high contrast vs city low contrast/haze-tinted) + a façade falling away under the roof edge into smoke.
  - Atmospheric perspective: far districts → low-contrast red-brown silhouettes; only near blocks get full fire highlights.
  - Smoke is **lit from below** (orange-red underside, near-black top) — that one cue reads as "city burning". Fire: white-hot → warm → grey smoke, fast expansion then slowing; loop smoke by spawning new puffs every 4 frames.
- **Palette:** Lospec **Inferno 666** (8 colours: `#ffdd69 #fe8e63 #d23b36 #ac1242 #77123d #3e1548 #210743 #000323`) + a 3–4 step cool grey ramp (concrete, smoke, demon bone-white). Background 16–20 colours (Pixflux `color_image` or `reduce_colors`); characters keep their own 12–16 colour ramps.
- No useful community (Reddit/Discord/X) PixelLab threads were found — our own learnings above remain the main source.

### Character scale / perspective decision
- Side-view sprites on a 35° camera look pasted on (no head/shoulder tops, feet too big). **Plan A:** re-view both with create_character v3, `view: high top-down`. Grin: downscale grin_body to ~176x256 (HighQualityBicubic → `scripts/snap.py` → `correct_pixelart`), use as south-facing reference; take the **south-west** rotation (faces left). Demon: re-create at 128–160px (64px would be a speck next to grin), take **south-east** (faces right).
- **Plan B:** `create_image_pro` 256x256 with reference_images `[{grin, "identity of the right fighter"}, {demon, "identity of the left fighter"}]` → one interlocked pair sprite (~20 gens per candidate).
- **Plan C (cheat):** keep current sprites, flatter rooftop tilt, strong contact shadows/shadow pool, feet hidden behind rubble/parapet.
- Identity fixes (teeth, 4 arms, eyes): Pro Flash inpaint ≤256² tiles + hand-paint details <16px. Never ask the model to add limbs it didn't draw (make geometry first, then inpaint — see side task learnings).
- On-canvas size target: fighters ~170–200 px tall (see review corrections), demon centre-left x≈170, grin right x≈340, feet on the slab at y≈250–285.

### Pipeline (gen costs = estimates from USD prices at ~$0.0045/gen; verify with get_balance)
| # | Step | Tool / params | Size | ~Gens | Fallback |
|---|---|---|---|---|---|
| 0 | Verify tools, params, costs | list MCP tools, `get_balance` | — | 0 | — |
| 1 | Hand blockout: colour blobs, parapet diagonal, street grid, smoke band | local (Aseprite / python) → `refs/blockout.png` | 512x288 | 0 | — |
| 2 | Far city (B2), opaque | `create_image_pixen`, view high top-down, detail medium, 4–6 seeds | 512x288 | ~20 | `create_image_pixflux` + init = blockout, strength 350–450, color_image = Inferno 666 |
| 3 | Rooftop slab (B4), transparent | `create_image_pixflux`, init = blockout crop, strength ~450, no_background | 400x160 → pad to 512 | ~12 | Pixen 512x160, hand-cut the edge |
| 4 | Mid-city fire blocks (B3) | Pixen, no_background (or on black → key) | 512x128 | ~10 | key out from black |
| 5 | Smoke bands x3 depths (B5) | Pixen, detail **low**, on pure black → luminance→alpha locally | 512x96 each | ~30 | Pixflux 400x100 |
| 6 | Giant shadow silhouettes in the sky | Pixen | 256x192 | ~9 | hand-paint flat shapes |
| 7 | Seam / detail fixes | `inpaint_image_pro_flash` tiles | ≤256² | ~45 | hand-paint |
| 8 | Palette lock | `reduce_colors` 16–20 + `correct_pixelart` | per layer | ~10 | local quantize to Inferno 666 + greys |
| 9 | Grin re-view | `create_character` v3, ref = 176x256 south-facing, view high top-down | ≤256 | ~18 x2 | Plan B / C |
| 10 | Demon re-create 128–160 | `create_character` v3, view high top-down, old demon as ref | 160 | ~18 | Pro Flash create with style_image = old demon |
| 11 | Identity fixes | Pro Flash inpaint + hand-paint | ≤256 | ~30 | hand-paint |
| 12 | Clash keyframes | skeleton v3, 3–5 frames each | ≤256 | ~60 | animate-with-text v3 with end frame |
| 13 | Clash loops | `animate_image_pixminimax`, first = last, 8–16 frames | ≤256 | ~60 | 2-frame hand jitter |
| 14 | (opt.) interlocked pair sprite | `create_image_pro`, 2 labelled refs, no_background (or black) | 256x256 | ~60 | separate sprites overlapping via z-order |
| 15 | ~~Fire-spot loops in the city~~ dropped — baked static glows + procedural flicker | — | — | 0 | — |
| 16 | Debris slabs (big chunks only) | Pixflux no_background | 32–48 | ~5 | hand |

**Total ≈ 420 gens (≈480 with step 14), budget 600** (~30% of Tier 1's 2000/month). Order of work: 0 → 1 → 2/3 (show the user the composite with placeholder rects for fighters) → 9/10 → 12/13 → effects.

### Prompts (positive phrasing, layout by %, no franchise names)
- **P2 far city (Pixen, high top-down):** "Pixel art night city seen from very high above, camera looking steeply down at a dense grid of city blocks and streets far below. Many districts are burning: scattered orange fires glow between dark rooftops, streets glow faint red. The top 12% of the image is a dark crimson smoky sky. The lower half shows rooftops in sharp top-down view with tiny lit windows. Distant districts toward the top fade into red-brown haze with low contrast. Thick dark smoke drifts in wide bands across the middle. Limited palette of black, deep violet, crimson, orange and pale yellow. Moody, cinematic, clean pixels."
- **P3 rooftop (Pixflux init / Pixen, no_background):** "Pixel art flat concrete building rooftop seen from high above at a steep angle, filling the bottom 45% of the image. The rooftop's far edge is a low parapet wall running diagonally from the left side lower to the right side higher. Cracked concrete slabs, a rusted vent, scattered broken glass and rubble, puddles reflecting orange firelight. The parapet's outer edge has a bright orange rim light from fires below. Near-black shadows, high contrast, limited dark palette. Empty sky area above the rooftop."
- **P4 mid-city fire blocks:** "Pixel art cluster of burning city building tops seen from directly above at a steep angle, flames rising from three rooftops, glowing orange windows, dark ash-covered roofs, small details, red and orange light on black, transparent background."
- **P5 smoke band (Pixen, low detail, solid black bg):** "Thin wispy horizontal band of smoke stretching across the full width, slightly transparent, soft layered streaks, low detail, dark grey-brown on top, lit warm orange-red from below, on a solid pure black background." Near layer: add "denser, darker"; far layer: "faint, reddish haze".
- **P6 sky shadows:** "Huge dark shadowy silhouette shapes looming in a red smoky sky, abstract towering forms with long reaching arm-like shapes, made of black smoke, no faces, soft edges dissolving into haze, deep violet-black on dark crimson."
- **P9 grin (create_character description):** "Tall gaunt pale grey man with an extremely wide stretched grin full of long needle-like teeth, glowing red eyes, short messy black hair, black veins on the neck, battered black business suit with long black coat, torn sleeves, pitch-black hands with long sharp spindly fingers, seen from above."
- **P10 demon:** "Lean bone-white demon with four long arms, two pairs of shoulders, glowing yellow eyes, sharp claws, smooth bone-like skin with darker grey seams, crouched aggressive stance, seen from above."
- **P12 skeleton poses:** demon = lunge: front foot forward, upper arms reaching right, lower arms pulled back. Grin = counter: torso twisted left, one black hand thrust forward, the other raised high, coat flaring behind.
- **P13 PixMiniMax loop (enhance_prompt false):** "Locked in a straining power struggle, body trembles slightly, coat and hair flutter in hot wind, shoulders heave with breath, feet stay planted, camera does not move, returns to the starting pose."
- **P14 pair sprite (Pro, 256x256):** "Two fighters clashing mid-fight seen from high above: on the left a four-armed bone-white demon lunging in toward the right, on the right a pale grinning man in a black long coat counter-attacking toward the left, arms interlocked at the centre, both standing on flat ground, strong motion, dramatic pose, transparent background."
- **P15 fire spot:** "Flames flicker and rise steadily, tongues of fire curl upward, gentle looping motion, returns to the starting shape."

### FX: generated vs procedural
| Effect | How | Why |
|---|---|---|
| Sparks, embers, ash | procedural canvas, 1–2px palette colours, upward drift + noise | <16px: AI gives mush |
| Glass shards | procedural 2–4px quads tumbling out from the clash point; every few frames one pixel flips to `#ffdd69` (glint) | the glint flicker sells it |
| Dust / debris | 6–10 hand-pixelled 3–8px chunks thrown with gravity + 1–2 generated 32–48px concrete slabs | big debris benefits from texture |
| Smoke sheets | generated static wispy bands (P5), scrolled at 2–3 speeds, sine alpha wobble | large + slow, AI texture is fine |
| Fire spots in the city | PixMiniMax loops (P15), glow as a separate layer | rule: glow never baked |
| Fire glow / parapet rim light | procedural quantized radial gradients, flicker in palette steps | |
| Clash flash | procedural burst every 2–4 s at the contact point + spark spray | |

### Layer stack (back → front), all offsets integer-snapped at 512x288
0 sky gradient (procedural, dithered bands, slow hue pulse) · 1 giant shadow shapes (drift 0.3–0.5 px/s) · 2 far city · 3 far fire glows · 4 far haze band (scroll ~2 px/s) · 5 mid-city fire blocks + fire loops (8–10 fps) · 6 mid smoke band (~4 px/s) · 7 far embers/ash · 8 rooftop slab · 9 parapet rim light (flicker synced with fires) · 10 contact shadows (engine `shadow`, pulse with the clash) · 11 fighters (8–12 fps; offset loop phases so they never pulse in sync; 16-frame coat loop ≈1.5 s) · 12 clash flash + sparks · 13 glass shards + debris · 14 near smoke wisps / foreground ash (fast) · 15 vignette / red tint. Lively's mouse-parallax is optional — otherwise use the multipliers as drift speeds.

### Risks
- Tool names/params differ from the above → step 0. "high top-down" won't be steep enough → prompt wording + Pixflux init blockout. v3 keeps side-on pose → Plan B/C. Pixen crops tight → leave margin / use Pixflux for full silhouettes. Pro transparency fails → solid black + key. Banded sky → procedural dithered gradient. 688x384 may exceed the area cap → 512x288 / 680x384. Inline base64 ~8k limit → `scripts/png_index.py`. Gen estimates are derived, not quoted → measure after the first call of each tool.

Sources: pixellab.ai/pixellab-api · pixellab.ai/docs/options/init-image · pixellab.ai/docs/options/guidance · pixellab.ai/docs/tools/create-sl-image-pro · pixellab.ai/docs/tools/image-to-image-depth · api.pixellab.ai/v2/docs · glama.ai/mcp/servers/rabbitcannon/pixellab-forge-mcp (create_image_pixen, create_character_v3, animate_pixminimax) · github.com/Shilo/pixellab-pip (benchmark + routing spike) · slynyrd.com Pixelblog 11 / 31 · Saint11 smoke animation (patreon) · lospec.com/palette-list/inferno-666

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

## Head / sky details (planned 2026-10-02)

Folder: `wallpapers/burning-city-grin/`, sketch: `refs/sketch.png`. Reuses the ruined-city background (v2 composition, sky top ~40%).
- Night, city burning: smoke is an **animated layer** (sprites), never baked. Visible fire was dropped (see Status). Orange underglow on the sky = procedural gradient in canvas with flicker, not in bg.png.
- Sky: huge semi-transparent head, focus on a very wide grin with long needle-like fangs; glowing red eyes; upper head dissolves into the black upper sky band (dithered fade, not smoke).
- Head sprite ~160x96 canvas px (~30% width), generated on transparent bg at native scale. Transparency = canvas `globalAlpha` or **ordered dither** (keeps pure palette; preferred for pixel look).
- Eyes glow = separate small layer, additive (`lighter`) pulsing. Veil = dithered fade of the head into the black sky (smoke veil was tried and rejected).
- Prompts: describe the teeth generically; **don't name Mortal Kombat characters** in prompts (model may draw the character itself).
- Rough budget: ~60–120 calls, $3–8 on credits; Tier 1 month covers it with huge margin and unlocks PixMiniMax.
