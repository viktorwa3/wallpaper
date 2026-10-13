// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Point Blank: over the grin's shoulder on a wrecked street — he "shoots" finger guns at the demon; gravity blasts
// frozen mid-moment tear into the demon and the building behind it. Debris hangs and drifts (frozen moment); blood splashes are static.
(() => {
  const q = new URLSearchParams(location.search);
  const BG = q.get('bg') ? `assets/drafts/bg_pixen_512x288_seed${q.get('bg')}.png` : 'assets/bg.png';   // bg = 16001b, craters moved (v3)
  // Grin: Pro 168 seed 16302 c2 / c3 with body v9 + the rooftop grin as references (round 9) — shared art,
  // ../../shared/characters/grin/aim/. ?aim=c3 picks the other one; ?grin=<seed> shows an old pixen draft.
  const old = q.get('grin');
  const aim = q.get('aim') === 'c3' ? 'c3' : 'c2';
  const GRIN = old ? `assets/drafts/grin_back_edit_seed${old}.png` : `../../shared/characters/grin/aim/aim_${aim}.png`;
  const G = old ? { x: -14, y: 60 } : { x: 8, y: 124 };   // sprite position
  // Hits = almost transparent shockwaves bursting from the centre (engine `wave`), no beams.
  const hit = (id, x, y, r, phase, z, lens = 0.08) => ({ id, type: 'wave', x, y, r, phase, period: 1.8, rings: 3, lens, z });   // no hover: the lens samples untranslated canvas coords
  // Demon: Pro 168 seed 16501 c1 (rooftop demon as reference) recoiling, upper arm torn off at the shoulder.
  // Stump at sprite (60,49), eyes (107,25), punched-through side (80,80) (Pro Flash inpaint 16604), soles on row 160.
  // Static (user: no sway).
  const DM = { x: 255, y: 102 };
  const at = (sx, sy) => [DM.x + sx, DM.y + sy];
  // Wall debris: Pro 64 seed 16702 sprays (16 candidates, style = the wall around crater 1; sheet refs/debris_round2.png),
  // impact point at the middle of the right edge (60,32). Cut into pieces by scripts/split-pieces.py (atlas +
  // [sx, sy, w, h, ox, oy] per piece); each piece drifts away from the impact and back, far ones more (engine `shards`).
  // The first try (Pro 96, 16701) was too big — slabs larger than the craters — with an opaque dust puff cut by the border.
  const DEBRIS = { B1: [[0, 0, 10, 9, 39, 6], [11, 0, 8, 7, 28, 11], [20, 0, 4, 4, 24, 17], [25, 0, 19, 22, 44, 17], [45, 0, 4, 3, 40, 18], [50, 0, 7, 4, 34, 22], [58, 0, 5, 4, 26, 26], [64, 0, 5, 4, 35, 29], [70, 0, 2, 2, 21, 31], [73, 0, 8, 8, 38, 35], [82, 0, 3, 3, 28, 38], [86, 0, 3, 4, 18, 39], [90, 0, 3, 3, 33, 41], [94, 0, 4, 5, 47, 42], [99, 0, 5, 6, 37, 50]], B2: [[0, 0, 6, 6, 40, 10], [7, 0, 4, 5, 33, 11], [12, 0, 21, 27, 43, 14], [34, 0, 3, 3, 44, 18], [38, 0, 4, 3, 39, 19], [43, 0, 4, 3, 27, 24], [48, 0, 8, 8, 33, 25], [57, 0, 3, 3, 22, 29], [61, 0, 4, 5, 39, 34], [66, 0, 5, 4, 31, 35], [72, 0, 5, 7, 42, 39], [78, 0, 2, 1, 50, 39], [81, 0, 6, 5, 49, 41], [88, 0, 4, 3, 36, 44], [93, 0, 4, 2, 19, 45], [98, 0, 3, 2, 30, 51], [102, 0, 3, 3, 38, 54]], B3: [[0, 0, 4, 5, 38, 7], [5, 0, 4, 3, 29, 9], [10, 0, 22, 31, 42, 13], [33, 0, 4, 5, 38, 15], [38, 0, 3, 3, 29, 19], [42, 0, 7, 4, 33, 22], [50, 0, 3, 4, 41, 26], [54, 0, 3, 3, 32, 30], [58, 0, 4, 3, 23, 31], [63, 0, 3, 2, 39, 34], [67, 0, 5, 4, 33, 37], [73, 0, 3, 3, 19, 41], [77, 0, 6, 7, 45, 45], [84, 0, 5, 4, 36, 46], [90, 0, 3, 3, 28, 49], [94, 0, 3, 3, 35, 56]] };
  const LAMP = [{ blend: 'multiply', color: '#d8a878', alpha: 0.55 }];   // warm the grey chunks in the lamp light
  const debris = (id, [cx, cy], seed, grade) => ({ id: 'debris' + id, type: 'shards', src: `assets/debris_${id.toLowerCase()}.png`,
    pieces: DEBRIS[id], from: [60, 32], x: cx - 60, y: cy - 32, drift: 4, reach: 40, period: 7, seed, grade, z: 2 });
  const ARM = { x: DM.x + 60 - 86, y: DM.y + 49 - 44 };   // severed arm sprite, up-left of the stump

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'bg', type: 'image', src: BG, x: 0, y: 0, z: 0 },
      // Building hits in the bg's craters around the demon (bg_16001b_moved: the far-left craters were painted out).
      hit('hitB1', 350, 88, 18, 0, 1),
      hit('hitB2', 356, 143, 14, 0.6, 1),
      hit('hitB3', 422, 111, 11, 1.1, 1),
      { id: 'demon', type: 'image', src: 'assets/demon.png', x: DM.x, y: DM.y, z: 3 },
      { id: 'demonEye', type: 'glow', x: at(107, 25)[0], y: at(107, 25)[1], r: 5, color: '#ffc21a', alpha: 0.7, flicker: 0.3,
        hz: 0.5, blend: 'lighter', z: 4 },
      // The torn-off arm hangs in the air just off the stump (static). Its torn end is at arm sprite (55,11).
      // Graded into the night: the raw pixen arm was a bright orange-beige that glowed against the blue wall.
      { id: 'arm', type: 'image', src: 'assets/demon_arm.png', x: ARM.x, y: ARM.y, z: 5,
        grade: [{ blend: 'multiply', color: '#7d86a0', alpha: 0.8 }, { blend: 'multiply', color: '#3a3448', alpha: 0.35, from: [1, 0], to: [0, 1] }] },
      // Blood: static anime-style bursts (Pro 96 seed 16621): droplets exploding left from one point, no stream, so they
      // sit in front of the body. c0 (thin spikes, no big blobs — user: drop the big drops) on the punched-through side,
      // the sparser c2 on the stump, and c2 mirrored (blood_arm.png, spraying right) as a small fountain from the arm's
      // torn end (cut to a 22px radius so it stays small). Blobs wider than 5px outside each burst's core are stripped
      // (user: no big drops). Burst centres in sprite px: c0 (66,47), c2 (54,54), mirrored c2 (41,54).
      { id: 'bloodSide', type: 'image', src: 'assets/blood_side.png', x: at(80, 80)[0] - 66, y: at(80, 80)[1] - 47, z: 6 },
      { id: 'bloodStump', type: 'image', src: 'assets/blood_stump.png', x: at(60, 49)[0] - 54, y: at(60, 49)[1] - 54, z: 6 },
      { id: 'bloodArm', type: 'image', src: 'assets/blood_arm.png', x: ARM.x + 55 - 41, y: ARM.y + 11 - 54, z: 6 },
      // On the demon: the big one at the stump (the arm tear), a smaller one in the side. No lens there: even 0.02
      // shifted the dark window edge behind the demon into a black arc next to the stump.
      hit('hitD1', ...at(60, 49), 28, 0.3, 7, 0),
      hit('hitD2', ...at(80, 80), 18, 0.9, 7, 0),
      // Debris blown out of the wall craters back toward the shooter, hanging in the air (behind the demon).
      debris('B1', [350, 88], 1),
      debris('B2', [356, 143], 2, LAMP),
      debris('B3', [422, 111], 3, LAMP),
      // Glass and street debris lifted into the air across the street.
      { id: 'glass', type: 'float', kind: 'glass', area: [190, 120, 300, 130], count: 16, size: [1, 3], dir: -90, spread: 360,
        drift: 2, period: 6, glint: '#e8f6ff', seed: 7, z: 8 },
      { id: 'rocks', type: 'float', kind: 'rock', area: [180, 200, 320, 70], count: 14, size: [1, 4], dir: -90, spread: 60,
        drift: 3, period: 6, seed: 8, z: 8 },
      { id: 'grin', type: 'image', src: GRIN, x: G.x, y: G.y, z: 10 },
      { id: 'vignette', type: 'vignette', color: '#040508', alpha: 0.5, inner: 0.55, z: 40 },
    ],
  };
})();
