// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Otherworld: first-person view from the street, looking up between rusted, stained mid-rise blocks under a slight
// dutch tilt; a pitch-black sky where a murky orange band glows through drifting black fog. The walls flake apart and
// ash, flakes and embers float up everywhere — the moment the town shifts into the other world.
(() => {
  // Two finished backgrounds, each with its own sky mask + band layer (scripts/sky-mask.py) and effect geometry:
  //   default = seed 14003 rotated 7° clockwise (nearest, zoom 1.21) = assets/bg.png;
  //   ?bg=14103 = the cartoon-cloud variant (Pixen "dutch angle" seed 14103, unrotated) = assets/bg_14103.png.
  const V = {
    main: {
      bg: 'assets/bg.png', sky: 'assets/sky_mask.png', band: 'assets/band.png',
      halos: [[245, 95, 34], [292, 55, 34], [338, 18, 30], [258, 258, 34], [302, 222, 34], [342, 184, 28]],
      seeps: [[262, 80, 46], [318, 34, 40], [276, 246, 46], [326, 200, 40]],
      murk: [200, 178], walls: [[0, 0, 204, 288], [376, 0, 136, 288]], vanish: [300, -30],
      // Flake colours = the wall's own paint (pale beige-grey and rust tones from bg.png).
      paint: ['#a8987e', '#8c7c66', '#b9ab92', '#7a4a32', '#96826a'],
    },
    14103: {
      bg: 'assets/bg_14103.png', sky: 'assets/sky_mask_14103.png', band: 'assets/band_14103.png',
      halos: [[240, 55, 34], [300, 110, 40], [370, 70, 40], [395, 20, 30], [345, 200, 34], [300, 235, 28]],
      seeps: [[280, 90, 50], [370, 60, 44], [340, 210, 44]],
      murk: [172, 278], walls: [[0, 30, 180, 258], [400, 0, 112, 288], [190, 150, 110, 138]], vanish: [330, -30],
      bandAlpha: 0.55,   // the clouds are big solid shapes: at 0.9 they blow out to yellow
      paint: ['#b1b597', '#9a9c82', '#727165', '#7a3a22', '#a05a26'],
    },
  };
  const v = V[new URLSearchParams(location.search).get('bg')] ?? V.main;
  const SKY = v.sky;

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'bg', type: 'image', src: v.bg, x: 0, y: 0, z: 0 },

      // The band itself lights up (its orange pixels, brightened, added on top) with a slow breathing pulse.
      { id: 'band', type: 'image', src: v.band, x: 0, y: 0, blend: 'lighter', alpha: v.bandAlpha ?? 0.9,
        pulse: { amp: 0.5, hz: 0.09 }, z: 1 },
      // Light bleeding out of the band into the sky, under the fog.
      ...v.halos.map(([x, y, r], i) => ({
        id: 'halo' + i, type: 'glow', x, y, r, color: '#d8802e', alpha: 0.4, flicker: 0.5, hz: 0.11, phase: i * 1.3,
        blend: 'lighter', mask: SKY, z: 2,
      })),
      // Black fog drifting across the sky (up and to the right, along the band), thick in places, torn in others.
      { id: 'murk', type: 'murk', x: v.murk[0], y: 0, w: v.murk[1], h: 288, color: '#030203', scale: 46, drift: [4, -6], curl: 0.04,
        cover: 0.43, soft: 0.2, density: 0.96, levels: 5, fps: 12, mask: SKY, z: 3 },
      // The band shining through the fog: the same brightened band pixels again, weaker, on top of the murk.
      { id: 'bandThrough', type: 'image', src: v.band, x: 0, y: 0, blend: 'lighter', alpha: 0.4,
        pulse: { amp: 0.5, hz: 0.09 }, z: 4 },
      // A faint glow on top of the fog: light diffusing through it where the band runs underneath.
      ...v.seeps.map(([x, y, r], i) => ({
        id: 'seep' + i, type: 'glow', x, y, r, color: '#b85a1e', alpha: 0.17, flicker: 0.6, hz: 0.09, phase: i * 1.7,
        blend: 'lighter', mask: SKY, z: 4,
      })),

      // Wall flakes tearing off both blocks and drifting up toward the top of the band.
      { id: 'peel', type: 'peel', areas: v.walls, rate: 10, prewarm: 10,
        size: [3, 6], cling: [0.5, 1.5], life: [7, 12], speed: [9, 18], vanish: v.vanish, sway: 7,
        colors: v.paint, back: '#2a1712', edge: '#d08a3c', under: '#140a08', ash: '#2a1c18', z: 10 },
      // The otherworld motes: dark ash flakes and a few smouldering embers rising slowly over the whole frame.
      { id: 'rise', type: 'rise', count: 110, speed: [5, 14], life: [5, 11], size: [1, 3], sway: 5,
        colors: ['#1a1210', '#2a1c18', '#3a2822', '#4a3a34'], edge: '#7a4a32',
        emberChance: 0.22, embers: ['#ff9a3c', '#e8642a', '#ffc070', '#c8401e'], z: 11 },

      { id: 'vignette', type: 'vignette', color: '#050203', alpha: 0.55, inner: 0.55, z: 40 },
    ],
  };
})();
