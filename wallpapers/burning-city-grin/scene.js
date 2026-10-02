// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Layout follows refs/sketch.png: big head top-center under a smoke veil, burning city below.
//
// Variants for comparing (URL params):
//   ?head=168 | 224 | 264 | pro256 | 320   which head sprite (default 264)
//   ?veil=fog | static | smoke             veil motion (default fog)
(() => {
  // Sprite geometry measured from the PNGs: opaque bbox [x0, x1, y0, y1], eye centres and eye rows, in sprite px.
  const HEADS = {
    168:    { src: 'head3_c3eyes_pixen_seed7302.png',  bbox: [45, 122, 4, 100], eyes: [[70, 51], [97, 51]], eyeRows: [47, 56] },
    224:    { src: 'head4_pixen_224x140_seed7401.png', bbox: [60, 163, 5, 134], eyes: [[93, 69], [130, 69]], eyeRows: [63, 75] },
    264:    { src: 'head4_pixen_264x164_seed7402.png', bbox: [71, 192, 6, 158], eyes: [[110, 82], [153, 81]], eyeRows: [74, 89] },
    pro256: { src: 'head4_pro_256x160_seed7404.png',   bbox: [54, 201, 0, 159], eyes: [[101, 78], [154, 78]], eyeRows: [69, 87] },
    320:    { src: 'head4_pixen_320x200_seed7403.png', bbox: [86, 233, 8, 193], eyes: [[133, 99], [186, 99]], eyeRows: [90, 108] },
  };
  const VEILS = {
    fog:    { drift: 1.5, rise: 0, curl: 0 },   // keeps its shape, slides slowly sideways
    static: { drift: 0, rise: 0, curl: 0 },     // drawn once
    smoke:  { drift: 2, rise: 3, curl: 1 },     // churning smoke (previous version)
  };

  const params = new URLSearchParams(location.search);
  const head = HEADS[params.get('head')] ?? HEADS[264];
  const veil = VEILS[params.get('veil')] ?? VEILS.fog;

  // Centre the head's opaque bbox horizontally, top of the hair 2px below the screen edge.
  const hx = Math.round(256 - (head.bbox[0] + head.bbox[1]) / 2);
  const hy = 2 - head.bbox[2];
  const [eyeL, eyeR] = head.eyes.map(([x, y]) => [hx + x, hy + y]);
  const eyeTop = hy + head.eyeRows[0], eyeMid = hy + (head.eyeRows[0] + head.eyeRows[1]) / 2;
  const glowR = Math.round((head.eyeRows[1] - head.eyeRows[0]) * 0.9);

  // Veil: solid down to just above the eyes, gone around the eye middle; about as wide as the face there.
  const halfWidth = Math.round((head.bbox[1] - head.bbox[0]) * 0.36);
  const spread = 0.7, fadeTo = Math.round(eyeMid + 2);
  const topHalf = Math.ceil(halfWidth + fadeTo * spread) + 6;

  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      { id: 'bg', type: 'image', src: '../../shared/assets/bg.png', x: 0, y: 0, z: 0 },

      // Orange underglow from the burning city, procedural.
      { id: 'glow', type: 'gradient', y0: 40, y1: 250, peak: 0.6, color: '#ff6a1f', alpha: 0.35, flicker: 0.35, hz: 0.7, blend: 'lighter', z: 5 },

      { id: 'head', type: 'image', src: 'assets/drafts/' + head.src, x: hx, y: hy, alpha: 0.8, z: 10 },

      { id: 'veil', type: 'haze', x: 256 - topHalf, y: 0, w: topHalf * 2, h: fadeTo + 10, cx: 256,
        solidTo: Math.round(eyeTop - 2), fadeTo, halfWidth, spread,
        colors: ['#000000', '#08090e', '#171a24'], scale: 16, ragged: 6, fps: 15, ...veil, z: 12 },

      // Eye glow above the veil so it burns through the smoke.
      { id: 'eyeL', type: 'glow', x: eyeL[0], y: eyeL[1], r: glowR, color: '#ff2a1a', alpha: 0.75, flicker: 0.4, hz: 0.5, blend: 'lighter', z: 13 },
      { id: 'eyeR', type: 'glow', x: eyeR[0], y: eyeR[1], r: glowR, color: '#ff2a1a', alpha: 0.75, flicker: 0.4, hz: 0.5, blend: 'lighter', z: 13 },

      // Fires on the ruins and smoke above them.
      { id: 'fire1', type: 'rect', x: 150, y: 150, w: 24, h: 32, color: '#f80', label: 'fire', z: 20 },
      { id: 'fire2', type: 'rect', x: 330, y: 170, w: 24, h: 32, color: '#f80', label: 'fire', z: 20 },
      { id: 'fire3', type: 'rect', x: 420, y: 100, w: 24, h: 32, color: '#f80', label: 'fire', z: 20 },
      { id: 'smoke1', type: 'rect', x: 130, y: 70, w: 64, h: 80, color: '#444', label: 'smoke', alpha: 0.5, z: 21 },
      { id: 'smoke2', type: 'rect', x: 400, y: 20, w: 64, h: 80, color: '#444', label: 'smoke', alpha: 0.5, z: 21 },

      // Ash falling, procedural.
      { id: 'ash', type: 'particles', count: 60, color: '#c9a07f', speed: 25, angle: 100, length: 1, z: 30 },
    ],
  };
})();
