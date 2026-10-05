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
      // Demon = Pro candidate c1 (glowing yellow eyes, four clearly separate arms), aligned to where c2 stood
      // (same reaching-hand x, top shifted 3px). Its eyes at sprite (90,46) / (97,46) get a yellow pulsing glow.
      { id: 'demon', type: 'image', src: 'assets/drafts/demon_pro_168_seed11001_c1.png', x: 78, y: 65, z: 20 },
      { id: 'demonEyeL', type: 'glow', x: 78 + 90, y: 65 + 46, r: 5, color: '#ffc21a', alpha: 0.8, flicker: 0.35, hz: 0.4, blend: 'lighter', z: 22 },
      { id: 'demonEyeR', type: 'glow', x: 78 + 97, y: 65 + 46, r: 4, color: '#ffc21a', alpha: 0.6, flicker: 0.35, hz: 0.4, blend: 'lighter', z: 22 },
      { id: 'grin', type: 'image', src: 'assets/drafts/grin_pro_168_seed11002_c0.png', x: 186, y: 48, z: 21 },

      // Embers and ash rising from the city, procedural.
      { id: 'embers', type: 'particles', count: 70, color: '#fe8e63', speed: 18, angle: -80, length: 1, z: 30 },
      { id: 'ash', type: 'particles', count: 40, color: '#5a5560', speed: 12, angle: -95, length: 1, z: 29 },
    ],
  };
})();
