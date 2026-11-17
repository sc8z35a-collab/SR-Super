// 地下2階〜地下7階: five levels below the crypt and the underground cathedral at the bottom.
// Building-local metres; every level lies inside the nave's footprint. Flights E and W alternate
// down the levels along the side walls; the processional stair G descends into the cathedral.
import { UNDER as U } from './under.js';
import { DECOR as D } from './decor.js';
import { PROPS } from './props.js';
import { SURFACE as S } from './surfaces.js';
import { DEPTHS, DEPTH_FLIGHTS as F, CRYPT } from './layout.js';
import { TAU, lerp, random } from './terrain.js';
import { lathe, disc, floorQuad, slab, candle, candlestand, crossMark, picture } from './chapels.js';
import { LAKE_BREACH } from './citydata.js';

const LIGHT = 11;
const X0 = -11.3, X1 = 11.3;
const rect = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const around = (x, z, w, d) => rect(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
const [CISTERN, CATACOMBS, MINE, CRYSTAL, LAKE, CATHEDRAL] = DEPTHS;
const CRYPT_LEVEL = { y: CRYPT.y };

// The parts of r not covered by any hole, as rectangles.
export function subtract(r, holes) {
  const xs = [...new Set([r.x0, r.x1, ...holes.flatMap(h => [h.x0, h.x1])])]
    .filter(x => x >= r.x0 && x <= r.x1).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    if (b - a < .01) continue;
    const mid = (a + b) / 2;
    const cuts = holes.filter(h => h.x0 <= mid && h.x1 >= mid)
      .map(h => [Math.max(h.z0, r.z0), Math.min(h.z1, r.z1)]).filter(([p, q]) => q > p).sort((p, q) => p[0] - q[0]);
    let z = r.z0;
    for (const [p, q] of cuts) {
      if (p > z + .01) out.push(rect(a, b, z, p));
      z = Math.max(z, q);
    }
    if (r.z1 > z + .01) out.push(rect(a, b, z, r.z1));
  }
  return out;
}

// Floor openings above each flight (the same rectangle is the hole in the ceiling below).
const OPEN = {
  E: rect(F.E.x0, X1, F.E.z0, F.E.z1),
  W: rect(X0, F.W.x1, F.W.z0, F.W.z1),
  G: rect(X0, F.G.x1, F.G.z0, F.G.z0 + 6)
};
export const CRYPT_OPENING = OPEN.E;

// Guard rails round an opening: along its inner side and across its far (low) end.
export function openingRails(kit, m, y, kind) {
  if (kind === 'E') {
    kit.rail(m, [F.E.x0, F.E.z0], [F.E.x0, F.E.z1], y);
    kit.rail(m, [F.E.x0, F.E.z0], [X1, F.E.z0], y);
  } else if (kind === 'W') {
    kit.rail(m, [F.W.x1, F.W.z0], [F.W.x1, F.W.z1], y);
    kit.rail(m, [X0, F.W.z1], [F.W.x1, F.W.z1], y);
  } else {
    kit.rail(m, [F.G.x1, F.G.z0], [F.G.x1, F.G.z0 + 6], y);
    kit.rail(m, [X0, F.G.z0 + 6], [F.G.x1, F.G.z0 + 6], y);
  }
}

// A flight from `upper` down to `lower`, its masonry wedge and the solid beneath it.
function flightBetween(m, kit, upper, lower, f, up, wall) {
  kit.flight(m, f, lower.y, upper.y, up, U.wornSteps);
  const inner = f.x0 > 0 ? f.x0 : f.x1;
  const [zl, zh] = up > 0 ? [f.z0, f.z1] : [f.z1, f.z0];
  m.tri([inner, lower.y, zl], [inner, lower.y, zh], [inner, upper.y - .3, zh], wall, .9);
  slab(m, rect(f.x0, f.x1, Math.min(zh, zh + up * .06), Math.max(zh, zh + up * .06)), lower.y, upper.y - .3, wall, .88);
  kit.solid(up > 0 ? rect(f.x0, f.x1, f.z0 + .6, f.z1) : rect(f.x0, f.x1, f.z0, f.z1 - .6), lower.y, lower.y + .4);
  // An iron grate landing at the foot of the flight.
  const foot = up > 0 ? rect(f.x0, f.x1, f.z0 - 1.4, f.z0) : rect(f.x0, f.x1, f.z1, f.z1 + 1.4);
  floorQuad(m, foot.x0, foot.x1, foot.z0, foot.z1, lower.y + .008, U.ironGrate, 1);
}

// Floor, walls and ceiling of a level. Walls are blocks outside the room, so they also stop walkers.
// A ceiling rectangle facing down; tiled layers take world-projected UVs from the shader.
function ceilingQuad(m, r, y, mat, shade = .9, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
  m.quad([r.x0, y, r.z0], [r.x1, y, r.z0], [r.x1, y, r.z1], [r.x0, y, r.z1], mat, shade, [0, -1, 0], uv);
}

function shell(m, kit, L, { floor, wall, ceiling, floorHoles = [], ceilingHoles = [], walls = {}, breachE = null }) {
  const room = rect(X0, X1, L.z0, L.z1);
  for (const r of subtract(room, floorHoles)) kit.deck(m, r, L.y, floor, .33);
  const t = .5, top = L.ceiling + .05;
  kit.block(m, rect(X0 - t, X0, L.z0 - t, L.z1 + t), L.y - .4, top, walls.W ?? wall, .95);
  if (breachE) {
    // The east wall has fallen in: a ragged gap into the ancient city, with rock bridging over it.
    const [a, b] = breachE;
    kit.block(m, rect(X1, X1 + t, L.z0 - t, a), L.y - .4, top, walls.E ?? wall, .95);
    kit.block(m, rect(X1, X1 + t, b, L.z1 + t), L.y - .4, top, walls.E ?? wall, .95);
    slab(m, rect(X1, X1 + t, a, b), L.y + 2.0, top, U.wetBlackRock, .9);
  } else kit.block(m, rect(X1, X1 + t, L.z0 - t, L.z1 + t), L.y - .4, top, walls.E ?? wall, .95);
  kit.block(m, rect(X0, X1, L.z0 - t, L.z0), L.y - .4, top, walls.N ?? wall, .95);
  kit.block(m, rect(X0, X1, L.z1, L.z1 + t), L.y - .4, top, walls.S ?? wall, .95);
  for (const r of subtract(room, ceilingHoles)) ceilingQuad(m, r, L.ceiling, ceiling);
}

// A picture on one of the level's walls: side W/E at z = pos, side N/S at x = pos.
function wallPicture(m, L, side, pos, y0, y1, w, mat) {
  if (side === 'W') picture(m, X0 + .012, pos, y0, y1, w, [1, 0], mat);
  else if (side === 'E') picture(m, X1 - .012, pos, y0, y1, w, [-1, 0], mat);
  else if (side === 'N') picture(m, pos, L.z0 + .012, y0, y1, w, [0, 1], mat);
  else picture(m, pos, L.z1 - .012, y0, y1, w, [0, -1], mat);
}

// A band of a texture laid over one wall's inner face.
function wallBand(m, L, side, a, b, y0, y1, mat) {
  const d = .02;
  if (side === 'W') slab(m, rect(X0, X0 + d, a, b), y0, y1, mat, .95);
  else if (side === 'E') slab(m, rect(X1 - d, X1, a, b), y0, y1, mat, .95);
  else if (side === 'N') slab(m, rect(a, b, L.z0, L.z0 + d), y0, y1, mat, .95);
  else slab(m, rect(a, b, L.z1 - d, L.z1), y0, y1, mat, .95);
}

// A vertical strip from a to b (plan points) repeating a picture every `tile` metres.
function strip(m, a, b, y0, y1, mat, tile) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / tile));
  m.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], mat, 1, undefined,
    [[0, 1], [n, 1], [n, 0], [0, 0]]);
}

// A turned shape whose surface shows one window of a picture (u0..u1 around, vTop..vBottom up the side).
function latheWindow(m, x, y, z, profile, mat, segs, [u0, u1, vTop, vBottom]) {
  for (let j = 0; j < profile.length - 1; j++) {
    const [h0, r0] = profile[j], [h1, r1] = profile[j + 1];
    const f0 = j / (profile.length - 1), f1 = (j + 1) / (profile.length - 1);
    const v0 = 1 - lerp(vBottom, vTop, f0), v1 = 1 - lerp(vBottom, vTop, f1);
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU;
      const p = (a, h, r) => [x + Math.cos(a) * r, y + h, z + Math.sin(a) * r];
      const ua = lerp(u0, u1, i / segs), ub = lerp(u0, u1, (i + 1) / segs);
      m.quad(p(a1, h0, r0), p(a0, h0, r0), p(a0, h1, r1), p(a1, h1, r1), mat, 1, undefined, [[ub, v0], [ua, v0], [ua, v1], [ub, v1]]);
    }
  }
}

function flame(m, x, y, z, s = 1) {
  m.rod([x, y, z], [x + .01, y + .22 * s, z], .07 * s, .004, LIGHT, 7, 1.12);
}

// A torch on a wall bracket near (x, z), on the nearer side wall.
function wallTorch(m, L, x, h, z) {
  const side = x < 0 ? 'W' : 'E', face = x < 0 ? X0 + .3 : X1 - .3;
  wallPicture(m, L, side, z, h - .75, h + .15, .55, U.torchBracket);
  flame(m, face, h, z, 1.1);
}

// A hanging lantern on a chain from the ceiling.
function lantern(m, L, x, h, z, body = PROPS.castIron) {
  m.rod([x, h + .32, z], [x, L.ceiling, z], .012, .012, S.chain, 4, .95);
  lathe(m, x, h - .25, z, [[0, .05], [.06, .14], [.12, .14], [.4, .14], [.46, .1], [.56, .02]], body, 8, 1);
  lathe(m, x, h - .14, z, [[0, .1], [.28, .1]], D.lanternGlass, 8, 1);
}

// Fixtures at the level's lamps (the shader lights from the same points). `glow` lists lamps that
// stand for something already glowing (a waterfall, a hot spring) and get no fixture.
function lamps(m, L, style = 'mixed', glow = []) {
  L.lamps.forEach(([x, h, z], i) => {
    if (glow.includes(i)) return;
    if (Math.abs(x) > 10.5) wallTorch(m, L, x, h, z);
    else if (style === 'candles') candlestand(m, x, L.y, z, h - L.y - .35);
    else lantern(m, L, x, h, z);
  });
}

function column(m, kit, x, z, y, h, r, mat, base = U.caveMarble, cap = U.caveMarble) {
  m.beveledBox(x, y + .15, z, r * 2.6, .3, r * 2.6, .04, base, .95);
  m.rod([x, y + .3, z], [x, y + h - .35, z], r, r * .96, mat, 12, 1);
  m.beveledBox(x, y + h - .18, z, r * 2.6, .36, r * 2.6, .05, cap, 1);
  kit.solid(around(x, z, r * 2.6, r * 2.6), y, y + h);
}

// ---------------------------------------------------------------- 地下2階 · 大貯水槽

function cistern(m, kit) {
  const L = CISTERN, y = L.y;
  shell(m, kit, L, { floor: U.floodedFloor, wall: U.waterlineWall, ceiling: U.wetCeiling, floorHoles: [OPEN.W], ceilingHoles: [OPEN.E] });
  flightBetween(m, kit, CRYPT_LEVEL, L, F.E, 1, U.waterlineWall);
  openingRails(kit, m, y, 'W');
  // A forest of mossy columns rising out of the water.
  for (const x of [-6.6, -2.2, 2.2, 6.6]) {
    for (const z of [-16, -11, -6, -1, 4, 9, 14]) {
      if (x === -2.2 && z === 9 || x === 2.2 && z === 14) continue;
      column(m, kit, x, z, y, L.ceiling - y, .32, U.mossyColumn, U.wetCeiling, U.dripStone);
    }
  }
  // Plank walkways over the flooded floor.
  floorQuad(m, -.6, .6, L.z0, L.z1, y + .03, U.walkway, 1);
  floorQuad(m, X0, X1, -1.6, -.4, y + .035, U.walkway, 1);
  // Limestone drips down the upper walls, drains, pipes and the old hand pump.
  for (const side of ['W', 'E']) wallBand(m, L, side, L.z0, side === 'E' ? F.E.z0 : L.z1, L.ceiling - 1.4, L.ceiling, U.dripStone);
  wallBand(m, L, 'N', X0, X1, L.ceiling - 1.4, L.ceiling, U.dripStone);
  for (const [side, z] of [['W', -14], ['W', 7], ['E', -10], ['E', -1]]) wallPicture(m, L, side, z, y + .05, y + .75, 1.1, U.drainGrate);
  wallPicture(m, L, 'W', 13, y + .4, y + 2.0, 1.3, U.handPump);
  slab(m, rect(X0, X0 + .55, 12.3, 13.7), y, y + .4, U.mossyColumn, .9);
  kit.solid(rect(X0, X0 + .6, 12.2, 13.8), y, y + 1);
  for (const z of [L.z0 + .3, 3.5]) m.rod([X1 - .25, L.ceiling - .1, z], [X1 - .25, y + .2, z], .1, .1, U.rustyPipe, 10, 1);
  m.rod([X1 - .25, L.ceiling - .7, L.z0 + .3], [X1 - .25, L.ceiling - .7, 3.5], .12, .12, U.rustyPipe, 10, 1);
  m.rod([X0 + .25, L.ceiling - .7, L.z0 + .3], [X0 + .25, L.ceiling - .7, F.W.z0 - .5], .12, .12, U.rustyPipe, 10, 1);
  // A wishing pool of coins in the middle of the hall.
  const px = 0, pz = 11.5;
  lathe(m, px, y, pz, [[0, 1.25], [.5, 1.2], [.58, 1.3], [.62, 1.3], [.62, 1.12], [.2, 1.08]], U.mossyColumn, 20, 1);
  disc(m, px, y + .42, pz, 1.12, U.coinPool, 20, 1);
  kit.solid(around(px, pz, 2.6, 2.6), y, y + .7);
  wallPicture(m, L, 'S', -4, y, y + 2.4, 1.4, U.studdedDoor);
  lamps(m, L);
}

// ---------------------------------------------------------------- 地下3階 · カタコンベ

function catacombs(m, kit) {
  const L = CATACOMBS, y = L.y;
  shell(m, kit, L, { floor: U.earthFloor, wall: U.tuff, ceiling: U.crumblingCeiling, floorHoles: [OPEN.E], ceilingHoles: [OPEN.W] });
  flightBetween(m, kit, CISTERN, L, F.W, -1, U.tuff);
  openingRails(kit, m, y, 'E');
  // Two long galleries of burial niches with doorways, opening on an ossuary chapel to the south.
  const h = L.ceiling - y;
  for (const sx of [-1, 1]) {
    const x = sx * 4;
    for (const [a, b] of [[-17, -6], [-4, 6], [8, 15]]) {
      kit.block(m, rect(x - .3, x + .3, a, b), y, L.ceiling, U.tuff, .95);
      for (const face of [-1, 1]) {
        const fx = x + face * .31, n = Math.round((b - a) / 1.7);
        for (let i = 0; i < n; i++) {
          const z0 = lerp(a, b, i / n), z1 = lerp(a, b, (i + 1) / n), mid = (z0 + z1) / 2;
          const skulls = (i + (face > 0 ? 1 : 0)) % 3 === 2;
          picture(m, fx, mid, y + .15, y + 2.75, z1 - z0, [face, 0], skulls ? U.skullWall : U.loculi);
        }
      }
      for (const z of [a, b]) picture(m, x, z + (z === a ? -.31 : .31), y + .2, y + 2.6, .6, [0, z === a ? -1 : 1], U.boneWall);
    }
  }
  // Ossuary chapel: a wall of skulls, bone panels and a fresco above a stone altar.
  for (let i = 0; i < 6; i++) wallPicture(m, L, 'S', -5.5 + i * 2.2, y, y + 2.2, 2.2, U.skullWall);
  wallPicture(m, L, 'S', -4.4, y + 2.25, y + 4.3, 2.0, U.boneWall);
  wallPicture(m, L, 'S', 4.4, y + 2.25, y + 4.3, 2.0, U.boneWall);
  wallPicture(m, L, 'S', 0, y + 2.25, y + 4.35, 2.4, U.redFresco);
  kit.block(m, around(0, 17.6, 2.0, .8), y, y + .95, U.tuff, .95);
  floorQuad(m, -1, 1, 17.2, 18.0, y + .955, U.boneWall, 1);
  crossMark(m, 0, y + .95, 17.9, .5, D.verdigris);
  // Frescoes and gravestones on the outer walls, coffins along the galleries.
  for (const [side, z] of [['W', 8], ['W', 14], ['E', -14], ['E', -6]]) wallPicture(m, L, side, z, y + .9, y + 3.0, 2.0, U.redFresco);
  for (const [side, z] of [['W', -12], ['W', -15], ['E', -10], ['E', 2]]) wallPicture(m, L, side, z, y, y + 1.6, 1.1, U.catacombStone);
  for (const [x, z] of [[7.6, -15.5], [7.6, -8.5], [7.6, -1.5], [-6.6, 7.5], [-6.6, 11.5], [-6.6, -15.5]]) {
    m.box(x, y + .25, z, .75, .5, 1.9, D.bandedOak, .8);
    floorQuad(m, x - .4, x + .4, z - 1.0, z + 1.0, y + .505, U.coffinLid, 1, [[1, 0], [1, 1], [0, 1], [0, 0]]);
    kit.solid(around(x, z, .8, 2.0), y, y + .6);
  }
  wallPicture(m, L, 'N', 0, y, y + 2.5, 1.5, U.stoneDoor);
  lamps(m, L, 'candles');
}

// ---------------------------------------------------------------- 地下4階 · 坑道

function mineCart(m, kit, x, z, y) {
  for (const dz of [-.5, .5]) for (const dx of [-.42, .42]) m.rod([x + dx - .05, y + .18, z + dz], [x + dx + .05, y + .18, z + dz], .17, .17, PROPS.castIron, 10, .9, 0, true);
  m.box(x, y + .7, z, .95, .75, 1.5, U.rustPlate, 1);
  lathe(m, x, y + 1.0, z, [[0, .4], [.2, .3], [.35, .05]], U.oreRock, 10, 1);
  kit.solid(around(x, z, 1.0, 1.6), y, y + 1.1);
}

function mine(m, kit) {
  const L = MINE, y = L.y;
  shell(m, kit, L, { floor: U.crushedRock, wall: U.oreRock, ceiling: U.sootCeiling, floorHoles: [OPEN.W], ceilingHoles: [OPEN.E],
    walls: { N: U.coalSeam, S: U.coalSeam } });
  flightBetween(m, kit, CATACOMBS, L, F.E, 1, U.oreRock);
  openingRails(kit, m, y, 'W');
  // Seams of coal and iron ore along the walls, red sediment on the far wall.
  wallBand(m, L, 'W', -19, -9.5, y + .2, y + 1.6, U.coalSeam);
  wallBand(m, L, 'E', -19, 3.5, y + .3, y + 1.4, U.ironOre);
  wallBand(m, L, 'S', X0, X1, y + 1.6, y + 2.6, U.sediment);
  // The main drift: timber sets every 3.5 m over a rail track.
  const top = L.ceiling - .2;
  for (let z = -18; z <= 16; z += 3.5) {
    for (const x of [-1.9, 1.9]) {
      m.beveledBox(x, (y + top) / 2, z, .24, top - y, .24, .03, U.walkway, .95);
      kit.solid(around(x, z, .3, .3), y, top);
    }
    m.beveledBox(0, top - .12, z, 4.1, .24, .26, .03, U.walkway, .95);
    for (const s of [-1, 1]) m.rod([s * 1.9, top - .9, z], [s * 1.3, top - .24, z], .05, .05, U.walkway, 4, .9);
  }
  floorQuad(m, -.6, .6, L.z0, L.z1, y + .02, U.railTrack, 1, [[0, 32], [1, 32], [1, 0], [0, 0]]);
  mineCart(m, kit, 0, -10, y);
  mineCart(m, kit, 0, 8.5, y);
  // Rock pillars left standing in the stopes.
  for (const [x, z, w] of [[6, -14, 2.2], [-6, -6, 2.4], [6, 2, 1.8], [-6.2, 10, 2.0]]) {
    kit.block(m, around(x, z, w, w), y, L.ceiling, z % 4 === 0 ? U.coalSeam : U.oreRock, .9);
  }
  // A lift cage hanging in a shaft, the pulley above it, a ladder and a sealed spiral stair.
  const cx = 6.5, cz = 12.0;
  for (const [out, px, pz] of [[[1, 0], cx + .6, cz], [[-1, 0], cx - .6, cz], [[0, 1], cx, cz + .6], [[0, -1], cx, cz - .6]]) {
    picture(m, px, pz, y + .1, y + 2.4, 1.2, out, U.liftCage);
  }
  for (const dx of [-.4, .4]) m.rod([cx + dx, y + 2.4, cz], [cx + dx, L.ceiling, cz], .02, .02, S.chain, 4, 1);
  kit.solid(around(cx, cz, 1.3, 1.3), y, y + 2.5);
  wallPicture(m, L, 'E', -6.5, L.ceiling - 2.2, L.ceiling - .2, 1.6, U.pulley);
  wallPicture(m, L, 'W', 6.5, y, L.ceiling - .3, 1.0, U.ironLadder);
  floorQuad(m, -7.6, -4.6, 14.3, 17.3, y + .02, U.spiralStair, 1);
  for (const [a, b] of [[[-7.6, 14.3], [-4.6, 14.3]], [[-4.6, 14.3], [-4.6, 17.3]], [[-7.6, 14.3], [-7.6, 17.3]]]) {
    for (const f of [0, .02]) strip(m, [a[0] + f, a[1] + f], [b[0] + f, b[1] + f], y, y + .95, U.ropeRail, 1.5);
  }
  kit.solid(rect(-7.7, -4.5, 14.2, 17.4), y, y + 1);
  // Side drifts blocked off behind timber sets.
  for (const [side, z] of [['W', -16], ['W', -2], ['E', -16], ['E', 0]]) wallPicture(m, L, side, z, y, y + 3.2, 3.0, U.timberFrame);
  wallPicture(m, L, 'S', -2.5, y, y + 3.2, 3.0, U.timberFrame);
  wallPicture(m, L, 'N', 0, y, y + 2.5, 1.5, U.studdedDoor);
  lamps(m, L);
}

// ---------------------------------------------------------------- 地下5階 · 水晶洞窟

function crystalCluster(m, kit, x, z, y, scale, mats, seed) {
  const rng = random(seed);
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU, d = rng() * .7 * scale, h = (.5 + rng() * 1.4) * scale, r = (.1 + rng() * .12) * scale;
    const tilt = .35 * (rng() - .5);
    const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
    const tip = [bx + Math.cos(a) * h * tilt, y + h, bz + Math.sin(a) * h * tilt];
    const mat = mats[i % mats.length];
    m.rod([bx, y - .05, bz], [tip[0], y + h * .82, tip[2]], r, r * .9, mat, 6, 1, rng());
    m.rod([tip[0], y + h * .82, tip[2]], tip, r * .9, .005, mat, 6, 1.05, rng());
  }
  kit.solid(around(x, z, 1.8 * scale, 1.8 * scale), y, y + 1.6 * scale);
}

function crystalCave(m, kit) {
  const L = CRYSTAL, y = L.y;
  shell(m, kit, L, { floor: U.crystalFloor, wall: U.deepGranite, ceiling: U.volcanicGlass, floorHoles: [OPEN.E], ceilingHoles: [OPEN.W],
    walls: { W: U.amethyst, E: U.quartzCluster, N: U.fluorite, S: U.deepGranite } });
  flightBetween(m, kit, MINE, L, F.W, -1, U.deepGranite);
  openingRails(kit, m, y, 'E');
  for (const [x, z, s, mats, seed] of [
    [-5, -15, 1.1, [U.blueCrystal, U.quartzCluster], 11], [4, -14, 1.0, [U.amethyst], 12], [-7, -4, .9, [U.quartzCluster, U.amethyst], 13],
    [6, -6, 1.0, [U.fluorite], 14], [0, -9, 1.2, [U.blueCrystal], 15], [-4, 9, 1.0, [U.amethyst, U.blueCrystal], 16],
    [3, 6, 1.1, [U.blueCrystal, U.fluorite], 17], [5, 13, .9, [U.quartzCluster], 18], [-1, 15, 1.0, [U.blueCrystal, U.amethyst], 19]
  ]) crystalCluster(m, kit, x, z, y, s, mats, seed);
  // Pyrite cubes heaped by the north-west corner.
  const rng = random(31);
  for (let i = 0; i < 9; i++) {
    const s = .25 + rng() * .35;
    m.box(-7 + (rng() - .5) * 1.6, y + s / 2, 14 + (rng() - .5) * 1.6, s, s, s, U.pyrite, 1);
  }
  kit.solid(around(-7, 14, 1.9, 1.9), y, y + .7);
  // Geodes split open in the walls, glowing moss and mushrooms on the floor.
  wallPicture(m, L, 'N', 0, y + .5, y + 3.7, 3.2, U.geode);
  wallPicture(m, L, 'W', 12, y + .8, y + 3.2, 2.4, U.geode);
  wallPicture(m, L, 'E', -12, y + .8, y + 3.2, 2.4, U.geode);
  for (const [x, z, w] of [[-8, -14, 2.6], [2, -2, 3.0], [-3, 13, 2.4], [7, -16, 2.0], [-6, 2, 2.2]]) {
    floorQuad(m, x - w / 2, x + w / 2, z - w / 2, z + w / 2, y + .015, U.glowMoss, 1);
  }
  for (const [x, z] of [[-8, -14], [2, -2], [-3, 13]]) {
    floorQuad(m, x - .9, x + .9, z - .9, z + .9, y + .02, U.glowMushroom, 1);
    const r = random(Math.round(x * 13 + z));
    for (let i = 0; i < 6; i++) {
      const mx = x + (r() - .5) * 1.4, mz = z + (r() - .5) * 1.4, s = .5 + r() * .7;
      m.rod([mx, y, mz], [mx, y + .28 * s, mz], .025 * s, .02 * s, U.glowMushroom, 5, 1);
      lathe(m, mx, y + .26 * s, mz, [[0, .16 * s], [.06 * s, .13 * s], [.1 * s, 0]], U.glowMushroom, 8, 1);
    }
  }
  wallPicture(m, L, 'S', -4, y, y + 2.5, 1.5, U.stoneDoor);
}

// ---------------------------------------------------------------- 地下6階 · 地底湖

function lakeCave(m, kit) {
  const L = LAKE, y = L.y;
  const lake = rect(-6, 6, -13, 5);
  shell(m, kit, L, { floor: U.caveMud, wall: U.flowstone, ceiling: U.stalactites, floorHoles: [OPEN.G, lake], ceilingHoles: [OPEN.E], breachE: LAKE_BREACH });
  flightBetween(m, kit, CRYSTAL, L, F.E, 1, U.flowstone);
  openingRails(kit, m, y, 'G');
  // The lake: a sandy bed under clear water, a beach round it and a rope rail along the shore.
  floorQuad(m, lake.x0, lake.x1, lake.z0, lake.z1, y - 1.2, U.lakeSand, 1);
  for (const r of [rect(lake.x0, lake.x1, lake.z0 - .05, lake.z0), rect(lake.x0, lake.x1, lake.z1, lake.z1 + .05),
    rect(lake.x0 - .05, lake.x0, lake.z0, lake.z1), rect(lake.x1, lake.x1 + .05, lake.z0, lake.z1)]) slab(m, r, y - 1.25, y, U.rimstone, .9);
  floorQuad(m, lake.x0, lake.x1, lake.z0, lake.z1, y - .22, U.lakeWater, 1);
  floorQuad(m, lake.x0 - 1.2, lake.x1 + 1.2, lake.z0 - 1.2, lake.z0, y + .01, U.lakeSand, 1);
  floorQuad(m, lake.x0 - 1.2, lake.x1 + 1.2, lake.z1, lake.z1 + 1.2, y + .01, U.lakeSand, 1);
  for (const [a, b] of [[[lake.x0, lake.z1], [lake.x1, lake.z1]], [[lake.x0, lake.z0], [lake.x0, lake.z1]], [[lake.x1, lake.z1], [lake.x1, lake.z0]]]) {
    strip(m, a, b, y, y + .9, U.ropeRail, 1.5);
  }
  kit.solid(rect(lake.x0 - .1, lake.x1 + .1, lake.z0 - .1, lake.z1 + .1), y - 1.3, y + 1.2);
  // A waterfall down the north wall into a misty pool that feeds the lake.
  wallPicture(m, L, 'N', 0, y - .2, L.ceiling, 5.0, U.waterfall);
  floorQuad(m, -2.5, 2.5, L.z0, -17.6, y + .02, U.mistWater, 1);
  floorQuad(m, -1.0, 1.0, -17.6, lake.z0, y + .025, U.mistWater, 1);
  kit.solid(rect(-2.6, 2.6, L.z0, -17.5), y, y + 1);
  // Rimstone terraces, flowstone and wet rock walls, stalagmites and hanging stalactites.
  floorQuad(m, 3, 9, 8, 14, y + .02, U.rimstone, 1);
  wallBand(m, L, 'W', -11, 2, y, y + 2.2, U.wetBlackRock);
  wallBand(m, L, 'E', -19, LAKE_BREACH[0] - .4, y, y + 1.6, U.wetBlackRock);
  wallBand(m, L, 'E', LAKE_BREACH[1] + .4, 3.5, y, y + 1.6, U.wetBlackRock);
  // Rubble spilled through the breach and a torch beside it.
  for (const [x, z, r] of [[10.3, -9.3, .55], [10.6, -6.4, .45], [9.4, -8.6, .35]]) lathe(m, x, y - .05, z, [[0, r], [r * .5, r * .6], [r * .8, .1]], U.crackedRock, 7, 1);
  wallTorch(m, L, 10.9, y + 1.8, -10.2);
  wallBand(m, L, 'S', X0, X1, y + 2.2, y + 3.4, U.sediment);
  const rng = random(73);
  for (const [x, z] of [[-8, -6], [-7.5, 8], [8, -10], [7.5, -2], [3, 10], [-4, 13], [6.5, 15]]) {
    const h = .8 + rng() * 1.4, r = .25 + rng() * .2;
    m.rod([x, y, z], [x, y + h, z], r, .02, U.stalagmites, 7, 1, rng());
    kit.solid(around(x, z, r * 2.2, r * 2.2), y, y + h);
  }
  for (let i = 0; i < 26; i++) {
    const x = lerp(X0 + .8, X1 - .8, rng()), z = lerp(L.z0 + .8, L.z1 - .8, rng()), h = .4 + rng() * 1.3;
    if (x > F.E.x0 - .5 && z > F.E.z0 - .5 && z < F.E.z1 + .5) continue;
    m.rod([x, L.ceiling, z], [x, L.ceiling - h, z], .08 + rng() * .14, .01, U.stalactites, 6, 1, rng());
  }
  // A hot spring among warm rock, sulphur and volcanic glass in the south-west corner.
  const hx = -8, hz = 14;
  lathe(m, hx, y, hz, [[0, 1.6], [.35, 1.5], [.42, 1.3], [.2, 1.2]], U.warmRock, 16, 1);
  disc(m, hx, y + .3, hz, 1.25, U.hotSpring, 16, 1);
  floorQuad(m, hx - 2.3, hx + 2.3, hz - 2.3, hz + 2.3, y + .012, U.sulfur, 1);
  for (const [dx, dz, s] of [[2.0, -1.5, .5], [1.6, 1.8, .4], [-1.9, -1.9, .45]]) m.beveledBox(hx + dx, y + s / 2, hz + dz, s * 1.4, s, s, .04, U.volcanicGlass, 1);
  wallBand(m, L, 'W', 10, 18.4, y, y + 2.6, U.warmRock);
  wallBand(m, L, 'S', X0, -4.5, y, y + 2.2, U.crackedRock);
  kit.solid(around(hx, hz, 3.4, 3.4), y, y + .6);
  lamps(m, L, 'mixed', [0, 1]);
}

// ---------------------------------------------------------------- 地下7階 · 地下大聖堂

function chandelier(m, x, h, z, top) {
  m.rod([x, h + 1.1, z], [x, top, z], .02, .02, S.chain, 4, 1);
  latheWindow(m, x, h, z, [[0, .05], [.25, .55], [.55, .95], [.75, 1.0], [.95, .55], [1.1, .2]], U.chandelier, 14, [.12, .88, .25, .95]);
  lathe(m, x, h + .95, z, [[0, 1.02], [.08, 1.05], [.16, 1.0]], PROPS.brass, 14, 1);
}

function hangingLamp(m, x, h, z, top) {
  m.rod([x, h + .7, z], [x, top, z], .015, .015, S.chain, 4, 1);
  latheWindow(m, x, h, z, [[0, .02], [.18, .2], [.4, .3], [.62, .26], [.75, .12]], U.hangingLamp, 10, [.33, .67, .42, .9]);
}

function candelabra(m, x, y, z) {
  latheWindow(m, x, y, z, [[0, .16], [.08, .12], [.3, .05], [.7, .04], [.78, .1]], U.candelabra, 10, [.38, .62, .32, .98]);
  for (const dx of [-.22, 0, .22]) {
    m.rod([x, y + .72, z], [x + dx, y + .8, z], .015, .015, D.silverFiligree, 4, 1);
    candle(m, x + dx, y + .8, z, .22, .03);
  }
}

function pew(m, kit, x0, x1, z, y) {
  const x = (x0 + x1) / 2, w = x1 - x0;
  m.box(x, y + .45, z, w, .07, .45, PROPS.pewOak, .95);
  m.box(x, y + .78, z + .24, w, .6, .06, PROPS.pewOak, .9);
  for (const px of [x0 + .08, x1 - .08]) m.box(px, y + .42, z + .05, .08, .84, .55, PROPS.pewOak, .85);
  kit.solid(rect(x0, x1, z - .25, z + .3), y, y + 1.1);
}

function cathedral(m, kit) {
  const L = CATHEDRAL, y = L.y, top = L.ceiling, s = y + .5;
  const steps = rect(-4, 4, 17, 18.5);
  // Floors: salt down the nave, obsidian in the aisles, an alabaster sanctuary raised by three steps.
  for (const r of subtract(rect(X0, X1, L.z0, 18.5), [steps])) {
    for (const part of subtract(r, [rect(-5, 5, L.z0, 18.5)])) kit.deck(m, part, y, U.obsidianFloor, .33);
    for (const part of subtract(r, [rect(X0, -5, L.z0, 18.5), rect(5, X1, L.z0, 18.5)])) kit.deck(m, part, y, U.saltFloor, .33);
  }
  kit.deck(m, rect(X0, X1, 18.5, L.z1), s, U.alabasterFloor, .55);
  slab(m, rect(X0, X1, 18.45, 18.5), y, s, U.caveMarble, .95);
  kit.flight(m, steps, y, s, 1, U.caveMarble);
  // Walls of rock salt, chiselled above; a flat carved ceiling under the lake level.
  const t = .5;
  for (const r of [rect(X0 - t, X0, L.z0 - t, L.z1 + t), rect(X1, X1 + t, L.z0 - t, L.z1 + t), rect(X0, X1, L.z0 - t, L.z0), rect(X0, X1, L.z1, L.z1 + t)]) {
    kit.block(m, r, y - .4, top + .05, U.saltWall, .95);
  }
  for (const side of ['E', 'N', 'S']) wallBand(m, L, side, side === 'E' ? L.z0 : X0, side === 'E' ? L.z1 : X1, y + 9.5, top, U.chiselledRock);
  wallBand(m, L, 'W', L.z0, L.z1, y + 9.5, top, U.chiselledRock);
  for (const r of subtract(rect(X0, X1, L.z0, L.z1), [OPEN.G])) ceilingQuad(m, r, top, U.chiselledRock);
  // The stairwell up to the lake level.
  for (const r of [rect(F.G.x1, F.G.x1 + .3, F.G.z0, F.G.z0 + 6), rect(X0, F.G.x1 + .3, F.G.z0 + 6, F.G.z0 + 6.3)]) slab(m, r, top, LAKE.y - .33, U.saltWall, .9);
  // The processional stair from the lake down the west aisle, its wedge carved with reliefs.
  flightBetween(m, kit, LAKE, L, F.G, -1, U.saltWall);
  for (const [z, y0, y1] of [[-4, y + 2.0, y + 5.6], [4, y + .8, y + 3.8]]) picture(m, F.G.x1 + .015, z, y0, y1, 3.0, [1, 0], U.saltRelief);
  // Salt columns carry the ceiling; red marble in the sanctuary. Ribs run across between them.
  for (const z of [-14, -8, -2, 4, 10, 16]) {
    for (const x of [-6.2, 6.2]) column(m, kit, x, z, y, top - y, .55, U.saltColumn, U.caveMarble, U.ivoryCarving);
    m.rod([X0, top - .15, z], [X1, top - .15, z], .14, .14, U.ivoryCarving, 6, 1);
  }
  for (const z of [21, 26]) for (const x of [-5.5, 5.5]) column(m, kit, x, z, s, top - s, .45, U.redMarble, U.blackGoldMarble, U.ivoryCarving);
  // Starry frescoes between the ribs and a salt dome over the sanctuary, facing down into the nave.
  for (const z of [-11, -5, 1, 7, 13]) ceilingQuad(m, rect(-2.8, 2.8, z - 2.8, z + 2.8), top - .03, U.starFresco, 1);
  for (let i = 0; i < 32; i++) {
    const a0 = i / 32 * TAU, a1 = (i + 1) / 32 * TAU, uv = a => [.5 + .5 * Math.cos(a), .5 + .5 * Math.sin(a)];
    m.tri([0, top - .04, 23], [Math.cos(a0) * 4.4, top - .04, 23 + Math.sin(a0) * 4.4], [Math.cos(a1) * 4.4, top - .04, 23 + Math.sin(a1) * 4.4],
      U.rockDome, 1, [[0, -1, 0], [0, -1, 0], [0, -1, 0]], [[.5, .5], uv(a0), uv(a1)]);
  }
  // Side walls: amber windows high on the east, saints in niches, salt reliefs and a blind arch.
  for (const z of [-11, -5, 1, 7]) wallPicture(m, L, 'E', z, y + 6, y + 10.5, 2.8, U.amberWindow);
  for (const z of [-14, -2, 10]) wallPicture(m, L, 'E', z, y + 1, y + 4.4, 2.0, U.rockSaint);
  for (const z of [-8, 4]) wallPicture(m, L, 'E', z, y + 1, y + 4.0, 3.0, U.saltRelief);
  wallPicture(m, L, 'N', 3, y, y + 6.5, 5.0, U.rockArch);
  // Pews, a carved pulpit and the hanging lights of the nave.
  for (let z = -14; z <= 12; z += 2.2) { pew(m, kit, -5, -1.4, z, y); pew(m, kit, 1.4, 5, z, y); }
  const px = -3.8, pz = 15.0, pr = .7;
  for (let i = 0; i < 8; i++) {
    const a0 = (i - .5) / 8 * TAU, a1 = (i + .5) / 8 * TAU;
    const p = (a, hh) => [px + Math.cos(a) * pr, hh, pz + Math.sin(a) * pr];
    m.quad(p(a1, y + .3), p(a0, y + .3), p(a0, y + 1.5), p(a1, y + 1.5), U.pulpitRelief, 1, undefined, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  disc(m, px, y + 1.5, pz, pr, U.ivoryCarving, 8, 1);
  lathe(m, px, y, pz, [[0, .45], [.3, .3], [.32, pr]], U.caveMarble, 8, 1);
  kit.solid(around(px, pz, 1.6, 1.6), y, y + 1.6);
  for (const z of [-12, -3, 6, 15]) chandelier(m, 0, y + 7.6, z, top);
  for (const z of [-12, 0, 12]) hangingLamp(m, 8.8, y + 5.8, z, top);
  // Sanctuary: communion rail, altar, reredos, the gold star mosaic and glowing windows.
  for (const [a, b] of [[-4, -1], [1, 4]]) {
    for (const f of [-.02, .02]) strip(m, [a, 19.3 + f], [b, 19.3 + f], s, s + .95, U.ironRailing, 1.5);
    m.beveledBox((a + b) / 2, s + .98, 19.3, b - a, .08, .16, .02, U.ivoryCarving, 1);
    kit.solid(rect(a, b, 19.2, 19.4), s, s + 1);
  }
  wallPicture(m, L, 'S', 0, s, s + 6.0, 6.0, U.altarFront);
  wallPicture(m, L, 'S', 0, s + 6.4, s + 11.0, 4.6, U.haloMosaic);
  for (const x of [-7.2, 7.2]) wallPicture(m, L, 'S', x, s + 1.5, s + 7.5, 3.0, U.glowWindow);
  const az = 24.6;
  m.box(0, s + .12, az, 3.6, .24, 1.6, U.blackGoldMarble, 1);
  kit.block(m, around(0, az, 3.0, 1.1), s, s + 1.1, U.caveMarble, .95);
  m.box(0, s + 1.13, az, 3.2, .06, 1.25, U.blackGoldMarble, 1.05);
  picture(m, 0, az - .565, s + .2, s + 1.1, 1.6, [0, -1], U.altarCloth);
  crossMark(m, 0, s + 1.16, az + .3, .7, D.hammeredGold);
  for (const x of [-1.25, 1.25]) candelabra(m, x, s + 1.16, az + .1);
  // Blue velvet hangings either side of the reredos.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = sx * (3.2 + i * .2), b = sx * (3.2 + (i + 1) * .2);
      const fold = q => L.z1 - .1 - .12 * Math.abs(Math.sin(q * 15));
      m.quad([a, s, fold(a)], [b, s, fold(b)], [b, s + 7.0, fold(b)], [a, s + 7.0, fold(a)], U.blueVelvet, .95);
    }
  }
  // Inlaid choir stalls down both sides of the sanctuary.
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? X0 : 9.4, x1 = sx < 0 ? -9.4 : X1;
    kit.block(m, rect(x0, x1, 20, 26), s, s + 1.4, PROPS.pewOak, .85);
    const fx = sx < 0 ? x1 + .015 : x0 - .015;
    strip(m, [fx, sx < 0 ? 26 : 20], [fx, sx < 0 ? 20 : 26], s, s + 1.4, U.choirStalls, 2.0);
  }
}

export function depths(meshes, kit) {
  cistern(meshes[0], kit);
  catacombs(meshes[1], kit);
  mine(meshes[2], kit);
  crystalCave(meshes[3], kit);
  lakeCave(meshes[4], kit);
  cathedral(meshes[5], kit);
}
