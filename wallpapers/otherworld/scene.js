// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Otherworld: first-person view from the street, looking straight up between rusted, stained mid-rise blocks; a
// pitch-black sky cut by one murky orange band like a river. The walls flake apart and the flakes drift up into the
// sky — the moment the town shifts into the other world.
(() => {
  // Background candidates (Pixen 512x288, round 1): ?bg=14001|14002|14003|14004. Default = assets/bg.png (= 14001).
  const pick = new URLSearchParams(location.search).get('bg');
  const BG = pick ? `assets/drafts/bg_pixen_512x288_seed${pick}.png` : 'assets/bg.png';

  // Rust flakes off the walls (14001: left block x 0..250, right block x 335..512), pulled toward the top of the
  // river where the street's perspective converges.
  // Flakes are the wall's own paint (pale beige-grey and rust tones from bg.png), with a dark rusted underside.
  const PAINT = ['#a8987e', '#8c7c66', '#b9ab92', '#7a4a32', '#96826a'];

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'bg', type: 'image', src: BG, x: 0, y: 0, z: 0 },

      // The river of murky light: a slow, weak pulse along its course.
      ...[[322, 10, 22], [300, 60, 24], [328, 120, 24], [304, 180, 22], [276, 225, 18]].map(([x, y, r], i) => ({
        id: 'river' + i, type: 'glow', x, y, r, color: '#c8762e', alpha: 0.16, flicker: 0.5, hz: 0.12, phase: i * 0.9,
        blend: 'lighter', z: 1,
      })),

      { id: 'peel', type: 'peel', areas: [[0, 0, 250, 288], [335, 0, 177, 288]], rate: 14, prewarm: 10,
        size: [3, 7], cling: [0.5, 1.5], life: [7, 12], speed: [9, 20], vanish: [318, -30], sway: 7,
        colors: PAINT, back: '#2a1712', edge: '#d08a3c', under: '#140a08', ash: '#2a1c18', z: 10 },
      { id: 'ash', type: 'particles', count: 40, color: '#4a3a34', speed: 8, angle: -96, length: 1, z: 11 },

      { id: 'vignette', type: 'vignette', color: '#050203', alpha: 0.55, inner: 0.55, z: 40 },
    ],
  };
})();
