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
export const DECOR_GLOW = [['glowAlgae', [1.1, 2.4, 2.3]], ['votiveGlass', [2.3, 1.1, .9]]];

// Until an atlas holding a layer has loaded (the crypt sheets are generated separately), the shader
// borrows the detail of an existing layer and tints it with that layer's fallback colour.
export const DECOR_STANDIN = [
  5, 27, 5, 34, 28, 35, 20, 2, 0, 3, 8, 29,
  28, 28, 4, 15, 12, 8, 20, 2, 0, 20, 2, 7,
  6, 34, 0, 11, 25, 25, 5, 5, 1, 33, 20, 18
];

// Mean colour of each layer (sRGB^1.48), shown until the atlas has loaded.
// Printed by `sunburst.py pack`; keep it in atlas order.
export const DECOR_FALLBACK = [
  [0.606,0.586,0.555], [0.131,0.310,0.308], [0.680,0.682,0.687], [0.516,0.607,0.584], [0.422,0.423,0.391], [0.669,0.616,0.559],
  [0.602,0.398,0.140], [0.168,0.232,0.325], [0.292,0.432,0.402], [0.208,0.257,0.272], [0.160,0.132,0.111], [0.600,0.526,0.432],
  [0.382,0.351,0.323], [0.555,0.479,0.346], [0.454,0.337,0.180], [0.272,0.172,0.124], [0.368,0.412,0.425], [0.166,0.126,0.093],
  [0.210,0.008,0.018], [0.631,0.437,0.152], [0.386,0.346,0.306], [0.277,0.176,0.125], [0.355,0.300,0.224], [0.144,0.103,0.080],
  [0.526,0.436,0.336], [0.236,0.132,0.075], [0.080,0.134,0.346], [0.348,0.333,0.279], [0.500,0.479,0.450], [0.177,0.203,0.131],
  [0.592,0.325,0.210], [0.531,0.363,0.203], [0.361,0.319,0.286], [0.762,0.441,0.106], [0.140,0.129,0.124], [0.145,0.201,0.121],
  // Hand estimates for the crypt layers (sRGB^1.48); replace with the `pack` output once generated.
  ...[
    [.42,.41,.38], [.40,.37,.33], [.50,.30,.22], [.20,.21,.22], [.55,.53,.48], [.30,.42,.20],
    [.62,.58,.50], [.12,.12,.13], [.62,.42,.36], [.10,.26,.27], [.40,.42,.35], [.28,.22,.10],
    [.12,.13,.17], [.80,.76,.68], [.66,.56,.44], [.30,.55,.48], [.55,.47,.36], [.10,.45,.50],
    [.78,.75,.68], [.80,.78,.72], [.42,.20,.26], [.38,.27,.15], [.85,.72,.52], [.62,.55,.42],
    [.70,.52,.22], [.10,.10,.10], [.88,.82,.66], [.86,.82,.72], [.55,.30,.20], [.60,.46,.30],
    [.20,.18,.16], [.78,.62,.36], [.55,.62,.78], [.85,.12,.10], [.65,.65,.62], [.55,.22,.16]
  ].map(c => c.map(v => +(v ** 1.48).toFixed(3)))
];
