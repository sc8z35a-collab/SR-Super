import { BASE, local, buildingDistance, ENTRY, entryTop } from './layout.js';
export { BASE, ANGLE, world, local } from './layout.js';
export const TAU=Math.PI*2;
export const LIMITS=[56,37];

export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export function smooth(a, b, n) {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function hash(x, z) {
  let n = Math.imul(x, 374761393) + Math.imul(z, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export function noise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(0, 1, x - ix);
  const fz = smooth(0, 1, z - iz);
  return lerp(
    lerp(hash(ix, iz), hash(ix + 1, iz), fx),
    lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), fx),
    fz
  );
}

export function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function radius(t) {
  const headlands=.94 + .092 * Math.sin(3 * t - .9) + .115 * Math.cos(2 * t + .21)
    + .066 * Math.sin(5 * t + .15) + .036 * Math.cos(9 * t - .7)
    + .025 * Math.sin(13 * t + 2.1) + .012 * Math.cos(22 * t + .2);
  const shelf=(Math.abs(Math.cos(t))**3.4+Math.abs(Math.sin(t))**3.4)**(-1/3.4);
  const ledges=.94+.012*Math.sin(9*t+.12)+.016*Math.cos(12*t)+.014*Math.sin(17*t-.47);
  return lerp(headlands,shelf*ledges,.49);
}

const coastBounds = [Infinity, -Infinity, Infinity, -Infinity];
for (let i = 0; i < 2048; i++) {
  const a = i / 2048 * TAU;
  const r = radius(a);
  const x = r * Math.cos(a);
  const z = r * Math.sin(a);
  coastBounds[0] = Math.min(coastBounds[0], x);
  coastBounds[1] = Math.max(coastBounds[1], x);
  coastBounds[2] = Math.min(coastBounds[2], z);
  coastBounds[3] = Math.max(coastBounds[3], z);
}

export function shore(theta, radial = 1) {
  const r = radius(theta) * radial;
  return [
    (r * Math.cos(theta) - coastBounds[0]) * 80 / (coastBounds[1] - coastBounds[0]) - 40,
    (r * Math.sin(theta) - coastBounds[2]) * 50 / (coastBounds[3] - coastBounds[2]) - 25
  ];
}

export function coast(x, z) {
  const nx = (x + 40) * (coastBounds[1] - coastBounds[0]) / 80 + coastBounds[0];
  const nz = (z + 25) * (coastBounds[3] - coastBounds[2]) / 50 + coastBounds[2];
  const t = Math.atan2(nz, nx);
  const r = radius(t);
  const stretch = Math.hypot(
    Math.cos(t) * 80 / (coastBounds[1] - coastBounds[0]),
    Math.sin(t) * 50 / (coastBounds[3] - coastBounds[2])
  );
  return (r - Math.hypot(nx, nz)) * stretch;
}

export function ground(x, z) {
  const d = coast(x, z);
  const n = noise(x * .16 + 49, z * .16) - .5;
  const grain = noise(x * .52, z * .48 + 70) - .5;
  if (d < 0) {
    const shelf = smooth(0, 8.5, -d);
    return d * (.34 + (n + .5) * .36) - shelf * 1.9 + grain * shelf * 1.05;
  }

  const highGround = 5.55 + 2.15 * (noise(x * .057 + 71, z * .056) - .45)
    + 1.7 * n;
  const escarpment = smooth(-.24, 4.95 + n * 4.5, d);
  const strata = Math.sin(d * 1.55 + 2.6 * n + .054 * x - .037 * z);
  const faults = 1 - smooth(.015,.26,Math.abs(noise(x*.15 + z*.028, z*.12 + 42) - .51));
  const fracture = Math.pow(faults,2.6) * (.67 + .35 * grain);
  const terrace = (.82 * strata + grain * 1.58 - fracture * 2.24);
  const cliff = terrace * Math.sin(Math.PI * escarpment);
  const inlandHills = 1.4 * smooth(14, 34, Math.abs(x)) * smooth(1.5, 13, d);
  const natural = highGround * escarpment + cliff + inlandHills;

  const [bx, bz] = local(x, z);
  const footprint=buildingDistance(bx,bz);
  const settling=(1-smooth(-.32,4.20,footprint))*smooth(.33,3.6,d);
  const steps=(1-smooth(ENTRY.half+.16,ENTRY.half+1.35,Math.abs(bx)))
    *smooth(ENTRY.inner,ENTRY.edge+.18,bz)
    *(1-smooth(ENTRY.edge+ENTRY.length-.15,ENTRY.edge+ENTRY.length+1.5,bz));
  return lerp(lerp(natural,BASE-.23,settling),BASE+entryTop(bz)-.18,steps*.98);
}

export function groundNormal(x, z) {
  const delta = .16;
  const a = ground(x - delta, z) - ground(x + delta, z);
  const b = ground(x, z - delta) - ground(x, z + delta);
  const length = Math.hypot(a, delta * 2, b);
  return [a / length, 2 * delta / length, b / length];
}

export function coastMap() {
  const width = 512;
  const height = 336;
  const data = new Uint8Array(width * height * 4);
  for (let j = 0; j < height; j++) {
    const z = ((j + .5) / height * 2 - 1) * LIMITS[1];
    for (let i = 0; i < width; i++) {
      const x = ((i + .5) / width * 2 - 1) * LIMITS[0];
      const at = (j * width + i) * 4;
      const value = Math.round(clamp((ground(x, z) + 14) / 24) * 65535);
      data[at] = value >> 8;
      data[at + 1] = value & 255;
      data[at + 2] = Math.round(clamp((coast(x, z) + 13) / 35) * 255);
      data[at + 3] = 255;
    }
  }
  return { width, height, data };
}

export function islandMesh(mesh, detailed) {
  // The photographic land cover carries the small-scale detail, so the grid can stay coarse.
  const cols = detailed ? 128 : 74;
  const rows = detailed ? 90 : 54;
  const points = [];
  const normals = [];
  const rng = random(288);
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols * 2 - 1) * 47 + (rng() - .5) * (detailed ? .43 : .62);
      const z = (j / rows * 2 - 1) * 30 + (rng() - .5) * (detailed ? .39 : .57);
      points.push([x, ground(x, z), z]);
      normals.push(groundNormal(x, z));
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const d = a + cols + 1;
      const c = d + 1;
      if (Math.max(points[a][1], points[b][1], points[c][1], points[d][1]) < -.57) continue;
      mesh.tri(points[a], points[d], points[b], 0, 1, [normals[a], normals[d], normals[b]]);
      mesh.tri(points[b], points[d], points[c], 0, 1, [normals[b], normals[d], normals[c]]);
    }
  }
}

export function shorelineRocks(mesh) {
  const rng = random(982);
  for (let i = 0; i < 520; i++) {
    const angle = rng() * TAU;
    const cluster = .45 + .26 * Math.sin(angle * 6.0 + .4) + .19 * Math.cos(angle * 11);
    if (rng() > cluster + .12) continue;
    const [x, z] = shore(angle, .63 + .43 * Math.pow(rng(), .55));
    const [ox,oz]=local(x,z);
    if(buildingDistance(ox,oz)<.12||
      (Math.abs(ox)<ENTRY.half+.8&&oz>ENTRY.inner&&oz<ENTRY.edge+ENTRY.length+1.1))continue;
    const h = ground(x, z);
    if (h < -1.0) continue;
    const n = groundNormal(x, z);
    const big = Math.pow(rng(), 2.9);
    const w = .20 + big * (n[1] < .83 ? 2.40 : 1.10);
    const r = w * (.55 + rng() * .55);
    const hy = w * (.40 + .75 * rng());
    const tilt = rng() * TAU;
    const num = 6 + Math.floor(rng() * 4);
    const base = [];
    const middle = [];
    const top = [];
    const rockTint = .75 + .25 * rng();
    const off = (rng() - .5) * .65;
    for (let p = 0; p < num; p++) {
      const a = (p + .18 * rng()) / num * TAU;
      const u = Math.cos(a) * w * (.83 + .28 * rng());
      const v = Math.sin(a) * r * (.81 + .34 * rng());
      const px = Math.cos(tilt) * u - Math.sin(tilt) * v;
      const pz = Math.sin(tilt) * u + Math.cos(tilt) * v;
      base.push([x + px * .74, h - hy * .73 - n[0] * px - n[2] * pz, z + pz * .74]);
      middle.push([x + px, h + hy * (.05 + .39 * rng()), z + pz]);
      const s = .31 + .45 * rng();
      top.push([x + px * s + w * off, h + hy * (.72 + .36 * rng()), z + pz * s]);
    }
    const peak = [x + w * off, h + hy * .96, z];
    for (let p = 0; p < num; p++) {
      const q = (p + 1) % num;
      mesh.quad(base[q], base[p], middle[p], middle[q], 7, rockTint);
      mesh.quad(middle[q], middle[p], top[p], top[q], 7, rockTint);
      mesh.tri(top[q], top[p], peak, 7, rockTint);
    }
  }
}

export function meadow(mesh, maxTufts) {
  const rng = random(701);
  let count = 0;
  for (let i = 0; i < 20000 && count < maxTufts; i++) {
    const x = (rng() * 2 - 1) * 41;
    const z = (rng() * 2 - 1) * 26;
    const d = coast(x, z);
    if (d < 2.7 || rng() > .37 + noise(x * .11, z * .11 + 2) * .55) continue;
    const [bx, bz] = local(x, z);
    if(buildingDistance(bx,bz)<.72||
      (Math.abs(bx)<ENTRY.half+.82&&bz>ENTRY.inner&&bz<ENTRY.edge+ENTRY.length+1.1))continue;
    const normal = groundNormal(x, z);
    if (normal[1] < .75) continue;
    const y = ground(x, z) - .025;
    const blades = 3 + Math.floor(rng() * 3);
    const tall = .13 + .34 * Math.pow(rng(), 2.2);
    for (let p = 0; p < blades; p++) {
      const a = rng() * TAU;
      const w = .033 + rng() * .065;
      const ox = x + (rng() - .5) * .3;
      const oz = z + (rng() - .5) * .3;
      const qx = Math.cos(a) * w;
      const qz = Math.sin(a) * w;
      const tip = [ox - qz * 2.3 + .08, y + tall * (.57 + rng() * .75), oz + qx * 2.2];
      const tint = .63 + .36 * rng();
      mesh.tri([ox - qx, y, oz - qz], [ox + qx, y, oz + qz], tip, 8, tint,
        [[.12, .96, .14], [.12, .96, .14], [.15, .96, .12]], [[0, 0], [1, 0], [.5, 1]]);
    }
    count++;
  }
}
