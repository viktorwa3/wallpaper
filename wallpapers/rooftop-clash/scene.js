// Scene config for engine/engine.js. Paths are relative to this folder's index.html.
// Rooftop Clash: a tilted burning skyscraper on the right, the burning city far below on the left (seen from high
// above); the demon (left) and the grin character (right) clash in mid-air in front of it.
(() => {
  window.SCENE = {
    canvas: { width: 512, height: 288 },
    maxFps: 30,
    layers: [
      // Background: Pixen 512x288 high top-down, seed 10602 (tower ~70°, burning window grid, city on the left).
      { id: 'bg', type: 'image', src: 'assets/bg.png', x: 0, y: 0, z: 0 },

      // Mid-air fighters (create_image_pro 168x168 with references, poses after refs/composition_ref.jpg):
      // the demon lunges up-right with one arm reaching past the grin; the grin's black fist lands in the demon's chest.
      { id: 'demon', type: 'image', src: 'assets/drafts/demon_pro_168_seed11001_c2.png', x: 78, y: 62, z: 20 },
      { id: 'grin', type: 'image', src: 'assets/drafts/grin_pro_168_seed11002_c0.png', x: 186, y: 48, z: 21 },

      // Embers and ash rising from the city, procedural.
      { id: 'embers', type: 'particles', count: 70, color: '#fe8e63', speed: 18, angle: -80, length: 1, z: 30 },
      { id: 'ash', type: 'particles', count: 40, color: '#5a5560', speed: 12, angle: -95, length: 1, z: 29 },
    ],
  };
})();
