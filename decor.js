// Material IDs for the decor atlas (decor-96.webp / decor-256.webp), generated with GPT Image 2.5 Sunburst.
// The order matches the "layers" list in textures/decor-atlas.json, beginning after the surface atlas.
export const DECOR_START = 105;
const NAMES = [
  'terrazzo', 'zellige', 'carrara', 'fontWater', 'waveMosaic', 'limestone',
  'gildedGesso', 'starFresco', 'seaGlass', 'hullPlanks', 'fishingNet', 'patchedSail',
  'driftwood', 'seaChart', 'compassDial', 'rustedIron', 'motherOfPearl', 'ropeCoil',
  'velvet', 'hammeredGold', 'silverFiligree', 'gems', 'ebonyInlay', 'bandedOak',
  'illuminatedPage', 'scribeDesk', 'lapis', 'cobbles', 'gravel', 'herbBed',
  'terracotta', 'strawSkep', 'teakSlats', 'lanternGlass', 'wroughtIron', 'ivy',
  // Crypt (地下聖堂): textures/specs/decor-e … decor-h.
  'cryptFlagstones', 'rubbleWall', 'vaultBrick', 'wetStone', 'barnacleStone', 'algaeStone',
  'carvedFrieze', 'blackBasalt', 'cisternPlaster', 'seawater', 'tidePool', 'kelp',
  'mussels', 'shellSand', 'octopusMosaic', 'verdigris', 'wetSand', 'glowAlgae',
  'sarcophagusRelief', 'effigyMarble', 'porphyry', 'bronzePlaque', 'alabaster', 'angelFresco',
  'goldIcon', 'ironGrille', 'waxDrips', 'embroideredLinen', 'cedar', 'oliveWood',
  'sootPlaster', 'ochrePlaster', 'azulejo', 'votiveGlass', 'pressedTin', 'kilim'
];
export const DECOR = Object.freeze(Object.fromEntries(NAMES.map((name, i) => [name, DECOR_START + i])));
export const DECOR_LAYERS = NAMES.length;

// Per-layer shading parameters, in atlas order:
// [repeats per metre (0 = use the mesh UVs as a picture), roughness, brightness]
export const DECOR_SHADING = [
  [.80, .30, 1.00], [1.65, .18, .95], [.90, .26, 1.02], [.70, .08, 1.00], [0, .62, 1.00], [.70, .86, .98],
  [2.4, .34, 1.06], [.50, .90, 1.06], [2.0, .40, .98], [.80, .80, .98], [1.5, .90, 1.00], [.60, .92, 1.02],
  [1.2, .88, 1.00], [0, .85, 1.00], [0, .30, 1.05], [2.0, .82, 1.00], [3.0, .14, 1.06], [0, .90, 1.00],
  [1.5, .74, 1.05], [3.0, .22, 1.04], [3.0, .26, 1.00], [4.0, .20, 1.04], [1.5, .38, 1.00], [1.2, .70, 1.00],
  [0, .80, 1.00], [1.0, .55, 1.00], [2.0, .20, 1.02], [.50, .88, 1.00], [1.0, .95, 1.00], [.70, .95, 1.06],
  [1.5, .86, 1.00], [2.0, .92, 1.04], [2.2, .78, 1.00], [2.0, .20, 1.00], [2.5, .50, 1.00], [.80, .62, 1.00],
  [.45, .80, 1.00], [.50, .90, 1.00], [.80, .88, 1.00], [.60, .12, .92], [1.2, .85, 1.00], [.90, .50, 1.00],
  [1.1, .80, 1.00], [1.0, .15, 1.00], [.70, .85, 1.00], [.35, .05, 1.00], [.50, .10, 1.00], [1.0, .40, 1.00],
  [1.5, .30, 1.00], [1.2, .95, 1.00], [0, .60, 1.00], [1.5, .45, 1.00], [.70, .60, 1.00], [.80, .50, 1.00],
  [.90, .60, 1.02], [.80, .35, 1.02], [1.5, .20, 1.00], [1.2, .35, 1.05], [1.0, .30, 1.05], [0, .90, 1.04],
  [0, .40, 1.05], [1.4, .50, 1.00], [2.0, .50, 1.05], [1.5, .85, 1.05], [1.0, .60, 1.00], [1.2, .40, 1.00],
  [.50, .95, 1.00], [.60, .92, 1.04], [1.6, .20, 1.00], [3.0, .20, 1.00], [1.2, .30, 1.05], [.80, .95, 1.02]
];

// Emissive layers glow instead of being lit: [layer name, rgb gain].
export const DECOR_GLOW = [['glowAlgae', [.8, 1.75, 1.7]], ['votiveGlass', [2.3, 1.1, .9]]];

// While an older, shorter atlas is loaded (an offline cache), the shader borrows the detail of an
// existing layer for the missing ones and tints it with that layer's fallback colour.
export const DECOR_STANDIN = [
  5, 27, 5, 34, 28, 35, 20, 2, 0, 3, 8, 29,
  28, 28, 4, 15, 12, 8, 20, 2, 0, 20, 2, 7,
  6, 34, 0, 11, 25, 25, 5, 5, 1, 33, 20, 18
];

// Mean colour of each layer (sRGB^1.48), shown until the atlas has loaded.
// Printed by `sunburst.py pack`; keep it in atlas order.
export const DECOR_FALLBACK = [
  [0.605,0.584,0.554], [0.131,0.307,0.306], [0.680,0.680,0.687], [0.514,0.607,0.583], [0.423,0.418,0.385], [0.669,0.615,0.559],
  [0.602,0.396,0.136], [0.168,0.231,0.326], [0.291,0.431,0.401], [0.207,0.256,0.271], [0.159,0.130,0.108], [0.601,0.525,0.431],
  [0.379,0.349,0.323], [0.554,0.477,0.344], [0.455,0.334,0.175], [0.272,0.170,0.122], [0.365,0.411,0.426], [0.166,0.124,0.090],
  [0.211,0.005,0.016], [0.631,0.436,0.148], [0.384,0.342,0.304], [0.277,0.173,0.120], [0.354,0.295,0.215], [0.144,0.102,0.079],
  [0.523,0.432,0.331], [0.236,0.131,0.075], [0.079,0.132,0.347], [0.346,0.331,0.278], [0.497,0.475,0.448], [0.175,0.201,0.128],
  [0.592,0.324,0.209], [0.529,0.362,0.200], [0.360,0.317,0.285], [0.764,0.439,0.103], [0.139,0.128,0.124], [0.143,0.200,0.119],
  [0.304,0.264,0.217], [0.257,0.227,0.185], [0.229,0.114,0.061], [0.131,0.134,0.138], [0.222,0.200,0.159], [0.142,0.163,0.043],
  [0.366,0.306,0.251], [0.065,0.068,0.070], [0.622,0.338,0.294], [0.016,0.161,0.177], [0.254,0.165,0.115], [0.157,0.119,0.059],
  [0.171,0.157,0.143], [0.669,0.594,0.534], [0.497,0.370,0.286], [0.178,0.310,0.239], [0.395,0.337,0.268], [0.020,0.156,0.255],
  [0.522,0.450,0.406], [0.544,0.483,0.438], [0.258,0.150,0.187], [0.270,0.209,0.123], [0.753,0.627,0.508], [0.396,0.316,0.272],
  [0.511,0.308,0.135], [0.158,0.117,0.096], [0.574,0.449,0.319], [0.597,0.521,0.449], [0.416,0.131,0.064], [0.610,0.331,0.131],
  [0.345,0.280,0.225], [0.657,0.370,0.112], [0.461,0.476,0.509], [0.618,0.067,0.015], [0.320,0.243,0.176], [0.361,0.206,0.154]
];
