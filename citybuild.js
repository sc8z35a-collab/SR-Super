// Builds the ancient underground city (地下6階の東) from the hand-written records in citydata.js.
// Everything here turns records into geometry, walls and floors; where things stand, how they are
// shaped and what they hold is decided record by record in citydata.js, never by this file.
import { Mesh } from './mesh.js';
import { CITY as K } from './city.js';
import { UNDER as U } from './under.js';
import { DECOR as D } from './decor.js';
import { PROPS } from './props.js';
import { SURFACE as S } from './surfaces.js';
import { lerp } from './terrain.js';
import { CITY_Y, LAKE_ROOM, CHAMBERS, TUNNELS, HOUSES, CELLS, STALLS, FEATURES, TORCHES } from './citydata.js';

const LIGHT = 11;
const R = .18;          // the walker's radius in the city's narrow lanes
const CELL = 4;         // collision grid (m)
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- materials

const TABLES = { k: K, u: U, d: D, p: PROPS, s: S };
function M(name) {
  const [t, n] = name.includes(':') ? name.split(':') : ['k', name];
  const id = TABLES[t]?.[n];
  if (id === undefined) throw new Error(`city: unknown material "${name}"`);
  return id;
}

// ---------------------------------------------------------------- 2-D helpers

export function signedArea(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length]; s += x0 * z1 - x1 * z0; }
  return s / 2;
}
export function centroid(p) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length], c = x0 * z1 - x1 * z0;
    a += c; cx += (x0 + x1) * c; cz += (z0 + z1) * c;
  }
  return [cx / (3 * a), cz / (3 * a)];
}
export function pointIn(p, x, z) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
  return [Math.hypot(x - ax - dx * t, z - az - dz * t), t];
}
const parse = s => (s || '').split(';').map(t => t.trim()).filter(Boolean).map(t => t.split(/\s+/));

// ---------------------------------------------------------------- 3-D helpers

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Triangles face `want`: the vertex order is flipped when needed, so lighting and two-sided
// rendering agree whichever way the record lists its points.
function tri(m, a, b, c, mat, want, shade = 1, uv) {
  const n = cross3(sub3(b, a), sub3(c, a));
  if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) { [b, c] = [c, b]; if (uv) uv = [uv[0], uv[2], uv[1]]; }
  m.tri(a, b, c, mat, shade, undefined, uv);
}
function quad(m, a, b, c, d, mat, want, shade = 1, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
  tri(m, a, b, c, mat, want, shade, [uv[0], uv[1], uv[2]]);
  tri(m, a, c, d, mat, want, shade, [uv[0], uv[2], uv[3]]);
}
// A vertical picture centred at (x, z) facing f = [fx, fz]; u runs to the viewer's right.
function stand(m, x, z, f, w, y0, y1, mat, shade = 1) {
  const rx = f[1], rz = -f[0];
  quad(m, [x - rx * w / 2, y0, z - rz * w / 2], [x + rx * w / 2, y0, z + rz * w / 2], [x + rx * w / 2, y1, z + rz * w / 2],
    [x - rx * w / 2, y1, z - rz * w / 2], mat, [f[0], 0, f[1]], shade);
}
// A horizontal picture centred at (x, z): width w across f's right, depth d along f.
function flat(m, x, z, f, w, d, y, mat, up = 1, shade = 1) {
  const rx = f[1], rz = -f[0], p = (u, v) => [x + rx * u * w / 2 + f[0] * v * d / 2, y, z + rz * u * w / 2 + f[1] * v * d / 2];
  quad(m, p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), mat, [0, up, 0], shade);
}
function fan(m, pts, c, yv, yc, mat, up, shade = 1) {
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    tri(m, [c[0], yc, c[1]], [pts[i][0], yv(i), pts[i][1]], [pts[j][0], yv(j), pts[j][1]], mat, [0, up, 0], shade);
  }
}
function lathe(m, x, y, z, profile, mat, segs = 10, shade = 1) {
  for (let j = 0; j < profile.length - 1; j++) {
    const [h0, r0] = profile[j], [h1, r1] = profile[j + 1];
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2;
      const p = (a, h, r) => [x + Math.cos(a) * r, y + h, z + Math.sin(a) * r];
      const mid = (a0 + a1) / 2;
      quad(m, p(a0, h0, r0), p(a1, h0, r0), p(a1, h1, r1), p(a0, h1, r1), mat, [Math.cos(mid), (r0 - r1) * .5, Math.sin(mid)], shade);
    }
  }
}
// A slab wall of thickness t along a -> b (plan points), both faces, top and ends.
function slab(m, a, b, y0, y1, t, mat, shade = 1) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * t / 2, nz = dx / L * t / 2;
  const P = (p, s, y) => [p[0] + nx * s, y, p[1] + nz * s];
  for (const s of [1, -1]) quad(m, P(a, s, y0), P(b, s, y0), P(b, s, y1), P(a, s, y1), mat, [nx * s, 0, nz * s], shade);
  quad(m, P(a, 1, y1), P(b, 1, y1), P(b, -1, y1), P(a, -1, y1), mat, [0, 1, 0], shade);
  quad(m, P(a, 1, y0), P(a, -1, y0), P(a, -1, y1), P(a, 1, y1), mat, [-dx, 0, -dz], shade * .9);
  quad(m, P(b, 1, y0), P(b, -1, y0), P(b, -1, y1), P(b, 1, y1), mat, [dx, 0, dz], shade * .9);
}
function box(m, x, z, f, w, d, y0, y1, mat, shade = 1) {
  const rx = f[1], rz = -f[0];
  const a = [x - f[0] * d / 2, z - f[1] * d / 2], b = [x + f[0] * d / 2, z + f[1] * d / 2];
  slab(m, [a[0] - rx * 0, a[1]], [b[0], b[1]], y0, y1, w, mat, shade);
}
function rod(m, a, b, r, mat, sides = 5, shade = 1) { m.rod(a, b, r, r, mat, sides, shade); }

// ---------------------------------------------------------------- collision and floors

const blockers = new Map(), floorCells = new Map();
const EMPTY = [];
const key = (ix, iz) => ix * 4096 + iz;
function insert(grid, item, x0, x1, z0, z1) {
  for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++) {
    for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
      const k = key(ix, iz);
      let list = grid.get(k);
      if (!list) grid.set(k, list = []);
      list.push(item);
    }
  }
}
const at = (grid, x, z) => grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) ?? EMPTY;
function wallBlock(a, b, half, y0, y1) {
  const it = { ax: a[0], az: a[1], bx: b[0], bz: b[1], half, y0, y1 }, e = half + R + .05;
  insert(blockers, it, Math.min(a[0], b[0]) - e, Math.max(a[0], b[0]) + e, Math.min(a[1], b[1]) - e, Math.max(a[1], b[1]) + e);
}
function roundBlock(x, z, r, y0, y1) {
  const it = { x, z, r, y0, y1 }, e = r + R + .05;
  insert(blockers, it, x - e, x + e, z - e, z + e);
}
// A long item blocks with a row of circles along its length.
function boxBlock(x, z, f, w, d, y0, y1) {
  const rx = f[1], rz = -f[0], r = Math.min(w, d) / 2, long = Math.max(w, d), along = w >= d ? [rx, rz] : [f[0], f[1]];
  const n = Math.max(1, Math.round(long / (2 * r)));
  for (let i = 0; i < n; i++) {
    const s = (i + .5) / n * long - long / 2;
    roundBlock(x + along[0] * s, z + along[1] * s, r, y0, y1);
  }
}
function polyFloor(pts, y) {
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  insert(floorCells, { poly: pts, y }, Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
}
function bandFloor(a, b, half, ya, yb) {
  const it = { ax: a[0], az: a[1], bx: b[0], bz: b[1], half, ya, yb };
  insert(floorCells, it, Math.min(a[0], b[0]) - half, Math.max(a[0], b[0]) + half, Math.min(a[1], b[1]) - half, Math.max(a[1], b[1]) + half);
}

export function inCity(x, y) { return x > LAKE_ROOM.x1 && y < -26.5 && y > -33.5; }

export function cityFree(x, z, y) {
  for (const it of at(blockers, x, z)) {
    if (it.y0 >= y + 1.70 || it.y1 <= y + .26) continue;
    if (it.half !== undefined) { if (segDist(x, z, it.ax, it.az, it.bx, it.bz)[0] < R + it.half) return false; }
    else if (Math.hypot(x - it.x, z - it.z) < R + it.r) return false;
  }
  return true;
}
export function cityHeights(x, z) {
  const out = [];
  for (const f of at(floorCells, x, z)) {
    if (f.poly) { if (pointIn(f.poly, x, z)) out.push(f.y); }
    else { const [d, t] = segDist(x, z, f.ax, f.az, f.bx, f.bz); if (d <= f.half) out.push(lerp(f.ya, f.yb, t)); }
  }
  return out;
}

// ---------------------------------------------------------------- lookup

const chamberById = new Map(CHAMBERS.map(c => [c.id, c]));
const floorY = c => CITY_Y + (chamberById.get(c)?.y ?? 0);
export function cityPlace(x, z) {
  for (const c of CHAMBERS) if (pointIn(c.pts, x, z)) return c.name;
  let best = null, bd = 1.2;
  for (const t of TUNNELS) {
    for (let i = 0; i < t.pts.length - 1; i++) {
      const d = segDist(x, z, ...t.pts[i], ...t.pts[i + 1])[0];
      if (d < bd) { bd = d; best = t.name; }
    }
  }
  return best ?? '古代都市';
}
function insideAnyRoom(x, z) {
  if (x <= LAKE_ROOM.x1 && x >= LAKE_ROOM.x0 && z >= LAKE_ROOM.z0 && z <= LAKE_ROOM.z1) return true;
  for (const c of CHAMBERS) if (pointIn(c.pts, x, z)) return true;
  return false;
}

// ---------------------------------------------------------------- torches and lamps

let lamps = [];
const FLAMES = { o: 'flame', w: 'flame2', b: 'blueFlame', v: 'blueFlame2' };
function flameAt(m, x, y, z, size = 1, kind = 'o') {
  const mat = M(FLAMES[kind] ?? 'flame'), w = .34 * size, h = .55 * size;
  stand(m, x, z, [0, 1], w, y, y + h, mat);
  stand(m, x, z, [1, 0], w, y, y + h, mat);
}
// A torch on a wall at (x, z) with the wall's outward normal f, or on a pole when f is null.
function torch(m, x, z, y, f, kind = 'o', strength = 1) {
  const h = y + 1.72;
  if (f) {
    rod(m, [x - f[0] * .2, h - .22, z - f[1] * .2], [x, h - .05, z], .025, PROPS.castIron, 4);
    stand(m, x - f[0] * .19, z - f[1] * .19, f, .26, h - .5, h - .1, M('sconce'));
  } else {
    rod(m, [x, y, z], [x, h - .05, z], .04, M('sootPlanks'), 5);
    lathe(m, x, y, z, [[0, .18], [.05, .12], [.12, .05]], M('roughBlock'), 6);
  }
  lathe(m, x, h - .14, z, [[0, .04], [.1, .1], [.16, .13]], PROPS.castIron, 6);
  flameAt(m, x, h, z, 1, kind);
  lamps.push([x, h + .25, z, strength, kind === 'b' || kind === 'v' ? 1 : 0]);
}

// ---------------------------------------------------------------- items

// Every item takes the floor height y, its position, facing f (world) and the arguments after the
// facing in its record. A few cast light; those that are in the way also block the walker.
function rubble(m, x, z, y, r, h, mat = 'rubbleBrick') {
  lathe(m, x, y - .05, z, [[0, r], [h * .55, r * .62], [h, r * .18], [h + .04, 0]], M(mat), 7);
}
const ITEMS = {
  hearth(m, x, z, y, f) {
    box(m, x, z, f, .95, .8, y, y + .78, M('strawMud'));
    stand(m, x + f[0] * .41, z + f[1] * .41, f, .95, y, y + .95, M('hearth'));
    lathe(m, x, y + .78, z, [[0, .2], [.12, .27], [.28, .2], [.32, .14]], D.terracotta, 8);
    boxBlock(x, z, f, .95, .8, y, y + .9);
    lamps.push([x + f[0] * .6, y + .5, z + f[1] * .6, .45, 0]);
  },
  table(m, x, z, y, f) {
    const rx = f[1], rz = -f[0];
    box(m, x, z, f, 1.25, .72, y + .72, y + .8, M('dirtyPlanks'));
    for (const [u, v] of [[-.55, -.3], [.55, -.3], [-.55, .3], [.55, .3]]) rod(m, [x + rx * u + f[0] * v, y, z + rz * u + f[1] * v], [x + rx * u + f[0] * v, y + .72, z + rz * u + f[1] * v], .035, M('oldPlanks'), 4);
    lathe(m, x + rx * .3, y + .8, z + rz * .3, [[0, .08], [.1, .12], [.14, .09]], D.terracotta, 7);
    lathe(m, x - rx * .25 + f[0] * .1, y + .8, z - rz * .25 + f[1] * .1, [[0, .1], [.05, .14]], M('crackedMud'), 7);
    boxBlock(x, z, f, 1.25, .72, y, y + .8);
  },
  bed(m, x, z, y, f) {
    box(m, x, z, f, .95, 1.95, y, y + .26, M('splitLog'));
    flat(m, x, z, f, .9, 1.9, y + .27, M('strawBed'));
    box(m, x + f[0] * .7, z + f[1] * .7, f, .55, .3, y + .27, y + .38, M('burlap'));
    boxBlock(x, z, f, .95, 1.95, y, y + .36);
  },
  loom(m, x, z, y, f) {
    stand(m, x, z, f, 1.4, y, y + 1.75, M('loom'));
    stand(m, x, z, [-f[0], -f[1]], 1.4, y, y + 1.75, M('loom'));
    boxBlock(x, z, f, 1.4, .45, y, y + 1.75);
  },
  shelf(m, x, z, y, f) {
    box(m, x - f[0] * .02, z - f[1] * .02, f, .95, .34, y, y + 1.6, M('oldPlanks'), .85);
    stand(m, x + f[0] * .16, z + f[1] * .16, f, .92, y, y + 1.6, M('potShelf'));
    boxBlock(x, z, f, .95, .36, y, y + 1.6);
  },
  jars(m, x, z, y, f) {
    box(m, x - f[0] * .02, z - f[1] * .02, f, 1.1, .34, y, y + 1.3, M('oldPlanks'), .85);
    stand(m, x + f[0] * .16, z + f[1] * .16, f, 1.08, y, y + 1.3, M('jarRows'));
    boxBlock(x, z, f, 1.1, .36, y, y + 1.3);
  },
  fish(m, x, z, y, f) { stand(m, x, z, f, .95, y + 1.0, y + 1.9, M('hangingFish')); },
  herbs(m, x, z, y, f) { stand(m, x, z, f, .9, y + 1.0, y + 1.85, M('herbs')); },
  iron(m, x, z, y, f) { stand(m, x, z, f, 1.0, y + .7, y + 1.7, M('ironware')); },
  net(m, x, z, y, f) { stand(m, x, z, f, 1.5, y + .5, y + 1.9, M('ropeNet')); },
  bones(m, x, z, y, f) { stand(m, x, z, f, .8, y + .9, y + 1.7, M('boneCraft')); },
  tally(m, x, z, y, f) { stand(m, x, z, f, 1.2, y + .3, y + 1.6, M('tally')); },
  shackles(m, x, z, y, f) { stand(m, x, z, f, .9, y + .6, y + 1.6, M('shackles')); },
  relief(m, x, z, y, f, a) { stand(m, x, z, f, +(a ?? 1.4), y + .5, y + .5 + +(a ?? 1.4), M('shrineRelief')); },
  relief2(m, x, z, y, f, a) { stand(m, x, z, f, +(a ?? 1.4), y + .5, y + .5 + +(a ?? 1.4), M('shrineRelief2')); },
  sign(m, x, z, y, f) { stand(m, x, z, f, 1.1, y + 1.0, y + 2.0, M('signCloth')); },
  candles(m, x, z, y, f) {
    box(m, x, z, f, .7, .3, y, y + .72, M('roughBlock'));
    stand(m, x + f[0] * .16, z + f[1] * .16, f, .66, y + .72, y + 1.3, M('tallowCandles'));
    lamps.push([x + f[0] * .4, y + 1.1, z + f[1] * .4, .5, 0]);
    boxBlock(x, z, f, .7, .3, y, y + .72);
  },
  wax(m, x, z, y, f) {
    stand(m, x, z, f, 1.0, y, y + 1.0, M('waxWall'));
    lamps.push([x + f[0] * .4, y + .7, z + f[1] * .4, .45, 0]);
  },
  lamp(m, x, z, y, f) {
    box(m, x - f[0] * .05, z - f[1] * .05, f, .5, .25, y + 1.05, y + 1.12, M('oldPlanks'));
    stand(m, x + f[0] * .06, z + f[1] * .06, f, .42, y + 1.12, y + 1.5, M(f[0] > 0 ? 'oilLamp2' : 'oilLamp'));
    lamps.push([x + f[0] * .35, y + 1.35, z + f[1] * .35, .5, 0]);
  },
  brazier(m, x, z, y, f) {
    rod(m, [x, y, z], [x, y + .62, z], .05, PROPS.castIron, 5);
    lathe(m, x, y + .55, z, [[0, .06], [.12, .3], [.22, .34]], PROPS.castIron, 8);
    flat(m, x, z, f, .5, .5, y + .74, M('embers'));
    flameAt(m, x, y + .74, z, .8, 'o');
    roundBlock(x, z, .34, y, y + .8);
    lamps.push([x, y + 1.2, z, .9, 0]);
  },
  forge(m, x, z, y, f) {
    box(m, x, z, f, 1.4, .9, y, y + 1.5, M('sootBrick'));
    stand(m, x + f[0] * .46, z + f[1] * .46, f, 1.3, y + .1, y + 1.4, M('forge'));
    boxBlock(x, z, f, 1.4, .9, y, y + 1.5);
    lamps.push([x + f[0] * .9, y + .8, z + f[1] * .9, 1.0, 0]);
  },
  furnace(m, x, z, y, f) {
    box(m, x, z, f, 1.3, 1.0, y, y + 1.7, M('burntBrick2'));
    stand(m, x + f[0] * .51, z + f[1] * .51, f, 1.2, y + .05, y + 1.4, M('furnace2'));
    boxBlock(x, z, f, 1.3, 1.0, y, y + 1.7);
    lamps.push([x + f[0] * .9, y + .7, z + f[1] * .9, 1.0, 0]);
  },
  mill(m, x, z, y, f) {
    lathe(m, x, y, z, [[0, .52], [.32, .5], [.34, .46]], M('roughBlock'), 9);
    lathe(m, x, y + .34, z, [[0, .45], [.18, .45]], M('fieldStone'), 10);
    const top = y + .521;
    for (let i = 0; i < 12; i++) {
      const a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2, uv = a => [.5 + .5 * Math.cos(a), .5 + .5 * Math.sin(a)];
      tri(m, [x, top, z], [x + Math.cos(a0) * .45, top, z + Math.sin(a0) * .45], [x + Math.cos(a1) * .45, top, z + Math.sin(a1) * .45], M('millstone'), [0, 1, 0], 1, [[.5, .5], uv(a0), uv(a1)]);
    }
    roundBlock(x, z, .5, y, y + .55);
  },
  jar(m, x, z, y, f, s) {
    const k = +(s ?? 1);
    lathe(m, x, y, z, [[0, .17 * k], [.2 * k, .32 * k], [.55 * k, .34 * k], [.78 * k, .2 * k], [.86 * k, .19 * k]], D.terracotta, 9);
    roundBlock(x, z, .32 * k, y, y + .85 * k);
  },
  pots(m, x, z, y, f) {
    const rx = f[1], rz = -f[0];
    for (const [u, v, s, mat] of [[-.2, .05, .9, D.terracotta], [.18, -.1, .7, M('crackedMud')], [.05, .25, .55, D.terracotta], [-.32, -.22, .45, M('sootMud')]]) {
      lathe(m, x + rx * u + f[0] * v, y, z + rz * u + f[1] * v, [[0, .1 * s], [.18 * s, .2 * s], [.36 * s, .16 * s], [.42 * s, .1 * s]], mat, 7);
    }
    roundBlock(x, z, .42, y, y + .4);
  },
  sacks(m, x, z, y, f) {
    const rx = f[1], rz = -f[0];
    for (const [u, v, h] of [[-.3, 0, .55], [.25, .1, .48], [0, -.32, .4]]) {
      const cx = x + rx * u + f[0] * v, cz = z + rz * u + f[1] * v;
      lathe(m, cx, y, cz, [[0, .2], [h * .5, .27], [h, .16], [h + .08, .05]], M('burlap'), 7);
    }
    roundBlock(x, z, .5, y, y + .55);
  },
  basket(m, x, z, y) { lathe(m, x, y, z, [[0, .2], [.3, .27], [.34, .25]], M('reedWall'), 8); },
  crate(m, x, z, y, f) { box(m, x, z, f, .62, .62, y, y + .6, M('oldPlanks')); boxBlock(x, z, f, .62, .62, y, y + .6); },
  barrel(m, x, z, y) { lathe(m, x, y, z, [[0, .26], [.4, .31], [.8, .26]], M('oldPlanks'), 9); roundBlock(x, z, .3, y, y + .8); },
  stool(m, x, z, y) { lathe(m, x, y, z, [[0, .14], [.42, .12], [.44, .19], [.48, .19]], M('splitLog'), 6); },
  sherds(m, x, z, y, f) { flat(m, x, z, f, 1.3, 1.0, y + .012, M('sherdPile')); },
  sherds2(m, x, z, y, f) { flat(m, x, z, f, 1.1, 1.1, y + .012, M('sherds2')); },
  straw(m, x, z, y, f) { flat(m, x, z, f, 1.7, 1.2, y + .01, M('strawFloor')); },
  rug(m, x, z, y, f) { flat(m, x, z, f, 1.9, 1.3, y + .011, M('wornRug')); },
  hide(m, x, z, y, f) { flat(m, x, z, f, 1.5, 1.0, y + .011, M('fur')); },
  mat(m, x, z, y, f) { flat(m, x, z, f, 1.7, .9, y + .011, M('strawMat')); },
  coins(m, x, z, y, f) { flat(m, x, z, f, .6, .5, y + .013, M('coins')); },
  ash(m, x, z, y, f) { flat(m, x, z, f, 1.4, 1.1, y + .012, M('ashFloor')); },
  puddle(m, x, z, y, f) { flat(m, x, z, f, 1.6, 1.2, y + .013, M('mudPuddles')); },
  cloth(m, x, z, y, f) {
    const rx = f[1], rz = -f[0];
    rod(m, [x - rx * .8, y + 2.0, z - rz * .8], [x + rx * .8, y + 2.0, z + rz * .8], .025, M('splitLog'), 4);
    stand(m, x, z, f, 1.5, y + .35, y + 2.0, M('dyedCloth'));
    stand(m, x, z, [-f[0], -f[1]], 1.5, y + .35, y + 2.0, M('dyedCloth'));
  },
  // A ragged curtain hung across a room; it does not stop the walker.
  curtain(m, x, z, y, f, w) {
    const ww = +(w ?? 1.8);
    stand(m, x, z, f, ww, y + .12, y + 2.0, M('patchCloth'));
    stand(m, x, z, [-f[0], -f[1]], ww, y + .12, y + 2.0, M('patchCloth'));
  },
  rubble(m, x, z, y, f, r, h) {
    const rr = +(r ?? .7), hh = +(h ?? .35);
    rubble(m, x, z, y, rr, hh, rr > .9 ? 'rubble2' : 'rubbleBrick');
    if (hh > .3) roundBlock(x, z, rr * .7, y, y + hh);
  },
  // A beam fallen from the roof, its foot on the floor and its head against the wall behind.
  beam(m, x, z, y, f, len) {
    const l = +(len ?? 2.6);
    rod(m, [x, y + .05, z], [x - f[0] * l * .8, y + 1.9, z - f[1] * l * .8], .09, M('sootPlanks'), 4);
    roundBlock(x - f[0] * .3, z - f[1] * .3, .2, y, y + .5);
  },
  web(m, x, z, y, f) { stand(m, x, z, f, 1.1, y + 1.45, y + 2.2, M('cobweb2')); },
  ladder(m, x, z, y, f, h) {
    const hh = +(h ?? 1.9), rx = f[1], rz = -f[0];
    for (const s of [-.22, .22]) rod(m, [x + rx * s, y, z + rz * s], [x + rx * s - f[0] * .35, y + hh, z + rz * s - f[1] * .35], .03, M('splitLog'), 4);
    for (let i = 1; i < 7; i++) {
      const k = i / 7, cx = x - f[0] * .35 * k, cz = z - f[1] * .35 * k;
      rod(m, [cx - rx * .22, y + hh * k, cz - rz * .22], [cx + rx * .22, y + hh * k, cz + rz * .22], .02, M('oldPlanks'), 4);
    }
  },
  // A sleeping loft on two posts; straw and a sack on top.
  loft(m, x, z, y, f, w, d) {
    const ww = +(w ?? 1.8), dd = +(d ?? 1.4), rx = f[1], rz = -f[0];
    box(m, x, z, f, ww, dd, y + 1.38, y + 1.48, M('oldPlanks'));
    flat(m, x, z, f, ww - .1, dd - .1, y + 1.485, M('strawFloor'));
    for (const s of [-1, 1]) {
      const px = x + rx * s * (ww / 2 - .08) + f[0] * (dd / 2 - .08), pz = z + rz * s * (ww / 2 - .08) + f[1] * (dd / 2 - .08);
      rod(m, [px, y, pz], [px, y + 1.4, pz], .06, M('splitLog'), 5);
      roundBlock(px, pz, .08, y, y + 1.4);
    }
    lathe(m, x - rx * .4, y + 1.48, z - rz * .4, [[0, .2], [.25, .24], [.42, .12]], M('burlap'), 6);
  },
  partition(m, x, z, y, f, w) {
    const ww = +(w ?? 1.6);
    slab(m, [x - f[1] * ww / 2, z + f[0] * ww / 2], [x + f[1] * ww / 2, z - f[0] * ww / 2], y, y + 1.75, .06, M('reedWall'));
    wallBlock([x - f[1] * ww / 2, z + f[0] * ww / 2], [x + f[1] * ww / 2, z - f[0] * ww / 2], .04, y, y + 1.75);
  },
  goods(m, x, z, y, f, g) { flat(m, x, z, f, 1.2, .8, y + .02, M(g ?? 'roots')); },
};

// ---------------------------------------------------------------- house walls

// The frame of a house record: its plan corners, and a map from the record's own axes to the plan.
function frameOf(H) {
  if (H.q) {
    const [cx, cz, w, d, deg] = H.q, a = (deg ?? 0) * DEG, ca = Math.cos(a), sa = Math.sin(a);
    const k = H.k ?? [[0, 0], [0, 0], [0, 0], [0, 0]];
    const loc = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z], i) => [x + k[i][0], z + k[i][1]]);
    const toW = (x, z) => [cx + x * ca - z * sa, cz + x * sa + z * ca];
    return { pts: loc.map(([x, z]) => toW(x, z)), toW, dir: (x, z) => [x * ca - z * sa, x * sa + z * ca] };
  }
  const c = centroid(H.p);
  return { pts: H.p, toW: (x, z) => [c[0] + x, c[1] + z], dir: (x, z) => [x, z] };
}

function buildHouse(m, H, kind = 'house') {
  const ch = chamberById.get(H.c);
  if (!ch) throw new Error(`city: house in unknown chamber ${H.c}`);
  const base = CITY_Y + ch.y + (H.base ?? 0), y = base + (H.y ?? 0), h = H.h ?? 2.2, top = y + h, wallTop = top + .2, t = H.tw ?? .2;
  const F = frameOf(H), pts = F.pts, n = pts.length, inward = signedArea(pts) > 0 ? 1 : -1;
  const wallMat = e => M(H.ew?.[e] ?? H.w);
  const edge = e => {
    const a = pts[e], b = pts[(e + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const ux = dx / L, uz = dz / L, nin = [-uz * inward, ux * inward];
    return { a, b, L, ux, uz, nin, P: s => [a[0] + ux * s, a[1] + uz * s] };
  };
  const c = centroid(pts);
  // Floor, ceiling and the roof's upper face.
  fan(m, pts, c, () => y + .012, y + .012, M(H.f), 1);
  if (!H.open) {
    fan(m, pts, c, () => top, top, M(H.r ?? 'reedMudCeil'), -1);
    fan(m, pts, c, () => wallTop, wallTop + (H.ridge ?? .06), M(H.top ?? 'reedMud2'), 1, .9);
  }
  polyFloor(pts, y);
  // Walls edge by edge, cut by doors (d), holes (o) and collapsed stretches (b).
  const cuts = Array.from({ length: n }, () => []);
  for (const [e, tt, w, k, dh] of parse(H.d)) {
    const E = edge(+e), s = +tt * E.L;
    cuts[+e].push({ s0: s - +w / 2, s1: s + +w / 2, type: 'door', kind: k ?? 'open', dh: +(dh ?? 1.9) });
  }
  for (const [e, tt, w, y0, y1] of parse(H.o)) {
    const E = edge(+e), s = +tt * E.L;
    cuts[+e].push({ s0: s - +w / 2, s1: s + +w / 2, type: 'hole', y0: +y0, y1: +y1 });
  }
  for (const [e, t0, t1, keep] of parse(H.b)) {
    const E = edge(+e);
    cuts[+e].push({ s0: +t0 * E.L, s1: +t1 * E.L, type: 'break', keep: +keep });
  }
  for (let e = 0; e < n; e++) {
    const E = edge(e), mat = wallMat(e);
    const solid = (s0, s1, y0, y1) => { if (s1 - s0 > .02) slab(m, E.P(s0), E.P(s1), y0, y1, t, mat); };
    let pos = 0;
    for (const cut of cuts[e].sort((p, q) => p.s0 - q.s0)) {
      const s0 = Math.max(.1, cut.s0), s1 = Math.min(E.L - .1, cut.s1);
      if (s0 > pos) { solid(pos, s0, base - .02, wallTop); wallBlock(E.P(pos), E.P(s0), t / 2, base, top); }
      if (cut.type === 'door') {
        solid(s0, s1, y + cut.dh, wallTop);
        const A = E.P(s0), B = E.P(s1);
        for (const p of [A, B]) rod(m, [p[0], base, p[1]], [p[0], y + cut.dh, p[1]], .06, M('sootPlanks'), 4);
        rod(m, [A[0], y + cut.dh, A[1]], [B[0], y + cut.dh, B[1]], .07, M('sootPlanks'), 4);
        const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], w = s1 - s0;
        if (cut.kind === 'cloth' || cut.kind === 'stripe') {
          const cm = M(cut.kind === 'cloth' ? 'patchCloth' : 'tentStripe');
          stand(m, mid[0], mid[1], E.nin, w * .96, y + .25, y + cut.dh, cm);
          stand(m, mid[0], mid[1], [-E.nin[0], -E.nin[1]], w * .96, y + .25, y + cut.dh, cm);
        } else if (cut.kind === 'blind') {
          stand(m, mid[0], mid[1], E.nin, w * .96, y + cut.dh - .75, y + cut.dh, M('reedBlind'));
          stand(m, mid[0], mid[1], [-E.nin[0], -E.nin[1]], w * .96, y + cut.dh - .75, y + cut.dh, M('reedBlind'));
        } else if (cut.kind === 'bars') {
          stand(m, mid[0], mid[1], E.nin, w, base, y + cut.dh, M('bentBars'));
          stand(m, mid[0], mid[1], [-E.nin[0], -E.nin[1]], w, base, y + cut.dh, M('bentBars'));
          wallBlock(A, B, .05, base, top);
        }
        if (H.y > .05) slab(m, A, B, base - .02, y, t + .3, M('roughBlock'));
      } else if (cut.type === 'hole') {
        solid(s0, s1, base - .02, y + cut.y0);
        solid(s0, s1, y + cut.y1, wallTop);
        wallBlock(E.P(s0), E.P(s1), t / 2, base, top);
      } else {
        // A collapsed stretch: three jagged stumps and rubble spilled to both sides.
        const third = (s1 - s0) / 3;
        [1, .62, .86].forEach((k, i) => solid(s0 + third * i, s0 + third * (i + 1), base - .02, y + cut.keep * k));
        if (cut.keep > .35) wallBlock(E.P(s0), E.P(s1), t / 2, base, y + cut.keep);
        const mid = E.P((s0 + s1) / 2), r = Math.min(.9, Math.max(.3, (s1 - s0) / 3));
        for (const sgn of [1, -1]) rubble(m, mid[0] + E.nin[0] * sgn * .45, mid[1] + E.nin[1] * sgn * .45, base, r, .28, 'rubble2');
      }
      pos = Math.max(pos, s1);
    }
    if (E.L > pos) { solid(pos, E.L, base - .02, wallTop); wallBlock(E.P(pos), E.P(E.L), t / 2, base, top); }
    // Corner post.
    m.box(E.a[0], (base + wallTop + .05) / 2, E.a[1], t + .08, wallTop + .05 - base, t + .08, M(H.post ?? H.ew?.[e] ?? H.w), .92);
  }
  // Pictures and stains on the walls: kind edge t side [width height bottom].
  const DECALS = {
    soot: ['sootStreaks', 1.4, 1.5, .8], soot2: ['sootStreaks2', 1.4, 1.5, .8], mold: ['mold', 1.3, 1.2, .2], mold2: ['mold2', 1.3, 1.2, .3],
    oil: ['oilStain', 1.0, 1.0, .3], oil2: ['oilStain2', 1.0, 1.0, .4], web: ['cobweb', 1.0, .7, 1.45], drip: ['dripMoss', 1.2, 1.6, .3],
    drip2: ['dripMoss2', 1.2, 1.6, .3], graffiti: ['graffiti', 1.4, 1.1, .6], paint: ['cavePainting', 1.5, 1.2, .5], hands: ['handprints', 1.2, 1.0, .6],
    breach: ['wallBreak', 1.3, 1.2, .2], breach2: ['wallBreak2', 1.3, 1.2, .2], hole: ['wallHole', 1.1, 1.1, .1], hole2: ['wallHole2', 1.1, 1.1, .1],
    plank: ['plankDoor', 1.0, 1.9, 0], plank2: ['plankDoor2', 1.0, 1.9, 0], slide: ['stoneSlide', 1.1, 1.9, 0], slide2: ['stoneSlide2', 1.1, 1.9, 0],
    barred: ['barredDoor', 1.0, 1.9, 0], iron: ['ironDoor2', 1.0, 1.9, 0], lattice: ['lattice', .9, .9, .9], lattice2: ['lattice2', .9, .9, .9],
    lintel: ['lintelDoor', 1.2, 1.9, 0], lintel2: ['lintelDoor2', 1.2, 1.9, 0], clothdoor: ['clothDoor', 1.0, 1.9, 0], clothdoor2: ['clothDoor2', 1.0, 1.9, 0],
    patchdoor: ['patchDoor', 1.0, 1.9, 0], wax: ['waxWall', .9, .9, .5], sconce: ['sootSconce', 1.0, 1.4, .8], sootwall: ['sootWall2', 1.3, 1.4, .7],
    glyphs: ['glyphs', 1.0, 1.0, .7], geometric: ['geometric', 1.0, 1.0, .7], relief: ['shrineRelief', 1.2, 1.2, .5], relief2: ['shrineRelief2', 1.2, 1.2, .5],
    sign: ['signCloth', 1.0, 1.0, 1.0], cloth: ['dyedCloth', 1.4, 1.4, .5], tally: ['tally', 1.2, 1.2, .3], scratch: ['scratchedWall', 1.4, 1.5, .2],
  };
  for (const [k, e, tt, sd, w, hh, y0] of parse(H.x)) {
    const def = DECALS[k];
    if (!def) throw new Error(`city: unknown wall picture ${k}`);
    const E = edge(+e), side = sd === 'i' ? 1 : -1, p = E.P(+tt * E.L), off = t / 2 + .012;
    const f = [E.nin[0] * side, E.nin[1] * side];
    const ww = +(w ?? def[1]), hhh = +(hh ?? def[2]), yy = (sd === 'i' ? y : base) + +(y0 ?? def[3]);
    stand(m, p[0] + f[0] * off, p[1] + f[1] * off, f, ww, yy, yy + hhh, M(def[0]));
  }
  // Items: kind (x z | @edge t) [facing°] [args...], in the record's own axes.
  for (const tok of parse(H.i)) {
    const kindName = tok[0], fn = ITEMS[kindName];
    if (!fn) throw new Error(`city: unknown item ${kindName}`);
    let x, z, f, rest;
    if (tok[1].startsWith('@')) {
      const E = edge(+tok[1].slice(1)), p = E.P(+tok[2] * E.L), off = +(tok[3] ?? .3);
      x = p[0] + E.nin[0] * off; z = p[1] + E.nin[1] * off; f = E.nin; rest = tok.slice(4);
    } else {
      [x, z] = F.toW(+tok[1], +tok[2]);
      const a = +(tok[3] ?? 0) * DEG;
      f = F.dir(Math.sin(a), Math.cos(a));
      rest = tok.slice(4);
    }
    fn(m, x, z, kindName === 'web' ? y : y, f, ...rest);
  }
  // Torches: edge t side ('i' inside, 'o' outside) [flame].
  for (const [e, tt, sd, fl] of parse(H.t)) {
    const E = edge(+e), side = sd === 'i' ? 1 : -1, p = E.P(+tt * E.L), off = t / 2 + .22;
    const f = [E.nin[0] * side, E.nin[1] * side];
    torch(m, p[0] + f[0] * off, p[1] + f[1] * off, sd === 'i' ? y : base, f, fl ?? 'o', sd === 'i' ? .7 : 1);
  }
  return { pts, y };
}

// ---------------------------------------------------------------- chambers and tunnels

function tunnelEnds(T) {
  const y0 = T.from === 'lake' ? CITY_Y : floorY(T.from), y1 = floorY(T.to);
  return [y0, y1];
}

// Offset lines of a centreline with mitred joints.
function offsets(pts, half) {
  const L = [], Rr = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = 0, nz = 0;
    for (const [s, e] of [[a, p], [p, b]]) {
      const dx = e[0] - s[0], dz = e[1] - s[1], l = Math.hypot(dx, dz);
      if (l > 1e-6) { nx += -dz / l; nz += dx / l; }
    }
    const l = Math.hypot(nx, nz) || 1;
    nx /= l; nz /= l;
    // Mitre: scale so the wall stays `half` from each segment.
    const dx = b[0] - p[0] || p[0] - a[0], dz = b[1] - p[1] || p[1] - a[1], sl = Math.hypot(dx, dz) || 1;
    const cos = Math.abs(nx * -dz / sl + nz * dx / sl) || 1, k = Math.min(1.8, 1 / cos) * half;
    L.push([p[0] + nx * k, p[1] + nz * k]);
    Rr.push([p[0] - nx * k, p[1] - nz * k]);
  }
  return [L, Rr];
}

// Where the tunnels pierce the chambers' walls: per chamber edge, the gaps (metres along the edge).
function mouths() {
  const out = new Map();
  for (const T of TUNNELS) {
    const half = T.w / 2, [y0, y1] = tunnelEnds(T);
    for (const C of CHAMBERS) {
      const p = C.pts;
      for (let e = 0; e < p.length; e++) {
        const a = p[e], b = p[(e + 1) % p.length];
        for (let i = 0; i < T.pts.length - 1; i++) {
          const c = T.pts[i], d = T.pts[i + 1];
          const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
          const den = r[0] * s[1] - r[1] * s[0];
          if (Math.abs(den) < 1e-9) continue;
          const u = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, v = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          const L = Math.hypot(...r), sl = Math.hypot(...s), sin = Math.abs(den) / (L * sl);
          const g = Math.min(2.5, half / Math.max(sin, .3) + .03);
          const yHere = C.id === T.to ? y1 : y0;
          if (!out.has(C.id)) out.set(C.id, []);
          out.get(C.id).push({ e, s: u * L, g, top: yHere + T.h });
        }
      }
    }
  }
  return out;
}

function buildChamber(m, C, gaps) {
  const p = C.pts, n = p.length, y = CITY_Y + C.y, c = centroid(p), inward = signedArea(p) > 0 ? 1 : -1;
  const hi = i => y + (C.hi?.[i] ?? C.ceil);
  fan(m, p, c, () => y, y, M(C.floor), 1);
  fan(m, p, c, hi, y + (C.cc ?? C.ceil + .5), M(C.roof ?? 'bedrock'), -1);
  polyFloor(p, y);
  for (let e = 0; e < n; e++) {
    const a = p[e], b = p[(e + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nin = [-uz * inward, ux * inward];
    const P = s => [a[0] + ux * s, a[1] + uz * s], H = s => lerp(hi(e), hi((e + 1) % n), s / L);
    const wall = (s0, s1, yb0, yb1, ytop) => {
      if (s1 - s0 < .02) return;
      const A = P(s0), B = P(s1);
      quad(m, [A[0], yb0, A[1]], [B[0], yb1, B[1]], [B[0], ytop(s1), B[1]], [A[0], ytop(s0), A[1]], M(C.ew?.[e] ?? C.rock), [nin[0], 0, nin[1]], .95);
    };
    let pos = 0;
    for (const g of (gaps.get(C.id) ?? []).filter(g => g.e === e).sort((q, r) => q.s - r.s)) {
      const s0 = Math.max(0, g.s - g.g), s1 = Math.min(L, g.s + g.g);
      if (s0 > pos) { wall(pos, s0, y - .3, y - .3, H); wallBlock(P(pos), P(s0), .05, y - .3, y + 6); }
      wall(s0, s1, g.top, g.top, H);
      pos = s1;
    }
    if (L > pos) { wall(pos, L, y - .3, y - .3, H); wallBlock(P(pos), P(L), .05, y - .3, y + 6); }
  }
  for (const [x, z, r, mat] of C.pillars ?? []) {
    m.rod([x, y - .2, z], [x, y + (C.cc ?? C.ceil + .5) + .2, z], r, r * .82, M(mat ?? C.rock), 9, .95);
    roundBlock(x, z, r, y - .2, y + 5);
  }
}

function buildTunnel(m, T) {
  const half = T.w / 2, [ya, yb] = tunnelEnds(T), pts = T.pts;
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1];
  const ys = T.ys ? T.ys.map(v => CITY_Y + v) : lens.map(l => lerp(ya, yb, l / total));
  const [Lw, Rw] = offsets(pts, half);
  const out = (i, s) => !insideAnyRoom(lerp(pts[i][0], pts[i + 1][0], s), lerp(pts[i][1], pts[i + 1][1], s));
  for (let i = 0; i < pts.length - 1; i++) {
    bandFloor(pts[i], pts[i + 1], half + .08, ys[i], ys[i + 1]);
    // Find the stretches of this segment that lie in rock (outside every room), refined by bisection.
    const len = lens[i + 1] - lens[i], steps = Math.max(2, Math.ceil(len / .5));
    const runs = [];
    let start = out(i, 0) ? 0 : null;
    for (let k = 1; k <= steps; k++) {
      const s = k / steps, o = out(i, s);
      if (o && start === null || !o && start !== null) {
        let lo = (k - 1) / steps, hi = s;
        for (let j = 0; j < 14; j++) { const mid = (lo + hi) / 2; if (out(i, mid) === o) hi = mid; else lo = mid; }
        if (o) start = hi; else { runs.push([start, lo]); start = null; }
      }
    }
    if (start !== null) runs.push([start, 1]);
    for (const [s0, s1] of runs) {
      const l0 = lerp(Lw[i], Lw[i + 1], s0), l1 = lerp(Lw[i], Lw[i + 1], s1), r0 = lerp(Rw[i], Rw[i + 1], s0), r1 = lerp(Rw[i], Rw[i + 1], s1);
      const y0 = lerp(ys[i], ys[i + 1], s0), y1 = lerp(ys[i], ys[i + 1], s1), h = T.h;
      const dir = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]], dl = Math.hypot(...dir), nx = -dir[1] / dl, nz = dir[0] / dl;
      quad(m, [l0[0], y0, l0[1]], [l1[0], y1, l1[1]], [r1[0], y1, r1[1]], [r0[0], y0, r0[1]], M(T.floor), [0, 1, 0]);
      quad(m, [l0[0], y0 + h, l0[1]], [l1[0], y1 + h, l1[1]], [r1[0], y1 + h, r1[1]], [r0[0], y0 + h, r0[1]], M(T.ceil ?? 'bedrock2'), [0, -1, 0], .9);
      quad(m, [l0[0], y0 - .1, l0[1]], [l1[0], y1 - .1, l1[1]], [l1[0], y1 + h, l1[1]], [l0[0], y0 + h, l0[1]], M(T.wall), [-nx, 0, -nz], .95);
      quad(m, [r0[0], y0 - .1, r0[1]], [r1[0], y1 - .1, r1[1]], [r1[0], y1 + h, r1[1]], [r0[0], y0 + h, r0[1]], M(T.wall2 ?? T.wall), [nx, 0, nz], .95);
      wallBlock(l0, l1, .04, Math.min(y0, y1) - .2, Math.max(y0, y1) + h);
      wallBlock(r0, r1, .04, Math.min(y0, y1) - .2, Math.max(y0, y1) + h);
    }
  }
  // Torches on the tunnel walls: segment s side(l|r) [flame].
  for (const [si, s, side, fl] of parse(T.t)) {
    const i = +si, k = +s, line = side === 'l' ? Lw : Rw;
    const p = lerp(line[i], line[i + 1], k);
    const dir = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]], dl = Math.hypot(...dir);
    const f = side === 'l' ? [dir[1] / dl, -dir[0] / dl] : [-dir[1] / dl, dir[0] / dl];
    torch(m, p[0] + f[0] * .22, p[1] + f[1] * .22, lerp(ys[i], ys[i + 1], k), f, fl ?? 'o', .8);
  }
  // Pictures on the tunnel walls: kind segment s side.
  for (const [kind, si, s, side] of parse(T.x)) {
    const i = +si, k = +s, line = side === 'l' ? Lw : Rw, p = lerp(line[i], line[i + 1], k);
    const dir = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]], dl = Math.hypot(...dir);
    const f = side === 'l' ? [dir[1] / dl, -dir[0] / dl] : [-dir[1] / dl, dir[0] / dl];
    const yy = lerp(ys[i], ys[i + 1], k);
    const pic = { paint: 'cavePainting', graffiti: 'graffiti', glyphs: 'glyphs', web: 'cobweb', drip: 'dripMoss2', hole: 'wallHole2', relief: 'shrineRelief2', tally: 'tally' }[kind];
    stand(m, p[0] + f[0] * .015, p[1] + f[1] * .015, f, .9, yy + .45, yy + 1.45, M(pic));
  }
}

// ---------------------------------------------------------------- stalls and features

function buildStall(m, St) {
  const y = floorY(St.c), a = (St.a ?? 0) * DEG, f = [Math.sin(a), Math.cos(a)], rx = f[1], rz = -f[0];
  const { x, z } = St, w = St.w ?? 2.0, d = St.d ?? 1.2, P = (u, v) => [x + rx * u + f[0] * v, z + rz * u + f[1] * v];
  if (St.ground) {
    flat(m, x, z, f, w, d, y + .012, M(St.mat ?? 'strawMat'));
    flat(m, x - f[0] * .05, z - f[1] * .05, f, w * .8, d * .7, y + .02, M(St.g));
    for (const [u, v] of [[-w / 2 + .3, -d / 2 - .1], [w / 2 - .25, -d / 2 - .05]]) {
      const [px, pz] = P(u, v);
      lathe(m, px, y, pz, [[0, .2], [.3, .26], [.34, .24]], M('reedWall'), 7);
    }
  } else {
    box(m, x, z, f, w, d, y, y + .82, M(St.body ?? 'oldPlanks'));
    flat(m, x, z, f, w - .08, d - .08, y + .825, M(St.g));
    boxBlock(x, z, f, w, d, y, y + .85);
  }
  const back = -d / 2 - .25, front = d / 2 + .35;
  for (const [u, v] of [[-w / 2, back], [w / 2, back], [-w / 2, front], [w / 2, front]]) {
    const [px, pz] = P(u, v);
    rod(m, [px, y, pz], [px, y + (v === back ? 2.35 : 2.05), pz], .04, M('splitLog'), 4);
    roundBlock(px, pz, .05, y, y + 2);
  }
  const [b0x, b0z] = P(-w / 2 - .05, back), [b1x, b1z] = P(w / 2 + .05, back), [f0x, f0z] = P(-w / 2 - .05, front + .25), [f1x, f1z] = P(w / 2 + .05, front + .25);
  quad(m, [b0x, y + 2.4, b0z], [b1x, y + 2.4, b1z], [f1x, y + 1.95, f1z], [f0x, y + 1.95, f0z], M(St.aw ?? 'tentStripe'), [f[0] * .3, -1, f[1] * .3]);
  quad(m, [b0x, y + 2.41, b0z], [b1x, y + 2.41, b1z], [f1x, y + 1.96, f1z], [f0x, y + 1.96, f0z], M(St.aw ?? 'tentStripe'), [-f[0] * .3, 1, -f[1] * .3]);
  if (St.back) {
    const [bx, bz] = P(0, back + .02);
    stand(m, bx, bz, f, w, y + .2, y + 2.3, M(St.back));
  }
  if (St.hang) {
    const [hx, hz] = P(0, front + .1);
    stand(m, hx, hz, f, w * .7, y + 1.15, y + 1.92, M(St.hang));
    stand(m, hx, hz, [-f[0], -f[1]], w * .7, y + 1.15, y + 1.92, M(St.hang));
  }
  if (St.sign) {
    const [sx, sz] = P(w / 2 + .1, front);
    stand(m, sx, sz, f, .8, y + 1.25, y + 2.0, M('signCloth'));
  }
  for (const it of parse(St.i)) {
    const [px, pz] = P(+it[1], +it[2]), fa = +(it[3] ?? 0) * DEG;
    const ff = [Math.sin(a + fa), Math.cos(a + fa)];
    ITEMS[it[0]](m, px, pz, y, ff, ...it.slice(4));
  }
}

const FEATURE = {
  // A water channel: water at floor level between low stone kerbs, broken where bridges cross.
  canal(m, F) {
    const y = floorY(F.c), half = F.w / 2, [L, Rr] = offsets(F.pts, half);
    for (let i = 0; i < F.pts.length - 1; i++) {
      quad(m, [L[i][0], y + .03, L[i][1]], [L[i + 1][0], y + .03, L[i + 1][1]], [Rr[i + 1][0], y + .03, Rr[i + 1][1]], [Rr[i][0], y + .03, Rr[i][1]], U.lakeWater, [0, 1, 0]);
      for (const line of [L, Rr]) {
        const open = (F.open ?? []).some(([seg, s0, s1]) => seg === i);
        const pieces = open ? (F.open.filter(([seg]) => seg === i).reduce((acc, [, s0, s1]) => {
          const last = acc.pop(); acc.push([last[0], s0], [s1, 1]); return acc;
        }, [[0, 1]])) : [[0, 1]];
        for (const [s0, s1] of pieces) {
          if (s1 - s0 < .01) continue;
          const A = lerp(line[i], line[i + 1], s0), B = lerp(line[i], line[i + 1], s1);
          slab(m, A, B, y - .05, y + .32, .3, M(F.kerb ?? 'roughBlock'));
          wallBlock(A, B, .15, y - .05, y + .4);
        }
      }
    }
  },
  bridge(m, F) {
    const y = floorY(F.c), a = F.a * DEG, f = [Math.sin(a), Math.cos(a)], rx = f[1], rz = -f[0], { x, z } = F, l = F.len, w = F.w ?? 1.0;
    const P = (u, v, h) => [x + rx * u + f[0] * v, y + h, z + rz * u + f[1] * v];
    quad(m, P(-w / 2, -l / 2, .36), P(w / 2, -l / 2, .36), P(w / 2, l / 2, .36), P(-w / 2, l / 2, .36), M('ropeBridge'), [0, 1, 0], 1,
      [[0, 0], [1, 0], [1, 1], [0, 1]]);
    for (const s of [-1, 1]) {
      rod(m, P(s * w / 2, -l / 2, .9), P(s * w / 2, l / 2, .9), .02, S.rope, 4);
      for (const v of [-l / 2, l / 2]) rod(m, P(s * w / 2, v, 0), P(s * w / 2, v, 1.0), .05, M('splitLog'), 4);
      wallBlock(P(s * (w / 2 + .05), -l / 2, 0).filter((_, i) => i !== 1), P(s * (w / 2 + .05), l / 2, 0).filter((_, i) => i !== 1), .03, y, y + 1);
    }
  },
  rubble(m, F) { rubble(m, F.x, F.z, floorY(F.c), F.r, F.h ?? .5, F.mat ?? 'rubble2'); if ((F.h ?? .5) > .3) roundBlock(F.x, F.z, F.r * .75, floorY(F.c), floorY(F.c) + (F.h ?? .5)); },
  fallen(m, F) {
    const y = floorY(F.c), a = F.a * DEG, f = [Math.sin(a), Math.cos(a)];
    rod(m, [F.x - f[0] * F.len / 2, y + F.r, F.z - f[1] * F.len / 2], [F.x + f[0] * F.len / 2, y + F.r * .9, F.z + f[1] * F.len / 2], F.r, M(F.mat ?? 'polColumn'), 8);
    boxBlock(F.x, F.z, f, F.r * 2, F.len, y, y + F.r * 2);
  },
  // Where the roof has come down: a heap, roots hanging from the broken rock above, a shaft of dust.
  collapse(m, F) {
    const y = floorY(F.c), C = chamberById.get(F.c), top = y + (C.cc ?? C.ceil + .5) - .05;
    rubble(m, F.x, F.z, y, F.r, F.h ?? 1.1, 'rubble2');
    rubble(m, F.x + F.r * .5, F.z - F.r * .3, y, F.r * .6, (F.h ?? 1.1) * .7, 'rubbleBrick');
    roundBlock(F.x, F.z, F.r * .8, y, y + 2);
    flat(m, F.x, F.z, [0, 1], F.r * 2.2, F.r * 2.2, top, M('brokenCeil2'), -1);
  },
  shrine(m, F) {
    const y = floorY(F.c), { x, z } = F;
    lathe(m, x, y, z, [[0, 1.9], [.25, 1.85], [.3, 1.5], [.55, 1.45], [.6, 1.1], [1.0, 1.0], [1.05, 1.15], [1.15, 1.15]], M('polSandstone'), 12);
    lathe(m, x, y + 1.15, z, [[0, .95], [.25, .7]], PROPS.castIron, 12);
    flat(m, x, z, [0, 1], 1.5, 1.5, y + 1.4, M('embers2'));
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 4;
      stand(m, x, z, [Math.sin(a), Math.cos(a)], 1.6, y + 1.35, y + 3.6, M(i % 2 ? 'flame2' : 'flame'));
    }
    roundBlock(x, z, 1.9, y, y + 3);
    lamps.push([x, y + 2.6, z, 4.0, 0]);
    for (const [dx, dz, a] of F.reliefs ?? []) stand(m, x + dx, z + dz, [Math.sin(a * DEG), Math.cos(a * DEG)], 1.6, y + .3, y + 1.9, M(a % 2 ? 'shrineRelief2' : 'shrineRelief'));
  },
  well(m, F) {
    const y = floorY(F.c), { x, z } = F, r = F.r ?? 2.2;
    lathe(m, x, y, z, [[0, r + .3], [.75, r + .3], [.8, r + .38], [.85, r + .2], [.85, r]], M('roughBlock'), 14);
    lathe(m, x, y - 3.4, z, [[0, r - .1], [3.4, r]], M('mudStone'), 14);
    // Steps spiral down the inside of the shaft.
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + .3, sx = x + Math.cos(a) * (r - .45), sz = z + Math.sin(a) * (r - .45);
      m.box(sx, y - .3 - i * .26, sz, .7, .14, .5, M('wornSteps'), .9);
    }
    flat(m, x, z, [0, 1], r * 1.6, r * 1.6, y - 3.2, U.lakeWater);
    roundBlock(x, z, r + .3, y, y + .9);
  },
  bath(m, F) {
    const y = floorY(F.c), a = (F.a ?? 0) * DEG, f = [Math.sin(a), Math.cos(a)], { x, z } = F, w = F.w, d = F.d;
    flat(m, x, z, f, w + 1.6, d + 1.6, y + .01, M('brokenTiles'));
    flat(m, x, z, f, w, d, y - .35, U.hotSpring);
    const rx = f[1], rz = -f[0], P = (u, v) => [x + rx * u + f[0] * v, z + rz * u + f[1] * v];
    const corners = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    for (let i = 0; i < 4; i++) {
      slab(m, corners[i], corners[(i + 1) % 4], y - .9, y + .28, .3, M(F.edge ?? 'polWorn'));
      wallBlock(corners[i], corners[(i + 1) % 4], .15, y - .9, y + .4);
    }
    boxBlock(x, z, f, w, d, y - .5, y + .3);
    lamps.push([x, y + .6, z, .5, 1]);
  },
  // A hanging iron cage on a chain, or one standing on the floor.
  cage(m, F) {
    const y = floorY(F.c), C = chamberById.get(F.c), s = F.s ?? 1.2, y0 = y + (F.up ?? 0), { x, z } = F;
    for (const f of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      stand(m, x + f[0] * s / 2, z + f[1] * s / 2, f, s, y0, y0 + s * 1.3, M('cage'));
      stand(m, x + f[0] * s / 2, z + f[1] * s / 2, [-f[0], -f[1]], s, y0, y0 + s * 1.3, M('cage'));
    }
    flat(m, x, z, [0, 1], s, s, y0 + s * 1.3, M('rustPlate', 'u'), 1);
    flat(m, x, z, [0, 1], s, s, y0 + .02, M('rustPlate', 'u'), 1);
    if (F.up) rod(m, [x, y0 + s * 1.3, z], [x, y + (C.cc ?? C.ceil + .5), z], .03, S.chain, 4);
    if ((F.up ?? 0) < 1.4) roundBlock(x, z, s * .7, y0, y0 + s * 1.3);
  },
  tower(m, F) {
    const y = floorY(F.c), { x, z } = F, s = F.s, h = F.h;
    for (const f of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      slab(m, [x + f[0] * s / 2 - f[1] * s / 2, z + f[1] * s / 2 + f[0] * s / 2], [x + f[0] * s / 2 + f[1] * s / 2, z + f[1] * s / 2 - f[0] * s / 2], y - .1, y + h, .5, M('flatStone'));
      stand(m, x + f[0] * (s / 2 + .26), z + f[1] * (s / 2 + .26), f, s, y + h - 2.0, y + h, M('guardWall'));
      stand(m, x + f[0] * (s / 2 + .26), z + f[1] * (s / 2 + .26), f, 1.2, y, y + 2.0, M(f[0] ? 'cellDoor' : 'portcullis'));
    }
    roundBlock(x, z, s * .7, y, y + h);
  },
  // Burial niches and urns cut into a chamber wall: pictures in a row, set by hand.
  niches(m, F) {
    const y = floorY(F.c);
    for (const [x, z, a, pic, w, h, y0] of F.list) {
      const f = [Math.sin(a * DEG), Math.cos(a * DEG)];
      stand(m, x, z, f, w ?? 1.6, y + (y0 ?? 0), y + (y0 ?? 0) + (h ?? 1.8), pic.includes(':') ? M(pic) : M(pic));
    }
  },
  // Free items on a chamber floor (outside the houses).
  items(m, F) {
    const y = floorY(F.c);
    for (const tok of parse(F.i)) {
      const a = +(tok[3] ?? 0) * DEG;
      ITEMS[tok[0]](m, +tok[1], +tok[2], y, [Math.sin(a), Math.cos(a)], ...tok.slice(4));
    }
  },
  // A raised platform with a front wall and steps; houses on it use base: its height.
  terrace(m, F) {
    const y0 = floorY(F.c), y = y0 + F.h, p = F.p, c = centroid(p);
    fan(m, p, c, () => y, y, M(F.floor ?? 'flatStone'), 1);
    polyFloor(p, y);
    for (let e = 0; e < p.length; e++) {
      const a = p[e], b = p[(e + 1) % p.length];
      if ((F.free ?? []).includes(e)) continue;
      slab(m, a, b, y0 - .1, y + (F.parapet?.includes(e) ? .9 : .02), .3, M(F.wall ?? 'fieldStone'));
      wallBlock(a, b, .15, y0 - .1, y + (F.parapet?.includes(e) ? .9 : .02));
    }
    for (const [x, z, a, w, len] of F.steps ?? []) {
      const f = [Math.sin(a * DEG), Math.cos(a * DEG)], n = Math.ceil(F.h / .18);
      for (let i = 0; i < n; i++) {
        const v = -len / 2 + (i + .5) * len / n;
        m.box(x + f[0] * v, y0 + (i + 1) * F.h / n / 2, z + f[1] * v, Math.abs(f[1]) > .5 ? w : len / n, (i + 1) * F.h / n, Math.abs(f[1]) > .5 ? len / n : w, M('smallSteps'), .95);
      }
      bandFloor([x - f[0] * len / 2, z - f[1] * len / 2], [x + f[0] * len / 2, z + f[1] * len / 2], w / 2, y0, y);
    }
  },
};

// ---------------------------------------------------------------- the whole city

let city = null;
export function buildCity() {
  if (city) return city;
  blockers.clear(); floorCells.clear(); lamps = [];
  const m = new Mesh(), gaps = mouths();
  for (const C of CHAMBERS) buildChamber(m, C, gaps);
  for (const T of TUNNELS) buildTunnel(m, T);
  for (const F of FEATURES) {
    if (!FEATURE[F.k]) throw new Error(`city: unknown feature ${F.k}`);
    FEATURE[F.k](m, F);
  }
  for (const H of HOUSES) buildHouse(m, H);
  for (const H of CELLS) buildHouse(m, H, 'cell');
  for (const St of STALLS) buildStall(m, St);
  for (const [x, z, c, fl, fx, fz] of TORCHES) torch(m, x, z, floorY(c), fx === undefined ? null : [fx, fz], fl ?? 'o', 1);
  city = { mesh: m, lamps };
  return city;
}
export function cityLamps() { return buildCity().lamps; }
