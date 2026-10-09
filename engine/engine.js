// Pixel wallpaper engine: renders window.SCENE on a native-resolution canvas,
// scaled to the screen by the largest integer factor (letterboxed if needed).
//
// Layer types (drawn in ascending z):
//   image       { src, x, y, fade, edgeFade, rim, grade }  rim: { color, alpha, sides } = 1px backlight outline (see
//               buildRim); grade: [{ blend, alpha, color, from, to }] = colour grade / scene light passes (see buildGrade).
//               fade: [y0, y1] canvas rows — image is gone above y0 and fully
//               visible below y1, ordered-dithered in between (sinks into the dark sky). Mask applied once at load.
//   sprite      { src, x, y, frameW, frames, fps, phase, h, flipX } frames laid out in one row; phase = frame offset
//               (desyncs copies); h = draw only the top h rows (crops a baked-in base); flipX mirrors horizontally.
//               Also takes fade / edgeFade like image. edgeFade { top, bottom, left, right }: px over which each
//               frame's edges dither out (hides plumes cut flat by the frame border); smooth: true fades with alpha
//               instead of dither (for already semi-transparent layers). tint: [color, amount] recolours the sheet
//               (e.g. darkens grey smoke). Masks and tint are applied once at load.
//   rect        { x, y, w, h, color, label }                placeholder for an asset not made yet
//   gradient    { y0, y1, peak, color, alpha, flicker, hz } vertical glow: 0 at y0 → full at peak (0..1 of span, default 0.75) → 0 at y1
//   glow        { x, y, r, color, alpha, flicker, hz }      radial glow centred on x,y (e.g. eyes), pulsing
//   haze        { x, y, w, h, cx, solidTo, fadeTo, halfWidth, spread, colors, scale, drift, rise, curl, ragged, fps }
//               drift/rise = sideways/upward speed, curl = how much the smoke shape itself churns.
//               curl 0 = fog that keeps its shape and only slides; drift = rise = curl = 0 = static, drawn once.
//               domain-warped smoke shaped as a dome over cx: solid down to canvas row solidTo, gone at fadeTo,
//               with tendrils hanging up to `ragged` px lower; half-width is halfWidth at fadeTo and grows by
//               `spread` px per row upwards. colors = [core, body, crest]; edges ordered-dithered (pure palette).
//               Recomputed at `fps` (default 15) — it is the most expensive layer.
//   flames      { x, y, w, h, sources, heat, cool, wind, fps, palette, fadeIn }  procedural pixel fire (averaging fire,
//               Doom palette): heat is pinned in `sources` ([[x, y, w, h], ...] canvas rects, e.g. inside a window),
//               rises one row per step, each cell = mean of the cells below minus noise-driven cooling (`cool`, higher =
//               shorter flames); turb = per-row sideways wobble (default 1.5), taper = extra cooling away from the
//               centre line cx (default 1) so flames end in tips; wind sways the whole fire (shears it — avoid). heat 0..1 = source strength; fadeIn = coolest palette levels
//               drawn semi-transparent (default 6). The Doom spread algorithm was tried first: pure sparks at this size.
//               Never loops, any shape; combine with `mask` to keep it in an opening.
//   shadow      { x, y, rx, ry, color }                     flat pixel ellipse centred on x,y (contact shadow under feet);
//               built from whole-pixel rows, so it stays crisp. Use alpha for strength.
//   slash       { from, ctrl, to, streaks, gap, width, period, draw, hold, fade, delay, colors }
//               claw trail: `streaks` parallel quadratic arcs (canvas points from → ctrl → to, offset `gap` px apart
//               along the normal), drawn in whole pixels. Each cycle of `period` s: the arcs are swept in over
//               `draw` s, stay `hold` s, burn out over `fade` s (tail first). colors = [core, mid, edge] (white-hot
//               → red); width = core thickness in px at the middle of the arc, tapering to 1 at the ends.
//   claws       { x, y, angle, len, count, gap, curve, colors }  static claw wounds: `count` parallel gashes starting
//               around x,y, running at `angle` degrees (0 = right, 90 = down) for ~len px, `gap` px apart, bowed by
//               `curve` px. Each gash = bright red line + dark red lip below + short pale highlight above, 1px tips.
//               colors = [dark, red, highlight]. Put it on the victim's z so it reads as part of the body.
//   burst       { x, y, period, delay, flashR, flashColor, sparks, speed, gravity, life, spread, angle, colors }
//               clash impact repeating every `period` s: a quick radial flash (fades in ~0.18 s) + `sparks` sparks
//               flung out around `angle` (deg, ±spread/2), falling under `gravity`, drawn as short whole-pixel streaks
//               whose colour cools along `colors` (white-hot → red) over `life` s. Seeded per cycle, so it varies.
//   debris      { area: [x, y, w, h], rate, kind: 'glass' | 'rock', vx: [min, max], vy: [min, max], gravity, size: [min, max],
//               colors, glint, trail, trailColor }  pieces spawned in `area` at `rate`/s: glass = tumbling 2–3 px slivers
//               that flash a `glint` pixel now and then, rock = small dark chunks; trail = motion streak length in px.
//               Removed once off screen. An area just off one edge + fast vx = pieces flying across the whole frame.
//   peel        { areas: [[x, y, w, h], ...], rate, size: [min, max], cling: [min, max], life: [min, max], speed: [min, max],
//               vanish: [x, y], sway, colors, back, edge, under, ash, prewarm }  the "shift into the other world" flakes: each
//               flake appears on a wall patch (area-weighted pick), clings curling up for `cling` s (dark `under` gap +
//               lifting strip), then tears off and drifts toward `vanish` (px/s `speed`, sideways `sway`), turning over
//               (width flutters, showing the dark `back` side half the time), shrinking, and crumbling into `ash` pixels over its last third. edge = 1px glowing torn edge.
//   murk        { x, y, w, h, color, scale, drift: [vx, vy], curl, cover, soft, density, levels, fps }  drifting dark fog:
//               domain-warped noise sliding at `drift` px/s and churning at `curl`; cover 0..1 = noise level where it
//               starts (higher = thinner fog), soft = transition width, density = max alpha; alpha is posterized into
//               `levels` steps with an ordered dither (crisp single-colour pixels). Pair with `mask` to keep it in the sky.
//   rise        { count, area, speed: [min, max], life: [min, max], size: [min, max], sway, colors, edge, emberChance, embers }
//               motes floating up everywhere: each fades in somewhere in `area`, rises at `speed` px/s with a sway,
//               and dissolves after `life` s. Flakes turn over (width swings, `edge` = lit rim); a share `emberChance`
//               are 1px smouldering embers in `embers` colours (flickering, a dim cross around the bigger ones).
//   scroll      { src, x, y, w, h, speed }  endless vertical scroll of a tile, `speed` px/s (positive = content moves
//               up, e.g. a shaft wall passing a descending lift). Takes grade/tint like image.
//   spin        { src, cx, cy, speed, step, angle }  image rotating about its centre placed at cx,cy, `speed` deg/s,
//               angle snapped to `step` deg (nearest-neighbour, so a coarser step shimmers less). Takes grade.
//   sparks      { x, y, rate, gust, angle, spread, speed: [min, max], life: [min, max], gravity, drag, wind: [x, y],
//               jitter: [x, y], colors, prewarm }  continuous spark stream from x,y: a cone around `angle` deg
//               (0 = right, -90 = up), gravity + drag, 1px streaks cooling through `colors` over their life;
//               gust 0..1 = noise-driven swing of the rate (spurts). Use blend 'lighter'.
//   vignette    { color, alpha, inner }                     darkens the frame edges (radial, transparent inside `inner` 0..1).
//   particles   { count, color, speed, angle, length }      procedural rain
// Common: id, z, alpha (0..1), blend (canvas globalCompositeOperation, e.g. "lighter"),
//         pulse: { amp, hz, phase } — slow alpha swing (dims by up to amp of alpha; any layer, masked ones too),
//         bob: { amp, period, phase } — slow vertical sway in whole pixels (layers with the same bob move together);
//         clip: [[x, y, w, h], ...] canvas rects — the layer is drawn only inside their union;
//         mask: canvas-sized PNG — the layer is drawn only where the mask is opaque (scripts/hole-mask.ps1 builds one
//         from a window opening, so flames stay inside its irregular shape).
// An image/sprite whose file is missing falls back to a magenta rect of size w x h.
// URL flags: ?grid — 16px grid and layer outlines with ids.
(() => {
  const scene = window.SCENE;
  const W = scene.canvas.width, H = scene.canvas.height;
  const debug = new URLSearchParams(location.search).has('grid');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  document.body.appendChild(canvas);
  const screen = canvas.getContext('2d');
  let ctx = screen;   // draw functions target ctx; masked layers swap it for an offscreen canvas
  const off = document.createElement('canvas');
  off.width = W;
  off.height = H;
  const offCtx = off.getContext('2d');

  function fit() {
    const scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
  }
  addEventListener('resize', fit);
  fit();

  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { console.warn('missing asset:', src); resolve(null); };
      img.src = src;
    });
  }

  function initParticles(l) {
    const rad = (l.angle ?? 100) * Math.PI / 180;
    l._dx = Math.cos(rad);
    l._dy = Math.sin(rad);
    l._drops = Array.from({ length: l.count ?? 100 }, () => ({ x: Math.random() * W, y: Math.random() * H }));
  }

  // Doom-fire palette: dark red → orange → yellow → white. Index 0 = no fire; the darkest few fade in with alpha.
  const DOOM = ['#070707', '#1f0707', '#2f0f07', '#470f07', '#571707', '#671f07', '#771f07', '#8f2707', '#9f2f07', '#af3f07',
    '#bf4707', '#c74707', '#df4f07', '#df5707', '#df5707', '#d75f07', '#d7670f', '#cf6f0f', '#cf770f', '#cf7f0f', '#cf8717',
    '#c78717', '#c78f17', '#c7971f', '#bf9f1f', '#bf9f1f', '#bfa727', '#bfa727', '#bfaf2f', '#b7af2f', '#b7b72f', '#b7b737',
    '#cfcf6f', '#dfdf9f', '#efefc7', '#ffffff'];

  function initFlames(l) {
    l._pal = (l.palette ?? DOOM).map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
    l._heat = new Float32Array(l.w * l.h);
    l._tmp = new Float32Array(l.w * l.h);
    l._buf = document.createElement('canvas');
    l._buf.width = l.w;
    l._buf.height = l.h;
    l._bctx = l._buf.getContext('2d');
    l._data = l._bctx.createImageData(l.w, l.h);
    l._next = 0;
    for (let i = 0; i < l.h * 2; i++) stepFlames(l);   // warm up: heat climbs one row per step, start fully grown
  }

  // Averaging fire (Hugo Elias): each cell = mean of the cells below it minus a cooling amount read from noise that
  // scrolls upward with the flames, so coherent tongues form and break off at their tips. Heat is 0..1.
  function stepFlames(l) {
    const { w, h } = l, cool = (l.cool ?? 0.5) * 0.12, wind = l.wind ?? 0;
    let heat = l._heat, next = l._tmp;
    l._tick = (l._tick ?? 0) + 1;
    const t = l._tick, time = t / (l.fps ?? 20);
    for (const [sx, sy, sw, sh] of l.sources) {
      for (let y = Math.max(0, sy - l.y); y < Math.min(h, sy - l.y + sh); y++) {
        for (let x = Math.max(0, sx - l.x); x < Math.min(w, sx - l.x + sw); x++) {
          heat[y * w + x] = (l.heat ?? 1) * (0.55 + 0.45 * valueNoise((l.x + x) * 0.35, time * 2.5)) * (0.9 + 0.1 * Math.random());
        }
      }
    }
    const shift = Math.round(wind * Math.sin(time * 0.7)), turb = l.turb ?? 1.5, taper = l.taper ?? 1;
    const cx = (l.cx ?? l.x + w / 2) - l.x, half = w / 2;
    for (let y = 0; y < h; y++) {
      // Turbulence: each row samples from below with its own small sideways offset, so tongues wiggle instead of
      // standing as straight columns (no accumulating shear like a constant wind).
      const wob = Math.round(turb * (valueNoise((l.y + y) * 0.18, time * 1.8) - 0.5) * 2);
      for (let x = 0; x < w; x++) {
        const xs = x + shift + wob;
        // Taper: extra cooling away from the centre line, so flames narrow into tips.
        const d = (x - cx) / half, edgeCool = 1 + taper * 3 * d * d;
        const at = (xx, yy) => (yy < h && xx >= 0 && xx < w) ? heat[yy * w + xx] : 0;
        const avg = (at(xs - 1, y + 1) + at(xs, y + 1) + at(xs + 1, y + 1) + at(xs, y + 2)) * 0.25;
        const n = valueNoise(x * 0.22, (y + t) * 0.22);
        next[y * w + x] = Math.max(0, avg - cool * edgeCool * (0.3 + 1.7 * n * n));
      }
    }
    // Sources stay pinned (otherwise they cool like everything else).
    for (const [sx, sy, sw, sh] of l.sources) {
      for (let y = Math.max(0, sy - l.y); y < Math.min(h, sy - l.y + sh); y++) {
        for (let x = Math.max(0, sx - l.x); x < Math.min(w, sx - l.x + sw); x++) next[y * w + x] = heat[y * w + x];
      }
    }
    l._heat = next; l._tmp = heat;
    const px = l._data.data, max = l._pal.length - 1, fadeIn = l.fadeIn ?? 6;
    for (let i = 0; i < next.length; i++) {
      const v = Math.min(max, Math.floor(next[i] * max)), c = l._pal[v], o = i * 4;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
      px[o + 3] = v === 0 ? 0 : v >= fadeIn ? 255 : (255 * v / fadeIn) | 0;
    }
    l._bctx.putImageData(l._data, 0, 0);
  }

  function drawRect(l, color, label) {
    ctx.fillStyle = color;
    ctx.fillRect(l.x, l.y, l.w, l.h);
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.fillText(label, l.x + 2, l.y + 9);
    }
  }

  // Smooth 2D value noise in 0..1, two octaves.
  function hash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function valueNoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const noise = (x, y) => valueNoise(x, y) * 0.65 + valueNoise(x * 2.1 + 17, y * 2.1 + 31) * 0.35;
  function fbm(x, y) {
    let sum = 0, amp = 0.5, norm = 0;
    for (let o = 0; o < 4; o++) {
      sum += valueNoise(x, y) * amp;
      norm += amp;
      x = x * 2.03 + 17.1; y = y * 2.03 + 31.7; amp *= 0.5;
    }
    return sum / norm;
  }
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const smooth = (a, b, v) => { const k = clamp01((v - a) / (b - a)); return k * k * (3 - 2 * k); };

  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function renderHaze(l, t) {
    const { w, h } = l, px = l._data.data, [core, body, crest] = l._pal;
    const scale = l.scale ?? 16, drift = (l.drift ?? 2) / scale, rise = (l.rise ?? 3) / scale;
    const curl = l.curl ?? 1, ragged = l.ragged ?? 6, cx0 = l.cx ?? l.x + w / 2;
    const halfWidth = l.halfWidth ?? w / 3, spread = l.spread ?? 0.6;
    const span = l.fadeTo - l.solidTo;
    for (let y = 0; y < h; y++) {
      const Y = l.y + y;
      const hw = halfWidth + Math.max(0, l.fadeTo - Y) * spread;
      for (let x = 0; x < w; x++) {
        const X = l.x + x;
        const sx = X / scale, sy = Y / scale;
        // Domain warp: the warp field itself drifts, so the smoke curls instead of sliding.
        // With curl 0 the whole warped field slides as one piece: the shape holds and just drifts (fog).
        const fx = sx - t * drift, fy = sy + t * rise;
        const wx = fbm(fx + 3.1 + t * curl * 0.06, fy - t * curl * 0.08);
        const wy = fbm(fx - 1.7, fy + 5.3 - t * curl * 0.05);
        const n = fbm(fx + 1.8 * wx, fy + 1.8 * wy);
        // Tendrils: dense spots reach further down, sparse ones end higher.
        const row = Y - (n - 0.45) * 2 * ragged;
        const vert = clamp01((l.fadeTo - row) / span);
        const d = Math.abs(X - cx0) / hw;
        const side = clamp01((1 - d) / 0.3 + (n - 0.5) * 1.6);
        const a = smooth(0.15, 0.75, vert * side * (0.55 + 0.9 * n));
        const i = (y * w + x) * 4;
        if (a <= BAYER4[(Y & 3) * 4 + (X & 3)] * 0.9) { px[i + 3] = 0; continue; }
        // Solid core is black; thinner smoke shows the body tone, curl crests a slightly lighter one.
        const c = a > 0.9 && n < 0.62 ? core : n > 0.66 && a > 0.4 ? crest : body;
        px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
      }
    }
    l._bctx.putImageData(l._data, 0, 0);
  }

  // Dithered vertical fade for an image layer. Built with compositing, not getImageData:
  // images loaded from file:// taint the canvas, so their pixels can't be read back.
  function fadeImage(l) {
    const img = l._img, oy = Math.round(l.y ?? 0), ox = Math.round(l.x ?? 0);
    const fw = l.frameW ?? img.width, H = l.h ?? img.height, [y0, y1] = l.fade ?? [-1e9, -1e9];
    const e = l.edgeFade ?? {}, et = e.top ?? 0, eb = e.bottom ?? 0, el = e.left ?? 0, er = e.right ?? 0;
    const edge = (d, w) => w ? clamp01((d + 0.5) / w) : 1;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    for (let y = 0; y < H; y++) {
      const Y = oy + y, row = clamp01((Y - y0) / (y1 - y0)) * edge(y, et) * edge(H - 1 - y, eb);
      if (row <= 0) continue;
      if (row >= 1 && !el && !er) { g.fillRect(0, y, img.width, 1); continue; }
      if (e.smooth && !el && !er) { g.globalAlpha = row; g.fillRect(0, y, img.width, 1); g.globalAlpha = 1; continue; }
      for (let x = 0; x < img.width; x++) {
        const fx = x % fw, a = row * edge(fx, el) * edge(fw - 1 - fx, er);
        if (e.smooth) { if (a > 0) { g.globalAlpha = a; g.fillRect(x, y, 1, 1); g.globalAlpha = 1; } }
        else if (a >= 1 || a > BAYER4[(Y & 3) * 4 + ((ox + fx) & 3)]) g.fillRect(x, y, 1, 1);
      }
    }
    g.globalCompositeOperation = 'source-in';
    g.drawImage(img, 0, 0);
    if (l.tint) {
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = l.tint[1];
      g.fillStyle = l.tint[0];
      g.fillRect(0, 0, c.width, c.height);
    }
    l._faded = c;
  }

  // Colour grade / scene light for image layers: `grade` = list of passes, each clipped to the sprite's silhouette and
  // composited onto it with `blend` (any canvas blend mode: multiply darkens/warms, screen adds light, ...) at `alpha`.
  // A pass is a flat `color`, or a linear gradient from `color` at `from` to transparent at `to` (both [fx, fy] as
  // fractions of the sprite box, e.g. from [0, 1] = bottom-left) — e.g. firelight from below. Built once at load,
  // compositing only (no getImageData: it throws on file:// pages).
  function buildGrade(l) {
    const src = l._faded ?? l._img, w = src.width, h = src.height;
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ox = out.getContext('2d');
    ox.drawImage(src, 0, 0);
    for (const p of l.grade) {
      const pass = document.createElement('canvas');
      pass.width = w; pass.height = h;
      const px = pass.getContext('2d');
      if (p.from) {
        const g = px.createLinearGradient(p.from[0] * w, p.from[1] * h, p.to[0] * w, p.to[1] * h);
        g.addColorStop(0, p.color);
        g.addColorStop(1, 'transparent');
        px.fillStyle = g;
      } else px.fillStyle = p.color;
      px.fillRect(0, 0, w, h);
      px.globalCompositeOperation = 'destination-in';
      px.drawImage(src, 0, 0);
      ox.globalCompositeOperation = p.blend ?? 'source-over';
      ox.globalAlpha = p.alpha ?? 1;
      ox.drawImage(pass, 0, 0);
    }
    l._faded = out;
  }

  // Rim light for image layers: a 1px silhouette ring in `rim.color` around the opaque pixels, drawn under the
  // image, so dark figures separate from a dark background (fire backlight). Optional rim.sides limits it to some
  // directions, e.g. ['left', 'top'] for light coming from the upper left. Built once at load.
  // Compositing only — no getImageData, which throws on file:// pages (images count as cross-origin there).
  function buildRim(l) {
    // Built from the original image, not the faded one: a dithered edgeFade would get a rim around every dot.
    const src = l._img, w = src.width, h = src.height;
    const sil = document.createElement('canvas');           // the sprite's silhouette in the rim colour
    sil.width = w; sil.height = h;
    const sx = sil.getContext('2d');
    sx.drawImage(src, 0, 0);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = l.rim.color ?? '#ff5a2a';
    sx.fillRect(0, 0, w, h);
    const out = document.createElement('canvas');           // 1px larger on every side, origin at (-1, -1)
    out.width = w + 2; out.height = h + 2;
    const ox = out.getContext('2d');
    const shift = { left: [0, 1], right: [2, 1], top: [1, 0], bottom: [1, 2] };   // silhouette pushed toward that side
    for (const s of l.rim.sides ?? ['left', 'right', 'top', 'bottom']) ox.drawImage(sil, ...shift[s]);
    ox.globalCompositeOperation = 'destination-out';        // keep only the ring outside the sprite
    ox.drawImage(src, 1, 1);
    l._rim = out;
  }

  // debris simulation step: spawn at `rate`/s inside `area`, move under gravity, drop pieces that left the screen.
  function stepDebris(l, dt) {
    l._acc = (l._acc ?? 0) + dt * (l.rate ?? 3);
    const [ax, ay, aw, ah] = l.area, rnd = (lo, hi) => lo + Math.random() * (hi - lo);
    while (l._acc >= 1) {
      l._acc -= 1;
      const [s0, s1] = l.size ?? (l.kind === 'rock' ? [2, 4] : [2, 3]);
      l._p.push({ x: rnd(ax, ax + aw), y: rnd(ay, ay + ah), vx: rnd(...(l.vx ?? [-20, 20])), vy: rnd(...(l.vy ?? [-10, 10])),
        s: Math.round(rnd(s0, s1 + 0.99)), rot: Math.random() * 4, spin: rnd(4, 10) * (Math.random() < 0.5 ? -1 : 1),
        c: Math.floor(Math.random() * (l.colors?.length ?? 1)) });
    }
    const grav = l.gravity ?? 60;
    for (const p of l._p) { p.vy += grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt; }
    // Drop pieces only once they are off screen AND moving away, so ones spawned just outside an edge survive.
    l._p = l._p.filter(p => p.y < H + 8 && !(p.x < -40 && p.vx <= 0) && !(p.x > W + 40 && p.vx >= 0));
  }

  // peel simulation step: flakes spawn on the walls (`areas`), cling for `cling` s, then drift toward `vanish`.
  function stepPeel(l, dt) {
    const areas = l.areas ?? [[0, 0, W, H]], rnd = (lo, hi) => lo + Math.random() * (hi - lo);
    const total = areas.reduce((s, a) => s + a[2] * a[3], 0);
    l._acc = (l._acc ?? 0) + dt * (l.rate ?? 4);
    while (l._acc >= 1) {
      l._acc -= 1;
      let k = Math.random() * total, a = areas[0];
      for (const b of areas) { if ((k -= b[2] * b[3]) <= 0) { a = b; break; } }   // area-weighted pick
      const [s0, s1] = l.size ?? [2, 4];
      l._p.push({ x: rnd(a[0], a[0] + a[2]), y: rnd(a[1], a[1] + a[3]), age: 0, life: rnd(...(l.life ?? [5, 9])),
        cling: rnd(...(l.cling ?? [0.4, 1.2])), s: Math.round(rnd(s0, s1 + 0.99)), sp: rnd(...(l.speed ?? [10, 22])),
        ph: Math.random() * 6.28, fl: rnd(1.5, 3.5), c: Math.floor(Math.random() * 1e6) });
    }
    const [vx, vy] = l.vanish ?? [W / 2, -40];
    for (const p of l._p) {
      p.age += dt;
      if (p.age < p.cling) continue;
      // Pulled toward the vanishing point (looking up: away from the viewer), swaying sideways as it goes.
      const dx = vx - p.x, dy = vy - p.y, d = Math.hypot(dx, dy) || 1;
      p.x += (dx / d * p.sp + Math.sin(p.age * 1.7 + p.ph) * (l.sway ?? 6)) * dt;
      p.y += dy / d * p.sp * dt;
    }
    l._p = l._p.filter(p => p.age < p.life && p.y > -10);
  }

  // murk: drifting, churning dark fog. Domain-warped fbm → coverage → alpha, posterized into `levels` steps with
  // an ordered dither between them, so it stays crisp pixels in a single colour.
  // The noise is sampled on a coarse grid every `cell` px (default 4) and interpolated bilinearly; only the dither
  // runs per pixel. The fog is far larger than a cell, so it looks the same, at ~1/16 of the cost (per pixel, three
  // 4-octave fbm calls = 48 sin(): three full-screen murk layers at 12 fps used to choke the page to a few fps).
  function renderMurk(l, t) {
    const { w, h } = l, px = l._data.data, [r, g, b] = hexToRgb(l.color ?? '#000000');
    const scale = l.scale ?? 40, [vx, vy] = l.drift ?? [3, -2], curl = (l.curl ?? 0.05) * t;
    const cover = l.cover ?? 0.5, soft = l.soft ?? 0.15, levels = l.levels ?? 4, maxA = l.density ?? 0.9;
    const ox = (l.x - vx * t) / scale, oy = (l.y - vy * t) / scale;
    const c = l.cell ?? 4, gw = Math.ceil(w / c) + 1, gh = Math.ceil(h / c) + 1;
    const grid = l._grid ?? (l._grid = new Float32Array(gw * gh));
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const u = gx * c / scale + ox, v = gy * c / scale + oy;
        const wu = fbm(u * 0.7 + curl, v * 0.7 + 3.1), wv = fbm(u * 0.7 + 7.7, v * 0.7 - curl);
        grid[gy * gw + gx] = fbm(u + wu * 1.6, v + wv * 1.6);
      }
    }
    for (let y = 0; y < h; y++) {
      const gy = Math.floor(y / c), fy = (y - gy * c) / c, row = gy * gw;
      for (let x = 0; x < w; x++) {
        const gx = Math.floor(x / c), fx = (x - gx * c) / c, k = row + gx;
        const top = grid[k] + (grid[k + 1] - grid[k]) * fx, bot = grid[k + gw] + (grid[k + gw + 1] - grid[k + gw]) * fx;
        const n = top + (bot - top) * fy;
        let a = Math.min(1, Math.max(0, (n - cover + soft) / (2 * soft)));
        a = a * a * (3 - 2 * a) * levels;
        const lo = Math.floor(a), q = (lo + (a - lo > BAYER4[(y & 3) * 4 + (x & 3)] ? 1 : 0)) / levels;
        const i = (y * w + x) * 4;
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = Math.round(q * maxA * 255);
      }
    }
    l._bctx.putImageData(l._data, 0, 0);
  }

  // rise: a mote spawned anywhere in `area` (default the whole canvas); fresh = prewarm (random age).
  function spawnRise(l, fresh) {
    const [ax, ay, aw, ah] = l.area ?? [0, 0, W, H], rnd = (lo, hi) => lo + Math.random() * (hi - lo);
    const life = rnd(...(l.life ?? [5, 10])), [s0, s1] = l.size ?? [1, 3];
    return { x: rnd(ax, ax + aw), y: rnd(ay, ay + ah), v: rnd(...(l.speed ?? [6, 16])), life, age: fresh ? Math.random() * life : 0,
      s: Math.round(rnd(s0, s1 + 0.99)), ph: Math.random() * 6.28, fl: rnd(1, 2.5), c: Math.floor(Math.random() * 1e6),
      ember: Math.random() < (l.emberChance ?? 0) };
  }

  // sparks simulation step: spawn at `rate`/s (gusting) at x,y, fly out in a cone, fall under gravity with drag.
  function stepSparks(l, t, dt) {
    const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
    const gust = 1 + (l.gust ?? 0) * (valueNoise(t * 1.7, 3.3) * 2 - 1);
    l._acc = (l._acc ?? 0) + dt * (l.rate ?? 30) * Math.max(0, gust);
    const base = (l.angle ?? -90) * Math.PI / 180, spread = (l.spread ?? 60) * Math.PI / 180;
    while (l._acc >= 1) {
      l._acc -= 1;
      const a = base + (Math.random() - 0.5) * spread, v = rnd(...(l.speed ?? [40, 120]));
      const [jx, jy] = l.jitter ?? [2, 1];
      l._p.push({ x: l.x + rnd(-jx, jx), y: l.y + rnd(-jy, jy), vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        age: 0, life: rnd(...(l.life ?? [0.3, 0.9])) });
    }
    const g = l.gravity ?? 160, drag = Math.exp(-(l.drag ?? 1.5) * dt), [wx, wy] = l.wind ?? [0, 0];
    for (const p of l._p) {
      p.px = p.x; p.py = p.y;
      p.vx = p.vx * drag + wx * dt; p.vy = p.vy * drag + (g + wy) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
    }
    l._p = l._p.filter(p => p.age < p.life);
  }

  const draw = {
    // Vertical endless scroll of a tile (e.g. a shaft wall seen from a descending lift): `speed` px/s, positive =
    // content moves up. Drawn tiled over x,y,w,h (default the tile width / canvas height), whole-pixel offset.
    scroll(l, t) {
      if (!l._img) return drawRect(l, '#f0f', l.id);
      const img = l._faded ?? l._img, th = img.height, x = Math.round(l.x ?? 0), y0 = Math.round(l.y ?? 0);
      const h = l.h ?? H - y0, off = Math.round(((t * (l.speed ?? 40)) % th + th) % th);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y0, l.w ?? img.width, h); ctx.clip();
      for (let y = y0 - off; y < y0 + h; y += th) ctx.drawImage(img, x, y);
      ctx.restore();
    },
    // Image rotating around its centre placed at cx,cy: `speed` deg/s (negative = counter-clockwise), angle snapped
    // to `step` degrees so the nearest-neighbour rotation doesn't shimmer every frame.
    spin(l, t) {
      if (!l._img) return drawRect(l, '#f0f', l.id);
      const img = l._faded ?? l._img, step = l.step ?? 1;
      const deg = Math.round(((l.angle ?? 0) + t * (l.speed ?? 20)) / step) * step;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(l.cx), Math.round(l.cy));
      ctx.rotate(deg * Math.PI / 180);
      ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
      ctx.restore();
    },
    sparks(l, t, dt) {
      if (!l._p) {
        l._p = [];
        for (let i = 0; i < (l.prewarm ?? 0) * 30; i++) stepSparks(l, i / 30, 1 / 30);
      }
      stepSparks(l, t, dt);
      const colors = l.colors ?? ['#fffbe6', '#ffdd69', '#fe8e63', '#d23b36', '#5a1a14'];
      for (const p of l._p) {
        ctx.fillStyle = colors[Math.min(colors.length - 1, Math.floor(p.age / p.life * colors.length))];
        const x0 = p.px ?? p.x, y0 = p.py ?? p.y, steps = Math.max(1, Math.round(Math.hypot(p.x - x0, p.y - y0)));
        for (let s = 0; s <= steps; s++) ctx.fillRect(Math.round(x0 + (p.x - x0) * s / steps), Math.round(y0 + (p.y - y0) * s / steps), 1, 1);
      }
    },
    image(l) {
      if (!l._img) return drawRect(l, '#f0f', l.id);
      const x = Math.round(l.x ?? 0), y = Math.round(l.y ?? 0);
      if (l._rim) {
        ctx.save();
        ctx.globalAlpha *= l.rim.alpha ?? 1;
        ctx.drawImage(l._rim, x - 1, y - 1);
        ctx.restore();
      }
      ctx.drawImage(l._faded ?? l._img, x, y);
    },
    sprite(l, t) {
      if (!l._img) return drawRect(l, '#f0f', l.id);
      const frame = (Math.floor(t * (l.fps ?? 8)) + (l.phase ?? 0)) % l.frames;
      const h = l.h ?? l._img.height;
      const x = Math.round(l.x), y = Math.round(l.y);
      if (l.flipX) {
        ctx.translate(x + l.frameW, y);
        ctx.scale(-1, 1);
        ctx.drawImage(l._faded ?? l._img, frame * l.frameW, 0, l.frameW, h, 0, 0, l.frameW, h);
      } else {
        ctx.drawImage(l._faded ?? l._img, frame * l.frameW, 0, l.frameW, h, x, y, l.frameW, h);
      }
    },
    rect(l) {
      drawRect(l, l.color ?? '#f0f', l.label ?? l.id);
    },
    gradient(l, t) {
      const flicker = l.flicker ? 1 - l.flicker * (0.5 + 0.5 * Math.sin(t * (l.hz ?? 1) * Math.PI * 2) * Math.sin(t * 2.3)) : 1;
      const g = ctx.createLinearGradient(0, l.y0, 0, l.y1);
      g.addColorStop(0, 'transparent');
      g.addColorStop(l.peak ?? 0.75, l.color);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha *= flicker;
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.min(l.y0, l.y1), W, Math.abs(l.y1 - l.y0));
    },
    glow(l, t) {
      // phase (s) desyncs several glows; jitter adds a fast irregular flicker on top of the slow pulse (fire).
      const tt = t + (l.phase ?? 0);
      let pulse = l.flicker ? 1 - l.flicker * (0.5 + 0.5 * Math.sin(tt * (l.hz ?? 1) * Math.PI * 2)) : 1;
      if (l.jitter) pulse *= 1 - l.jitter * valueNoise(tt * 7, (l.x ?? 0) * 0.37);
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, l.color);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha *= pulse;
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    },
    haze(l, t) {
      if (!l._buf) {
        l._buf = document.createElement('canvas');
        l._buf.width = l.w;
        l._buf.height = l.h;
        l._bctx = l._buf.getContext('2d');
        l._data = l._bctx.createImageData(l.w, l.h);
        l._pal = (l.colors ?? ['#000000', '#07080c', '#14161e']).map(hexToRgb);
        l._next = -1;
      }
      if (t >= l._next) {
        const still = !l.drift && !l.rise && !l.curl;
        l._next = still ? Infinity : t + 1 / (l.fps ?? 15);
        renderHaze(l, t);
      }
      ctx.drawImage(l._buf, l.x, l.y);
    },
    flames(l, t) {
      if (t >= l._next) {
        l._next = t + 1 / (l.fps ?? 20);
        stepFlames(l);
      }
      ctx.drawImage(l._buf, Math.round(l.x), Math.round(l.y));
    },
    shadow(l) {
      ctx.fillStyle = l.color ?? '#000';
      const cx = Math.round(l.x), cy = Math.round(l.y), rx = l.rx ?? 10, ry = l.ry ?? 2;
      for (let dy = -ry; dy <= ry; dy++) {
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
        ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
      }
    },
    slash(l, t) {
      const period = l.period ?? 2.5, dIn = l.draw ?? 0.12, hold = l.hold ?? 0.25, fade = l.fade ?? 0.45;
      const ct = ((t - (l.delay ?? 0)) % period + period) % period;
      if (ct > dIn + hold + fade) return;
      const head = Math.min(1, ct / dIn);                                    // how far along the arc is swept in
      const tail = ct < dIn + hold ? 0 : (ct - dIn - hold) / fade;           // the tail burns away after the hold
      const [x0, y0] = l.from, [cx, cy] = l.ctrl, [x1, y1] = l.to;
      const [core, mid, edge] = l.colors ?? ['#fff4d6', '#ff5a2a', '#8f1418'];
      const n = l.streaks ?? 3, gap = l.gap ?? 4, width = l.width ?? 2;
      const len = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
      const steps = Math.ceil(len * 2);
      for (let s = 0; s < n; s++) {
        const off = (s - (n - 1) / 2) * gap;
        // Outer streaks are a little shorter, like claw tips raking at slightly different depths.
        const trim = Math.abs(s - (n - 1) / 2) / n * 0.25;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          if (u < tail + trim || u > head - trim * 0.5 || u > 1 - trim) continue;
          const a = 1 - u, px = a * a * x0 + 2 * a * u * cx + u * u * x1, py = a * a * y0 + 2 * a * u * cy + u * u * y1;
          const tx = 2 * a * (cx - x0) + 2 * u * (x1 - cx), ty = 2 * a * (cy - y0) + 2 * u * (y1 - cy);
          const tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
          const taper = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - tail) / Math.max(0.01, head - tail))));
          const w = Math.max(1, Math.round(width * taper));
          for (let k = -w; k <= w; k++) {
            const c = Math.abs(k) < w * 0.5 ? core : Math.abs(k) < w ? mid : edge;
            ctx.fillStyle = c;
            ctx.fillRect(Math.round(px + nx * (off + k * 0.5)), Math.round(py + ny * (off + k * 0.5)), 1, 1);
          }
        }
      }
    },
    claws(l) {
      const [dark, red, hi] = l.colors ?? ['#4a0810', '#c41e24', '#ff9a86'];
      const a = (l.angle ?? 60) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      const n = l.count ?? 3, gap = l.gap ?? 4, len = l.len ?? 18, curve = l.curve ?? 1.5, mid = (n - 1) / 2;
      const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
      for (let i = 0; i < n; i++) {
        const off = (i - mid) * gap, L = len * (1 - 0.18 * Math.abs(i - mid)), lead = Math.abs(i - mid) * 1.5;
        const steps = Math.ceil(L * 2);
        for (let s = 0; s <= steps; s++) {
          const u = s / steps, bow = curve * Math.sin(Math.PI * u);
          const x = l.x + dx * (lead + u * L) + nx * (off + bow), y = l.y + dy * (lead + u * L) + ny * (off + bow);
          const body = u > 0.15 && u < 0.85;
          if (body) px(x + nx, y + ny, dark);                  // lower lip of the cut
          px(x, y, red);
          if (u > 0.3 && u < 0.65) px(x - nx, y - ny, hi);     // torn-skin highlight on the upper edge
        }
      }
    },
    burst(l, t) {
      const period = l.period ?? 3, ct = ((t - (l.delay ?? 0)) % period + period) % period;
      const cycle = Math.floor((t - (l.delay ?? 0)) / period), life = l.life ?? 0.7;
      if (ct > Math.max(life, 0.2)) return;
      const rand = (i) => hash(cycle * 13.1 + i * 7.7, i * 3.3 + 1.7);
      // Flash: bright core shrinking fast.
      const f = 1 - ct / 0.18;
      if (f > 0) {
        const r = (l.flashR ?? 14) * (0.6 + 0.4 * f);
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
        g.addColorStop(0, l.flashColor ?? '#fff6d8');
        g.addColorStop(0.35, '#ffb347');
        g.addColorStop(1, 'transparent');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha *= f;
        ctx.fillStyle = g;
        ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
        ctx.restore();
      }
      const colors = l.colors ?? ['#fffbe6', '#ffdd69', '#fe8e63', '#d23b36', '#77123d'];
      const n = l.sparks ?? 16, base = (l.angle ?? 180) * Math.PI / 180, spread = (l.spread ?? 160) * Math.PI / 180;
      const grav = l.gravity ?? 90;
      for (let i = 0; i < n; i++) {
        const lt = life * (0.5 + 0.5 * rand(i + 50));
        if (ct > lt) continue;
        const a = base + (rand(i) - 0.5) * spread, v = (l.speed ?? 70) * (0.4 + 0.8 * rand(i + 20));
        const pos = (s) => [l.x + Math.cos(a) * v * s, l.y + Math.sin(a) * v * s + 0.5 * grav * s * s];
        const [x1, y1] = pos(ct), [x0, y0] = pos(Math.max(0, ct - 0.03));
        ctx.fillStyle = colors[Math.min(colors.length - 1, Math.floor(ct / lt * colors.length))];
        const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
        for (let s = 0; s <= steps; s++) ctx.fillRect(Math.round(x0 + (x1 - x0) * s / steps), Math.round(y0 + (y1 - y0) * s / steps), 1, 1);
      }
    },
    debris(l, t, dt) {
      if (!l._p) {
        l._p = [];
        // prewarm (s): run the simulation ahead so pieces are already in flight on the first frame.
        for (let i = 0; i < (l.prewarm ?? 0) * 30; i++) stepDebris(l, 1 / 30);
      }
      stepDebris(l, dt);
      const colors = l.colors ?? (l.kind === 'rock' ? ['#2a2226', '#3e3438'] : ['#9fb4c8', '#cfe0ec']);
      for (const p of l._p) {
        const x = Math.round(p.x), y = Math.round(p.y);
        if (l.trail) {
          // Motion streak: `trail` px behind the piece along its velocity, in the trail colour.
          const v = Math.hypot(p.vx, p.vy) || 1;
          ctx.fillStyle = l.trailColor ?? colors[0];
          for (let i = 1; i <= l.trail; i++) ctx.fillRect(Math.round(p.x - p.vx / v * i), Math.round(p.y - p.vy / v * i), 1, 1);
        }
        ctx.fillStyle = colors[p.c % colors.length];
        if (l.kind === 'rock') {
          ctx.fillRect(x, y, p.s, p.s - 1 || 1);
          ctx.fillRect(x + 1, y + p.s - 1, Math.max(1, p.s - 2), 1);
        } else {
          // Glass sliver: a 1px line of length s whose direction tumbles through 4 orientations.
          const o = Math.floor(((p.rot % 4) + 4) % 4), d = [[1, 0], [1, 1], [0, 1], [-1, 1]][o];
          for (let i = 0; i < p.s; i++) ctx.fillRect(x + d[0] * i, y + d[1] * i, 1, 1);
          if (l.glint && hash(Math.floor(t * 8), p.x * 0.13 + p.c) > 0.86) {
            ctx.fillStyle = l.glint;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    },
    peel(l, t, dt) {
      if (!l._p) {
        l._p = [];
        for (let i = 0; i < (l.prewarm ?? 0) * 30; i++) stepPeel(l, 1 / 30);
      }
      stepPeel(l, dt);
      const colors = l.colors ?? ['#3a2420', '#5a3426', '#6e4a3a'];
      const base = ctx.globalAlpha;
      for (const p of l._p) {
        const x = Math.round(p.x), y = Math.round(p.y), col = colors[p.c % colors.length];
        const free = p.age >= p.cling, k = free ? (p.age - p.cling) / (p.life - p.cling) : 0;   // 0 → 1 over the flight
        // Shrinks with distance; the last third crumbles into single ash pixels and fades.
        const s = Math.max(1, Math.round(p.s * (1 - 0.5 * k)));
        ctx.globalAlpha = base * (k > 0.66 ? (1 - k) / 0.34 : 1);
        if (!free) {
          // Clinging: a curled-up corner — the flake lifts off its patch of wall, one edge catching the light.
          const lift = Math.floor(p.age / p.cling * 3);
          ctx.fillStyle = l.under ?? '#120808';
          ctx.fillRect(x, y, p.s, Math.max(1, p.s - 1));
          ctx.fillStyle = col;
          ctx.fillRect(x, y - lift + 1, p.s, 1);
          if (l.edge) { ctx.fillStyle = l.edge; ctx.fillRect(x + p.s - 1, y - lift + 1, 1, 1); }
          continue;
        }
        if (k > 0.66) {
          ctx.fillStyle = l.ash ?? col;
          ctx.fillRect(x, y, 1, 1);
          if (s > 1) ctx.fillRect(x + 2, y + 1, 1, 1);
          continue;
        }
        // Flutter: the flake turns over, so its drawn width swings between s and 1 px.
        const turn = Math.cos(p.age * p.fl + p.ph), w = Math.max(1, Math.round(s * Math.abs(turn)));
        ctx.fillStyle = turn < 0 && l.back ? l.back : col;   // the painted face, then the dark rusted underside
        ctx.fillRect(x - (w >> 1), y, w, Math.max(1, s - 1));
        if (l.edge && w > 1) { ctx.fillStyle = l.edge; ctx.fillRect(x - (w >> 1), y, 1, 1); }   // glowing torn edge
      }
      ctx.globalAlpha = base;
    },
    murk(l, t) {
      if (!l._buf) {
        l._buf = document.createElement('canvas');
        l._buf.width = l.w;
        l._buf.height = l.h;
        l._bctx = l._buf.getContext('2d');
        l._data = l._bctx.createImageData(l.w, l.h);
        l._next = -1;
      }
      if (t >= l._next) {
        // The first redraw after the initial one gets a random delay, so several murk layers recompute on
        // different frames instead of all stalling the same one.
        l._next = t + (l._next < 0 ? 1 + Math.random() : 1) / (l.fps ?? 10);
        renderMurk(l, t);
      }
      ctx.drawImage(l._buf, l.x, l.y);
    },
    rise(l, t, dt) {
      if (!l._p) l._p = Array.from({ length: l.count ?? 60 }, () => spawnRise(l, true));
      const base = ctx.globalAlpha, sway = l.sway ?? 4;
      for (let i = 0; i < l._p.length; i++) {
        let p = l._p[i];
        p.age += dt;
        if (p.age >= p.life) p = l._p[i] = spawnRise(l, false);
        p.y -= p.v * dt;
        p.x += Math.sin(p.age * p.fl + p.ph) * sway * dt;
        // Fades in, hangs, fades out — the motes appear out of nothing and dissolve on the way up.
        const k = p.age / p.life, fade = Math.min(1, k / 0.2, (1 - k) / 0.3);
        const x = Math.round(p.x), y = Math.round(p.y);
        if (p.ember) {
          // Embers smoulder: brightness flickers, the core stays 1px, a dim cross around the bigger ones.
          const fl = 0.55 + 0.45 * valueNoise(t * 3 + p.ph * 10, p.ph * 7);
          ctx.globalAlpha = base * fade * fl;
          const em = l.embers ?? ['#ffa040'];
          ctx.fillStyle = em[p.c % em.length];
          ctx.fillRect(x, y, 1, 1);
          if (p.s > 1) {
            ctx.globalAlpha = base * fade * fl * 0.35;
            ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1);
          }
          continue;
        }
        // Flakes of ash/paint turning over as they float up: width swings between s and 1 px.
        const turn = Math.cos(p.age * p.fl * 1.3 + p.ph), w = Math.max(1, Math.round(p.s * Math.abs(turn)));
        ctx.globalAlpha = base * fade;
        const cs = l.colors ?? ['#3a2a26'];
        ctx.fillStyle = cs[p.c % cs.length];
        ctx.fillRect(x - (w >> 1), y, w, Math.max(1, p.s - 1));
        if (l.edge && w > 1 && turn > 0) { ctx.fillStyle = l.edge; ctx.fillRect(x - (w >> 1), y, 1, 1); }
      }
      ctx.globalAlpha = base;
    },
    vignette(l) {
      const r = Math.hypot(W, H) / 2, g = ctx.createRadialGradient(W / 2, H / 2, r * (l.inner ?? 0.55), W / 2, H / 2, r);
      g.addColorStop(0, 'transparent');
      g.addColorStop(1, l.color ?? '#000000');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    },
    particles(l, t, dt) {
      const len = l.length ?? 4, speed = l.speed ?? 180;
      ctx.fillStyle = l.color ?? '#7fa6c9';
      for (const d of l._drops) {
        d.x += l._dx * speed * dt;
        d.y += l._dy * speed * dt;
        if (d.y > H) { d.y -= H + len; d.x = Math.random() * W; }
        else if (d.y < -len) { d.y += H + len; d.x = Math.random() * W; }   // upward particles (embers) wrap too
        if (d.x < 0) d.x += W; else if (d.x > W) d.x -= W;
        for (let i = 0; i < len; i++) {
          ctx.fillRect(Math.round(d.x - l._dx * i), Math.round(d.y - l._dy * i), 1, 1);
        }
      }
    },
  };

  async function start() {
    const layers = [...scene.layers].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    await Promise.all(layers.filter(l => l.src).map(async l => { l._img = await loadImage(l.src); }));
    await Promise.all(layers.filter(l => l.mask).map(async l => { l._mask = await loadImage(l.mask); }));
    layers.filter(l => l._img && (l.fade || l.edgeFade || l.tint)).forEach(fadeImage);
    layers.filter(l => l._img && l.rim).forEach(buildRim);
    layers.filter(l => l._img && l.grade).forEach(buildGrade);
    layers.filter(l => l.type === 'particles').forEach(initParticles);
    layers.filter(l => l.type === 'flames').forEach(initFlames);

    const minFrame = 1000 / (scene.maxFps ?? 30);
    let last = performance.now(), acc = 0;

    function frame(now) {
      requestAnimationFrame(frame);
      const elapsed = now - last;
      if (elapsed < minFrame) return;
      last = now;
      const dt = Math.min(elapsed / 1000, 0.1);
      acc += dt;

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = scene.background ?? '#000';
      ctx.fillRect(0, 0, W, H);
      for (const l of layers) {
        if (l.hidden) continue;
        if (l._mask) {
          // Draw the layer alone offscreen, keep only what the mask allows, then composite it with alpha/blend.
          offCtx.clearRect(0, 0, W, H);
          offCtx.imageSmoothingEnabled = false;
          ctx = offCtx;
          drawLayer(l, { ...l, alpha: 1, blend: null }, acc, dt);
          offCtx.save();
          offCtx.globalCompositeOperation = 'destination-in';
          offCtx.drawImage(l._mask, 0, 0);
          offCtx.restore();
          ctx = screen;
          ctx.save();
          ctx.globalAlpha = layerAlpha(l, acc);
          if (l.blend) ctx.globalCompositeOperation = l.blend;
          ctx.drawImage(off, 0, 0);
          ctx.restore();
          continue;
        }
        drawLayer(l, { ...l, alpha: layerAlpha(l, acc) }, acc, dt);
      }
      if (debug) drawDebug(layers);
    }
    requestAnimationFrame(frame);
  }

  // Vertical sway in whole pixels (stays crisp): amp px, period s, phase 0..1. Layers sharing a bob move together.
  function bobOffset(b, t) {
    return Math.round((b.amp ?? 2) * Math.sin((t / (b.period ?? 6) + (b.phase ?? 0)) * Math.PI * 2));
  }

  // alpha × the optional slow pulse { amp, hz, phase }: amp 0..1 = how far it dims at the bottom of the swing.
  function layerAlpha(l, t) {
    const p = l.pulse;
    if (!p) return l.alpha ?? 1;
    const s = 0.5 + 0.5 * Math.sin((t * (p.hz ?? 0.2) + (p.phase ?? 0)) * Math.PI * 2);
    return (l.alpha ?? 1) * (1 - (p.amp ?? 0.5) * (1 - s));
  }

  function drawLayer(l, opts, t, dt) {
    ctx.save();
    ctx.globalAlpha = opts.alpha ?? 1;
    if (opts.blend) ctx.globalCompositeOperation = opts.blend;
    if (l.clip) {
      ctx.beginPath();
      for (const [cx, cy, cw, ch] of l.clip) ctx.rect(cx, cy, cw, ch);
      ctx.clip();
    }
    if (l.bob) ctx.translate(0, bobOffset(l.bob, t));
    draw[l.type ?? 'image'](l, t, dt);
    ctx.restore();
  }

  function drawDebug(layers) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff';
    for (let x = 0; x < W; x += 16) ctx.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 16) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.font = '8px monospace';
    for (const l of layers) {
      const w = l.frameW ?? l._img?.width ?? l.w, h = l._img?.height ?? l.h;
      if (w && h && l.x !== undefined) {
        ctx.strokeRect(l.x + 0.5, l.y + 0.5, w - 1, h - 1);
        ctx.fillText(l.id, l.x + 2, l.y + h - 2);
      }
    }
    ctx.restore();
  }

  start();
})();
