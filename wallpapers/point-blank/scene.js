// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Point Blank: over the grin's shoulder on a wrecked street — he "shoots" finger guns at the demon; gravity blasts
// frozen mid-moment tear into the demon and the building behind it. Debris hangs and drifts (frozen moment); blood splashes are static.
(() => {
  const q = new URLSearchParams(location.search);
  const BG = q.get('bg') ? `assets/drafts/bg_pixen_512x288_seed${q.get('bg')}.png` : 'assets/bg.png';   // bg = 16001b, craters moved (v3)
  // Grin: Pro 168 seed 16302 c2 / c3 with body v9 + the rooftop grin as references (round 9) — shared art,
  // ../../shared/characters/grin/aim/. ?aim=c2 picks the other one; ?grin=<seed> shows an old pixen draft.
  const old = q.get('grin');
  const aim = q.get('aim') === 'c2' ? 'c2' : 'c3';   // c3 by default (user, 2026-10-16)
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
  // Pieces over 45 px are dropped (split-pieces.py max_px; user: no very big chunks) — incl. the clump at the hole.
  const DEBRIS = { B1: [[0, 0, 8, 7, 28, 11], [9, 0, 4, 4, 24, 17], [14, 0, 4, 3, 40, 18], [19, 0, 7, 4, 34, 22], [27, 0, 5, 4, 26, 26], [33, 0, 5, 4, 35, 29], [39, 0, 2, 2, 21, 31], [42, 0, 8, 8, 38, 35], [51, 0, 3, 3, 28, 38], [55, 0, 3, 4, 18, 39], [59, 0, 3, 3, 33, 41], [63, 0, 4, 5, 47, 42], [68, 0, 5, 6, 37, 50]], B2: [[0, 0, 6, 6, 40, 10], [7, 0, 4, 5, 33, 11], [12, 0, 3, 3, 44, 18], [16, 0, 4, 3, 39, 19], [21, 0, 4, 3, 27, 24], [26, 0, 8, 8, 33, 25], [35, 0, 3, 3, 22, 29], [39, 0, 4, 5, 39, 34], [44, 0, 5, 4, 31, 35], [50, 0, 5, 7, 42, 39], [56, 0, 2, 1, 50, 39], [59, 0, 6, 5, 49, 41], [66, 0, 4, 3, 36, 44], [71, 0, 4, 2, 19, 45], [76, 0, 3, 2, 30, 51], [80, 0, 3, 3, 38, 54]], B3: [[0, 0, 4, 5, 38, 7], [5, 0, 4, 3, 29, 9], [10, 0, 4, 5, 38, 15], [15, 0, 3, 3, 29, 19], [19, 0, 7, 4, 33, 22], [27, 0, 3, 4, 41, 26], [31, 0, 3, 3, 32, 30], [35, 0, 4, 3, 23, 31], [40, 0, 3, 2, 39, 34], [44, 0, 5, 4, 33, 37], [50, 0, 3, 3, 19, 41], [54, 0, 6, 7, 45, 45], [61, 0, 5, 4, 36, 46], [67, 0, 3, 3, 28, 49], [71, 0, 3, 3, 35, 56]] };
  // Blood bursts cut into pieces (split-pieces.py on drafts/blood_*_flat.png): the core stays, ~60% of the loose drops
  // drift a little away from the wound and back (user: like the debris, but moderate).
  const BLOOD = { Side: [[0, 0, 35, 85, 43, 3], [36, 0, 17, 17, 32, 6], [54, 0, 2, 3, 55, 9], [57, 0, 2, 3, 44, 11], [60, 0, 1, 2, 66, 11], [62, 0, 22, 19, 19, 12], [85, 0, 4, 4, 28, 12], [90, 0, 1, 1, 52, 12], [92, 0, 1, 1, 58, 12], [94, 0, 2, 3, 70, 12], [97, 0, 1, 1, 75, 14], [99, 0, 1, 1, 67, 15], [101, 0, 2, 2, 36, 16], [104, 0, 3, 5, 76, 16], [108, 0, 1, 1, 73, 17], [110, 0, 1, 1, 81, 17], [112, 0, 2, 2, 31, 18], [115, 0, 17, 10, 13, 20], [133, 0, 2, 2, 38, 20], [136, 0, 1, 2, 83, 21], [138, 0, 2, 2, 76, 22], [141, 0, 3, 3, 25, 23], [145, 0, 3, 4, 41, 24], [149, 0, 2, 2, 80, 25], [152, 0, 1, 1, 85, 28], [154, 0, 4, 2, 19, 29], [159, 0, 1, 1, 83, 30], [161, 0, 3, 2, 33, 31], [165, 0, 1, 1, 20, 32], [167, 0, 8, 5, 26, 32], [176, 0, 1, 1, 23, 33], [178, 0, 1, 1, 85, 33], [180, 0, 14, 8, 18, 34], [195, 0, 1, 1, 83, 34], [197, 0, 1, 1, 89, 36], [199, 0, 2, 2, 85, 37], [202, 0, 1, 1, 83, 39], [204, 0, 4, 2, 15, 40], [209, 0, 3, 2, 22, 42], [213, 0, 14, 3, 10, 45], [228, 0, 1, 1, 85, 45], [230, 0, 2, 1, 88, 45], [233, 0, 1, 1, 92, 45], [235, 0, 7, 4, 24, 48], [243, 0, 2, 1, 18, 49], [246, 0, 1, 2, 77, 49], [248, 0, 4, 2, 13, 51], [253, 0, 19, 9, 17, 51], [273, 0, 1, 1, 83, 51], [275, 0, 2, 2, 85, 52], [278, 0, 1, 1, 19, 53], [280, 0, 1, 1, 89, 54], [282, 0, 4, 4, 32, 56], [287, 0, 1, 1, 27, 59], [289, 0, 1, 1, 85, 59], [291, 0, 1, 1, 87, 60], [293, 0, 2, 2, 22, 61], [296, 0, 23, 21, 15, 61], [320, 0, 1, 1, 28, 62], [322, 0, 2, 4, 74, 62], [325, 0, 1, 1, 25, 63], [327, 0, 3, 3, 85, 64], [331, 0, 17, 10, 7, 65], [349, 0, 2, 3, 27, 65], [352, 0, 8, 7, 36, 65], [361, 0, 3, 2, 80, 65], [365, 0, 1, 1, 24, 68], [367, 0, 16, 18, 34, 68], [384, 0, 3, 4, 82, 69], [388, 0, 1, 1, 78, 70], [390, 0, 1, 1, 63, 72], [392, 0, 8, 8, 25, 74], [401, 0, 1, 1, 37, 75], [403, 0, 4, 15, 59, 75], [408, 0, 1, 1, 76, 75], [410, 0, 1, 1, 81, 75], [412, 0, 1, 1, 67, 76], [414, 0, 2, 4, 78, 76], [417, 0, 1, 1, 71, 77], [419, 0, 2, 2, 43, 78], [422, 0, 1, 1, 74, 78], [424, 0, 1, 1, 33, 79], [426, 0, 2, 4, 66, 80], [429, 0, 1, 1, 53, 81], [431, 0, 1, 1, 57, 82], [433, 0, 1, 1, 70, 82], [435, 0, 1, 1, 74, 82], [437, 0, 1, 1, 56, 84], [439, 0, 3, 3, 51, 85]], Stump: [[0, 0, 9, 11, 37, 10], [10, 0, 1, 1, 54, 14], [12, 0, 12, 9, 11, 15], [25, 0, 14, 12, 26, 16], [40, 0, 2, 2, 51, 20], [43, 0, 4, 7, 60, 22], [48, 0, 2, 2, 69, 23], [51, 0, 1, 1, 43, 24], [53, 0, 3, 2, 47, 24], [57, 0, 8, 9, 54, 24], [66, 0, 13, 7, 16, 28], [80, 0, 3, 2, 33, 28], [84, 0, 3, 3, 65, 28], [88, 0, 3, 3, 43, 29], [92, 0, 7, 8, 48, 29], [100, 0, 2, 2, 29, 30], [103, 0, 1, 1, 37, 30], [105, 0, 2, 2, 40, 31], [108, 0, 1, 2, 73, 31], [110, 0, 14, 5, 1, 33], [125, 0, 4, 2, 67, 33], [130, 0, 10, 7, 35, 34], [141, 0, 5, 3, 43, 34], [147, 0, 1, 1, 21, 36], [149, 0, 1, 1, 32, 37], [151, 0, 1, 1, 75, 37], [153, 0, 3, 2, 26, 38], [157, 0, 2, 2, 31, 40], [160, 0, 1, 2, 35, 40], [162, 0, 4, 6, 74, 40], [167, 0, 2, 2, 85, 40], [170, 0, 10, 4, 19, 41], [181, 0, 10, 4, 37, 41], [192, 0, 1, 1, 83, 42], [194, 0, 1, 1, 81, 43], [196, 0, 35, 29, 32, 44], [232, 0, 3, 2, 8, 45], [236, 0, 2, 1, 35, 45], [239, 0, 2, 1, 31, 46], [242, 0, 4, 2, 25, 48], [247, 0, 7, 5, 33, 49], [255, 0, 8, 3, 13, 50], [264, 0, 2, 2, 28, 52], [267, 0, 1, 1, 78, 53], [269, 0, 6, 9, 72, 55], [276, 0, 1, 1, 82, 55], [278, 0, 1, 1, 32, 56], [280, 0, 2, 1, 29, 57], [283, 0, 2, 2, 85, 57], [286, 0, 9, 4, 18, 58], [296, 0, 1, 1, 34, 58], [298, 0, 3, 2, 10, 61], [302, 0, 2, 2, 29, 64], [305, 0, 2, 5, 73, 66], [308, 0, 14, 7, 10, 67], [323, 0, 1, 1, 37, 67], [325, 0, 3, 5, 69, 67], [329, 0, 8, 6, 25, 68], [338, 0, 3, 3, 55, 69], [342, 0, 5, 4, 58, 70], [348, 0, 6, 12, 61, 70], [355, 0, 6, 5, 30, 71], [362, 0, 1, 1, 45, 73], [364, 0, 2, 2, 37, 74], [367, 0, 2, 2, 51, 75], [370, 0, 3, 5, 56, 75], [374, 0, 2, 4, 68, 75], [377, 0, 1, 2, 76, 75], [379, 0, 1, 1, 27, 77], [381, 0, 4, 4, 43, 77], [386, 0, 8, 8, 31, 78], [395, 0, 8, 11, 45, 81], [404, 0, 9, 7, 13, 82], [414, 0, 2, 2, 26, 85], [417, 0, 2, 4, 63, 85]], Arm: [[0, 0, 7, 4, 41, 33], [8, 0, 4, 3, 48, 34], [13, 0, 6, 5, 51, 36], [20, 0, 10, 4, 49, 41], [31, 0, 2, 1, 59, 45], [34, 0, 3, 3, 30, 46], [38, 0, 31, 27, 31, 46], [70, 0, 7, 5, 56, 49], [78, 0, 4, 6, 20, 57], [83, 0, 1, 1, 61, 58], [85, 0, 3, 3, 24, 67], [89, 0, 1, 1, 58, 67], [91, 0, 3, 3, 38, 69], [95, 0, 4, 5, 29, 70], [100, 0, 5, 4, 33, 70], [106, 0, 1, 1, 50, 73], [108, 0, 1, 1, 38, 75], [110, 0, 2, 1, 43, 75]] };
  const bloodBurst = (id, [wx, wy], c, core, seed) => ({ id: 'blood' + id, type: 'shards', src: `assets/blood_${id.toLowerCase()}.png`,
    pieces: BLOOD[id], from: c, x: wx - c[0], y: wy - c[1], drift: 2, reach: 40, period: 6, share: 0.6, still: core, seed, z: 6 });
  const LAMP = [{ blend: 'multiply', color: '#d8a878', alpha: 0.55 }];   // warm the grey chunks in the lamp light
  const debris = (id, [cx, cy], seed, grade) => ({ id: 'debris' + id, type: 'shards', src: `assets/debris_${id.toLowerCase()}.png`,
    pieces: DEBRIS[id], from: [60, 32], x: cx - 60, y: cy - 32, drift: 4, reach: 40, period: 7, seed, grade, z: 2 });
  const ARM = { x: DM.x + 60 - 86, y: DM.y + 49 - 44 };   // severed arm sprite, up-left of the stump
  const ARM_END = [ARM.x + 55, ARM.y + 11], STUMP = at(60, 49), SIDE = at(80, 80);
  // Blood variants (static), ?blood=a|b|c|d — comparison sheet refs/blood_variants.png:
  //   a  Pro radial bursts cut into pieces, loose drops sway (see bloodBurst above)
  //   b  blood inpainted INTO the demon sprite (Pro Flash 16801 side spray + 16802 stump arc → demon_blood_b.png), lit with
  //      the body; procedural arm fountain
  //   c  Pro 64 arterial spurts (16811: c14 side, c3 stump), stream foot at sprite (63,43)/(63,46), drawn behind the
  //      demon so the body hides the foot; procedural arm fountain
  //   d  procedural fighting-game blood (scripts/blood-arcs.py): stream breaking into shaded teardrop drops along arcs
  //   combinations (Pro 64 fan sprays 16812, sheet refs/blood_fan_round1.png: c4 thin jet, c11 fine mist, c12 slanted fan):
  //   e  side inpaint only (demon_blood_side.png) + the c3 arterial arc from the stump + a thin jet from the arm (c4 mirrored)
  //   f  full b + fine mist (c11) over the side wound + the arm jet
  //   g  user's pick: side spray inpainted into the sprite (demon_blood_side.png) + the same mist style (c11, rotated about
  //      its source with scripts/aim-sprite.py) on all three wounds: side, stump (205°, 24px), arm's torn end (-35°, 16px)
  const BV = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].includes(q.get('blood')) ? q.get('blood') : 'g';
  const img = (id, src, [px, py], [ox, oy], z) => ({ id, type: 'image', src, x: px - ox, y: py - oy, z });
  const procArm = img('bloodArm', 'assets/blood_proc_arm.png', ARM_END, [6, 22], 6);
  const armMist = img('bloodArm', 'assets/blood_mist_arm.png', ARM_END, [59, 59], 6);   // small spray like the side's (c11 aimed -35°, 16px)
  const armJet = img('bloodArm', 'assets/blood_jet_arm.png', ARM_END, [27, 27], 6);   // aim-sprite.py: source at (R,R), aimed -35° along the arm
  const BLOOD_LAYERS = {
    a: [bloodBurst('Side', SIDE, [66, 47], 22, 1), bloodBurst('Stump', STUMP, [54, 54], 10, 2), bloodBurst('Arm', ARM_END, [41, 54], 8, 3)],
    b: [procArm],
    c: [img('bloodSide', 'assets/blood_spurt_side.png', SIDE, [63, 43], 2.5), img('bloodStump', 'assets/blood_spurt_stump.png', STUMP, [63, 46], 2.5), procArm],
    e: [img('bloodStump', 'assets/blood_spurt_stump.png', STUMP, [63, 46], 2.5), armJet],
    f: [img('bloodMist', 'assets/blood_mist.png', SIDE, [63, 29], 6), armJet],
    g: [img('bloodMist', 'assets/blood_mist.png', SIDE, [63, 29], 6), img('bloodStump', 'assets/blood_mist_stump.png', STUMP, [59, 59], 6), armMist],
    d: [img('bloodSide', 'assets/blood_proc_side.png', SIDE, [66, 30], 6), img('bloodStump', 'assets/blood_proc_stump.png', STUMP, [58, 50], 6), procArm],
  }[BV];

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'bg', type: 'image', src: BG, x: 0, y: 0, z: 0 },
      // Building hits in the bg's craters around the demon (bg_16001b_moved: the far-left craters were painted out).
      hit('hitB1', 350, 88, 18, 0, 1),
      hit('hitB2', 356, 143, 14, 0.6, 1),
      hit('hitB3', 422, 111, 11, 1.1, 1),
      { id: 'demon', type: 'image', src: { b: 'assets/demon_blood_b.png', f: 'assets/demon_blood_b.png', e: 'assets/demon_blood_side.png', g: 'assets/demon_blood_side.png' }[BV] ?? 'assets/demon.png', x: DM.x, y: DM.y, z: 3 },
      { id: 'demonEye', type: 'glow', x: at(107, 25)[0], y: at(107, 25)[1], r: 5, color: '#ffc21a', alpha: 0.7, flicker: 0.3,
        hz: 0.5, blend: 'lighter', z: 4 },
      // The torn-off arm hangs in the air just off the stump (static). Its torn end is at arm sprite (55,11).
      // Graded into the night: the raw pixen arm was a bright orange-beige that glowed against the blue wall.
      { id: 'arm', type: 'image', src: 'assets/demon_arm.png', x: ARM.x, y: ARM.y, z: 5,
        grade: [{ blend: 'multiply', color: '#7d86a0', alpha: 0.8 }, { blend: 'multiply', color: '#3a3448', alpha: 0.35, from: [1, 0], to: [0, 1] }] },
      // Blood: one of the variants above (default a = the Pro 96 seed 16621 radial bursts: c0 thin spikes on the side, c2
      // on the stump, c2 mirrored as the arm fountain; blobs wider than 5px outside each core stripped).
      ...BLOOD_LAYERS,
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
