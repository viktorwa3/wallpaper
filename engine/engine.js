// Pixel wallpaper engine: renders window.SCENE on a native-resolution canvas,
// scaled to the screen by the largest integer factor (letterboxed if needed).
//
// Layer types (drawn in ascending z):
//   image       { src, x, y, fade, edgeFade }                         fade: [y0, y1] canvas rows — image is gone above y0 and fully
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
//   particles   { count, color, speed, angle, length }      procedural rain
// Common: id, z, alpha (0..1), blend (canvas globalCompositeOperation, e.g. "lighter"),
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

  const draw = {
    image(l) {
      if (l._img) ctx.drawImage(l._faded ?? l._img, Math.round(l.x ?? 0), Math.round(l.y ?? 0));
      else drawRect(l, '#f0f', l.id);
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
      const pulse = l.flicker ? 1 - l.flicker * (0.5 + 0.5 * Math.sin(t * (l.hz ?? 1) * Math.PI * 2)) : 1;
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
    particles(l, t, dt) {
      const len = l.length ?? 4, speed = l.speed ?? 180;
      ctx.fillStyle = l.color ?? '#7fa6c9';
      for (const d of l._drops) {
        d.x += l._dx * speed * dt;
        d.y += l._dy * speed * dt;
        if (d.y > H) { d.y -= H + len; d.x = Math.random() * W; }
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
          ctx.globalAlpha = l.alpha ?? 1;
          if (l.blend) ctx.globalCompositeOperation = l.blend;
          ctx.drawImage(off, 0, 0);
          ctx.restore();
          continue;
        }
        drawLayer(l, l, acc, dt);
      }
      if (debug) drawDebug(layers);
    }
    requestAnimationFrame(frame);
  }

  // Vertical sway in whole pixels (stays crisp): amp px, period s, phase 0..1. Layers sharing a bob move together.
  function bobOffset(b, t) {
    return Math.round((b.amp ?? 2) * Math.sin((t / (b.period ?? 6) + (b.phase ?? 0)) * Math.PI * 2));
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
