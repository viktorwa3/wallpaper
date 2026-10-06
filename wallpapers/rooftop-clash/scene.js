// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Rooftop Clash: a tilted burning skyscraper on the right, the burning city far below on the left (seen from high
// above); the demon (left) and the grin character (right) clash in mid-air in front of it.
(() => {
  // Demon: Pro c1 (yellow eyes, four separate arms) redrawn by edit_image_pixen at 256x256 (figure 193x206, 1.5x the
  // 168 original). Lunges up-right, one arm reaching past the grin's head. Three claw scratches across the chest are
  // inpainted into the sprite (demon_big_256_clawed_12501.png) as muted grooves with torn rims, sharing its shading.
  // Then cropped to the figure (196x208 at 50,22) and redrawn by Pro edit_image for single-pixel detail (the pixen
  // upscale looked chunky next to the grin); its eyes came out white and were repainted yellow → assets/demon.png (= drafts/demon_hq_196x208.png).
  const demon = { x: 30, y: 62, eyes: [[88, 48.5, 6, 0.85], [98.5, 50, 5, 0.7]] };   // [x, y, glow r, alpha] in sprite px
  // Grin: Pro slash pose c3, padded to 216x204 and the coat/legs cut by the old canvas border completed with
  // inpaint_image, then the hand recoloured by hand: claw tips and the light wrist cuff → black, so it is a bare
  // pitch-black hand running into the sleeve, not a glove (claws in the hand's own colours); a few black veins hand-
  // painted on the pale face → assets/grin.png (= drafts/grin_slash_c3_final_216x204.png). Flies left, raking down with the oversized claw.
  const grin = { x: 176, y: 22, eyes: [[57, 55.5, 6, 0.95], [63, 56, 5, 0.8]] };   // red eyes, sprite px

  // Scene light, so both read as lit by the same burning city below-left (round 6): the demon was lit like a studio
  // shot (brightest thing on screen, near-white highlights), the grin barely lit at all.
  const firelight = (alpha, color = '#ff5a1e') => ({ blend: 'screen', alpha, color, from: [0, 1], to: [0.65, 0.3] });
  const demonGrade = [
    { blend: 'multiply', alpha: 0.6, color: '#b8917e' },                                  // pull down + warm the bone-white
    { blend: 'multiply', alpha: 0.55, color: '#4a2a3a', from: [1, 0], to: [0.45, 0.55] },  // away-from-fire side into shadow
    firelight(0.45),
  ];
  // Weak and deep red on the grin: at 0.4 the screen pass turned his black claw (bottom-left, nearest the fire) brown.
  const grinGrade = [firelight(0.18, '#c8301a')];

  // Effects (round 8, all procedural, 0 gens).
  // Fire flicker over the brightest fire spots baked into bg.png (found by scanning for hot pixels): pulse + jitter,
  // each with its own phase so they never flicker in sync.
  const FIRES = [[441, 233], [102, 150], [111, 247], [311, 150], [427, 218], [59, 214], [27, 198], [59, 119], [255, 262],
    [437, 41], [410, 17], [24, 275], [122, 180]];
  const fireGlows = FIRES.map(([x, y], i) => ({
    id: 'fire' + i, type: 'glow', x, y, r: 9 + (i % 3) * 2, color: '#ff7a2a', alpha: 0.32, flicker: 0.45, jitter: 0.4,
    hz: 0.35 + (i % 5) * 0.11, phase: i * 1.7, blend: 'lighter', z: 1,
  }));
  // Shared distant-smoke loop, darkened, rising over the city on the left behind the fighters.
  const SMOKE = '../../shared/effects/smoke/smoke_pixmm_64x128x16_seed8601.png';
  const smoke = { type: 'sprite', src: SMOKE, frameW: 64, frames: 16, fps: 6, h: 116, tint: ['#1a0d10', 0.45],
    edgeFade: { top: 30, bottom: 30, left: 10, right: 14, smooth: true }, z: 3 };

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      // Background: Pixen 512x288 high top-down, seed 10602 (tower ~70°, burning window grid, city on the left).
      { id: 'bg', type: 'image', src: 'assets/bg.png', x: 0, y: 0, z: 0 },

      { id: 'demon', type: 'image', src: 'assets/demon.png', x: demon.x, y: demon.y, z: 20, grade: demonGrade },
      ...demon.eyes.map(([ex, ey, r, a], i) => ({
        id: 'demonEye' + i, type: 'glow', x: demon.x + ex, y: demon.y + ey, r, color: '#ffc21a',
        alpha: a, flicker: 0.35, hz: 0.4, blend: 'lighter', z: 22,
      })),
      { id: 'grin', type: 'image', src: 'assets/grin.png', x: grin.x, y: grin.y, z: 21, grade: grinGrade },
      ...grin.eyes.map(([ex, ey, r, a], i) => ({
        id: 'grinEye' + i, type: 'glow', x: grin.x + ex, y: grin.y + ey, r, color: '#ff2a1a',
        alpha: a, flicker: 0.3, hz: 0.6, blend: 'lighter', z: 22,
      })),

      ...fireGlows,
      { id: 'smoke1', ...smoke, x: -6, y: 60, alpha: 0.45, phase: 0 },
      { id: 'smoke2', ...smoke, x: 70, y: 40, alpha: 0.35, phase: 7, flipX: true },
      { id: 'smoke3', ...smoke, x: 150, y: 90, alpha: 0.3, phase: 12 },

      // Debris now and then flying across the whole frame (round 9: the clash flash and the debris bursting out of the
      // clash point were rejected): glass from the right, chunks from the left, fast, with a short motion streak.
      { id: 'glass', type: 'debris', area: [520, -20, 12, 200], rate: 0.6, prewarm: 4, kind: 'glass', size: [3, 5], vx: [-240, -160],
        vy: [-15, 45], gravity: 20, glint: '#ffdd69', colors: ['#a9bdd0', '#dbe8f2'], trail: 7, trailColor: '#5d6c7c', z: 26 },
      { id: 'rocks', type: 'debris', area: [-20, 20, 12, 220], rate: 0.4, prewarm: 4, kind: 'rock', size: [3, 5], vx: [140, 210],
        vy: [-40, 10], gravity: 35, colors: ['#7a6258', '#9a7c6a'], trail: 5, trailColor: '#4a3a34', z: 26 },

      // Embers and ash rising from the city, procedural.
      { id: 'embers', type: 'particles', count: 70, color: '#fe8e63', speed: 18, angle: -80, length: 1, z: 30 },
      { id: 'ash', type: 'particles', count: 40, color: '#5a5560', speed: 12, angle: -95, length: 1, z: 29 },

      // Darkened frame edges keep the eye on the clash.
      { id: 'vignette', type: 'vignette', color: '#07030a', alpha: 0.6, inner: 0.5, z: 40 },
    ],
  };
})();
