// Layers of the terrain atlas (terrain-128.webp / terrain-384.webp), generated with GPT Image 2.5 Sunburst.
// The order matches "layers" in textures/terrain-atlas.json.
const NAMES = [
  'coastalGrass', 'thrift', 'heather', 'moss', 'dirtPath', 'sand', 'shingle', 'dryGrass', 'lichenTop',
  'cliff', 'granite', 'slate', 'seaweedRock', 'barnacleRock', 'orangeLichen', 'peat', 'scree', 'sandstone',
  'clover', 'dandelion', 'bracken', 'gorse', 'thyme', 'tallGrass', 'leafLitter', 'rootSoil', 'mud',
  'basalt', 'karst', 'mossyRock', 'grus', 'gneiss', 'wetCliff', 'ironRock', 'saltRock', 'chalk',
  'mudflat', 'wrack', 'shellBeach', 'blackSand', 'driftwood', 'rockShelf', 'saltmarsh', 'marram', 'foamSand',
  'stonyGrass', 'wetGrass', 'rubble', 'mossyBoulders', 'guanoRock', 'smoothRock', 'lavaRock', 'redClay', 'caveRock'
];
export const TERRAIN = Object.freeze(Object.fromEntries(NAMES.map((name, i) => [name, i])));
export const TERRAIN_LAYERS = NAMES.length;
