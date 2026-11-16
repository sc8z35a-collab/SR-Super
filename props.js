// Metals, glass, sea, church furnishings and island props (props-128.webp / props-256.webp).
// Order matches "layers" in textures/props-atlas.json. Meshes may use PROPS.<name> as a material
// (IDs from PROPS_START; mesh.js stores 16-bit material IDs), and the shaders also dress older materials,
// the windows and the sea with these layers.
export const PROPS_START = 240;
const NAMES = [
  'bellBronze', 'castIron', 'brass', 'copperSheet', 'goldLeaf', 'rustyChain', 'scrollIron', 'pewter', 'rivetBand',
  'leadedDiamond', 'oldGreenGlass', 'saintGlass', 'shipGlass', 'roseWindow', 'geometricGlass', 'rainGlass', 'crackedGlass', 'tracery',
  'deepSea', 'shallowReef', 'breakingFoam', 'whirlpool', 'sunsetSea', 'cascade', 'backwash', 'kelpForest', 'harbourWater',
  'pewOak', 'kneelerVelvet', 'greenVestment', 'pulpitCarving', 'organPipes', 'sheetMusic', 'hymnalCover', 'almsBox', 'stoupMarble',
  'oldFence', 'gravestone', 'celticCross', 'redBoat', 'bollard', 'lighthouseStripe', 'stoneTrough', 'hay', 'logPile'
];
export const PROPS = Object.freeze(Object.fromEntries(NAMES.map((name, i) => [name, PROPS_START + i])));
export const PROPS_LAYER = Object.freeze(Object.fromEntries(NAMES.map((name, i) => [name, i])));
export const PROPS_LAYERS = NAMES.length;

// [repeats per metre (0 = the mesh UVs frame one picture, < 0 = mesh UVs in metres), roughness, brightness]
export const PROPS_SHADING = [
  [1.5, .35, 1.00], [1.2, .55, 1.00], [1.5, .15, 1.00], [1.0, .45, 1.00], [1.5, .20, 1.00], [2.0, .60, 1.00], [1.2, .50, 1.00], [1.2, .40, 1.00], [1.0, .55, 1.00],
  [0, .10, 1.00], [0, .10, 1.00], [0, .10, 1.00], [0, .10, 1.00], [0, .10, 1.00], [0, .10, 1.00], [0, .10, 1.00], [0, .10, 1.00], [0, .80, 1.00],
  [.10, .05, 1.00], [.20, .05, 1.00], [.25, .30, 1.00], [0, .05, 1.00], [.15, .05, 1.00], [.60, .20, 1.00], [.30, .10, 1.00], [.20, .05, 1.00], [.50, .08, 1.00],
  [1.0, .45, 1.00], [0, .90, 1.05], [0, .85, 1.05], [0, .60, 1.00], [0, .30, 1.00], [0, .85, 1.05], [0, .60, 1.00], [0, .55, 1.00], [-1.5, .25, 1.02],
  [0, .85, 1.00], [0, .85, 1.00], [0, .85, 1.00], [-.8, .80, 1.00], [1.5, .55, 1.00], [-.5, .70, 1.00], [0, .85, 1.00], [.9, .95, 1.05], [0, .85, 1.00]
];

// Mean colour of each layer (sRGB^1.48), printed by `sunburst.py pack`.
export const PROPS_FALLBACK = [
  [0.244,0.240,0.155], [0.100,0.100,0.096], [0.512,0.342,0.092], [0.245,0.315,0.236], [0.626,0.381,0.066], [0.174,0.100,0.060],
  [0.131,0.117,0.101], [0.346,0.328,0.292], [0.155,0.128,0.103], [0.363,0.411,0.388], [0.261,0.410,0.274], [0.237,0.231,0.294],
  [0.383,0.184,0.127], [0.257,0.205,0.250], [0.309,0.362,0.418], [0.301,0.380,0.427], [0.341,0.422,0.412], [0.326,0.299,0.255],
  [0.018,0.104,0.206], [0.151,0.298,0.238], [0.412,0.553,0.633], [0.080,0.246,0.325], [0.362,0.199,0.181], [0.267,0.308,0.318],
  [0.407,0.382,0.324], [0.114,0.202,0.105], [0.180,0.267,0.188], [0.147,0.054,0.023], [0.181,0.009,0.013], [0.196,0.181,0.051],
  [0.224,0.112,0.066], [0.317,0.264,0.218], [0.669,0.519,0.349], [0.188,0.087,0.054], [0.217,0.117,0.073], [0.532,0.467,0.416],
  [0.252,0.219,0.160], [0.233,0.212,0.137], [0.277,0.258,0.208], [0.388,0.135,0.105], [0.245,0.162,0.126], [0.404,0.405,0.405],
  [0.267,0.228,0.152], [0.506,0.341,0.148], [0.416,0.270,0.155]
];
