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

