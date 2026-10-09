// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Descent: eye level on the deck of a colossal freight lift dropping fast down a dark shaft. A gigantic rusted cog,
// half sunk into the deck, turns against the rack on the back wall; the shaft walls stream upward past the deck,
// sparks spray where the cog grinds, and rust motes are sucked up by the fall.
(() => {
  // Background = Pixen 512x288 seed 15603 (assets/bg.png). Split into layers (python, see CLAUDE.md):
  //   wall_tile.png  512x38 vertical tile of the walls (left side wall rows 100..137, back wall + rack rows 36..73;
  //                  38 px = one beam period on the side wall, two rungs of the rack) — scrolls up = the descent;
  //   deck.png       the deck only (wall cut away along its back/side edges, row ~199), drawn over the cog's lower half;
  //   cog.png        a separately generated cog (Pixen 256 no_background seed 15702) replacing the baked one, which
  //                  the scrolling wall covers; top_fade.png = dithered black over the top of the shaft.
  const SPEED = 70;                       // wall px/s
  const COG = { cx: 328, cy: 196, r: 118 };   // r ≈ pitch radius: the cog turns as fast as the rack slides
  const cogDeg = SPEED / COG.r * 180 / Math.PI;

  const sparkColors = ['#fffbe6', '#ffdd69', '#fe8e63', '#d23b36', '#5a1a14'];
  const spark = (id, x, y, angle, rate) => ({
    id, type: 'sparks', x, y, angle, spread: 70, rate, gust: 0.8, speed: [40, 130], life: [0.3, 0.9],
    gravity: -70, drag: 1.8, jitter: [3, 1], colors: sparkColors, prewarm: 1, blend: 'lighter', z: 6,
  });

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'wall', type: 'scroll', src: 'assets/wall_tile.png', x: 0, y: 0, h: 230, speed: SPEED, z: 0 },
      // The bg's own large-scale wall lighting (furnace glow low near the deck, dark corners), static — the light
      // rides with the platform while the wall texture slides under it. wall_shade = blur(bg)/blur(tile) capped at 1
      // (multiply), wall_light = what's left above that (added); blur radius 6, the cog area filled from its sides.
      { id: 'wallShade', type: 'image', src: 'assets/wall_shade.png', x: 0, y: 0, blend: 'multiply', z: 0.2 },
      { id: 'wallLight', type: 'image', src: 'assets/wall_light.png', x: 0, y: 0, blend: 'lighter', z: 0.3 },
      { id: 'topFade', type: 'image', src: 'assets/top_fade.png', x: 0, y: 0, z: 1 },

      // The cog: warmed and darkened to sit in the shaft's light (lit from the deck below, dark toward the top).
      { id: 'cog', type: 'spin', src: 'assets/cog.png', cx: COG.cx, cy: COG.cy, speed: cogDeg, step: 2, z: 2,
        grade: [
          { blend: 'multiply', alpha: 0.5, color: '#8a6450' },
          { blend: 'multiply', alpha: 0.6, color: '#1a0e0c', from: [0.5, 0], to: [0.5, 0.55] },
        ] },
      { id: 'deck', type: 'image', src: 'assets/deck.png', x: 0, y: 0, z: 3 },
      // Furnace light from below the deck edges, breathing.
      { id: 'underglow', type: 'glow', x: 230, y: 214, r: 70, color: '#e0742a', alpha: 0.18, flicker: 0.5, hz: 0.7,
        jitter: 0.3, blend: 'lighter', z: 4 },

      // Sparks: where the cog's teeth bite the rack (top), and where it grinds through the deck slot (both sides).
      spark('sparkTop', COG.cx, COG.cy - COG.r - 4, -90, 34),
      spark('sparkL', COG.cx - COG.r - 4, 198, -120, 18),
      spark('sparkR', COG.cx + COG.r + 4, 198, -60, 18),

      // Motes torn upward by the fall: fast dark rust streaks + slower glowing rust flakes.
      { id: 'streaks', type: 'particles', count: 45, color: '#2a1610', speed: 160, angle: -90, length: 6, z: 8 },
      { id: 'streaks2', type: 'particles', count: 20, color: '#6a3416', speed: 230, angle: -92, length: 9, z: 8 },
      { id: 'motes', type: 'rise', count: 90, speed: [45, 110], life: [2, 4], size: [1, 3], sway: 14,
        colors: ['#0a0807', '#140e0c', '#3a1a0e', '#56280f'], edge: '#6a3416', emberChance: 0.3,
        embers: ['#b8561e', '#9a4416', '#c8662a', '#7a3210'], z: 9 },

      { id: 'vignette', type: 'vignette', color: '#050203', alpha: 0.6, inner: 0.5, z: 40 },
    ],
  };
})();
