// 地下 · 潮の地下聖堂: a crypt under the front of the nave where the sea seeps in.
// Building-local metres; reached by a flight down the west aisle of the nave.
import { DECOR as D } from './decor.js';
import { SURFACE as S } from './surfaces.js';
import { CRYPT, CRYPT_STAIR, CRYPT_COLUMNS, FLOORS } from './layout.js';
import { lerp, random } from './terrain.js';
import { lathe, disc, floorQuad, slab, candle, candlestand, crossMark } from './chapels.js';

const LIGHT = 11;
const Y = CRYPT.y, TOP = CRYPT.ceiling;
const rect = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const around = (x, z, w, d) => rect(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
const CHANNEL = rect(-1.25, 1.25, CRYPT.z0, 17.2);
const BRIDGES = [[8.0, 9.8], [12.7, 14.5]];
const SCREEN_Z = 20.75;
const SPRING = Y + 2.32;

const ZONES = [
  { name: '地下 · 潮の回廊', z1: 11.6 },
  { name: '地下 · 石棺の間', z1: SCREEN_Z },
  { name: '地下 · 地下礼拝所', z1: Infinity }
];
export function cryptName(z) { return ZONES.find(zone => z < zone.z1).name; }

// ---------------------------------------------------------------- shell

function shell(m, kit) {
  const { x0, x1, z0, z1 } = CRYPT, s = CRYPT_STAIR, t = .35;
  for (const r of [rect(x0, CHANNEL.x0, z0, z1), rect(CHANNEL.x1, x1, z0, z1), rect(CHANNEL.x0, CHANNEL.x1, CHANNEL.z1, z1)]) {
    kit.deck(m, r, Y, D.cryptFlagstones, .33);
  }
  for (const r of [rect(x0 - t, x0, z0 - t, z1 + t), rect(x1, x1 + t, z0 - t, z1 + t),
    rect(x0, x1, z0 - t, z0), rect(x0, x1, z1, z1 + t)]) slab(m, r, Y - 1.4, TOP, D.rubbleWall, .95);
  // Brick vault under the nave floor, open above the stair.
  for (const r of [rect(x0, x1, z0, s.z0), rect(x0, x1, s.z1, z1), rect(x0, s.x0, s.z0, s.z1), rect(s.x1, x1, s.z0, s.z1)]) {
    floorQuad(m, r.x0, r.x1, r.z0, r.z1, TOP - .012, D.vaultBrick, .9);
  }
}

function arch(m, a, b, mat = D.limestone, r = .085) {
  let last;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const p = [lerp(a[0], b[0], t), SPRING + (TOP - .06 - SPRING) * Math.pow(Math.sin(Math.PI * t), .55), lerp(a[1], b[1], t)];
    if (last) m.rod(last, p, r, r, mat, 6, .95);
    last = p;
  }
}

function columns(m, kit) {
  const xs = CRYPT_COLUMNS.x, zs = CRYPT_COLUMNS.z, s = CRYPT_STAIR;
  for (const x of xs) {
    for (const z of zs) {
      const tidal = z < 11.6;
      m.beveledBox(x, Y + .14, z, .78, .28, .78, .04, D.blackBasalt, .95);
      if (tidal) {
        lathe(m, x, Y + .28, z, [[0, .34], [.3, .33], [.42, .29]], D.mussels, 14, 1);
        lathe(m, x, Y + .7, z, [[0, .29], [.6, .285]], D.barnacleStone, 14, 1);
        lathe(m, x, Y + 1.3, z, [[0, .285], [.5, .28]], D.algaeStone, 14, 1);
        lathe(m, x, Y + 1.8, z, [[0, .28], [.26, .275]], D.limestone, 14, 1);
      } else {
        lathe(m, x, Y + .28, z, [[0, .3], [1.78, .275]], D.limestone, 14, 1);
      }
      m.beveledBox(x, Y + 2.2, z, .64, .34, .64, .05, D.carvedFrieze, 1);
      m.beveledBox(x, Y + 2.35, z, .8, .1, .8, .02, D.blackBasalt, 1);
      kit.solid(around(x, z, .8, .8), Y, Y + 2.4);
      if (Math.abs(x) < 5) {
        // An iron torch on the face toward the channel.
        const dir = -Math.sign(x), tx = x + dir * .6;
        m.rod([x + dir * .27, Y + 1.62, z], [tx, Y + 1.8, z], .022, .02, D.wroughtIron, 6, 1);
        lathe(m, tx, Y + 1.78, z, [[0, .02], [.05, .07], [.13, .095]], D.wroughtIron, 10, 1);
        m.rod([tx, Y + 1.88, z], [tx + .01, Y + 2.16, z], .065, .004, LIGHT, 7, 1.12);
      }
    }
  }
  // Ribs between the columns and the walls; none cross the stair's headroom.
  const xLine = [CRYPT.x0, ...xs, CRYPT.x1], zLine = [CRYPT.z0, ...zs, CRYPT.z1];
  for (const z of zs) {
    for (let i = 0; i < xLine.length - 1; i++) {
      if (i === 0 && z > s.z0 - .5 && z < s.z1 + .5) continue;
      arch(m, [xLine[i], z], [xLine[i + 1], z]);
    }
  }
  for (const x of xs) {
    for (let i = 0; i < zLine.length - 1; i++) arch(m, [x, zLine[i]], [x, zLine[i + 1]]);
  }
}

// ---------------------------------------------------------------- 潮の回廊

function channel(m) {
  const c = CHANNEL, bottom = Y - 1.15;
  slab(m, rect(c.x0, c.x1, c.z0, c.z1), bottom - .2, bottom, D.cisternPlaster, .9);
  for (const [a, b] of [[c.x0, c.x0 + .1], [c.x1 - .1, c.x1]]) slab(m, rect(a, b, c.z0, c.z1), bottom, Y - .33, D.glowAlgae, .8);
  slab(m, rect(c.x0, c.x1, c.z1 - .1, c.z1), bottom, Y - .33, D.cisternPlaster, .9);
  floorQuad(m, c.x0 + .1, c.x1 - .1, c.z0, c.z1 - .1, Y - .5, D.seawater, 1);
  // Basalt kerbs, broken by the bridges.
  let at = c.z0;
  for (const [a, b] of [...BRIDGES, [c.z1, c.z1]]) {
    for (const x of [c.x0 - .11, c.x1 + .11]) {
      if (a > at) m.beveledBox(x, Y + .1, (at + a) / 2, .22, .2, a - at, .03, D.blackBasalt, 1);
    }
    at = b;
  }
  // The sea gate where the tide enters under the north wall.
  slab(m, rect(c.x0 - .15, c.x1 + .15, c.z0, c.z0 + .05), Y - 1.15, Y + 1.25, D.ironGrille, .9);
  let last;
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * i / 12, p = [Math.cos(a) * 1.42, Y + .55 + Math.sin(a) * .9, c.z0 + .09];
    if (last) m.rod(last, p, .07, .07, D.verdigris, 6, 1);
    last = p;
  }
  for (const x of [-1.42, 1.42]) m.rod([x, Y, c.z0 + .09], [x, Y + .56, c.z0 + .09], .07, .07, D.verdigris, 6, 1);
}

function bridges(m, kit) {
  for (const [a, b] of BRIDGES) {
    kit.deck(m, rect(CHANNEL.x0, CHANNEL.x1, a, b), Y, D.cryptFlagstones, .22);
    // Arched spandrels over the water on both faces of the bridge.
    const springing = u => Y - .5 + .24 * Math.sin(Math.PI * u);
    for (let i = 0; i < 8; i++) {
      const u0 = i / 8, u1 = (i + 1) / 8, x0 = lerp(CHANNEL.x0, CHANNEL.x1, u0), x1 = lerp(CHANNEL.x0, CHANNEL.x1, u1);
      for (const z of [a, b]) {
        m.quad([x0, springing(u0), z], [x1, springing(u1), z], [x1, Y - .22, z], [x0, Y - .22, z], D.cryptFlagstones, .85);
      }
    }
    for (const z of [a + .08, b - .08]) {
      kit.block(m, rect(CHANNEL.x0 - .1, CHANNEL.x1 + .1, z - .08, z + .08), Y, Y + .55, D.carvedFrieze, .96);
    }
  }
}

function tidePool(m, kit, x, z, r) {
  disc(m, x, Y + .009, z, r + .45, D.shellSand, 20, 1);
  lathe(m, x, Y, z, [[0, r + .12], [.3, r + .02], [.34, r - .1], [.22, r - .14]], D.barnacleStone, 20, 1);
  disc(m, x, Y + .24, z, r - .1, D.tidePool, 20, 1.05);
  kit.solid(around(x, z, 2 * r + .2, 2 * r + .2), Y, Y + .6);
}

function tidalHall(m, kit) {
  for (const [a, b] of [[-6.6, CHANNEL.x0 - .22], [CHANNEL.x1 + .22, 6.6]]) {
    floorQuad(m, a, b, CRYPT.z0, 11.6, Y + .006, D.wetStone, .95);
  }
  floorQuad(m, 4.3, 6.8, 7.95, 10.45, Y + .01, D.octopusMosaic, 1.02, [[1, 0], [0, 0], [0, 1], [1, 1]]);
  tidePool(m, kit, -6.1, 5.4, 1.0);
  tidePool(m, kit, 6.0, 5.2, .9);
  for (const [x, z, r] of [[-2.15, 4.2, .55], [2.2, 4.6, .48], [-2.0, 10.6, .4]]) {
    lathe(m, x, Y, z, [[0, r], [.12, r * .85], [.22, r * .5], [.28, 0]], D.kelp, 12, 1);
    kit.solid(around(x, z, r * 2, r * 2), Y, Y + .3);
  }
  // Glowing algae creeping up the walls nearest the sea gate.
  const rng = random(311);
  for (const side of [-1, 1]) {
    const x = side < 0 ? CRYPT.x0 + .02 : CRYPT.x1 - .02;
    for (let z = CRYPT.z0 + .2; z < 10.8; z += 1.1) {
      if (side < 0 && z > CRYPT_STAIR.z0 - .4) break;
      const h = .35 + rng() * .8;
      m.quad([x, Y, z], [x, Y, z + 1.0], [x, Y + h * (.7 + rng() * .4), z + 1.0], [x, Y + h, z], D.glowAlgae, .7 + rng() * .3);
    }
  }
  for (const x of [-3.0, 3.0]) {
    m.quad([x - 1.2, Y, CRYPT.z0 + .02], [x + 1.2, Y, CRYPT.z0 + .02], [x + 1.2, Y + .5, CRYPT.z0 + .02], [x - 1.2, Y + .9, CRYPT.z0 + .02],
      D.glowAlgae, .9);
  }
}

// ---------------------------------------------------------------- 石棺の間

function sarcophagus(m, kit, x, z, alongX, chest = D.sarcophagusRelief, lid = D.effigyMarble) {
  const L = 2.2, W = .95, H = .8;
  const w = alongX ? L : W, d = alongX ? W : L;
  m.beveledBox(x, Y + .09, z, w + .14, .18, d + .14, .03, D.blackBasalt, .95);
  m.beveledBox(x, Y + .18 + H / 2, z, w, H, d, .03, chest, 1);
  const top = Y + .18 + H;
  m.beveledBox(x, top + .06, z, w + .08, .12, d + .08, .03, lid, 1.02);
  kit.solid(around(x, z, w + .14, d + .14), Y, Y + 1.4);
  // Recumbent effigy: u runs along the tomb (head at -u), v across.
  const at = (u, v, h) => alongX ? [x + u, top + .12 + h, z + v] : [x + v, top + .12 + h, z + u];
  const box = (u, v, h, lu, lv, lh, mat = lid) => {
    const [px, py, pz] = at(u, v, h);
    m.beveledBox(px, py, pz, alongX ? lu : lv, lh, alongX ? lv : lu, Math.min(lu, lv, lh) * .3, mat, 1.02);
  };
  box(-.82, 0, .04, .3, .5, .08);
  lathe(m, ...at(-.78, 0, .08), [[0, 0], [.04, .1], [.14, .13], [.24, .1], [.28, 0]], lid, 12, 1.04);
  box(.05, 0, .1, 1.35, .46, .2);
  box(-.25, 0, .27, .12, .1, .22);
  box(.8, 0, .07, .16, .34, .14);
  // Two floor candles in pools of wax at the head end.
  for (const v of [-.5, .5]) {
    const [cx, , cz] = at(-1.32, v, 0);
    lathe(m, cx, Y, cz, [[0, .15], [.05, .12], [.09, .05]], D.waxDrips, 10, 1);
    candle(m, cx, Y + .07, cz, .26, .03);
  }
}

function plaque(m, x, z, alongZ) {
  const y = Y + 1.95;
  if (alongZ) {
    slab(m, rect(x - .03, x + .03, z - .55, z + .55), y - .38, y + .38, D.bronzePlaque, 1.02);
    slab(m, rect(x - .05, x + .05, z - .6, z + .6), y - .43, y - .38, D.verdigris, 1);
  } else {
    slab(m, rect(x - .55, x + .55, z - .03, z + .03), y - .38, y + .38, D.bronzePlaque, 1.02);
    slab(m, rect(x - .6, x + .6, z - .05, z + .05), y - .43, y - .38, D.verdigris, 1);
  }
}

function tombHall(m, kit) {
  for (const z of [13.6, 18.0]) {
    sarcophagus(m, kit, -5.5, z, true);
    sarcophagus(m, kit, 5.5, z, true);
    sarcophagus(m, kit, 9.75, z, false);
    plaque(m, CRYPT.x1 - .04, z, true);
  }
  sarcophagus(m, kit, 0, 18.95, false, D.porphyry, D.alabaster);
  plaque(m, CRYPT.x0 + .04, 18.6, true);
  // Iron screen before the chapel, with a gate in the middle.
  for (const [a, b] of [[CRYPT.x0, -2.0], [2.0, CRYPT.x1]]) {
    kit.block(m, rect(a, b, SCREEN_Z - .03, SCREEN_Z + .03), Y, Y + 2.55, D.ironGrille, 1);
    m.rod([a, Y + 2.6, SCREEN_Z], [b, Y + 2.6, SCREEN_Z], .05, .05, D.verdigris, 6, 1);
    for (let x = a + .55; x < b; x += .55) {
      m.rod([x, Y + 2.6, SCREEN_Z], [x, Y + 2.86, SCREEN_Z], .025, .006, D.verdigris, 5, 1);
    }
  }
  let last;
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * i / 12, p = [Math.cos(a) * 2.0, Y + 2.6 + Math.sin(a) * .6, SCREEN_Z];
    if (last) m.rod(last, p, .055, .055, D.verdigris, 6, 1);
    last = p;
  }
  for (const x of [-2.0, 2.0]) m.rod([x, Y, SCREEN_Z], [x, Y + 2.62, SCREEN_Z], .07, .06, D.verdigris, 8, 1);
  crossMark(m, 0, Y + 3.2, SCREEN_Z, .5, D.verdigris);
}

// ---------------------------------------------------------------- 地下礼拝所

function wallPanels(m) {
  const { x0, x1, z1 } = CRYPT;
  for (const [x, dx] of [[x0, 1], [x1, -1]]) {
    const r = (off, depth) => rect(Math.min(x + dx * off, x + dx * (off + depth)), Math.max(x + dx * off, x + dx * (off + depth)), SCREEN_Z + .05, z1);
    slab(m, r(0, .03), Y, TOP, D.ochrePlaster, .98);
    slab(m, r(.03, .02), Y + 3.05, TOP, D.sootPlaster, .95);
    slab(m, r(.03, .03), Y, Y + 1.15, D.azulejo, 1);
  }
  slab(m, rect(x0, x1, z1 - .03, z1), Y, TOP, D.ochrePlaster, .98);
  slab(m, rect(x0, x1, z1 - .05, z1 - .03), Y + 3.05, TOP, D.sootPlaster, .95);
  slab(m, rect(x0, x1, z1 - .06, z1 - .03), Y, Y + 1.15, D.azulejo, 1);
  // Fresco of two angels bearing a ship above the altar (viewed looking +z, so u runs toward -x).
  const zf = z1 - .065;
  m.quad([1.7, Y + 1.25, zf], [-1.7, Y + 1.25, zf], [-1.7, Y + 4.0, zf], [1.7, Y + 4.0, zf], D.angelFresco, 1.05, [0, 0, -1],
    [[0, 0], [1, 0], [1, 1], [0, 1]]);
  for (const [a, b] of [[[1.78, Y + 1.18], [-1.78, Y + 1.18]], [[1.78, Y + 4.06], [-1.78, Y + 4.06]], [[1.78, Y + 1.18], [1.78, Y + 4.06]], [[-1.78, Y + 1.18], [-1.78, Y + 4.06]]]) {
    m.rod([a[0], a[1], zf - .03], [b[0], b[1], zf - .03], .045, .045, D.gildedGesso, 6, 1);
  }
}

function bench(m, kit, x0, x1, z) {
  const y = Y + .45;
  m.beveledBox((x0 + x1) / 2, y, z, x1 - x0, .07, .4, .015, D.oliveWood, 1);
  m.beveledBox((x0 + x1) / 2, Y + .78, z - .22, x1 - x0, .3, .05, .015, D.cedar, .95);
  for (const x of [x0 + .15, (x0 + x1) / 2, x1 - .15]) {
    m.beveledBox(x, Y + .22, z, .06, .44, .36, .01, D.cedar, .9);
    m.rod([x, Y + .45, z - .2], [x, Y + .93, z - .22], .025, .025, D.cedar, 5, .9);
  }
  kit.solid(rect(x0, x1, z - .3, z + .22), Y, Y + 1.0);
}

function chapel(m, kit) {
  wallPanels(m);
  floorQuad(m, -1.0, 1.0, 21.1, 25.8, Y + .008, D.kilim, 1);
  for (const z of [22.4, 23.8]) {
    bench(m, kit, -5.4, -1.15, z);
    bench(m, kit, 1.15, 5.4, z);
  }
  // Altar of alabaster and porphyry under embroidered linen.
  const az = 26.75;
  kit.block(m, around(0, az, 2.3, .9), Y, Y + 1.0, D.alabaster, 1);
  m.beveledBox(0, Y + 1.04, az, 2.5, .08, 1.05, .02, D.porphyry, 1.02);
  m.box(0, Y + 1.09, az, 2.56, .02, 1.08, D.embroideredLinen, 1.05);
  m.quad([1.28, Y + .55, az - .55], [-1.28, Y + .55, az - .55], [-1.28, Y + 1.09, az - .55], [1.28, Y + 1.09, az - .55],
    D.embroideredLinen, 1.05, [0, 0, -1]);
  crossMark(m, 0, Y + 1.1, az + .3, .62, D.hammeredGold);
  for (const x of [-.9, .9]) {
    lathe(m, x, Y + 1.1, az + .1, [[0, .07], [.03, .05], [.2, .025], [.24, .05]], S.brass, 10, 1.05);
    candle(m, x, Y + 1.34, az + .1, .28, .028);
  }
  for (const x of [-.45, .45]) lathe(m, x, Y + 1.1, az - .25, [[0, .045], [.09, .05], [.1, .045]], D.votiveGlass, 10, 1);
  for (const x of [-1.75, 1.75]) {
    candlestand(m, x, Y, az - .2, 1.3);
    kit.solid(around(x, az - .2, .35, .35), Y, Y + 1.6);
  }
  // Gold icon of the sailors' saint on a cedar easel, with a rack of votive glasses.
  const ix = -3.6, iz = 25.45;
  for (const s of [-1, 1]) m.rod([ix + s * .45, Y, iz + .25], [ix + s * .4, Y + 2.25, iz], .03, .03, D.cedar, 5, .95);
  m.rod([ix, Y + 1.6, iz + .02], [ix, Y, iz + .55], .03, .03, D.cedar, 5, .9);
  slab(m, rect(ix - .55, ix + .55, iz, iz + .05), Y + .82, Y + 2.25, D.cedar, .9);
  m.quad([ix + .5, Y + .87, iz - .005], [ix - .5, Y + .87, iz - .005], [ix - .5, Y + 2.2, iz - .005], [ix + .5, Y + 2.2, iz - .005],
    D.goldIcon, 1.08, [0, 0, -1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  kit.block(m, rect(ix - .7, ix + .7, 24.55, 24.95), Y, Y + .85, D.cedar, .9);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      lathe(m, ix - .5 + i * .33, Y + .85, 24.66 + j * .18, [[0, .05], [.1, .055], [.11, .05]], D.votiveGlass, 10, 1);
    }
  }
  kit.solid(rect(ix - .6, ix + .6, iz - .1, iz + .6), Y, Y + 2.3);
  // Ex-votos of pressed tin on the east wall.
  slab(m, rect(CRYPT.x1 - .1, CRYPT.x1 - .04, 22.6, 25.4), Y + 1.15, Y + 2.65, D.cedar, .92);
  slab(m, rect(CRYPT.x1 - .12, CRYPT.x1 - .1, 22.75, 25.25), Y + 1.25, Y + 2.55, D.pressedTin, 1.05);
  // Hanging oil lamps.
  for (const x of [-2.6, 2.6]) {
    m.rod([x, Y + 2.62, 24.6], [x, TOP - .02, 24.6], .012, .012, S.chain, 5, .95);
    lathe(m, x, Y + 2.38, 24.6, [[0, 0], [.06, .16], [.14, .2], [.16, .18]], D.verdigris, 12, 1);
    lathe(m, x, Y + 2.46, 24.6, [[0, .09], [.08, .1]], D.votiveGlass, 10, 1);
  }
}

// ---------------------------------------------------------------- stair from the west aisle

function stair(m, kit) {
  const s = CRYPT_STAIR, y = FLOORS[0];
  kit.flight(m, s, Y, y, -1);
  // Masonry fills the space under the flight.
  for (const x of [s.x0, s.x1]) m.tri([x, Y, s.z0], [x, Y, s.z1], [x, y - .32, s.z0], D.rubbleWall, .9);
  slab(m, rect(s.x0, s.x1, s.z0 - .05, s.z0), Y, y - .3, D.rubbleWall, .9);
  kit.solid(rect(s.x0, s.x1, s.z0, s.z1 - .6), Y, Y + .4);
  // Guard rails around the opening in the nave floor.
  kit.rail(m, [s.x1, s.z0 + .05], [s.x1, s.z1], y);
  kit.rail(m, [s.x0, s.z0 + .05], [s.x0, s.z1], y);
  kit.rail(m, [s.x0, s.z1], [s.x1, s.z1], y);
}

export function crypt(m, kit) {
  shell(m, kit);
  columns(m, kit);
  channel(m);
  bridges(m, kit);
  tidalHall(m, kit);
  tombHall(m, kit);
  chapel(m, kit);
  stair(m, kit);
}
