// The cathedral's own stonework, floors, ceilings and roofs (fabric-68.webp / fabric-136.webp).
// Order matches "layers" in textures/fabric-atlas.json. Meshes may use FABRIC.<name> as a material
// (IDs from FABRIC_START), and the shader also dresses the older procedural materials with these layers.
export const FABRIC_START = 177;
const NAMES = [
  'extAshlar', 'extSooty', 'extMossy', 'extStreaked', 'windowMoulding', 'spireCarving',
  'buttress', 'belfryRubble', 'granitePlinth', 'intAshlar', 'columnStone', 'capital',
  'archVoussoir', 'whitePlaster', 'muralPlaster', 'sootyStone', 'oakWainscot', 'tapestry',
  'naveFlags', 'checkerMarble', 'greenMarble', 'whiteMarble', 'oakFloor', 'terracottaTiles',
  'stoneSteps', 'terraceSlabs', 'tombSlab', 'ribVault', 'plasterVault', 'beamCeiling',
  'stainedCeiling', 'sootBeams', 'slateRoof', 'leadRoof', 'mossyRoof', 'gutter',
  'dryStoneWall', 'retainingWall', 'rusticated', 'brickPeel', 'whitewash', 'saltEroded',
  'copperStain', 'windowRecess', 'studdedDoor', 'stripedMarble', 'frescoBand', 'plasterRelief',
  'goldMosaic', 'blindArcade', 'saintNiche', 'woodLattice', 'fadedBlue', 'graffitiStone',
  'battlement', 'gardenWall', 'roundedStoneWall', 'louvre', 'barredWindow', 'balustrade',
  'stairWall', 'wellInterior', 'dampPlaster'
];
export const FABRIC = Object.freeze(Object.fromEntries(NAMES.map((name, i) => [name, FABRIC_START + i])));
export const FABRIC_LAYER = Object.freeze(Object.fromEntries(NAMES.map((name, i) => [name, i])));
export const FABRIC_LAYERS = NAMES.length;

// [repeats per metre (0 = the mesh UVs frame one picture, < 0 = mesh UVs in metres), roughness, brightness]
export const FABRIC_SHADING = [
  [.42, .85, 1.00], [.42, .85, 1.00], [.42, .85, 1.00], [.42, .85, 1.00], [0, .80, 1.00], [0, .80, 1.00],
  [.40, .85, 1.00], [.50, .90, 1.00], [.55, .60, 1.00], [.45, .80, 1.00], [.60, .75, 1.00], [0, .80, 1.00],
  [0, .80, 1.00], [.40, .90, 1.02], [0, .90, 1.04], [.40, .90, 1.00], [-.62, .60, 1.00], [0, .95, 1.05],
  [.42, .70, 1.00], [0, .25, 1.00], [.60, .20, 1.00], [.60, .25, 1.02], [.80, .55, 1.00], [.70, .80, 1.00],
  [.45, .85, 1.00], [.50, .85, 1.00], [0, .75, 1.00], [0, .85, 1.00], [0, .90, 1.02], [.35, .80, 1.00],
  [.35, .90, 1.00], [.30, .85, 1.00], [.70, .40, 1.00], [.60, .40, 1.00], [.60, .90, 1.00], [-.8, .35, 1.00],
  [.50, .90, 1.00], [.45, .85, 1.00], [.45, .85, 1.00], [.50, .85, 1.00], [.45, .90, 1.00], [.50, .90, 1.00],
  [.42, .85, 1.00], [.50, .90, 1.00], [0, .65, 1.00], [.50, .30, 1.00], [0, .85, 1.00], [.80, .80, 1.00],
  [1.2, .25, 1.05], [0, .80, 1.00], [0, .80, 1.00], [0, .70, 1.00], [.45, .90, 1.02], [0, .85, 1.00],
  [-.42, .85, 1.00], [.50, .85, 1.00], [.50, .85, 1.00], [0, .80, 1.00], [0, .80, 1.00], [-.45, .80, 1.00],
  [0, .85, 1.00], [.60, .30, .95], [.45, .90, 1.00]
];

// Mean colour of each layer (sRGB^1.48), printed by `sunburst.py pack`.
export const FABRIC_FALLBACK = [
  [0.355,0.347,0.327], [0.216,0.210,0.191], [0.318,0.301,0.250], [0.266,0.261,0.251], [0.399,0.370,0.336], [0.353,0.331,0.297],
  [0.312,0.297,0.268], [0.334,0.307,0.268], [0.369,0.362,0.350], [0.781,0.703,0.613], [0.667,0.571,0.471], [0.522,0.424,0.320],
  [0.550,0.456,0.354], [0.810,0.778,0.744], [0.580,0.465,0.362], [0.238,0.181,0.130], [0.329,0.163,0.068], [0.325,0.259,0.186],
  [0.352,0.340,0.324], [0.390,0.389,0.390], [0.078,0.109,0.096], [0.738,0.739,0.740], [0.504,0.278,0.116], [0.597,0.280,0.148],
  [0.403,0.357,0.304], [0.534,0.475,0.403], [0.455,0.408,0.359], [0.334,0.275,0.203], [0.589,0.555,0.528], [0.277,0.159,0.075],
  [0.453,0.381,0.289], [0.121,0.090,0.065], [0.226,0.241,0.262], [0.318,0.336,0.362], [0.222,0.199,0.117], [0.345,0.322,0.281],
  [0.360,0.316,0.265], [0.298,0.274,0.223], [0.450,0.401,0.356], [0.635,0.551,0.487], [0.753,0.751,0.753], [0.480,0.439,0.398],
  [0.381,0.396,0.351], [0.135,0.125,0.105], [0.245,0.184,0.148], [0.392,0.351,0.308], [0.527,0.394,0.285], [0.577,0.488,0.409],
  [0.563,0.378,0.128], [0.518,0.425,0.340], [0.510,0.400,0.309], [0.317,0.194,0.119], [0.363,0.410,0.480], [0.533,0.448,0.368],
  [0.333,0.301,0.263], [0.275,0.241,0.152], [0.340,0.299,0.242], [0.267,0.225,0.182], [0.329,0.289,0.234], [0.334,0.288,0.224],
  [0.373,0.327,0.269], [0.156,0.139,0.086], [0.442,0.391,0.303]
];
