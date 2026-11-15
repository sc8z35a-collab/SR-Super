import { Mesh } from './mesh.js';
import { TAU } from './terrain.js';
import { buildWalkways } from './walkways.js';
import { FLOORS, ROOF_HEIGHT, shaftHeight } from './layout.js';
import { SURFACE } from './surfaces.js';

const STONE = 1;
const SLATE = 2;
const GLASS = 3;
const OAK = 4;
const METAL = 5;
const PAVING = 6;
const TRIM = 9;
const DARK = 10;
const LIGHT = 11;
const LEAD = 12;

function plane(x, z, dx, dz) {
  return (u, y, n = 0) => [x + dx * u - dz * n, y, z + dz * u + dx * n];
}

function arch(r, spring, rise, segments = 12) {
  const off = r * .68;
  const circle = r + off;
  const end = Math.acos(off / circle);
  const scale = rise / (circle * Math.sin(end));
  const left = [];
  for (let i = 0; i <= segments; i++) {
    const a = i * end / segments;
    left.push([off - circle * Math.cos(a), spring + circle * Math.sin(a) * scale]);
  }
  return left.concat(left.slice(0, -1).reverse().map(([x, y]) => [-x, y]));
}

function outline(r, bottom, spring, rise, segments) {
  return [[-r, bottom], ...arch(r, spring, rise, segments), [r, bottom]];
}

function mappedQuad(m, p, a, b, c, d, material, tint = 1, facing) {
  m.quad(p(...a), p(...b), p(...c), p(...d), material, tint, facing);
}

function rectangle(m, p, x1, y1, x2, y2, z, material, tint = 1, reverse = false) {
  const points = [[x1, y1, z], [x2, y1, z], [x2, y2, z], [x1, y2, z]];
  if (reverse) points.reverse();
  mappedQuad(m, p, ...points, material, tint);
}

function band(m, p, a, b, za, zb, material, tint = 1, reverse = false) {
  for (let i = 0; i < a.length - 1; i++) {
    const q = [[...a[i], za], [...a[i + 1], za], [...b[i + 1], zb], [...b[i], zb]];
    if (reverse) q.reverse();
    mappedQuad(m, p, ...q, material, tint);
  }
}

function ring(cx, cy, r, count = 48, phase = 0) {
  return Array.from({length: count + 1}, (_, i) => {
    const a = i / count * TAU + phase;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

function inset(m, p, r, sill, spring, rise, offset, depth, material, tint = 1) {
  const top = arch(r, spring, rise);
  const uv = (x, y) => [(x + r) / (r * 2), (y - sill) / (spring + rise - sill)];
  for (let j = 0; j < top.length - 1; j++) {
    const [a, ay] = top[j];
    const [b, by] = top[j + 1];
    m.quad(p(offset + a, sill, depth), p(offset + b, sill, depth),
      p(offset + b, by, depth), p(offset + a, ay, depth), material, tint, undefined,
      [uv(a, sill), uv(b, sill), uv(b, by), uv(a, ay)]);
  }
}

function sillBox(m, p, w, low, high, front, rear, mat = TRIM, shade = 1) {
  const r = w / 2;
  rectangle(m, p, -r, low, r, high, front, mat, shade);
  rectangle(m, p, -r, low, r, high, rear, mat, shade * .94, true);
  mappedQuad(m, p, [-r, high, front], [r, high, front], [r, high, rear], [-r, high, rear], mat, shade);
  mappedQuad(m, p, [-r, low, rear], [r, low, rear], [r, low, front], [-r, low, front], mat, shade);
  mappedQuad(m, p, [r, low, front], [r, low, rear], [r, high, rear], [r, high, front], mat, shade);
  mappedQuad(m, p, [-r, low, rear], [-r, low, front], [-r, high, front], [-r, high, rear], mat, shade);
}

function pointedWall(m, p, w, low, high, thick, shape, tone = 1) {
  const { r, sill, spring, rise, kind } = shape;
  const base = outline(r, sill, spring, rise);
  const inner = outline(r * .91, sill, spring, rise * .94);
  for (const [z, backwards] of [[0, false], [-thick, true]]) {
    rectangle(m, p, -w / 2, low, -r, high, z, STONE, tone, backwards);
    rectangle(m, p, r, low, w / 2, high, z, STONE, tone, backwards);
    if (sill > low) rectangle(m, p, -r, low, r, sill, z, STONE, tone, backwards);
    const points = arch(r, spring, rise);
    for (let i = 0; i < points.length - 1; i++) {
      const [a, ay] = points[i];
      const [b, by] = points[i + 1];
      const face = [[a, ay, z], [b, by, z], [b, high, z], [a, high, z]];
      if (backwards) face.reverse();
      mappedQuad(m, p, ...face, STONE, tone);
    }
  }
  const deep = kind === 'portal' ? .84 : .49;
  band(m, p, base, inner, 0, -thick * deep, TRIM, .75, true);
  band(m, p, inner, base, -thick * deep, -thick, STONE, .84, true);

  const scale = kind === 'portal' ? .24 : .11;
  for (const [d1, d2, h1, h2, tint] of [
    [scale * 1.85, scale * 1.34, .025, scale * .71, .93],
    [scale * 1.34, scale * .72, scale * .71, scale * .61, 1.07],
    [scale * .72, 0, scale * .61, -.028, .86]
  ]) {
    const a = outline(r + d1, sill, spring, rise + d1 * .82);
    const b = outline(r + d2, sill, spring, rise + d2 * .82);
    band(m, p, a, b, h1, h2, TRIM, tint, true);
  }
  if (kind !== 'portal' && kind !== 'doorway') {
    sillBox(m, p, r * 2 + .42, sill - .135, sill + .018, .22, -thick - .14);
    m.quad(p(-r - .045, sill + .02, .095), p(r + .045, sill + .02, .095),
      p(r + .045, sill + .105, -thick * .49), p(-r - .045, sill + .105, -thick * .49), TRIM, .92);
  }

  const insetDepth = -thick * deep - .012;
  if (kind === 'louver') {
    inset(m, p, r * .915, sill, spring, rise * .93, 0, insetDepth - .07, DARK, .78);
    for (let y = sill + .16; y < spring + rise * .79; y += .22) {
      const wide = r * .86 * (y > spring ? Math.pow(1 - (y - spring) / rise, .59) : 1);
      if (wide < .05) continue;
      mappedQuad(m, p, [-wide, y, insetDepth - .04], [wide, y, insetDepth - .04],
        [wide, y + .12, insetDepth + .082], [-wide, y + .12, insetDepth + .082], OAK, .42);
    }
    return;
  }
  if (kind === 'portal') {
    inset(m, p, r * .918, sill, spring, rise * .93, 0, insetDepth, SURFACE.doorOak, .74);
    rectangle(m, p, -.032, sill, .032, spring + rise * .93, insetDepth + .014, DARK, .56);
    for (const dir of [-1, 1]) {
      for (const y of [sill + .72, sill + 1.72, sill + 2.46]) {
        m.rod(p(dir * .20, y, insetDepth + .068), p(dir * (r * .84), y, insetDepth + .068), .035, .07, SURFACE.gateIron, 6, .74);
      }
      m.rod(p(dir * .17, sill + 1.24, insetDepth + .061), p(dir * .17, sill + 1.46, insetDepth + .061), .048, .048, METAL, 7, .88);
    }
    return;
  }
  if(kind==='doorway'){
    mappedQuad(m,p,[-r,sill,0],[r,sill,0],[r,sill,-thick],[-r,sill,-thick],PAVING,.94);
    return;
  }
  if (kind === 'open') return;
  const glassSill=sill+.035,glassRise=rise*.94;
  inset(m,p,r*.92,glassSill,spring,glassRise,0,insetDepth,GLASS,shape.glassRows? .84 : .74);
  if(shape.glassRows){
    for(let i=1;i<shape.glassRows;i++){
      const y=glassSill+(spring+glassRise-glassSill)*i/shape.glassRows;
      const radius=y>spring? r*.92*Math.pow(1-(y-spring)/glassRise,.68) : r*.92;
      m.rod(p(-radius,y,insetDepth+.022),p(radius,y,insetDepth+.022),.030,.030,TRIM,5,.88);
      m.rod(p(0,y-.041,insetDepth+.027),p(0,y+.041,insetDepth+.027),.047,.047,TRIM,6,.87);
    }
  }
  if (r >= .70) {
    const split = r * .47;
    const t = Math.min(.076, r * .105);
    m.rod(p(0, sill + .025, insetDepth + .032), p(0, spring + rise * .95, insetDepth + .032), t, t, TRIM, 8, .88);
    for (const side of [-1, 1]) {
      const sections = arch(split, spring - .09, rise * .49, 7);
      const trim = sections.map(([x, y]) => [x + side * split, y]);
      for (let i = 0; i < trim.length - 1; i++) {
        m.rod(p(...trim[i], insetDepth + .027), p(...trim[i + 1], insetDepth + .027), t * .7, t * .7, TRIM, 5, .87);
      }
    }
    if (r > 1.22) {
      for (const y of [spring + rise * .46, spring + rise * .68]) {
        const cy = y === spring + rise * .46 ? r * .205 : r * .113;
        const tracery = ring(0, y, cy, 20);
        band(m, p, tracery, ring(0, y, cy * .77, 20), insetDepth + .048, insetDepth + .067, TRIM);
      }
    }
  }
}

function roseWall(m, p, width, lo, hi, cy, r, thick) {
  const points = ring(0, cy, r, 48, Math.PI * .25);
  const limit = ([x, y]) => {
    const k = Math.min((width / 2) / Math.max(.001, Math.abs(x)),
      (y > cy ? hi - cy : cy - lo) / Math.max(.001, Math.abs(y - cy)));
    return [x * k, cy + (y - cy) * k];
  };
  for (const [z, inside] of [[0, false], [-thick, true]]) {
    const outer = points.map(limit);
    const corners = [[width / 2, hi], [-width / 2, hi], [-width / 2, lo], [width / 2, lo]];
    for (let i = 0; i < points.length - 1; i++) {
      const q = [[...outer[i], z], [...outer[i + 1], z], [...points[i + 1], z], [...points[i], z]];
      if (inside) q.reverse();
      mappedQuad(m, p, ...q, STONE, .98);
      const j = (i + 1) % 12;
      const a = outer[i], b = outer[i + 1];
      if (Math.abs(a[0] - b[0]) > .0001 && Math.abs(a[1] - b[1]) > .0001) {
        const corner = corners[(Math.floor(i / 12) + (j < 7 ? 1 : 2)) % 4];
        const safeCorner = [Math.sign(a[0] + b[0]) * Math.abs(corner[0]), a[1] + b[1] > cy * 2 ? hi : lo, z];
        const tri = [p(...a, z), p(...safeCorner), p(...b, z)];
        if (inside) tri.reverse();
        m.tri(...tri, STONE, .98);
      }
    }
  }
  const center = p(0, cy, -thick * .48);
  const uv = ([x, y]) => [x / (r * 2) + .5, (y - cy) / (r * 2) + .5];
  for (let i = 0; i < points.length - 1; i++) {
    m.tri(center, p(...points[i], -thick * .48), p(...points[i + 1], -thick * .48), GLASS, 1.27,
      undefined, [[.5, .5], uv(points[i]), uv(points[i + 1])]);
  }
  const halo = ring(0, cy, r, 48, Math.PI * .25);
  const border = (rad) => ring(0, cy, rad, 48, Math.PI * .25);
  band(m, p, halo, border(r * .94), 0, -thick * .48, TRIM, .82);
  band(m, p, border(r + .20), border(r + .075), .02, .165, TRIM, .97);
  band(m, p, border(r + .075), halo, .165, -.035, TRIM, .87);
  band(m, p, border(r * .24), border(r * .182), -thick * .41, -thick * .36, TRIM, .91);
  for (let i = 0; i < 12; i++) {
    const a = (i + .5) * TAU / 12;
    const x = Math.cos(a), y = Math.sin(a);
    m.rod(p(x * r * .236, cy + y * r * .236, -thick * .40), p(x * r * .92, cy + y * r * .92, -thick * .40),
      .041, .059, TRIM, 6, .88);
    const px = x * r * .663, py = cy + y * r * .663;
    const petals = ring(px, py, r * .135, 14);
    band(m, p, petals, ring(px, py, r * .109, 14), -thick * .39, -thick * .35, TRIM, .9);
  }
}

function solidWall(m, p, w, low, high, thick, shade = 1) {
  sillBox(m, p, w, low, high, 0, -thick, STONE, shade);
}

function pillar(m, x, z, base, h, bulk = .41, inside = false) {
  m.box(x, base + .14, z, bulk * 2.9, .28, bulk * 2.9, TRIM, .83);
  m.rod([x, base + .28, z], [x, base + .52, z], bulk * 1.34, bulk, TRIM, 10, .96);
  m.rod([x, base + .46, z], [x, base + h - .32, z], bulk, bulk * .92, STONE, 10, .91);
  if (inside) {
    for (let j = 0; j < 4; j++) {
      const a = Math.PI / 2 * j + Math.PI / 4;
      const xx = x + Math.cos(a) * bulk * .78, zz = z + Math.sin(a) * bulk * .78;
      m.rod([xx, base + .44, zz], [xx, base + h - .28, zz], bulk * .39, bulk * .36, TRIM, 7, .90);
    }
  }
  m.rod([x, base + h - .43, z], [x, base + h - .16, z], bulk * .94, bulk * 1.34, TRIM, 10, .95);
  m.box(x, base + h - .10, z, bulk * 2.77, .20, bulk * 2.77, TRIM, .85);
}

function finial(m, x, z, base, h, scale) {
  m.box(x, base + h * .13, z, scale * 1.7, h * .30, scale * 1.7, STONE, .93);
  m.rod([x, base + h * .26, z], [x, base + h * .84, z], scale, scale * .12, TRIM, 4, .96);
  for (let i = 0; i < 3; i++) {
    const xx = x + scale * (.63 - .155 * i);
    const y = base + (.31 + i * .14) * h;
    m.rod([xx, y, z], [xx, y + .26 * scale, z], scale * .24, 0, TRIM, 4, .95);
    m.rod([x, y, z - (xx - x)], [x, y + .26 * scale, z - (xx - x)], scale * .24, 0, TRIM, 4, .95);
    m.rod([x, y, z + (xx - x)], [x, y + .26 * scale, z + (xx - x)], scale * .24, 0, TRIM, 4, .95);
    m.rod([x - (xx - x), y, z], [x - (xx - x), y + .26 * scale, z], scale * .24, 0, TRIM, 4, .95);
  }
  m.rod([x, base + h * .75, z], [x, base + h, z], scale * .28, .019, TRIM, 6);
}

function roof(m, p, z1, z2, half, eave, ridge) {
  const v = [[0, ridge, z1], [half, eave, z1], [half, eave, z2], [0, ridge, z2],
    [-half, eave, z1], [-half, eave, z2]];
  const q = v.map(v => p(...v));
  const uv = (side) => [[0,1], [0,0], [side,0], [side,1]];
  const scale = Math.abs(z2 - z1) / Math.max(2, half * 2);
  m.quad(q[1], q[0], q[3], q[2], SLATE, 1, undefined, uv(scale));
  m.quad(q[0], q[4], q[5], q[3], SLATE, .96, undefined, uv(scale).map(([x, y]) => [x, 1 - y]));
  m.rod(q[0], q[3], .11, .11, LEAD, 7, .86);
  m.rod(q[1], q[2], .09, .09, LEAD, 6, .87);
  m.rod(q[4], q[5], .09, .09, LEAD, 6, .86);
}

function gable(m, p, offset, r, base, peak, rear = false) {
  const a = p(-r, base, offset);
  const b = p(r, base, offset);
  const c = p(0, peak, offset);
  m.tri(...(rear ? [b, a, c] : [a, b, c]), STONE, .98);
  m.rod(a, c, .105, .105, TRIM, 7, .97);
  m.rod(b, c, .105, .105, TRIM, 7, .97);
}

function cross(m, x, y, z, size, mat = METAL) {
  m.rod([x, y, z], [x, y + size, z], size * .035, size * .025, mat, 6, .98);
  m.rod([x - size * .24, y + size * .65, z], [x + size * .24, y + size * .65, z],
    size * .027, size * .027, mat, 6, .98);
}

function tower(m, x, z) {
  const w = 4.95;
  const p = [plane(x, z + w/2, 1, 0), plane(x + w/2, z, 0, -1),
    plane(x, z - w/2, -1, 0), plane(x - w/2, z, 0, 1)];
  for (const [index, wall] of p.entries()) {
    pointedWall(m, wall, w, .0, 8.6, .56,
      { r: .55, sill: 2.05, spring: 4.66, rise: 1.16, kind: 'louver' }, .92 + .03 * index);
    pointedWall(m, wall, w, 8.6, 15.65, .56,
      { r: .79, sill: 9.34, spring: 12.34, rise: 1.90, kind: 'glass' }, .92 + .03 * index);
    for (const dx of [-1, 1]) {
      const [a, , b] = wall(dx * .925, 0);
      const angle = Math.atan2(p[index](1, 0)[2] - wall(0, 0)[2], p[index](1, 0)[0] - wall(0, 0)[0]);
      pointedWall(m, plane(a, b, Math.cos(angle), Math.sin(angle)), w * .5, 15.65, 23.45, .53,
        { r: .67, sill: 16.92, spring: 20.08, rise: 1.92, kind: 'louver' }, .88 + index * .025);
    }
    for (const y of [1.10, 8.32, 15.32, 16.33, 22.90, 23.46, 24.30]) {
      sillBox(m, wall, w + .21, y, y + .17, .18, -.146, TRIM, .92);
    }
  }
  m.box(x, 23.9, z, w + .16, .96, w + .16, STONE, .9);
  m.box(x, 24.53, z, w + .32, .26, w + .32, TRIM, .92);
  for (const u of [-1, 1]) {
    for (const v of [-1, 1]) {
      const xx = x + u * (w * .5 - .09);
      const zz = z + v * (w * .5 - .09);
      m.box(xx, 6.1, zz, .67, 12.2, .67, STONE, .90);
      m.box(xx, 17.77, zz, .497, 11.1, .497, TRIM, .9);
      for (const y of [3.92, 7.0, 11.95, 15.8, 22.25]) {
        m.box(xx, y, zz, .80 - y * .011, .19, .80 - y * .011, TRIM, .98);
      }
      finial(m, xx, zz, 24.43, 3.85, .46);
    }
  }
  for (const wall of p) {
    for (let i = -2; i <= 2; i++) {
      const [x, , z] = wall(i * .70, 0, -.15);
      m.box(x, 24.88, z, .39, .63, .39, STONE, .93);
      m.box(x, 25.21, z, .49, .13, .49, TRIM, .96);
    }
  }
  m.rod([x, 24.55, z], [x, 26.65, z], 2.48, 1.98, STONE, 8, .90, Math.PI / 8);
  m.rod([x, 26.60, z], [x, 35.8, z], 2.02, .112, SLATE, 8, .95, Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = (i + .5) * TAU / 8;
    const u = Math.cos(a), v = Math.sin(a);
    m.rod([x + u * 2.02, 26.54, z + v * 2.02], [x + u * .11, 35.81, z + v * .11],
      .068, .026, LEAD, 5, .92);
    const w = plane(x + u * 1.91, z + v * 1.91, v, -u);
    inset(m, w, .22, 26.3, 27.09, .57, 0, .086, DARK, .82);
    band(m, w, outline(.25, 26.3, 27.09, .64, 6), outline(.19, 26.3, 27.09, .53, 6),
      .079, .125, TRIM, .82);
  }
  m.rod([x,35.64,z],[x,36.09,z],.205,.112,LEAD,8,.94);
  m.rod([x,36.07,z],[x,37.14,z],.119,.073,METAL,8,.91);
  m.rod([x-.36,36.74,z],[x+.36,36.74,z],.066,.066,METAL,7,.93);
}

function mainFacade(m) {
  const front = 16.26;
  const p = plane(0, front, 1, 0);
  for (const side of [-1,1]) {
    const x = side*2.53;
    const panel = plane(x, front+.07, 1, 0);
    inset(m,panel,.31,3.58,4.40,.53,0,.093,DARK,.62);
    band(m,panel,outline(.41,3.52,4.40,.66),outline(.31,3.58,4.40,.53),.107,.164,TRIM,1.01);
    m.box(x,3.55,front+.20,.91,.16,.44,TRIM,.93);
    m.rod([x,3.67,front+.24],[x,4.31,front+.24],.12,.18,TRIM,10,.96);
    m.rod([x,4.32,front+.23],[x,4.53,front+.24],.077,.048,TRIM,12,1.02);
    m.rod([x-.26,3.74,front+.17],[x+.26,3.74,front+.17],.021,.021,TRIM,5,.99);
  }
  pointedWall(m,p,6.18,-.03,8.18,.44,{r:1.32,sill:.0187,spring:1.0,rise:1.12,kind:'doorway'},.97);
  band(m,p,outline(1.68,.0187,3.51,2.53),outline(1.56,.0187,3.47,2.44),.021,.196,TRIM,.91,true);
  for(const side of [-1,1]){
    const door=plane(side*2.13,front-.29,1,0);
    sillBox(m,door,.74,.02,1.03,.10,-.045,SURFACE.doorOak,.83);
    for(const y of [.19,.67,.91]){
      sillBox(m,door,.64,y-.031,y+.031,.132,.095,SURFACE.gateIron,.98);
      for(const x of [-.27,.27])m.rod(door(x,y,.129),door(x,y,.151),.024,.018,SURFACE.brass,7,.97,0,true);
    }
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) pillar(m, s * (2.00 + .18 * i), front - .12 + .093 * i, .21, 3.53, .091);
    m.rod([s * 1.91, 3.99, front + .24], [0, 7.59, front + .24], .092, .069, TRIM, 8);
    finial(m, 2.76 * s, front + .17, 5.58, 2.40, .22);
  }
  roseWall(m, p, 6.18, 8.18, 15.31, 11.86, 2.08, .61);
  for (const y of [7.96, 8.25, 14.94, 15.30]) {
    sillBox(m, p, 6.30, y, y + .17, .29, -.136, TRIM);
  }
  gable(m, (u, y, d) => [u, y, front + d], .018, 3.11, 15.28, 19.70);
  inset(m, p, .29, 15.76, 16.50, .51, 0, .034, DARK, .88);
  band(m, p, outline(.43, 15.74, 16.50, .69), outline(.30, 15.74, 16.50, .52), .03, .108, TRIM);
  finial(m, 0, front + .10, 19.67, 1.18, .19);
  tower(m, -5.47, 13.75);
  tower(m, 5.47, 13.75);
}

function flyingButtress(m, side, z) {
  const o = side * 8.87;
  m.box(o, .52, z, 1.31, 1.3, 1.33, STONE, .90);
  m.box(o, 3.30, z, 1.00, 5.41, 1.00, STONE, .96);
  m.box(o, 5.96, z, 1.20, .25, 1.18, TRIM, 1);
  m.box(side * 8.51, 6.12, z, 1.02, .90, .85, STONE, .92);
  finial(m, o, z, 6.04, 2.39, .40);
  const bottom = [];
  const top = [];
  for (let i = 0; i <= 17; i++) {
    const t = i / 17;
    const x = side * (8.59 - 4.24 * t);
    const y = 6.07 + 4.65 * (1 - Math.pow(1 - t, 1.86));
    bottom.push([x, y]);
    top.push([x, y + .51 + .14 * t]);
  }
  for (let j = 0; j < bottom.length - 1; j++) {
    const [a, y] = bottom[j], [b, v] = bottom[j + 1];
    const h = top[j][1], t = top[j + 1][1];
    const w = .262;
    m.quad([a, y, z + w], [b, v, z + w], [b, t, z + w], [a, h, z + w], STONE, .92);
    m.quad([b, v, z - w], [a, y, z - w], [a, h, z - w], [b, t, z - w], STONE, .90);
    m.quad([a, h, z + w], [b, t, z + w], [b, t, z - w], [a, h, z - w], TRIM, .98, [0, 1, 0]);
    m.quad([a, y, z - w], [b, v, z - w], [b, v, z + w], [a, y, z + w], TRIM, .78, [0, -1, 0]);
  }
  m.box(side * 4.45, 9.41, z, .55, 5.46, .82, STONE, .94);
  finial(m, side * 4.63, z, 12.15, 2.58, .33);
}

function aisleRoof(m, side, z1, z2) {
  const a = [side * 4.44, 7.71, z1], b = [side * 4.44, 7.71, z2];
  const c = [side * 7.65, 5.77, z2], d = [side * 7.65, 5.77, z1];
  m.quad(a, d, c, b, SLATE, .95, [side * .51, .86, 0],
    [[0,1],[0,0],[(z2-z1)/6,0],[(z2-z1)/6,1]]);
  m.rod(d, c, .087, .087, LEAD, 6, .91);
}

function raisedAisleBay(m,p,z,w){
  const top=shaftHeight(ROOF_HEIGHT);
  const y=5.76;
  for(const [lo,hi,sill,spring,rise,kind,r] of [
    [y,8.54,6.08,7.43,.81,'glass',.89],
    [8.54,11.05,9.14,10.22,.60,'glass',.81],
    [11.05,top,11.50,12.47,.58,'open',.73]
  ]){
    pointedWall(m,p,w+.015,lo,hi,.48,{r,sill,spring,rise,kind},.94);
    sillBox(m,p,w+.013,lo+.029,lo+.14,.135,-.12,TRIM,.98);
  }
  const x=7.61;
  m.box(x,(y+top)*.5,z-w*.5,.41,top-y,.46,STONE,.94);
  for(const at of [7.99,10.85,top-.15])m.box(x,at,z-w*.5,.62,.18,.62,TRIM,.97);
}

function raisedAisleDoor(m,p){
  const top=shaftHeight(ROOF_HEIGHT),base=-.055;
  for(let i=0;i<FLOORS.length-1;i++){
    const f=shaftHeight(FLOORS[i]);
    const low=i===0?base:f-.083;
    const high=i===FLOORS.length-2?top:shaftHeight(FLOORS[i+1])-.083;
    pointedWall(m,p,4.25,low,high,.46,{r:1.41,sill:low,spring:f+.86,rise:.58,kind:'doorway'},.89);
    sillBox(m,p,4.28,high-.17,high-.058,.13,-.58,TRIM,.92);
  }
}

function nave(m) {
  const runs = [[-11.71, -5.18, 2], [1.60, 11.40, 3]];
  for (const s of [-1, 1]) {
    for (const [z1, z2, count] of runs) {
      const raised=s===1&&z1>0;
      const w = (z2 - z1) / count;
      for (let i = 0; i < count; i++) {
        const z = z1 + (i + .5) * w;
        const outer = plane(s * 7.48, z, 0, -s);
        const upper = plane(s * 4.40, z, 0, -s);
        pointedWall(m, outer, w + .007, -.04, 5.76, .48,
          {r: .90, sill: .53, spring: 3.25, rise: 1.77, kind: 'glass'}, .96);
        pointedWall(m, upper, w + .008, 7.06, 13.54, .44,
          {r: 1.01, sill: 8.23, spring: 10.37, rise: 2.08, kind: 'glass'}, .97);
        sillBox(m, outer, w + .01, .28, .49, .19, -.66, TRIM, .88);
        sillBox(m, outer, w + .01, 5.36, 5.63, .19, -.24, TRIM, .95);
        sillBox(m, upper, w + .01, 12.97, 13.22, .18, -.27, TRIM, .94);
        sillBox(m, upper, w + .01, 7.88, 8.01, .105, -.15, TRIM, .89);
        const zBreak = z1 + i * w;
        m.box(s * 7.53, 2.53, zBreak, .51, 5.16, .52, STONE, .94);
        if(raised)raisedAisleBay(m,outer,z,w);
        else if((i===1||i===2)&&(s===1||z1>0))flyingButtress(m,s,zBreak);
      }
      if(!raised)aisleRoof(m,s,z1,z2);
    }
    solidWall(m, plane(s * 5.94, -11.71, -1, 0), 3.17, -.02, 5.77, .50);
    solidWall(m, plane(s * 4.40, 13.75, 0, -s), 4.85, 8.58, 13.54, .44);
  }
  const basis = (x, y, z) => [x, y, z];
  roof(m, basis, -11.79, 16.18, 4.61, 13.49, 18.87);
  for (const z of [-10.8, 7.70, 11.75]) {
    m.rod([-.00, 18.87, z], [0, 19.11, z], .07, 0, TRIM, 6);
  }
}

function transepts(m) {
  const mid = -1.8;
  for (const s of [-1, 1]) {
    for (const d of [-1, 1]) {
      for (const x of [6.20, 10.43]) {
        const p = plane(x * s, mid + d * 3.38, d, 0);
        if(s===1&&d===1&&x===6.20){
          raisedAisleDoor(m,p);
        }else{
          const top=s===1?shaftHeight(ROOF_HEIGHT):12.18;
          pointedWall(m,p,4.25,0,top,.49,{r:1.07,sill:3.70,spring:7.55,rise:3.32,kind:'glass'},.99);
          sillBox(m,p,4.26,.58,.78,.17,-.58,TRIM,.86);
          sillBox(m,p,4.26,11.80,12.03,.17,-.16,TRIM,.98);
        }
      }
      const z = mid + d * 3.42;
      m.box(s * 12.47, 4.43, z, .78, 8.9, .79, STONE, .92);
      m.box(s * 12.49, 9.70, z, .59, 5.40, .59, TRIM, .93);
      finial(m, s * 12.50, z, 12.20, 2.42, .37);
    }
    const facade = plane(s * 12.57, mid, 0, -s);
    pointedWall(m,facade,6.78,0,6.52,.61,{r:2.05,sill:1.11,spring:3.56,rise:2.55,kind:'glass'},.95);
    for(let column=-1;column<=1;column++){
      const opening=(u,y,n)=>facade(u+2.26*column,y,n);
      pointedWall(m,opening,2.267,6.52,8.42,.61,{r:.79,sill:6.83,spring:7.59,rise:.64,kind:'open'},.91);
      sillBox(m,opening,2.20,6.59,6.71,.24,-.78,TRIM,.92);
    }
    if(s<0)pointedWall(m,facade,6.78,8.42,12.17,.61,{r:2.04,sill:8.53,spring:9.60,rise:2.07,kind:'glass'},.99);
    else {
      pointedWall(m,facade,6.78,8.42,11.05,.61,{r:2.04,sill:8.79,spring:9.95,rise:.74,kind:'glass'},.99);
      for(let column=-1;column<=1;column++){
        const p=(u,y,n)=>facade(u+2.26*column,y,n);
        pointedWall(m,p,2.269,11.05,shaftHeight(ROOF_HEIGHT),.61,{r:.73,sill:11.49,spring:12.37,rise:.72,kind:'open'},.93);
      }
      sillBox(m,facade,7.02,11.01,11.19,.23,-.76,TRIM,1.03);
    }
    for(const y of [6.48,8.40])sillBox(m,facade,7.02,y,y+.17,.19,-.73,TRIM,1.03);
    sillBox(m, facade, 6.98, .58, .79, .2, -.64, TRIM, .88);
    if(s<0)sillBox(m,facade,6.98,11.80,12.07,.19,-.22,TRIM,.94);
    for (const lee of [-1,1]) {
      const p = (u,y,n) => facade(u+lee*2.81,y,n);
      const r = .205;
      inset(m,p,r,3.01,4.79,1.25,0,.085,DARK,.69);
      band(m,p,outline(r+.085,2.98,4.79,1.37),outline(r,3.01,4.79,1.25),.01,.16,TRIM,.91);
      sillBox(m,p,.69,2.91,3.00,.24,-.10,TRIM,.93);
    }
    const p = (u, y, v) => [s * v, y, mid - s * u];
    if(s<0){
      roof(m,p,1.70,12.64,3.60,12.13,16.98);
      gable(m,p,12.58,3.54,12.16,16.98);
      finial(m,s*12.52,mid,16.31,1.54,.21);
    }else{
      roof(m,p,1.70,4.37,3.60,12.13,16.98);
      gable(m,p,4.37,3.55,12.15,16.98);
    }
  }
  const over = [0, 18.89, mid];
  m.rod(over, [0, 21.23, mid], .51, .40, STONE, 8, .91);
  m.rod([0, 21.20, mid], [0, 24.05, mid], .61, .039, SLATE, 8, .89);
  cross(m, 0, 23.99, mid, .76);
}

function apse(m) {
  const center = -11.71;
  const ring = Array.from({length: 7}, (_, i) => {
    const a = Math.PI + i / 6 * Math.PI;
    return [4.40 * Math.cos(a), center + 4.58 * Math.sin(a)];
  });
  for (let i = 0; i < ring.length - 1; i++) {
    const [a, z] = ring[i], [b, w] = ring[i + 1];
    const d = Math.hypot(b - a, w - z);
    const p = plane((a + b) / 2, (z + w) / 2, (a - b) / d, (z - w) / d);
    pointedWall(m, p, d + .016, -.02, 13.46, .39,
      {r: .69, sill: 3.20, spring: 7.90, rise: 4.36, kind: 'glass', glassRows:4}, .98);
    sillBox(m, p, d + .057, 12.99, 13.25, .115, -.26, TRIM, .92);
    m.box(a, 5.47, z, .45, 11.29, .45, STONE, .93);
    finial(m, a, z, 10.96, 2.85, .24);
    const u = [a * 1.034, 13.45, center + (z - center) * 1.04];
    const v = [b * 1.034, 13.45, center + (w - center) * 1.04];
    m.tri([0, 18.87, center], v, u, SLATE, .95, undefined, [[.5,1],[1,0],[0,0]]);
    m.rod(u, [0, 18.87, center], .088, .055, LEAD, 6, .8);
    m.tri([0, -.12, center], [a, -.12, z], [b, -.12, w], STONE, .86);
    m.tri([0, .034, center], [b, .034, w], [a, .034, z], PAVING, .99);
    m.quad([a, -.52, z], [b, -.52, w], [b, .034, w], [a, .034, z], STONE, .89);
  }
}

function arcade(m, detail) {
  const runs = [[-11.70, -5.18, 2], [1.60, 11.4, 3], [11.40, 16.14, 1]];
  for (const side of [-1, 1]) {
    const x = side * 4.16;
    for (const [z1, z2, count] of runs) {
      const span = (z2 - z1) / count;
      for (let j = 0; j < count; j++) {
        const z = z1 + span * (j + .5);
        const p = plane(x, z, 0, -side);
        const r = span * .5 - .41;
        const frame = {r, sill: .04, spring: 3.98, rise: 2.29, kind: 'open'};
        pointedWall(m, p, span, 3.80, 7.12, .44, frame, .85);
        pillar(m, x - side * .21, z - span * .5, .039, 4.00, .43, true);
        if (detail) {
          const branch = arch(r - .058, 3.98, 2.22);
          for (let n = 0; n < branch.length - 1; n++) {
            m.rod(p(...branch[n], -.462), p(...branch[n + 1], -.462), .053, .053, TRIM, 5, .87);
          }
        }
      }
      pillar(m, x - side * .21, z2, .039, 4.00, .43, true);
    }
    for (const z of [-11.72, -8.44, -5.18, 1.60, 4.88, 8.14, 11.41]) {
      m.rod([side * 4.025, 4.04, z], [side * 4.025, 11.78, z], .13, .14, TRIM, 7, .84);
    }
  }
}

function vault(m, x, z, w, depth, spring, rise, detail) {
  const span = arch(w * .5, spring, rise, 9);
  const segments = 10;
  const curve = (u, v) => {
    const theta = 1 - Math.abs(u);
    const xx = .68 - 1.68 * Math.cos(theta * Math.acos(.68 / 1.68));
    const yy = Math.sin(theta * Math.acos(.68 / 1.68)) / Math.sqrt(1 - Math.pow(.68 / 1.68, 2));
    const bulge = .60 * (1 - v * v) * theta;
    return [x + (u <= 0 ? xx : -xx) * w * .5, spring + yy * rise + bulge, z + v * depth * .5];
  };
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < 4; j++) {
      const a = i / segments * 2 - 1, b = (i + 1) / segments * 2 - 1;
      const p = j * .5 - 1, q = (j + 1) * .5 - 1;
      m.quad(curve(a, p), curve(b, p), curve(b, q), curve(a, q), STONE, .73 + j * .026);
    }
  }
  for (const v of [-1, 1]) {
    for (let i = 0; i < span.length - 1; i++) {
      m.rod([x + span[i][0], span[i][1] - .038, z + v * depth * .5],
        [x + span[i + 1][0], span[i + 1][1] - .038, z + v * depth * .5], .12, .12, TRIM, 6, .83);
    }
    if (detail) {
      for (let i = 0; i < 16; i++) {
        const a = i / 8 - 1, b = (i + 1) / 8 - 1;
        const aa = curve(a, v * a), bb = curve(b, v * b);
        aa[1] -= .06;
        bb[1] -= .06;
        m.rod(aa, bb, .086, .086, TRIM, 6, .86);
      }
    }
  }
  m.rod([x, spring + rise + .57, z], [x, spring + rise + .41, z], .22, .125, TRIM, 10, .97);
}

export function cathedral() {
  const exterior = new Mesh();
  const interior = new Mesh();

  mainFacade(exterior);
  nave(exterior);
  transepts(exterior);
  apse(exterior);

  arcade(interior, true);
  for (const [z, d] of [[-10.07,3.28],[-6.8,3.26],[-1.79,6.78],[3.24,3.28],[6.51,3.26],[9.78,3.28],[13.77,4.71]]) {
    vault(interior, 0, z, 8.10, d, 11.81, 2.87, true);
    if (z !== -1.79) {
      vault(interior, -5.98, z, 3.00, d, 4.46, 1.24, false);
      if(z<0||z>11.40)vault(interior,5.98,z,3.00,d,4.46,1.24,false);
    }
  }
  for (const x of [-10.12,-6.71]) {
    vault(interior, x, -1.8, 3.30, 6.25, 11.83, 2.86, false);
  }
  vault(interior, 0, -13.30, 8.38, 3.25, 11.88, 2.79, false);
  for (const side of [-1,1]) {
    const x = side*4.17;
    const z=-8.5;
    const p = plane(x,z,0,-side);
    for (const anchor of [-8.8,-5.27,.94,4.62,8.27]) {
      const wall = plane(x,anchor,0,-side);
      sillBox(interior,wall,1.31,7.032,7.218,.101,-.25,TRIM,.71);
    }
    sillBox(interior,p,7.82,11.656,11.84,.26,-.21,TRIM,.747);
  }
  return {exterior,interior,...buildWalkways()};
}
