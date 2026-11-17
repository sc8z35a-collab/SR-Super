// 古代都市: the ancient city beyond the broken east wall of 地下6階 (the lake cave).
// Every chamber, tunnel, house, stall, cell, torch and feature is written out here by hand.
// Coordinates are building-local metres (x east from the lake, z across); heights are metres
// above the city datum CITY_Y, which is the lake cave's floor.

export const CITY_Y = -29.6;
export const LAKE_ROOM = { x0: -11.3, x1: 11.3, z0: -20, z1: 18.5 };
// The breach in the lake cave's east wall where the first tunnel begins.
export const LAKE_BREACH = [-8.45, -7.35];
// Where 「階を選ぶ → 古代都市」 puts the walker: x, z, yaw (facing east).
export const CITY_ARRIVAL = [19.5, -8.2, Math.PI / 2];

// ---------------------------------------------------------------- chambers
// pts: the cave's outline; ceil: ceiling height at the walls (or hi: per corner); cc: at the middle.

export const CHAMBERS = [
  { id: 'gate', name: '古代都市 · 崩れ門', y: 0, ceil: 2.9, cc: 3.6, rock: 'bedrock2', floor: 'dirtFloor', roof: 'brokenCeil2',
    pts: [[14.5, -12.2], [19, -20.5], [27, -22], [36, -19], [43.5, -14], [45.5, -6], [41, 2.5], [33, 6], [24, 5], [17, .5], [14, -4.6]],
    pillars: [[31.5, -13.5, .75]] },
  { id: 'lakeside', name: '古代都市 · 湖門の集落と朝市', y: -.3, ceil: 3.0, cc: 3.8, rock: 'bedrock', floor: 'dirtFloor', roof: 'bedrock2',
    pts: [[54, -8], [58, -30], [70, -41], [88, -43], [104, -36], [117, -22], [121, -4], [118, 14], [110, 30], [94, 37], [76, 35], [62, 26], [55, 10]],
    pillars: [[86.5, -5.5, .9], [101, 12.5, 1.1], [72, -24, .7]] },
  { id: 'mud', name: '古代都市 · 泥の古層区', y: .4, ceil: 2.9, cc: 3.4, rock: 'bedrock', floor: 'mudPuddles', roof: 'rootCeil',
    pts: [[100, 62], [108, 49], [124, 45], [142, 47], [160, 52], [172, 64], [176, 84], [171, 104], [160, 118], [142, 126], [122, 124], [107, 114], [99, 96], [97, 78]],
    pillars: [[136, 86, .8], [158, 70, .6]] },
  { id: 'maze', name: '古代都市 · 煉瓦の迷路区', y: -.5, ceil: 2.8, cc: 3.3, rock: 'bedrock', floor: 'cobbleLane', roof: 'soot2',
    pts: [[130, -30], [136, -58], [150, -84], [170, -99], [196, -101], [220, -92], [236, -72], [240, -44], [235, -14], [222, 6], [200, 15], [176, 14], [154, 8], [138, -6]],
    pillars: [[191, -41, .9], [168, -72, .7], [215, -20, .8]] },
  { id: 'market', name: '古代都市 · 炎の下の大市場', y: -.2, ceil: 3.4, cc: 4.4, rock: 'bedrock', floor: 'cobbleLane', roof: 'soot2',
    pts: [[250, -20], [258, -42], [276, -50], [298, -47], [315, -34], [322, -10], [320, 18], [312, 40], [294, 53], [272, 54], [256, 42], [249, 18]] },
  { id: 'timber', name: '古代都市 · 木組み区', y: .6, ceil: 2.9, cc: 3.5, rock: 'bedrock', floor: 'dirtFloor', roof: 'bedrock2',
    pts: [[304, 80], [316, 66], [338, 61], [362, 64], [384, 72], [397, 90], [398, 114], [390, 136], [372, 150], [348, 153], [326, 147], [310, 132], [301, 108]],
    pillars: [[349, 107, .8]] },
  { id: 'canal', name: '古代都市 · 水路沿いと染め物市', y: -.9, ceil: 2.8, cc: 3.3, rock: 'bedrock', floor: 'mudPuddles', roof: 'seepCeil',
    pts: [[332, -46], [344, -74], [360, -96], [386, -112], [416, -121], [448, -118], [474, -104], [489, -80], [488, -54], [476, -32], [452, -21], [420, -19], [390, -22], [360, -28], [340, -34]],
    pillars: [[401, -92, .8], [452, -44, .7]] },
  { id: 'smithy', name: '古代都市 · 鍛冶と陶工の市', y: .2, ceil: 3.0, cc: 3.7, rock: 'bedrock', floor: 'ashFloor', roof: 'soot2',
    pts: [[410, 86], [418, 72], [436, 67], [456, 70], [469, 82], [472, 100], [464, 116], [446, 123], [426, 120], [413, 106]] },
  { id: 'ashlar', name: '古代都市 · 切石の上層区', y: 1.1, ceil: 2.9, cc: 3.5, rock: 'bedrock', floor: 'polWorn', roof: 'slab2',
    pts: [[502, 88], [512, 70], [532, 65], [556, 68], [574, 80], [584, 102], [582, 128], [572, 150], [552, 163], [528, 164], [510, 152], [501, 128], [499, 106]],
    pillars: [[541, 112, .7, 'polColumn'], [559, 134, .7, 'polColumn']] },
  { id: 'bath', name: '古代都市 · 浴場跡と階段井戸', y: -.6, ceil: 3.0, cc: 3.8, rock: 'bedrock', floor: 'brokenTiles', roof: 'seepIce2',
    pts: [[520, -24], [528, -46], [546, -56], [570, -55], [590, -44], [603, -24], [604, 0], [594, 18], [574, 25], [550, 23], [532, 14], [521, -4]],
    pillars: [[554, -36, .6, 'polColumn'], [578, -36, .6, 'polColumn'], [554, -16, .6, 'polColumn']] },
  { id: 'rockcut', name: '古代都市 · 岩窟区', y: 0, ceil: 3.0, cc: 4.2, rock: 'bedrock', floor: 'pebbleFloor', roof: 'bedrock2',
    hi: [3.4, 4.4, 4.6, 4.6, 4.6, 4.4, 3.6, 3.2, 3.0, 3.0, 3.0, 3.0, 3.2],
    pts: [[612, -140], [620, -170], [640, -192], [668, -199], [698, -194], [718, -178], [725, -152], [720, -124], [704, -106], [680, -101], [652, -104], [630, -114], [616, -126]] },
  { id: 'cells', name: '古代都市 · 岩牢', y: -.4, ceil: 2.9, cc: 3.5, rock: 'bedrock', floor: 'cellFloor', roof: 'seepCeil',
    pts: [[628, 132], [636, 114], [654, 107], [674, 110], [688, 122], [692, 142], [686, 162], [670, 175], [648, 176], [634, 164], [627, 148]] },
  { id: 'ruin', name: '古代都市 · 崩落区と骨董夜市', y: .3, ceil: 2.8, cc: 3.4, rock: 'bedrock', floor: 'pebbleFloor', roof: 'brokenCeil',
    pts: [[732, 10], [738, -16], [754, -32], [778, -36], [802, -28], [820, -10], [826, 16], [822, 44], [810, 68], [788, 84], [762, 86], [744, 72], [734, 46]] },
  { id: 'cages', name: '古代都市 · 鉄籠の獄', y: -.2, ceil: 3.6, cc: 5.0, rock: 'bedrock', floor: 'cellFloor', roof: 'seepIce2',
    pts: [[840, -128], [846, -148], [862, -158], [882, -155], [895, -140], [896, -118], [886, -102], [866, -97], [849, -104]] },
  { id: 'east', name: '古代都市 · 東端の茸と魚の市', y: 0, ceil: 3.0, cc: 3.7, rock: 'bedrock', floor: 'mudPuddles', roof: 'rootCeil',
    pts: [[902, 0], [908, -26], [926, -42], [950, -45], [972, -36], [985, -14], [986, 10], [976, 28], [954, 36], [930, 35], [912, 24]] },
  { id: 'tombs', name: '古代都市 · 墓所', y: .5, ceil: 2.6, cc: 3.1, rock: 'bedrock2', floor: 'dirtFloor', roof: 'roots2',
    pts: [[958, 118], [966, 104], [984, 100], [1002, 106], [1010, 124], [1008, 150], [996, 168], [976, 172], [962, 160], [956, 138]] },
];

// ---------------------------------------------------------------- tunnels
// Narrow lanes (about 1.3 people wide) cut through the rock between chambers.
// t: torches "segment fraction side(l|r)"; x: pictures "kind segment fraction side".

export const TUNNELS = [
  { id: 't01', name: '崩れ門の裂け目', from: 'lake', to: 'gate', w: .9, h: 2.0, wall: 'crumbleStone', floor: 'pebbleFloor', ceil: 'brokenCeil2',
    pts: [[10.2, -7.9], [13.0, -7.9], [16.0, -7.6]] },
  { id: 't02', name: '門前の小径', from: 'gate', to: 'lakeside', w: .8, h: 2.1, wall: 'mudStone', floor: 'dirtFloor',
    pts: [[43, -5], [47, -4.2], [51, -5.6], [56, -4.4]], t: '1 .5 l' },
  { id: 't03', name: '泥の坂道', from: 'lakeside', to: 'mud', w: .8, h: 2.0, wall: 'crackedMud', floor: 'mudPuddles', ceil: 'rootCeil',
    pts: [[100, 31], [99, 38], [102, 44], [106, 50], [112, 58]], t: '1 .6 r;3 .4 l', x: 'hands 2 .5 l' },
  { id: 't04', name: '煉瓦の裏道', from: 'lakeside', to: 'maze', w: .8, h: 2.1, wall: 'sootBrick', floor: 'cobbleLane', ceil: 'sootCeil',
    pts: [[115, -14], [120, -15.5], [125, -13.8], [129, -16], [137, -19]], t: '2 .5 l', x: 'graffiti 1 .5 r' },
  { id: 't05', name: '古井戸の抜け道', from: 'mud', to: 'maze', w: .78, h: 1.95, wall: 'mudStone', floor: 'dirtFloor',
    pts: [[150, 53], [152, 44], [149, 37], [153, 29], [158, 20], [161, 5]], t: '1 .5 r;3 .3 l;4 .7 r', x: 'paint 2 .5 r;web 0 .4 l' },
  { id: 't06', name: '炎への通い路', from: 'maze', to: 'market', w: .85, h: 2.2, wall: 'burntBrick', floor: 'cobbleLane', ceil: 'soot2',
    pts: [[233, -30], [239, -28.6], [244, -30.4], [248, -28], [255, -27]], t: '1 .5 r;3 .5 l' },
  { id: 't07', name: '長い坑道', from: 'mud', to: 'timber', w: .82, h: 2.05, wall: 'roughBlock', floor: 'dirtFloor', ceil: 'logCeil',
    pts: [[170, 82], [178, 83.5], [186, 80], [196, 84], [208, 82.5], [222, 88], [236, 86], [250, 91], [264, 88.6], [278, 94], [290, 92], [306, 96]],
    t: '1 .5 l;3 .4 r;4 .7 l;6 .3 r;7 .8 l;9 .5 r;10 .6 l', x: 'glyphs 5 .5 l;paint 8 .4 r;drip 2 .6 r;tally 10 .2 r' },
  { id: 't08', name: '市場の北口', from: 'market', to: 'timber', w: .8, h: 2.1, wall: 'oldPlanks', floor: 'dirtyPlanks', ceil: 'beamCeiling',
    pts: [[300, 46], [304, 52], [302, 58], [307, 64], [313, 75]], t: '2 .5 r' },
  { id: 't09', name: '水路への下り', from: 'market', to: 'canal', w: .8, h: 2.0, wall: 'mossBrick', floor: 'mudPuddles', ceil: 'seepCeil',
    pts: [[306, -38], [312, -44], [318, -45.5], [326, -43], [334, -41], [339, -40]], t: '1 .5 l;3 .6 r', x: 'drip 2 .5 l' },
  { id: 't10', name: '鍛冶屋の路地', from: 'timber', to: 'smithy', w: .8, h: 2.0, wall: 'sootStone', floor: 'ashFloor', ceil: 'sootCeil',
    pts: [[394, 100], [400, 99], [405, 96.5], [415, 95]], t: '1 .4 r' },
  { id: 't11', name: '湯けむりの道', from: 'canal', to: 'bath', w: .82, h: 2.1, wall: 'mossStone', floor: 'pebbleFloor', ceil: 'seepIce2',
    pts: [[484, -60], [492, -57], [500, -50], [508, -44], [516, -38], [527, -33]], t: '1 .5 r;3 .5 l', x: 'drip 4 .4 r' },
  { id: 't12', name: '陶工の坂', from: 'smithy', to: 'ashlar', w: .8, h: 2.1, wall: 'limeStone', floor: 'cobbleLane',
    pts: [[468, 92], [476, 93.5], [484, 91], [492, 95], [500, 94], [505, 97]], t: '2 .5 l;4 .3 r' },
  { id: 't13', name: '石段の小路', from: 'ashlar', to: 'bath', w: .8, h: 2.1, wall: 'polWorn', floor: 'cobbleLane', ceil: 'slab2',
    pts: [[530, 71], [531, 60], [534, 50], [530, 40], [536, 30], [541, 15]], t: '1 .5 l;3 .5 r', x: 'glyphs 2 .5 r' },
  { id: 't14', name: '岩窟への裂け目', from: 'bath', to: 'rockcut', w: .78, h: 2.0, wall: 'u:wetBlackRock', floor: 'pebbleFloor', ceil: 'seepCeil',
    pts: [[594, -36], [600, -46], [606, -60], [611, -74], [608, -88], [616, -100], [624, -110], [628, -118]],
    t: '1 .5 r;3 .4 l;5 .5 r;6 .6 l', x: 'paint 4 .5 r;web 2 .3 l' },
  { id: 't15', name: '牢への道', from: 'ashlar', to: 'cells', w: .8, h: 2.0, wall: 'flatStone', floor: 'cellFloor',
    pts: [[576, 138], [586, 139], [598, 136], [610, 140], [622, 138], [631, 140]], t: '1 .5 l;3 .5 r', x: 'tally 4 .5 l' },
  { id: 't16', name: '崩れかけの長廊', from: 'bath', to: 'ruin', w: .82, h: 2.05, wall: 'crumbleStone', floor: 'pebbleFloor', ceil: 'brokenCeil',
    pts: [[600, -8], [608, -6], [620, -10], [634, -4], [650, -8], [664, -2], [680, -6], [694, 2], [708, -2], [722, 4], [736, 2]],
    t: '1 .5 l;2 .6 r;4 .4 l;5 .7 r;7 .5 l;8 .5 r;9 .6 l', x: 'paint 3 .5 r;hole 6 .4 l;graffiti 8 .3 l' },
  { id: 't17', name: '鎖の通り道', from: 'rockcut', to: 'cages', w: .8, h: 2.1, wall: 'roughBlock', floor: 'cellFloor',
    pts: [[719, -140], [728, -139], [740, -144], [756, -140], [772, -146], [790, -142], [806, -138], [822, -132], [836, -128], [845, -126]],
    t: '1 .5 r;2 .6 l;4 .4 r;5 .7 l;7 .5 r;8 .4 l', x: 'tally 6 .5 l;glyphs 3 .5 r' },
  { id: 't18', name: '瓦礫の抜け穴', from: 'ruin', to: 'cages', w: .75, h: 1.95, wall: 'crumbleStone', floor: 'pebbleFloor', ceil: 'brokenCeil2',
    pts: [[792, -30], [796, -40], [806, -52], [812, -66], [826, -80], [838, -94], [846, -104], [852, -110]], t: '1 .5 l;3 .5 r;5 .4 l', x: 'web 2 .5 r' },
  { id: 't19', name: '東への近道', from: 'ruin', to: 'east', w: .8, h: 2.0, wall: 'mudStone', floor: 'dirtFloor',
    pts: [[820, 28], [830, 27], [842, 22], [856, 24], [870, 18], [884, 14], [896, 10], [906, 6]], t: '1 .5 r;3 .5 l;5 .5 r;6 .6 l', x: 'paint 4 .5 l' },
  { id: 't20', name: '墓所への階段', from: 'east', to: 'tombs', w: .8, h: 2.0, wall: 'flatStone', floor: 'pebbleFloor', ceil: 'roots2',
    pts: [[966, 30], [968, 40], [964, 52], [970, 66], [966, 80], [972, 94], [976, 106]], t: '1 .5 l;3 .5 r;5 .5 l', x: 'glyphs 4 .5 r' },
  { id: 't21', name: '牢から崩落区へ', from: 'cells', to: 'ruin', w: .78, h: 2.0, wall: 'scratchedWall', floor: 'cellFloor',
    pts: [[686, 128], [694, 124], [704, 116], [714, 104], [726, 96], [738, 88], [748, 80], [756, 76]], t: '1 .5 r;3 .5 l;5 .5 r', x: 'tally 2 .4 l' },
  { id: 't22', name: '水路の古道', from: 'maze', to: 'canal', w: .8, h: 2.05, wall: 'mossBrick', floor: 'mudPuddles', ceil: 'seepCeil',
    pts: [[226, -82], [234, -90], [248, -96], [266, -101], [284, -98], [300, -104], [318, -100], [334, -92], [346, -88], [358, -86]],
    t: '1 .5 r;2 .6 l;4 .4 r;5 .5 l;7 .6 r;8 .4 l', x: 'drip 3 .5 l;paint 6 .5 r' },
  { id: 't23', name: '獄からの坂', from: 'cages', to: 'east', w: .8, h: 2.0, wall: 'roughBlock', floor: 'pebbleFloor',
    pts: [[890, -112], [898, -104], [904, -90], [908, -74], [912, -58], [916, -46], [921, -36]], t: '1 .5 l;3 .5 r;5 .4 l' },
  { id: 't24', name: '木組みの高廊', from: 'timber', to: 'ashlar', w: .8, h: 2.1, wall: 'barkWall', floor: 'dirtyPlanks', ceil: 'logs2',
    pts: [[392, 128], [400, 131], [412, 138], [426, 136], [440, 142], [456, 140], [470, 146], [486, 143], [498, 147], [510, 145]],
    t: '1 .5 l;2 .5 r;4 .4 l;5 .6 r;7 .5 l;8 .4 r', x: 'glyphs 3 .5 r;cloth 6 .5 l' },
];

// ---------------------------------------------------------------- houses, cells, stalls, features, torches
// (filled in district by district)

export const HOUSES = [];
export const CELLS = [];
export const STALLS = [];
export const FEATURES = [];
export const TORCHES = [];
