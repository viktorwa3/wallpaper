// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Layout follows refs/sketch.png: big head top-center, its top sinking into the black upper sky band, burning city below;
// on the foreground platform two battered heroes face a four-armed demon.
//
// Variants for comparing (URL params):
//   ?head=168 | 224 | 264 | pro256 | 320   which head sprite (default 320 = shared/characters/grin/head.png)
//   ?lift=N                                how far the eyes sit above the bottom of the black sky band (default 40)
//   ?alpha=0..1                            head opacity (default 0.2)
//   ?bob=N                                 head sway amplitude in px (default 2, 0 = still)
(() => {
  // Shared art (shared/): the grin character, the demon, the distant smoke and the ruined-city background.
  const SH = '../../shared/';
  const GRIN = SH + 'characters/grin/', DEMON = SH + 'characters/demon/', SMOKE = SH + 'effects/smoke/', CITY = SH + 'backgrounds/ruined-city/';

  // Sprite geometry measured from the PNGs: opaque bbox [x0, x1, y0, y1], eye centres and eye rows, in sprite px.
  const HEADS = {
    168:    { src: GRIN + 'drafts/head3_c3eyes_pixen_seed7302.png',  bbox: [45, 122, 4, 100], eyes: [[70, 51], [97, 51]], eyeRows: [47, 56] },
    224:    { src: GRIN + 'drafts/head4_pixen_224x140_seed7401.png', bbox: [60, 163, 5, 134], eyes: [[93, 69], [130, 69]], eyeRows: [63, 75] },
    264:    { src: GRIN + 'drafts/head4_pixen_264x164_seed7402.png', bbox: [71, 192, 6, 158], eyes: [[110, 82], [153, 81]], eyeRows: [74, 89] },
    pro256: { src: GRIN + 'drafts/head4_pro_256x160_seed7404.png',   bbox: [54, 201, 0, 159], eyes: [[101, 78], [154, 78]], eyeRows: [69, 87] },
    320:    { src: GRIN + 'head.png',                              bbox: [86, 233, 8, 193], eyes: [[133, 99], [186, 99]], eyeRows: [90, 108] },
  };
  const params = new URLSearchParams(location.search);
  const head = HEADS[params.get('head')] ?? HEADS[320];
  const lift = Number(params.get('lift') ?? 40);
  const alpha = Number(params.get('alpha') ?? 0.2);

  // The black sky band of bg.png ends at row ~62. The head fades out upwards into it (dithered, rows 36..72),
  // so the hair and forehead are swallowed by the night and only the glowing eyes show through.
  const skyBand = 62, fade = [36, skyBand + 10];
  const eyeY = (head.eyes[0][1] + head.eyes[1][1]) / 2;
  const hx = Math.round(256 - (head.bbox[0] + head.bbox[1]) / 2);
  const hy = Math.round(skyBand - lift - eyeY);
  const [eyeL, eyeR] = head.eyes.map(([x, y]) => [hx + x, hy + y]);
  const glowR = Math.round((head.eyeRows[1] - head.eyeRows[0]) * 0.9);
  // The head slowly sways up and down; the eye glows share the same bob so they stay on the eyes. ?bob=N sets amplitude.
  const bob = { amp: Number(params.get('bob') ?? 2), period: 5 };

  // Distant smoke: PixMiniMax animation of a pixen still, last frame pinned to the first; h crops its rubble base.
  // Fire was tried (sprites, procedural `flames`) and dropped on 2026-10-03 — see CLAUDE.md.
  const farSmoke = { type: 'sprite', src: SMOKE + 'smoke_pixmm_64x128x16_seed8601.png', frameW: 64, frames: 16, fps: 6, h: 116,
    edgeFade: { top: 24, bottom: 34, left: 8, right: 16, smooth: true } };

  // Fighters: PixelLab v3 characters (3/4 view) with PixMiniMax breathing loops, last frame pinned to the first.
  // feet = lowest opaque row (`ground - feet` puts the soles on a canvas row), feetX / feetW = stance centre and
  // half-width for the contact shadow. Platform top edge ~y 230, walking surface below it.
  const suit = { type: 'sprite', src: 'assets/suit_breath_48x8.png', frameW: 48, frames: 8, fps: 6, feet: 47, feetX: 20, feetW: 12 };
  const mage = { type: 'sprite', src: 'assets/mage_breath_48x8.png', frameW: 48, frames: 8, fps: 6, feet: 46, feetX: 23, feetW: 12 };
  // Demon: wide 3/4 stance, the rear foot ends ~5 px higher than the front one, so its shadow is taller and sits
  // between the two soles (shadowDy / shadowRy), or the rear foot floats above it.
  const demon = { type: 'sprite', src: DEMON + 'demon_breath_64x7.png', frameW: 64, frames: 7, fps: 5, feet: 62, feetX: 31, feetW: 18,
    shadowDy: -3, shadowRy: 3,
    eyes: [[26, 16, 7, 1], [22, 16, 4, 0.55]] };   // [x, y, glow radius, alpha] in sprite px; the far eye is hidden by the profile
  const stand = (c, x, ground) => ({ ...c, x, y: ground - c.feet });
  const shadow = (id, c, x, ground) =>
    ({ id, type: 'shadow', x: x + c.feetX, y: ground + (c.shadowDy ?? 0), rx: c.feetW, ry: c.shadowRy ?? 2, color: '#05070d', alpha: 0.6, z: 19 });
  const demonAt = [318, 258];

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'bg', type: 'image', src: CITY + 'bg.png', x: 0, y: 0, z: 0 },

      // Orange underglow from the burning city, procedural.
      { id: 'glow', type: 'gradient', y0: 40, y1: 250, peak: 0.6, color: '#ff6a1f', alpha: 0.35, flicker: 0.35, hz: 0.7, blend: 'lighter', z: 5 },

      { id: 'head', type: 'image', src: head.src, x: hx, y: hy, alpha, fade, bob, z: 10 },

      // Eye glow above the head so it burns through the black sky.
      { id: 'eyeL', type: 'glow', x: eyeL[0], y: eyeL[1], r: glowR, color: '#ff2a1a', alpha: 0.75, flicker: 0.4, hz: 0.5, blend: 'lighter', bob, z: 13 },
      { id: 'eyeR', type: 'glow', x: eyeR[0], y: eyeR[1], r: glowR, color: '#ff2a1a', alpha: 0.75, flicker: 0.4, hz: 0.5, blend: 'lighter', bob, z: 13 },

      // Distant smoke columns rising from behind the ruins and the lavender distant city: drawn under bg_fg (the
      // background with its sky cut out). Bases fade out above the light horizon strip (y 173+), never on it.
      { id: 'far1', ...farSmoke, x: 84, y: 176 - 116, alpha: 0.3, phase: 0, z: 2 },
      { id: 'far2', ...farSmoke, x: 318, y: 176 - 116, alpha: 0.35, phase: 10, z: 2 },
      { id: 'far3', ...farSmoke, x: 428, y: 172 - 116, alpha: 0.25, phase: 5, flipX: true, z: 2 },
      { id: 'fg', type: 'image', src: CITY + 'bg_fg.png', x: 0, y: 0, z: 3 },

      // Fighters on the platform, above the sky underglow; the mage stands a step behind the swordsman.
      shadow('mageShadow', mage, 104, 252),
      shadow('suitShadow', suit, 148, 258),
      shadow('demonShadow', demon, ...demonAt),
      { id: 'mage', ...stand(mage, 104, 252), phase: 3, z: 20 },
      { id: 'suit', ...stand(suit, 148, 258), z: 21 },
      { id: 'demon', ...stand(demon, ...demonAt), z: 21 },

      // Demon's eyes glow yellowish, pulsing slowly.
      ...demon.eyes.map(([ex, ey, r, a], i) => ({
        id: 'demonEye' + i, type: 'glow', x: demonAt[0] + ex, y: demonAt[1] - demon.feet + ey, r, color: '#ffc21a',
        alpha: a, flicker: 0.35, hz: 0.4, blend: 'lighter', z: 22,
      })),

      // Ash falling, procedural.
      { id: 'ash', type: 'particles', count: 60, color: '#c9a07f', speed: 25, angle: 100, length: 1, z: 30 },
    ],
  };
})();
