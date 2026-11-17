// The underground levels' atlas (under-68.webp / under-136.webp). Order matches "layers" in
// textures/under-atlas.json. Meshes use UNDER.<name> as a material (IDs from UNDER_START).
export const UNDER_START = 285;
const NAMES = [
  'mossyColumn', 'waterlineWall', 'floodedFloor', 'drainGrate', 'handPump', 'dripStone', 'wetCeiling', 'rustyPipe', 'coinPool',
  'skullWall', 'boneWall', 'loculi', 'tuff', 'redFresco', 'earthFloor', 'crumblingCeiling', 'catacombStone', 'coffinLid',
  'timberFrame', 'oreRock', 'railTrack', 'rustPlate', 'coalSeam', 'crushedRock', 'ironLadder', 'pulley', 'sootCeiling',
  'amethyst', 'quartzCluster', 'fluorite', 'blueCrystal', 'crystalFloor', 'pyrite', 'geode', 'glowMoss', 'glowMushroom',
  'stalactites', 'stalagmites', 'flowstone', 'rimstone', 'lakeWater', 'lakeSand', 'caveMud', 'waterfall', 'mistWater',
  'saltWall', 'saltFloor', 'saltColumn', 'saltRelief', 'chiselledRock', 'obsidianFloor', 'caveMarble', 'rockArch', 'rockDome',
  'chandelier', 'candelabra', 'ironRailing', 'haloMosaic', 'blueVelvet', 'rockSaint', 'ivoryCarving', 'hangingLamp', 'amberWindow',
  'altarFront', 'altarCloth', 'blackGoldMarble', 'alabasterFloor', 'glowWindow', 'pulpitRelief', 'redMarble', 'choirStalls', 'starFresco',
  'spiralStair', 'wornSteps', 'studdedDoor', 'stoneDoor', 'liftCage', 'walkway', 'ropeRail', 'ironGrate', 'torchBracket',
  'deepGranite', 'wetBlackRock', 'ironOre', 'sediment', 'crackedRock', 'warmRock', 'sulfur', 'hotSpring', 'volcanicGlass'
];
export const UNDER = Object.freeze(Object.fromEntries(NAMES.map((name, i) => [name, UNDER_START + i])));
export const UNDER_LAYER = Object.freeze(Object.fromEntries(NAMES.map((name, i) => [name, i])));
export const UNDER_LAYERS = NAMES.length;

// [repeats per metre (0 = the mesh UVs frame one picture, < 0 = mesh UVs in metres), roughness, brightness]
const P = s => [0, s, 1];
export const UNDER_SHADING = [
  [.5, .7, 1], [.45, .5, 1], [.5, .1, 1], P(.6), P(.5), [.5, .4, 1], [.5, .3, 1], [.8, .5, 1], [.6, .1, 1],
  [.6, .8, 1], P(.8), P(.85), [.45, .9, 1], P(.9), [.5, .95, 1], [.45, .9, 1], P(.85), P(.8),
  P(.8), [.45, .6, 1], [-1, .7, 1], [.7, .5, 1], [.5, .4, 1], [.6, .95, 1], P(.6), P(.6), [.45, .9, 1],
  [.8, .15, 1], [.8, .1, 1], [.8, .15, 1], [.8, .1, 1], [.5, .5, 1], [1.2, .2, 1], P(.3), [.6, .9, 1], [.6, .8, 1],
  [.4, .4, 1], [.45, .5, 1], [.4, .4, 1], [.4, .2, 1], [.3, .05, 1], [.5, .9, 1], [.6, .6, 1], P(.2), [.3, .1, 1],
  [.4, .35, 1], [.4, .25, 1], [.6, .3, 1], P(.5), [.4, .45, 1], [.5, .1, 1], [.5, .2, 1], P(.6), P(.5),
  P(.2), P(.3), [-1, .5, 1], P(.3), [.6, .9, 1], P(.7), [.7, .6, 1], P(.3), P(.4),
  P(.6), P(.85), [.5, .15, 1], [.45, .2, 1], P(.4), P(.6), [.6, .2, 1], [-1, .5, 1], P(.8),
  P(.7), [.6, .8, 1], P(.6), P(.7), P(.5), [.7, .8, 1], [-1, .8, 1], [.8, .5, 1], P(.6),
  [.45, .6, 1], [.45, .25, 1], [.5, .6, 1], [.4, .8, 1], [.45, .9, 1], [.5, .6, 1], [.8, .5, 1], [.4, .05, 1], [.6, .1, 1]
];
// Layers that light themselves: [name, rgb gain].
export const UNDER_GLOW = [
  ['blueCrystal', [1.5, 1.7, 2.1]], ['glowMoss', [1.2, 1.9, 1.2]], ['glowMushroom', [1.4, 1.8, 2.1]],
  ['amberWindow', [2.1, 1.6, 1.0]], ['glowWindow', [2.1, 1.7, 1.1]], ['chandelier', [1.7, 1.45, 1.1]]
];

// Mean colour of each layer (sRGB^1.48), printed by `sunburst.py pack`.
export const UNDER_FALLBACK = [
  [0.259,0.247,0.134], [0.297,0.279,0.187], [0.211,0.247,0.173], [0.203,0.193,0.125], [0.249,0.219,0.148], [0.389,0.350,0.256],
  [0.213,0.191,0.128], [0.199,0.153,0.089], [0.230,0.240,0.149], [0.379,0.287,0.184], [0.383,0.298,0.200], [0.346,0.272,0.188],
  [0.452,0.357,0.248], [0.514,0.359,0.240], [0.332,0.231,0.138], [0.431,0.353,0.262], [0.359,0.299,0.215], [0.282,0.207,0.136],
  [0.219,0.143,0.086], [0.199,0.176,0.136], [0.214,0.150,0.099], [0.241,0.159,0.111], [0.082,0.081,0.078], [0.228,0.195,0.154],
  [0.177,0.135,0.096], [0.189,0.136,0.087], [0.097,0.085,0.070], [0.367,0.214,0.458], [0.524,0.506,0.495], [0.226,0.366,0.327],
  [0.086,0.422,0.700], [0.278,0.256,0.248], [0.321,0.271,0.134], [0.375,0.311,0.488], [0.126,0.245,0.083], [0.072,0.308,0.363],
  [0.421,0.351,0.244], [0.334,0.276,0.166], [0.488,0.412,0.296], [0.380,0.377,0.270], [0.072,0.301,0.271], [0.538,0.592,0.539],
  [0.274,0.221,0.146], [0.319,0.347,0.347], [0.192,0.353,0.364], [0.629,0.441,0.366], [0.650,0.448,0.356], [0.664,0.462,0.369],
  [0.623,0.485,0.408], [0.592,0.437,0.372], [0.094,0.091,0.091], [0.540,0.484,0.437], [0.575,0.440,0.367], [0.581,0.422,0.325],
  [0.366,0.242,0.141], [0.218,0.172,0.119], [0.143,0.118,0.085], [0.393,0.299,0.202], [0.013,0.040,0.131], [0.405,0.313,0.205],
  [0.584,0.460,0.320], [0.215,0.160,0.091], [0.608,0.370,0.075], [0.400,0.282,0.174], [0.398,0.167,0.048], [0.133,0.107,0.077],
  [0.732,0.646,0.548], [0.613,0.438,0.214], [0.469,0.352,0.239], [0.373,0.169,0.100], [0.272,0.133,0.057], [0.296,0.233,0.201],
  [0.194,0.162,0.095], [0.245,0.204,0.134], [0.197,0.156,0.095], [0.236,0.200,0.118], [0.167,0.124,0.074], [0.273,0.201,0.119],
  [0.201,0.164,0.094], [0.171,0.126,0.078], [0.266,0.210,0.122], [0.301,0.259,0.230], [0.100,0.096,0.084], [0.239,0.107,0.073],
  [0.310,0.212,0.135], [0.291,0.243,0.187], [0.357,0.169,0.097], [0.604,0.488,0.197], [0.222,0.391,0.357], [0.140,0.109,0.096]
];
