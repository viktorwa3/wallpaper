// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
window.SCENE = {
  canvas: { width: 512, height: 288 },
  maxFps: 30,
  layers: [
    { id: 'bg', type: 'image', src: '../../shared/assets/bg.png', x: 0, y: 0, z: 0 },

    // Placeholders for the figures standing on the platform (top edge ~y=238).
    { id: 'fig1', type: 'rect', x: 120, y: 232, w: 32, h: 32, color: '#a33', z: 10 },
    { id: 'fig2', type: 'rect', x: 240, y: 232, w: 32, h: 32, color: '#3a3', z: 10 },
    { id: 'fig3', type: 'rect', x: 360, y: 232, w: 32, h: 32, color: '#33a', z: 10 },
  ],
};
