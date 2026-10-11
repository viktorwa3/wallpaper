// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Point Blank: over the grin's shoulder on a wrecked street — he "shoots" finger guns at the demon; gravity blasts
// frozen mid-moment tear into the demon and the building behind it. Everything hangs and drifts (frozen-moment hover).
(() => {
  const q = new URLSearchParams(location.search);
  const BG = `assets/drafts/bg_pixen_512x288_seed${q.get('bg') ?? '16001b'}.png`;
  // Grin: Pro 168 seed 16302 c2 / c3 with body v9 + the rooftop grin as references (round 9) — shared art,
  // ../../shared/characters/grin/aim/. ?aim=c3 picks the other one; ?grin=<seed> shows an old pixen draft.
  const old = q.get('grin');
  const aim = q.get('aim') === 'c3' ? 'c3' : 'c2';
  const GRIN = old ? `assets/drafts/grin_back_edit_seed${old}.png` : `../../shared/characters/grin/aim/aim_${aim}.png`;
  const G = old ? { x: -14, y: 60 } : { x: 8, y: 124 };   // sprite position
  // Hits = gravity anomalies frozen mid-blast (engine `anomaly`): nearly transparent pulsing lenses, no beams.
  const hit = (id, x, y, r, phase, z, lens = 0.35) => ({ id, type: 'anomaly', x, y, r, phase, hz: 0.6, lens, z });

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'bg', type: 'image', src: BG, x: 0, y: 0, z: 0 },
      // Building hits over the bg's craters. A weaker lens: a strong one just inflates the black hole into a dark ball.
      hit('hitB1', 107, 115, 30, 0, 1, 0.12),
      hit('hitB2', 221, 124, 20, 0.6, 1, 0.12),
      hit('hitB3', 356, 141, 12, 1.1, 1, 0.12),
      { id: 'demon', type: 'rect', x: 300, y: 120, w: 90, h: 140, color: '#3a3a44', label: 'demon', z: 3 },
      // On the demon: the big one at the shoulder (tears the arm off), a smaller one in the side.
      hit('hitD1', 332, 160, 24, 0.3, 6),
      hit('hitD2', 360, 210, 15, 0.9, 6),
      { id: 'grin', type: 'image', src: GRIN, x: G.x, y: G.y, z: 10 },
      { id: 'vignette', type: 'vignette', color: '#040508', alpha: 0.5, inner: 0.55, z: 40 },
    ],
  };
})();
