// New rooms and objects dressed with the GPT Image 2.5 Sunburst decor atlas (decor.js).
// All coordinates are building-local metres (x across, z along the nave, y above the base).
import { DECOR as D } from './decor.js';
import { FABRIC } from './fabric.js';
import { SURFACE as S } from './surfaces.js';
import { CRAFT as C } from './ornament.js';
import { FLOORS, ROOF_HEIGHT, BASE, world } from './layout.js';
import { TAU, ground, lerp, random } from './terrain.js';

const LIGHT = 11, BRONZE = 22, LINEN = 23, GILT = 31;
const rect = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const around = (x, z, w, d) => rect(x - w / 2, x + w / 2, z - d / 2, z + d / 2);

export const ROOMS = [
  { floor: 0, name: '1階 · 洗礼堂', ...rect(-19.38, -12.12, -8.68, 2.02) },
  { floor: 0, name: '1階 · 船乗りの礼拝堂', ...rect(12.12, 19.38, -8.68, 2.02) },
  { floor: 1, name: '2階 · 宝物庫', ...rect(-19.38, -11.45, -8.68, 2.02) },
  { floor: 1, name: '2階 · 写字室', ...rect(11.45, 19.38, -8.68, 2.02) }
];
const FORECOURT = rect(-4.6, 7.6, 34.2, 41.5);
const ROOF_GARDEN = rect(7.2, 14.4, -8.6, -3.4);

export function roomName(floor, x, z, outdoors = false) {
  if (outdoors) return inside(FORECOURT, x, z) ? '島の外周 · 前庭' : null;
  if (floor === FLOORS.length - 1) return inside(ROOF_GARDEN, x, z) ? '屋上 · 庭園' : null;
  return ROOMS.find(r => r.floor === floor && inside(r, x, z))?.name ?? null;
}
function inside(r, x, z) { return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1; }

// ---------------------------------------------------------------- shared helpers

// Surface of revolution; profile is [[height, radius], ...]. UVs are metres (arc length, profile length).
export function lathe(m, x, y, z, profile, mat, segs = 16, shade = 1, phase = 0) {
  let v = 0;
  for (let j = 0; j < profile.length - 1; j++) {
    const [h0, r0] = profile[j], [h1, r1] = profile[j + 1];
    const v1 = v + Math.hypot(h1 - h0, r1 - r0);
    const circumference = TAU * Math.max(r0, r1, .01);
    for (let i = 0; i < segs; i++) {
      const a0 = phase + i / segs * TAU, a1 = phase + (i + 1) / segs * TAU;
      const p = (a, h, r) => [x + Math.cos(a) * r, y + h, z + Math.sin(a) * r];
      const u0 = i / segs * circumference, u1 = (i + 1) / segs * circumference;
      m.quad(p(a1, h0, r0), p(a0, h0, r0), p(a0, h1, r1), p(a1, h1, r1), mat, shade, undefined,
        [[u1, v], [u0, v], [u0, v1], [u1, v1]]);
    }
    v = v1;
  }
}

// Flat disc whose UVs frame the whole texture, for pictures (compass, rope coil, water).
export function disc(m, x, y, z, r, mat, segs = 24, shade = 1, phase = 0) {
  for (let i = 0; i < segs; i++) {
    const a0 = phase + i / segs * TAU, a1 = phase + (i + 1) / segs * TAU;
    const uv = a => [.5 + .5 * Math.cos(a), .5 + .5 * Math.sin(a)];
    m.tri([x, y, z], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r],
      mat, shade, [[0, 1, 0], [0, 1, 0], [0, 1, 0]], [[.5, .5], uv(a1), uv(a0)]);
  }
}

// Horizontal picture or floor inlay.
export function floorQuad(m, x0, x1, z0, z1, y, mat, shade = 1, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
  m.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], mat, shade, [0, 1, 0], uv);
}

export function slab(m, r, y0, y1, mat, shade = 1) {
  m.box((r.x0 + r.x1) / 2, (y0 + y1) / 2, (r.z0 + r.z1) / 2, r.x1 - r.x0, y1 - y0, r.z1 - r.z0, mat, shade);
}

export function candle(m, x, y, z, h = .30, r = .028) {
  m.rod([x, y, z], [x, y + h, z], r, r * .9, LINEN, 8, 1.02, 0, true);
  m.rod([x, y + h, z], [x + .004, y + h + .07, z], r * .72, .002, LIGHT, 6, 1.1);
}

export function candlestand(m, x, y, z, h = 1.25) {
  lathe(m, x, y, z, [[0, .19], [.05, .17], [.09, .05], [h - .06, .035], [h - .03, .11], [h, .12]], BRONZE, 10, .95);
  candle(m, x, y + h, z, .34, .036);
}

export function crossMark(m, x, y, z, size, mat, alongX = true) {
  const w = size * .55;
  m.rod([x, y, z], [x, y + size, z], size * .06, size * .06, mat, 6, 1);
  const a = alongX ? [x - w / 2, y + size * .7, z] : [x, y + size * .7, z - w / 2];
  const b = alongX ? [x + w / 2, y + size * .7, z] : [x, y + size * .7, z + w / 2];
  m.rod(a, b, size * .06, size * .06, mat, 6, 1);
}

// A double-ended clinker boat. Length runs along z.
function boat(m, x, y, z, L, B, D, shell, lining, trim) {
  const N = 16, K = 7;
  const point = (t, f, side, inset = 0) => {
    const s = Math.sin(Math.PI * t);
    const half = Math.max(0, B / 2 * Math.pow(s, .62) - inset);
    const end = Math.pow(Math.abs(2 * t - 1), 2.6);
    const keel = y + .11 * end + inset;
    const top = y + D + .23 * end;
    const a = f * Math.PI / 2;
    return [x + side * half * Math.pow(Math.sin(a), .75), keel + (top - keel) * (1 - Math.cos(a)), z + (t - .5) * L];
  };
  for (const [mat, inset, shade] of [[shell, 0, 1], [lining, .045, .82]]) {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < K; j++) {
        const t0 = i / N, t1 = (i + 1) / N, f0 = j / K, f1 = (j + 1) / K;
        for (const side of [-1, 1]) {
          const uv = [[t0 * L, f0 * D * 1.4], [t1 * L, f0 * D * 1.4], [t1 * L, f1 * D * 1.4], [t0 * L, f1 * D * 1.4]];
          m.quad(point(t0, f0, side, inset), point(t1, f0, side, inset), point(t1, f1, side, inset), point(t0, f1, side, inset),
            mat, shade, undefined, uv);
        }
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < N; i++) m.rod(point(i / N, 1, side), point((i + 1) / N, 1, side), .03, .03, trim, 6, .95);
  }
  m.rod(point(0, 0, 1), point(0, 1, 1), .035, .03, trim, 6, .9);
  m.rod(point(1, 0, 1), point(1, 1, 1), .035, .03, trim, 6, .9);
  return point;
}

// ---------------------------------------------------------------- 1F west: baptistery

export function baptistery(m, kit) {
  const y = FLOORS[0], room = ROOMS[0];
  floorQuad(m, room.x0, room.x1, room.z0, room.z1, y + .006, D.terrazzo, 1);
  const fx = -15.85, fz = -4.45;
  // Fish mosaic medallion between the font and the crossing.
  floorQuad(m, -17.35, -14.35, -1.15, 1.85, y + .010, D.waveMosaic, 1.02);
  // Octagonal font under a baldachin.
  lathe(m, fx, y, fz, [[0, 1.18], [.14, 1.18], [.14, 1.0], [.24, .72], [.52, .56], [.64, .96], [.90, 1.06], [.98, 1.06]],
    D.carrara, 8, 1, Math.PI / 8);
  lathe(m, fx, y, fz, [[.84, 1.075], [.92, 1.075]], D.gildedGesso, 8, 1.04, Math.PI / 8);
  lathe(m, fx, y, fz, [[.98, 1.06], [.98, .93], [.80, .90]], D.zellige, 8, .95, Math.PI / 8);
  disc(m, fx, y + .80, fz, .91, D.fontWater, 8, 1, Math.PI / 8);
  kit.block(m, around(fx, fz, 2.25, 2.25), y, y + .18, D.carrara, .96);
  kit.solid(around(fx, fz, 2.2, 2.2), y, y + 1.0);
  // Baldachin.
  const top = y + 3.05;
  for (const [dx, dz] of [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]]) {
    const px = fx + dx, pz = fz + dz;
    m.beveledBox(px, y + .14, pz, .44, .28, .44, .04, D.limestone, .95);
    lathe(m, px, y + .28, pz, [[0, .16], [top - y - .55, .13]], D.carrara, 12, 1);
    m.beveledBox(px, top - .17, pz, .38, .22, .38, .04, D.gildedGesso, 1.02);
    kit.solid(around(px, pz, .5, .5), y, top);
  }
  slab(m, around(fx, fz, 3.72, 3.72), top - .06, top + .26, D.gildedGesso, .98);
  floorQuad(m, fx - 1.80, fx + 1.80, fz - 1.80, fz + 1.80, top - .065, D.starFresco, 1.05);
  slab(m, around(fx, fz, 3.92, 3.92), top + .26, top + .36, D.carrara, 1);
  lathe(m, fx, top + .36, fz, [[0, 1.05], [.30, .98], [.62, .74], [.86, .40], [.98, .08]], D.hammeredGold, 16, 1.02);
  crossMark(m, fx, top + 1.32, fz, .52, D.hammeredGold, false);
  for (const [dx, dz] of [[-2.05, -2.05], [2.05, -2.05], [-2.05, 2.05], [2.05, 2.05]]) {
    candlestand(m, fx + dx, y, fz + dz, 1.18);
    kit.solid(around(fx + dx, fz + dz, .34, .34), y, y + 1.5);
  }
  // Tiled dado on the outer wall and the north wall.
  slab(m, rect(room.x0 + .005, room.x0 + .06, room.z0, room.z1), y, y + 1.32, D.zellige, .98);
  slab(m, rect(room.x0, room.x1, room.z0 + .005, room.z0 + .06), y, y + 1.32, D.zellige, .98);
  slab(m, rect(room.x0, room.x1, room.z1 - .06, room.z1 - .005), y, y + 1.32, D.zellige, .98);
  m.rod([room.x0 + .07, y + 1.36, room.z0 + .07], [room.x0 + .07, y + 1.36, room.z1 - .07], .045, .045, D.gildedGesso, 6, 1);
  for (const z of [room.z0 + .07, room.z1 - .07]) {
    m.rod([room.x0 + .07, y + 1.36, z], [room.x1, y + 1.36, z], .045, .045, D.gildedGesso, 6, 1);
  }
  // Stone benches with marble seats along the outer wall.
  for (const [z0, z1] of [[-8.5, -6.9], [-1.95, 1.85]]) {
    kit.block(m, rect(room.x0 + .06, room.x0 + .62, z0, z1), y, y + .42, D.limestone, .93);
    m.beveledBox(room.x0 + .36, y + .46, (z0 + z1) / 2, .66, .08, z1 - z0 + .06, .02, D.carrara, 1.02);
  }
  kit.solid(rect(room.x0, room.x0 + .7, -6.9, -1.95), y, y + 2);
  // Basins of sea glass left by visitors.
  for (const z of [-7.85, 1.25]) {
    const x = -13.05;
    lathe(m, x, y, z, [[0, .26], [.08, .24], [.12, .09], [.78, .08], [.86, .30], [.96, .36], [.99, .34], [.92, .30]],
      D.carrara, 14, 1);
    disc(m, x, y + .93, z, .31, D.seaGlass, 14, 1.04);
    kit.solid(around(x, z, .7, .7), y, y + 1);
  }
  // Low limestone screen toward the crossing, open in the middle.
  for (const [z0, z1] of [[room.z0, -6.15], [-2.75, room.z1]]) {
    kit.block(m, rect(-12.52, -12.12, z0, z1), y, y + .86, D.limestone, .95);
    m.beveledBox(-12.32, y + .91, (z0 + z1) / 2, .52, .1, z1 - z0, .025, D.carrara, 1.02);
  }
  for (const z of [-6.15, -2.75]) {
    m.beveledBox(-12.32, y + 1.05, z, .32, .22, .32, .03, D.carrara, 1);
    lathe(m, -12.32, y + 1.16, z, [[0, .04], [.04, .08], [.1, .09], [.16, .06], [.2, 0]], D.carrara, 10, 1.02);
    m.rod([-12.32, y + 1.36, z], [-12.32, y + 1.44, z], .014, .003, D.gildedGesso, 6, 1.04);
  }
}

// ---------------------------------------------------------------- 1F east: mariners' chapel

function anchor(m, x, y, z, size, alongZ = true) {
  const s = size;
  const along = (u, h) => alongZ ? [x, y + h, z + u] : [x + u, y + h, z];
  m.rod(along(0, .22 * s), along(0, 2.0 * s), .07 * s, .06 * s, D.rustedIron, 8, 1);
  let last;
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI * (1.08 + .84 * i / 14);
    const p = along(Math.cos(a) * .78 * s, .62 * s + Math.sin(a) * .5 * s);
    if (last) m.rod(last, p, .065 * s, .065 * s, D.rustedIron, 7, 1);
    last = p;
  }
  for (const side of [-1, 1]) {
    const tip = along(side * .80 * s, .72 * s), fluke = along(side * .62 * s, .40 * s);
    m.rod(fluke, tip, .16 * s, .02 * s, D.rustedIron, 4, .96);
  }
  m.rod(alongZ ? [x - .72 * s, y + 1.78 * s, z] : [x, y + 1.78 * s, z - .72 * s],
    alongZ ? [x + .72 * s, y + 1.78 * s, z] : [x, y + 1.78 * s, z + .72 * s], .075 * s, .06 * s, D.driftwood, 8, 1, 0, true);
  last = null;
  for (let i = 0; i <= 12; i++) {
    const a = i / 12 * TAU;
    const p = along(Math.sin(a) * .2 * s, 2.2 * s + Math.cos(a) * .2 * s);
    if (last) m.rod(last, p, .035 * s, .035 * s, D.rustedIron, 6, 1);
    last = p;
  }
}

function ropeCoil(m, x, y, z, r, h) {
  lathe(m, x, y, z, [[0, r * .95], [h * .5, r], [h, r * .95]], S.rope, 18, .92);
  disc(m, x, y + h, z, r * .97, D.ropeCoil, 18, 1);
}

function shipModel(m, x, y, z, scale) {
  const s = scale;
  boat(m, x, y, z, 1.5 * s, .42 * s, .26 * s, D.hullPlanks, D.driftwood, S.handrail);
  slab(m, around(x, z, .34 * s, 1.1 * s), y + .2 * s, y + .23 * s, D.teakSlats, 1);
  for (const [dz, h] of [[-.28, .95], [.12, 1.2], [.46, .7]]) {
    const mz = z + dz * s, top = y + h * s;
    m.rod([x, y + .1 * s, mz], [x, top, mz], .016 * s, .011 * s, D.driftwood, 6, 1);
    for (let k = 0; k < 2; k++) {
      const lo = y + (.34 + k * (h - .38) / 2) * s, hi = lo + (h - .45) * .48 * s, w = (.36 - k * .07) * s;
      const sail = (u, v) => [x + .03 * s * Math.sin(Math.PI * v), lerp(lo, hi, v), mz + u * w];
      for (let j = 0; j < 3; j++) {
        const v0 = j / 3, v1 = (j + 1) / 3;
        m.quad(sail(-1, v0), sail(1, v0), sail(1, v1), sail(-1, v1), D.patchedSail, 1.04, undefined,
          [[0, v0], [1, v0], [1, v1], [0, v1]]);
      }
      m.rod([x, hi, mz - w], [x, hi, mz + w], .008 * s, .008 * s, D.driftwood, 5, 1);
    }
  }
  m.rod([x, y + 1.2 * s, z + .12 * s], [x, y + .25 * s, z + .78 * s], .004 * s, .004 * s, S.rope, 4, .9);
  m.rod([x, y + 1.2 * s, z + .12 * s], [x, y + .25 * s, z - .76 * s], .004 * s, .004 * s, S.rope, 4, .9);
}

export function marinersChapel(m, kit) {
  const y = FLOORS[0], room = ROOMS[1];
  // Rowing boat on trestles.
  const bx = 16.05, bz = -3.7;
  for (const dz of [-1.15, 1.15]) {
    for (const side of [-1, 1]) {
      m.rod([bx + side * .62, y, bz + dz - .22], [bx + side * .16, y + .5, bz + dz], .045, .045, D.bandedOak, 6, .95);
      m.rod([bx + side * .62, y, bz + dz + .22], [bx + side * .16, y + .5, bz + dz], .045, .045, D.bandedOak, 6, .95);
    }
    m.beveledBox(bx, y + .52, bz + dz, 1.5, .1, .16, .02, D.bandedOak, 1);
  }
  const hull = boat(m, bx, y + .56, bz, 4.3, 1.48, .62, D.hullPlanks, D.driftwood, D.bandedOak);
  for (const t of [.33, .58]) {
    const [hx, hy, hz] = hull(t, .85, 1, .05);
    m.beveledBox(bx, hy, hz, (hx - bx) * 2, .05, .24, .01, D.teakSlats, 1);
  }
  for (const side of [-1, 1]) {
    const [, hy] = hull(.45, 1, side);
    m.rod([bx + side * .35, hy + .06, bz - 1.4], [bx - side * .1, hy + .02, bz + 1.15], .022, .022, D.driftwood, 6, 1);
    m.beveledBox(bx - side * .12, hy + .02, bz + 1.35, .03, .02, .5, .008, D.driftwood, 1);
  }
  ropeCoil(m, bx, y + .6, bz + 1.55, .14, .07);
  kit.solid(around(bx, bz, 1.7, 4.5), y, y + 1.4);
  // Votive ship hanging from the ceiling.
  const sy = y + 3.7;
  shipModel(m, bx, sy, bz, 1.1);
  for (const dz of [-.55, .55]) m.rod([bx, sy + .3, bz + dz], [bx, 6.2, bz + dz * .4], .009, .009, S.chain, 5, .95);
  // Anchor on a stone plinth by the outer wall.
  kit.block(m, around(18.75, -6.9, .8, 1.9), y, y + .24, D.limestone, .94);
  anchor(m, 18.75, y + .24, -6.9, .92, true);
  kit.solid(around(18.75, -6.9, .9, 2.0), y, y + 2.4);
  // Fishing net draped along the north wall.
  const nz = room.z0 + .08;
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 4; j++) {
      const p = (u, v) => {
        const x = lerp(13.4, 18.9, u);
        const sag = .55 * Math.sin(Math.PI * u) * (1 - v);
        return [x, y + .75 + v * 2.15 - sag, nz + .05 + .06 * Math.sin(u * 37) * (1 - v)];
      };
      const u0 = i / 12, u1 = (i + 1) / 12, v0 = j / 4, v1 = (j + 1) / 4;
      m.quad(p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1), D.fishingNet, 1.3);
    }
  }
  for (const x of [13.4, 16.15, 18.9]) m.rod([x, y + 2.9, nz], [x, y + 3.05, nz + .14], .035, .03, D.rustedIron, 6, 1);
  // Chart table with a brass compass.
  const tx = 13.55, tz = -6.85;
  for (const [dx, dz] of [[-.62, -.42], [.62, -.42], [-.62, .42], [.62, .42]]) {
    m.rod([tx + dx, y, tz + dz], [tx + dx, y + .86, tz + dz], .045, .04, D.bandedOak, 6, .95);
  }
  m.beveledBox(tx, y + .9, tz, 1.5, .07, 1.08, .02, D.bandedOak, 1);
  floorQuad(m, tx - .66, tx + .66, tz - .46, tz + .46, y + .937, D.seaChart, 1.04, [[1, 0], [1, 1], [0, 1], [0, 0]]);
  m.beveledBox(tx + .38, y + .99, tz - .2, .34, .1, .34, .02, D.ebonyInlay, 1);
  disc(m, tx + .38, y + 1.042, tz - .2, .14, D.compassDial, 24, 1.05);
  candle(m, tx - .55, y + .935, tz + .36, .2, .03);
  kit.solid(around(tx, tz, 1.6, 1.2), y, y + 1);
  // Votive shelf of shells and candles on the south wall.
  const shelfZ = room.z1 - .22;
  for (const x of [14.7, 18.6]) m.rod([x, y + 1.0, shelfZ + .2], [x, y + 1.22, shelfZ - .08], .03, .03, D.rustedIron, 6, 1);
  m.beveledBox(16.65, y + 1.24, shelfZ, 4.3, .07, .4, .015, D.driftwood, 1);
  const rng = random(41);
  for (let i = 0; i < 9; i++) {
    const x = 14.85 + i * .47 + (rng() - .5) * .1;
    if (i % 2) candle(m, x, y + 1.275, shelfZ + (rng() - .5) * .1, .14 + rng() * .14, .025);
    else lathe(m, x, y + 1.275, shelfZ, [[0, .14], [.03, .13], [.06, .08], [.075, 0]], D.motherOfPearl, 12, 1.05, rng());
  }
  for (const [x, z, r] of [[18.55, 1.0, .3], [18.95, .3, .22], [12.95, -2.2, .26]]) {
    ropeCoil(m, x, y, z, r, .13);
    kit.solid(around(x, z, r * 2, r * 2), y, y + .2);
  }
}

// ---------------------------------------------------------------- 2F west: treasury

function crown(m, x, y, z, r) {
  lathe(m, x, y, z, [[0, r], [r * .55, r * 1.05]], D.hammeredGold, 20, 1.05);
  lathe(m, x, y, z, [[r * .12, r * 1.01], [r * .42, r * 1.06]], D.gems, 20, 1.08);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU, b = (i + .5) / 8 * TAU, c = (i + 1) / 8 * TAU;
    const at = (t, h, k = 1.05) => [x + Math.cos(t) * r * k, y + h, z + Math.sin(t) * r * k];
    m.tri(at(a, r * .55), at(c, r * .55), at(b, r * 1.05, 1.07), D.hammeredGold, 1.05);
    lathe(m, ...at(b, r * 1.05, 1.07), [[0, r * .07], [r * .07, r * .08], [r * .14, 0]], D.motherOfPearl, 8, 1.1);
  }
  for (const turn of [0, Math.PI / 2]) {
    let last;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * i / 10;
      const p = [x + Math.cos(a) * r * Math.cos(turn), y + r * .55 + Math.sin(a) * r * .8, z + Math.cos(a) * r * Math.sin(turn)];
      if (last) m.rod(last, p, r * .05, r * .05, D.hammeredGold, 5, 1.05);
      last = p;
    }
  }
  lathe(m, x, y + r * 1.32, z, [[0, 0], [r * .1, r * .12], [r * .22, 0]], D.gems, 10, 1.1);
  crossMark(m, x, y + r * 1.52, z, r * .38, D.hammeredGold);
}

function chalice(m, x, y, z, s) {
  lathe(m, x, y, z, [[0, .1 * s], [.02 * s, .1 * s], [.05 * s, .05 * s], [.1 * s, .022 * s], [.13 * s, .02 * s]],
    D.silverFiligree, 16, 1.05);
  lathe(m, x, y + .13 * s, z, [[0, .02 * s], [.025 * s, .048 * s], [.05 * s, .02 * s]], D.gems, 12, 1.1);
  lathe(m, x, y + .18 * s, z, [[0, .02 * s], [.02 * s, .04 * s], [.06 * s, .08 * s], [.14 * s, .095 * s], [.14 * s, .088 * s], [.05 * s, .02 * s]],
    D.hammeredGold, 18, 1.05);
}

function monstrance(m, x, y, z, s) {
  lathe(m, x, y, z, [[0, .17 * s], [.04 * s, .16 * s], [.09 * s, .06 * s], [.42 * s, .03 * s], [.46 * s, .06 * s], [.5 * s, .03 * s], [.62 * s, .03 * s]],
    D.hammeredGold, 16, 1.05);
  const cy = y + .9 * s;
  // A sunburst of alternating long and short rays around the luna, facing +x.
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * TAU, len = (i % 2 ? .3 : .42) * s;
    const from = [x, cy + Math.sin(a) * .13 * s, z + Math.cos(a) * .13 * s];
    const to = [x, cy + Math.sin(a) * len, z + Math.cos(a) * len];
    m.rod(from, to, (i % 2 ? .012 : .018) * s, .002 * s, i % 2 ? D.hammeredGold : GILT, 4, 1.06);
  }
  let last;
  for (let i = 0; i <= 24; i++) {
    const a = i / 24 * TAU, p = [x, cy + Math.sin(a) * .14 * s, z + Math.cos(a) * .14 * s];
    if (last) m.rod(last, p, .028 * s, .028 * s, D.gems, 6, 1.1);
    last = p;
  }
  for (let i = 0; i < 16; i++) {
    const a0 = i / 16 * TAU, a1 = (i + 1) / 16 * TAU;
    m.tri([x + .01 * s, cy, z], [x + .01 * s, cy + Math.sin(a0) * .11 * s, z + Math.cos(a0) * .11 * s],
      [x + .01 * s, cy + Math.sin(a1) * .11 * s, z + Math.cos(a1) * .11 * s], LINEN, 1.12);
  }
  crossMark(m, x, cy + .42 * s, z, .14 * s, D.hammeredGold, false);
}

function casket(m, x, y, z, w, d, h) {
  m.beveledBox(x, y + h * .35, z, w, h * .7, d, .012, D.hammeredGold, 1.04);
  for (const side of [-1, 1]) {
    m.box(x, y + h * .36, z + side * (d / 2 + .004), w * .8, h * .44, .01, D.gems, 1.06);
    m.box(x + side * (w / 2 + .004), y + h * .36, z, .01, h * .44, d * .7, D.gems, 1.06);
  }
  const eave = y + h * .7, ridge = y + h;
  for (const side of [-1, 1]) {
    m.quad([x - w / 2 - .02, eave, z + side * (d / 2 + .02)], [x + w / 2 + .02, eave, z + side * (d / 2 + .02)],
      [x + w / 2 + .02, ridge, z], [x - w / 2 - .02, ridge, z], D.hammeredGold, 1);
    m.tri([x + side * (w / 2 + .02), eave, z - d / 2 - .02], [x + side * (w / 2 + .02), eave, z + d / 2 + .02],
      [x + side * (w / 2 + .02), ridge, z], D.silverFiligree, 1.02);
  }
  m.rod([x - w / 2, ridge + .01, z], [x + w / 2, ridge + .01, z], .014, .014, D.gems, 6, 1.08);
}

function chest(m, x, y, z, w, d, h, open, kit) {
  kit.block(m, around(x, z, w, d), y, y + h, D.bandedOak, .96);
  for (const t of [-.32, .32]) {
    m.box(x + t * w, y + h / 2, z, .05, h + .012, d + .012, D.wroughtIron, 1);
  }
  m.box(x, y + h * .78, z + d / 2 + .008, .12, .14, .012, D.wroughtIron, 1.04);
  if (!open) {
    m.beveledBox(x, y + h + .06, z, w + .03, .12, d + .03, .03, D.bandedOak, 1);
    for (const t of [-.32, .32]) m.box(x + t * w, y + h + .06, z, .05, .132, d + .04, D.wroughtIron, 1);
    return;
  }
  const back = z - d / 2, lidH = .1;
  m.quad([x - w / 2, y + h, back], [x + w / 2, y + h, back], [x + w / 2, y + h + d * .95, back - .2], [x - w / 2, y + h + d * .95, back - .2],
    D.bandedOak, .92);
  m.quad([x - w / 2, y + h, back - lidH], [x + w / 2, y + h, back - lidH], [x + w / 2, y + h + d * .95, back - .2 - lidH],
    [x - w / 2, y + h + d * .95, back - .2 - lidH], D.bandedOak, .85);
  lathe(m, x, y + h - .12, z, [[0, Math.min(w, d) * .5], [.12, Math.min(w, d) * .42], [.2, Math.min(w, d) * .2], [.23, 0]],
    D.hammeredGold, 14, 1.08);
  for (let i = 0; i < 5; i++) {
    disc(m, x + (i - 2) * .14, y + h + .02 + (i % 2) * .01, z + d * .45 + .06 * (i % 3), .035, D.hammeredGold, 10, 1.1);
  }
}

export function treasury(m, kit) {
  const y = FLOORS[1], room = ROOMS[2];
  // Velvet carpet with a gold border.
  const cx0 = -18.6, cx1 = -12.4, cz0 = -7.7, cz1 = 1.1;
  floorQuad(m, cx0, cx1, cz0, cz1, y + .008, D.velvet, .95);
  for (const [a, b] of [[[cx0, cz0], [cx1, cz0]], [[cx1, cz0], [cx1, cz1]], [[cx1, cz1], [cx0, cz1]], [[cx0, cz1], [cx0, cz0]]]) {
    m.rod([a[0], y + .02, a[1]], [b[0], y + .02, b[1]], .035, .035, D.hammeredGold, 6, 1.02);
  }
  // Central plinth with the crown, chalice and the sunburst monstrance.
  const px = -15.5, pz = -3.3;
  kit.block(m, around(px, pz, 1.25, 2.9), y, y + .92, D.ebonyInlay, .98);
  m.beveledBox(px, y + .95, pz, 1.37, .07, 3.02, .02, D.lapis, 1.02);
  m.beveledBox(px, y + 1.03, pz - .9, .56, .1, .56, .045, D.velvet, 1);
  crown(m, px, y + 1.08, pz - .9, .16);
  m.beveledBox(px, y + 1.02, pz, .4, .08, .4, .03, D.velvet, 1);
  chalice(m, px, y + 1.06, pz, 1.25);
  monstrance(m, px, y + .985, pz + .95, 1.15);
  // Gilded reliquary caskets on lapis pedestals.
  for (const z of [-7.15, .55]) {
    const x = -13.55;
    kit.block(m, around(x, z, .75, .75), y, y + .95, D.carrara, .96);
    m.beveledBox(x, y + .98, z, .82, .06, .82, .02, D.lapis, 1);
    casket(m, x, y + 1.01, z, .46, .3, .38);
  }
  // Iron-banded chests along the north wall.
  chest(m, -18.0, y, -7.65, 1.05, .6, .55, false, kit);
  chest(m, -16.55, y, -7.75, .9, .55, .5, true, kit);
  chest(m, -18.0, y, .65, 1.05, .6, .55, false, kit);
  // Processional cross set with gems.
  const xx = -18.7, xz = -3.3;
  lathe(m, xx, y, xz, [[0, .3], [.08, .26], [.12, .07]], D.carrara, 12, .96);
  m.rod([xx, y + .1, xz], [xx, y + 2.1, xz], .035, .03, D.silverFiligree, 8, 1.04);
  m.beveledBox(xx, y + 2.45, xz, .06, .82, .1, .015, D.hammeredGold, 1.05);
  m.beveledBox(xx, y + 2.58, xz, .06, .1, .56, .015, D.hammeredGold, 1.05);
  m.beveledBox(xx + .04, y + 2.58, xz, .02, .14, .14, .01, D.gems, 1.1);
  kit.solid(around(xx, xz, .6, .6), y, y + 2.8);
  // Candles on tall stands at the plinth corners.
  for (const [dx, dz] of [[-1, -1.85], [1, -1.85], [-1, 1.85], [1, 1.85]]) {
    candlestand(m, px + dx, y, pz + dz, 1.3);
    kit.solid(around(px + dx, pz + dz, .34, .34), y, y + 1.6);
  }
}

// ---------------------------------------------------------------- 2F east: scriptorium

function writingDesk(m, x, y, z, kit) {
  // Faces -x, toward the scribe's stool.
  const w = 1.2, top = y + .88;
  for (const [dx, dz] of [[-.32, -.52], [.32, -.52], [-.32, .52], [.32, .52]]) {
    m.rod([x + dx, y, z + dz], [x + dx, top - .02 + (dx > 0 ? .2 : 0), z + dz], .04, .036, D.scribeDesk, 6, .95);
  }
  m.beveledBox(x, y + .3, z, .7, .05, w - .1, .015, D.scribeDesk, .9);
  const lo = [x - .36, top], hi = [x + .36, top + .26];
  const pt = (p, dz, off = 0) => [p[0], p[1] + off, z + dz];
  m.quad(pt(lo, -w / 2), pt(hi, -w / 2), pt(hi, w / 2), pt(lo, w / 2), D.scribeDesk, .95);
  m.quad(pt(lo, -w / 2, .04), pt(lo, w / 2, .04), pt(hi, w / 2, .04), pt(hi, -w / 2, .04), D.scribeDesk, 1);
  for (const dz of [-w / 2, w / 2]) {
    m.quad(pt(lo, dz), pt(hi, dz), pt(hi, dz, .04), pt(lo, dz, .04), D.scribeDesk, .9);
  }
  // Two facing pages on the slope, and a flat ledge for the ink at the high end.
  const slope = xx => top + .043 + (xx - lo[0]) / (hi[0] - lo[0]) * (hi[1] - lo[1]);
  const page = (u, v) => { const xx = lerp(x - .3, x + .3, u); return [xx, slope(xx), z + lerp(-.4, .4, v)]; };
  m.quad(page(0, 0), page(0, .49), page(1, .49), page(1, 0), D.illuminatedPage, 1.05, undefined, [[0, 0], [1, 0], [1, 1], [0, 1]]);
  m.quad(page(0, .51), page(0, 1), page(1, 1), page(1, .51), D.illuminatedPage, 1.0, undefined, [[1, 0], [0, 0], [0, 1], [1, 1]]);
  m.rod([x - .37, top + .02, z - .5], [x - .37, top + .02, z + .5], .018, .018, D.scribeDesk, 6, 1);
  const ledge = top + .3;
  m.beveledBox(x + .46, ledge - .015, z, .2, .03, w, .008, D.scribeDesk, 1);
  // Ink horn, a lapis pigment cup and a quill.
  lathe(m, x + .46, ledge, z - .4, [[0, .03], [.06, .028], [.07, .02]], S.ceramic, 10, 1);
  lathe(m, x + .46, ledge, z + .4, [[0, .04], [.03, .045], [.04, .042]], S.ceramic, 10, 1);
  disc(m, x + .46, ledge + .035, z + .4, .04, D.lapis, 10, 1.05);
  m.rod([x + .45, ledge + .07, z - .4], [x + .25, ledge + .32, z - .32], .006, .002, S.feather, 5, 1.05);
  // Stool.
  for (const [dx, dz] of [[-.17, -.17], [.17, -.17], [-.17, .17], [.17, .17]]) {
    m.rod([x - .78 + dx, y, z + dz], [x - .78 + dx * .8, y + .5, z + dz * .8], .028, .028, D.bandedOak, 6, .95);
  }
  m.beveledBox(x - .78, y + .52, z, .46, .06, .46, .02, D.scribeDesk, 1);
  kit.solid(around(x, z, .85, w + .1), y, y + 1.2);
}

export function scriptorium(m, kit) {
  const y = FLOORS[1], room = ROOMS[3];
  floorQuad(m, 12.2, 19.0, -7.9, 1.4, y + .008, D.terrazzo, .92);
  for (const z of [-6.6, -3.3, 0]) writingDesk(m, 17.6, y, z, kit);
  // Great lectern with an open book, facing the gallery.
  const lx = 13.4, lz = -3.3;
  lathe(m, lx, y, lz, [[0, .34], [.1, .3], [.16, .1], [1.0, .08], [1.06, .14]], D.ebonyInlay, 8, 1, Math.PI / 8);
  const book = (u, v) => [lx + (u - .5) * .4, y + 1.2 + (u - .5) * .2, lz + (v - .5) * .9];
  m.quad(book(0, 0), book(1, 0), book(1, .5), book(0, .5), D.illuminatedPage, 1.06, undefined, [[1, 1], [0, 1], [0, 0], [1, 0]]);
  m.quad(book(0, .5), book(1, .5), book(1, 1), book(0, 1), D.illuminatedPage, 1.0, undefined, [[1, 0], [0, 0], [0, 1], [1, 1]]);
  for (let i = 0; i < 4; i++) {
    const a = [lx - .22 + i * .11, y + 1.07 + i * .055], b = [lx - .11 + i * .11, y + 1.125 + i * .055];
    m.quad([a[0], a[1], lz - .48], [b[0], b[1], lz - .48], [b[0], b[1], lz + .48], [a[0], a[1], lz + .48], S.binding, .9);
  }
  kit.solid(around(lx, lz, .8, .8), y, y + 1.3);
  // Book press against the north wall: ebony frame with leather spines.
  const shelfZ = room.z0 + .42, rng = random(77);
  kit.block(m, rect(12.6, 17.8, room.z0 + .05, shelfZ + .18), y, y + .08, D.ebonyInlay, .9);
  for (const x of [12.6, 14.33, 16.06, 17.8]) {
    m.beveledBox(x, y + 1.25, shelfZ - .05, .1, 2.5, .48, .02, D.ebonyInlay, 1);
  }
  m.beveledBox(15.2, y + 2.53, shelfZ - .05, 5.4, .1, .52, .02, D.ebonyInlay, 1);
  for (let r = 0; r < 4; r++) {
    const h = y + .1 + r * .6;
    m.beveledBox(15.2, h, shelfZ - .05, 5.2, .04, .44, .01, D.scribeDesk, .95);
    let u = 12.7;
    while (u < 17.66) {
      const bw = .05 + .09 * rng(), bh = .26 + .22 * rng();
      if (Math.floor((u - 12.6) / 1.73) !== Math.floor((u + bw - 12.6) / 1.73)) { u += .1; continue; }
      const mat = [S.binding, C.redLeather, C.greenLeather, D.velvet][Math.floor(rng() * 4)];
      m.box(u + bw / 2, h + .02 + bh / 2, shelfZ - .02 - .04 * rng(), bw, bh, .3, mat, .78 + .3 * rng());
      m.box(u + bw / 2, h + .02 + bh * .8, shelfZ + .131, bw * .9, .012, .01, D.hammeredGold, 1);
      u += bw + .012;
    }
  }
  kit.solid(rect(12.5, 17.9, room.z0, shelfZ + .2), y, y + 2.6);
  // Pigment table: terracotta jars, lapis to grind and a book of gold leaf.
  const tx = 13.6, tz = .8;
  kit.block(m, around(tx, tz, 1.3, .7), y, y + .78, D.bandedOak, .92);
  m.beveledBox(tx, y + .8, tz, 1.4, .05, .8, .015, D.scribeDesk, 1);
  for (const [dx, h] of [[-.45, .26], [-.2, .2], [.05, .3]]) {
    lathe(m, tx + dx, y + .825, tz - .12, [[0, .06], [.04, .09], [h * .7, .085], [h, .04], [h + .02, .05]], D.terracotta, 12, 1);
  }
  m.beveledBox(tx + .38, y + .86, tz + .1, .3, .07, .22, .02, D.lapis, 1);
  m.beveledBox(tx + .4, y + .835, tz - .18, .22, .02, .16, .005, D.hammeredGold, 1.06);
  lathe(m, tx - .3, y + .825, tz + .2, [[0, .07], [.05, .1], [.07, .1], [.02, .04]], D.carrara, 12, 1);
  disc(m, tx - .3, y + .87, tz + .2, .08, D.lapis, 12, 1.05);
}

// ---------------------------------------------------------------- roof garden

function skep(m, x, y, z, r) {
  lathe(m, x, y, z, [[0, r], [r * .55, r * 1.02], [r * 1.0, r * .86], [r * 1.3, r * .55], [r * 1.48, r * .2], [r * 1.52, 0]],
    D.strawSkep, 18, 1.02);
  m.box(x + r * .95, y + .04, z, .08, .05, .12, LIGHT, .4);
}

function pot(m, x, y, z, r, h) {
  lathe(m, x, y, z, [[0, r * .7], [h * .15, r * .78], [h * .85, r], [h * .9, r * 1.1], [h, r * 1.1], [h, r * .98]],
    D.terracotta, 16, 1);
  lathe(m, x, y + h * .88, z, [[0, r * .98], [h * .15, r * .7], [h * .25, 0]], D.herbBed, 16, 1.06);
}

function lantern(m, x, y, z, h = 2.1) {
  lathe(m, x, y, z, [[0, .16], [.1, .14], [.14, .06], [h - .08, .045], [h - .04, .09], [h, .09]], D.wroughtIron, 8, 1);
  const top = y + h, s = .17;
  m.box(x, top + .2, z, s * 1.7, .36, s * 1.7, D.lanternGlass, 1.1);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    m.rod([x + dx * s, top, z + dz * s], [x + dx * s, top + .42, z + dz * s], .016, .016, D.wroughtIron, 4, 1);
  }
  m.beveledBox(x, top + .01, z, s * 2.3, .04, s * 2.3, .01, D.wroughtIron, 1);
  lathe(m, x, top + .42, z, [[0, s * 1.35], [.16, .03], [.24, .03]], D.wroughtIron, 4, 1, Math.PI / 4);
  m.rod([x, top + .66, z], [x, top + .78, z], .03, .01, D.wroughtIron, 6, 1);
}

function bench(m, x, y, z, length, facing, kit) {
  // `facing` is the direction the sitter looks, along x (+1/-1).
  for (const t of [-.42, .42]) {
    const zz = z + t * length;
    m.rod([x - .22, y, zz], [x - .22, y + .43, zz], .03, .03, D.wroughtIron, 6, 1);
    m.rod([x + .22, y, zz], [x + .22, y + .43, zz], .03, .03, D.wroughtIron, 6, 1);
    m.rod([x - .24, y + .43, zz], [x + .24, y + .43, zz], .028, .028, D.wroughtIron, 6, 1);
    m.rod([x - facing * .22, y + .43, zz], [x - facing * .3, y + .88, zz], .028, .028, D.wroughtIron, 6, 1);
  }
  for (let i = 0; i < 4; i++) {
    m.beveledBox(x - .17 + i * .115, y + .465, z, .1, .035, length, .008, D.teakSlats, 1);
  }
  for (let i = 0; i < 2; i++) {
    const h = y + .62 + i * .14;
    m.beveledBox(x - facing * (.25 + i * .025), h, z, .03, .1, length, .008, D.teakSlats, 1);
  }
  kit.solid(around(x, z, .6, length), y, y + .9);
}

export function roofGarden(m, kit) {
  const y = ROOF_HEIGHT;
  // Raised herb bed along the north parapet.
  const bed = rect(7.75, 13.8, -8.5, -7.55);
  kit.block(m, bed, y, y + .5, D.limestone, .95);
  slab(m, rect(bed.x0 + .1, bed.x1 - .1, bed.z0 + .1, bed.z1 - .1), y + .5, y + .52, D.herbBed, 1.05);
  for (let i = 0; i < 6; i++) {
    const x = 8.3 + i * .98;
    lathe(m, x, y + .52, -8.02, [[0, .32], [.12, .28], [.24, .14], [.3, 0]], D.herbBed, 10, 1.04, i);
  }
  m.rod([bed.x0, y + .52, bed.z1], [bed.x1, y + .52, bed.z1], .045, .045, D.carrara, 6, 1);
  // Beehives on a teak stand over gravel by the west parapet.
  floorQuad(m, 7.35, 9.3, -6.9, -3.6, y + .006, D.gravel, 1);
  kit.block(m, rect(7.6, 8.5, -6.4, -4.2), y, y + .42, D.teakSlats, .95);
  for (const z of [-5.85, -4.75]) skep(m, 8.05, y + .42, z, .36);
  // Herb pots and lanterns.
  for (const [x, z, r, h] of [[12.9, -6.8, .3, .5], [13.6, -4.25, .26, .44], [7.75, -2.6, .3, .5], [7.75, -.9, .24, .4]]) {
    pot(m, x, y, z, r, h);
    kit.solid(around(x, z, r * 2.2, r * 2.2), y, y + h);
  }
  lantern(m, 13.95, y, -7.75, 1.9);
  kit.solid(around(13.95, -7.75, .4, .4), y, y + 2.6);
  // Ivy spilling over the inner face of the west parapet.
  for (const [z0, z1] of [[-8.3, -6.6], [-3.4, -1.3]]) {
    for (let i = 0; i < 6; i++) {
      const a = lerp(z0, z1, i / 6), b = lerp(z0, z1, (i + 1) / 6);
      const drop = u => .75 - .45 * Math.abs(Math.sin(u * 2.7 + z0));
      m.quad([7.335, y + drop(a), a], [7.335, y + drop(b), b], [7.335, y + .95, b], [7.335, y + .95, a], D.ivy, .95);
    }
  }
}

// ---------------------------------------------------------------- forecourt (outdoors)

function groundAt(x, z) {
  const [a, , b] = world(x, 0, z);
  return ground(a, b) - BASE;
}

function well(m, x, z, kit) {
  const y = groundAt(x, z) - .05;
  lathe(m, x, y, z, [[0, .82], [.78, .8], [.86, .84], [.86, .66], [.3, .64]], D.limestone, 18, .97);
  disc(m, x, y + .3, z, .65, D.fontWater, 18, .9);
  lathe(m, x, y + .78, z, [[0, .845], [.1, .845], [.1, .65]], D.carrara, 18, 1);
  for (const side of [-1, 1]) {
    m.beveledBox(x + side * .74, y + 1.3, z, .14, 1.9, .14, .02, D.driftwood, 1);
  }
  m.rod([x - .82, y + 1.95, z], [x + .82, y + 1.95, z], .05, .05, D.bandedOak, 8, 1);
  for (const side of [-1, 1]) {
    m.quad([x - 1.05, y + 2.0, z + side * .72], [x + 1.05, y + 2.0, z + side * .72], [x + 1.05, y + 2.52, z], [x - 1.05, y + 2.52, z],
      D.terracotta, .95);
  }
  m.rod([x + .1, y + 1.95, z], [x + .1, y + 1.1, z], .01, .01, S.rope, 4, .9);
  lathe(m, x + .1, y + .85, z, [[0, .1], [.25, .13], [.27, .14]], D.bandedOak, 12, 1);
  kit.solid(around(x, z, 1.9, 1.9), y, y + 2.6);
}

export function forecourt(m, kit) {
  // Cobbled path draped over the ground from the foot of the steps to the headland.
  const x0 = -1.5, x1 = 1.5, z0 = 34.35, z1 = 40.3;
  const nx = 6, nz = 24;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const p = (u, v) => {
        const x = lerp(x0, x1, u), z = lerp(z0, z1, v);
        return [x, groundAt(x, z) + .035, z];
      };
      const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / nz, v1 = (j + 1) / nz;
      m.quad(p(u0, v1), p(u1, v1), p(u1, v0), p(u0, v0), D.cobbles, 1);
    }
  }
  // A paved round around the well.
  const wx = 3.6, wz = 38.4;
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 3; j++) {
      const p = (a, r) => {
        const x = wx + Math.cos(a) * r, z = wz + Math.sin(a) * r;
        return [x, groundAt(x, z) + .03, z];
      };
      const a0 = i / 20 * TAU, a1 = (i + 1) / 20 * TAU, r0 = .8 + j * .5, r1 = r0 + .5;
      m.quad(p(a0, r0), p(a1, r0), p(a1, r1), p(a0, r1), D.cobbles, .98);
    }
  }
  well(m, wx, wz, kit);
  for (const [x, z] of [[-2.25, 36.6], [2.25, 36.0], [-1.9, 39.6], [2.15, 40.1]]) {
    const y = groundAt(x, z) - .04;
    lantern(m, x, y, z, 2.0);
    kit.solid(around(x, z, .42, .42), y, y + 2.6);
  }
  const by = groundAt(6.1, 36.6);
  bench(m, 6.1, by - .02, 36.6, 1.6, -1, kit);
  for (const [x, z, r, h] of [[3.1, 35.0, .34, .62], [4.4, 35.3, .26, .48], [-3.4, 35.5, .34, .62]]) {
    const y = groundAt(x, z) - .05;
    pot(m, x, y, z, r, h);
    kit.solid(around(x, z, r * 2.2, r * 2.2), y, y + h);
  }
}

// ---------------------------------------------------------------- fabric pictures in the nave and rooms

// A picture hung on an aisle wall; `side` is the wall's sign of x. Viewed from the nave, u runs to the right.
function wallPicture(m, side, z, y0, y1, w, mat, frame) {
  const x = side * 11.28, a = z - side * w / 2, b = z + side * w / 2;
  m.quad([x, y0, a], [x, y0, b], [x, y1, b], [x, y1, a], mat, 1, [-side, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  if (frame) {
    for (const [p, q] of [[[a, y0], [b, y0]], [[a, y1], [b, y1]], [[a, y0], [a, y1]], [[b, y0], [b, y1]]]) {
      m.rod([x - side * .03, p[1], p[0]], [x - side * .03, q[1], q[0]], .04, .04, D.gildedGesso, 6, 1);
    }
  } else {
    m.rod([x - side * .06, y1 + .05, a - side * .12], [x - side * .06, y1 + .05, b + side * .12], .025, .025, D.wroughtIron, 6, 1);
  }
}

export function naveHangings(m) {
  const y = FLOORS[0];
  // Tapestries between the windows of the west aisle, murals on the east piers.
  for (const z of [-15.63, 9.0, 15.04]) wallPicture(m, -1, z, y + 1.75, y + 4.55, 2.15, FABRIC.tapestry, false);
  wallPicture(m, 1, -15.63, y + 1.75, y + 4.55, 2.15, FABRIC.muralPlaster, true);
  for (const side of [-1, 1]) wallPicture(m, side, -15.63, FLOORS[1] + 1.6, FLOORS[1] + 4.4, 2.15, FABRIC.muralPlaster, true);
  // Ledger stones in the aisles near the apse and a chequered pavement under the crossing.
  for (const side of [-1, 1]) {
    for (const z of [-12.4, -18.9]) floorQuad(m, side * 9.5 - .55, side * 9.5 + .55, z - 1.0, z + 1.0, y + .009, FABRIC.tombSlab, 1);
  }
  floorQuad(m, -3.8, 3.8, -7.1, .5, y + .004, FABRIC.checkerMarble, 1);
}

// Ceilings under the decks above the transept chapels (1F) and the treasury and scriptorium (2F).
export function chapelCeilings(m, floor) {
  for (const room of ROOMS.filter(r => r.floor === floor)) {
    const y = FLOORS[floor + 1] - (floor === 0 ? .33 : .33) - .02;
    if (floor === 0) {
      const mid = (room.z0 + room.z1) / 2;
      for (const [a, b] of [[room.z0, mid], [mid, room.z1]]) floorQuad(m, room.x0, room.x1, a, b, y, FABRIC.plasterVault, 1);
    } else {
      floorQuad(m, room.x0, room.x1, room.z0, room.z1, y, FABRIC.beamCeiling, 1);
    }
  }
}

// Stained plaster over the library and soot-black beams over the bell chamber.
export function upperCeilings(m, index) {
  const room = { x0: 7.17, x1: 19.5, z0: -8.74, z1: 2.97 };
  if (index === 4) floorQuad(m, room.x0, room.x1, room.z0, room.z1, FLOORS[5] - .46, FABRIC.stainedCeiling, 1);
  if (index === 5) floorQuad(m, room.x0, room.x1, room.z0, room.z1, ROOF_HEIGHT - .5, FABRIC.sootBeams, 1);
}

// A lead half-pipe gutter from a to b (level), UVs in metres.
export function gutterTrough(m, a, b, r) {
  const length = Math.hypot(b[0] - a[0], b[2] - a[2]), n = 10;
  const dz = (b[2] - a[2]) / length, dx = (b[0] - a[0]) / length;
  const at = (p, t) => [p[0] - dz * Math.cos(t) * r, p[1] - Math.sin(t) * r, p[2] + dx * Math.cos(t) * r];
  for (let i = 0; i < n; i++) {
    const t0 = Math.PI * i / n, t1 = Math.PI * (i + 1) / n;
    m.quad(at(a, t0), at(b, t0), at(b, t1), at(a, t1), FABRIC.gutter, 1, undefined,
      [[0, t0 * r], [length, t0 * r], [length, t1 * r], [0, t1 * r]]);
  }
  for (const p of [a, b]) {
    for (let i = 0; i < n; i++) m.tri(p, at(p, Math.PI * i / n), at(p, Math.PI * (i + 1) / n), D.wroughtIron, .9);
  }
}
