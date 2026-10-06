// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Rooftop Clash: a tilted burning skyscraper on the right, the burning city far below on the left (seen from high
// above); the demon (left) and the grin character (right) clash in mid-air in front of it.
(() => {
  const D = 'assets/drafts/';

  // Demon: Pro c1 (yellow eyes, four separate arms) redrawn by edit_image_pixen at 256x256 (figure 193x206, 1.5x the
  // 168 original). Lunges up-right, one arm reaching past the grin's head. Three claw scratches across the chest are
  // inpainted into the sprite (demon_big_256_clawed_12501.png) as muted grooves with torn rims, sharing its shading.
  // Then cropped to the figure (196x208 at 50,22) and redrawn by Pro edit_image for single-pixel detail (the pixen
  // upscale looked chunky next to the grin); its eyes came out white and were repainted yellow → demon_hq_196x208.png.
  const demon = { x: 30, y: 62, eyes: [[88, 48.5, 6, 0.85], [98.5, 50, 5, 0.7]] };   // [x, y, glow r, alpha] in sprite px
  // Grin: Pro slash pose c3, padded to 216x204 and the coat/legs cut by the old canvas border completed with
  // inpaint_image, then the hand recoloured by hand: claw tips and the light wrist cuff → black, so it is a bare
  // pitch-black hand running into the sleeve, not a glove (claws in the hand's own colours); a few black veins hand-
  // painted on the pale face. Flies left, raking down with the oversized claw.
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

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      // Background: Pixen 512x288 high top-down, seed 10602 (tower ~70°, burning window grid, city on the left).
      { id: 'bg', type: 'image', src: 'assets/bg.png', x: 0, y: 0, z: 0 },

      { id: 'demon', type: 'image', src: D + 'demon_hq_196x208.png', x: demon.x, y: demon.y, z: 20, grade: demonGrade },
      ...demon.eyes.map(([ex, ey, r, a], i) => ({
        id: 'demonEye' + i, type: 'glow', x: demon.x + ex, y: demon.y + ey, r, color: '#ffc21a',
        alpha: a, flicker: 0.35, hz: 0.4, blend: 'lighter', z: 22,
      })),
      { id: 'grin', type: 'image', src: D + 'grin_slash_c3_final_216x204.png', x: grin.x, y: grin.y, z: 21, grade: grinGrade },
      ...grin.eyes.map(([ex, ey, r, a], i) => ({
        id: 'grinEye' + i, type: 'glow', x: grin.x + ex, y: grin.y + ey, r, color: '#ff2a1a',
        alpha: a, flicker: 0.3, hz: 0.6, blend: 'lighter', z: 22,
      })),

      // Embers and ash rising from the city, procedural.
      { id: 'embers', type: 'particles', count: 70, color: '#fe8e63', speed: 18, angle: -80, length: 1, z: 30 },
      { id: 'ash', type: 'particles', count: 40, color: '#5a5560', speed: 12, angle: -95, length: 1, z: 29 },
    ],
  };
})();
