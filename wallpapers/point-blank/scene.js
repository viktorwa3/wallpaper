// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Point Blank: over the grin's shoulder on a wrecked street — he "shoots" finger guns at the demon; electric slugs
// frozen mid-moment tear into the demon and the building behind it. Everything hangs and drifts (frozen-moment hover).
(() => {
  const q = new URLSearchParams(location.search);
  const BG = `assets/drafts/bg_pixen_512x288_seed${q.get('bg') ?? '16001b'}.png`;
  // Grin from behind: 16101 → edit 16132 → 16152 → 16153 (one arm, clean back) → 16172 ("raise the second arm
  // parallel to the first") → 16182 ("make both hands finger guns, thumbs up").
  const GRIN = `assets/drafts/grin_back_edit_seed${q.get('grin') ?? '16182'}.png`;
  const G = { x: -14, y: 60 };            // grin sprite position; fingertips at sprite (255,99) / (255,149)
  const tipA = [G.x + 256, G.y + 99], tipB = [G.x + 256, G.y + 149];
  const shot = (id, from, to, r, seed, z = 6) => ({ id, type: 'gauss', from, to, r, seed, arcs: 7, z });

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'bg', type: 'image', src: BG, x: 0, y: 0, z: 0 },
      // Building hits (no beams: older shots), in the bg's craters.
      { id: 'hitB1', type: 'gauss', to: [107, 115], r: 12, seed: 11, z: 1 },
      { id: 'hitB2', type: 'gauss', to: [221, 124], r: 8, seed: 12, z: 1 },
      { id: 'hitB3', type: 'gauss', to: [356, 141], r: 5, seed: 13, z: 1 },
      { id: 'demon', type: 'rect', x: 300, y: 120, w: 90, h: 140, color: '#3a3a44', label: 'demon', z: 3 },
      shot('shotA', tipA, [330, 170], 9, 21),
      shot('shotB', tipB, [360, 205], 7, 22),
      { id: 'grin', type: 'image', src: GRIN, x: G.x, y: G.y, z: 10 },
      { id: 'vignette', type: 'vignette', color: '#040508', alpha: 0.5, inner: 0.55, z: 40 },
    ],
  };
})();
