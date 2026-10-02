// Pixel wallpaper engine: renders window.SCENE on a native-resolution canvas,
// scaled to the screen by the largest integer factor (letterboxed if needed).
//
// Layer types (drawn in ascending z):
//   image       { src, x, y }
//   sprite      { src, x, y, frameW, frames, fps }          frames laid out in one row
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
//   particles   { count, color, speed, angle, length }      procedural rain
// Common: id, z, alpha (0..1), blend (canvas globalCompositeOperation, e.g. "lighter").
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
  const ctx = canvas.getContext('2d');

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

  const draw = {
    image(l) {
      if (l._img) ctx.drawImage(l._img, Math.round(l.x ?? 0), Math.round(l.y ?? 0));
      else drawRect(l, '#f0f', l.id);
    },
    sprite(l, t) {
      if (!l._img) return drawRect(l, '#f0f', l.id);
      const frame = Math.floor(t * (l.fps ?? 8)) % l.frames;
      const h = l._img.height;
      ctx.drawImage(l._img, frame * l.frameW, 0, l.frameW, h, Math.round(l.x), Math.round(l.y), l.frameW, h);
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
    layers.filter(l => l.type === 'particles').forEach(initParticles);

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
        ctx.save();
        ctx.globalAlpha = l.alpha ?? 1;
        if (l.blend) ctx.globalCompositeOperation = l.blend;
        draw[l.type ?? 'image'](l, acc, dt);
        ctx.restore();
      }
      if (debug) drawDebug(layers);
    }
    requestAnimationFrame(frame);
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
