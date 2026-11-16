export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const mul = (a, n) => a.map(v => v * n);
export const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]
];
export const normal = a => mul(a, 1 / (Math.hypot(...a) || 1));
const faceNormal = (a, b, c) => normal(cross(sub(b, a), sub(c, a)));
const UV_TRI = [[0, 0], [1, 0], [1, 1]];
const UV_QUAD = [[0, 0], [1, 0], [1, 1], [0, 1]];

// Level of detail: round things get only as many sides as their size needs on screen.
// The textures carry the surface detail, so thin rods and small turnings stay cheap.
export function roundSides(sides, radius) {
  if (radius < .025) return Math.min(sides, 3);
  if (radius < .05) return Math.min(sides, 4);
  if (radius < .1) return Math.min(sides, 5);
  if (radius < .25) return Math.min(sides, 6);
  if (radius < .6) return Math.min(sides, 10);
  return Math.max(10, Math.min(sides, Math.ceil(sides * .75)));
}

export class Mesh {
  values = [];

  tri(a, b, c, material, shade = 1, normals, uv = UV_TRI) {
    const points = [a, b, c];
    const facing = faceNormal(a, b, c);
    for (let i = 0; i < 3; i++) {
      const n = normals ? normals[i] : facing;
      this.values.push(...points[i], ...n, ...uv[i], material, shade);
    }
  }

  quad(a, b, c, d, material, shade = 1, facing, uv = UV_QUAD) {
    const ns = facing ? [facing, facing, facing] : undefined;
    this.tri(a, b, c, material, shade, ns, [uv[0], uv[1], uv[2]]);
    this.tri(a, c, d, material, shade, ns, [uv[0], uv[2], uv[3]]);
  }

  box(x, y, z, w, h, d, material, shade = 1) {
    const l = x - w / 2, r = x + w / 2, a = y - h / 2, b = y + h / 2;
    const f = z + d / 2, k = z - d / 2;
    this.quad([l, a, f], [r, a, f], [r, b, f], [l, b, f], material, shade);
    this.quad([r, a, k], [l, a, k], [l, b, k], [r, b, k], material, shade);
    this.quad([r, a, f], [r, a, k], [r, b, k], [r, b, f], material, shade);
    this.quad([l, a, k], [l, a, f], [l, b, f], [l, b, k], material, shade);
    this.quad([l, b, f], [r, b, f], [r, b, k], [l, b, k], material, shade);
    this.quad([l, a, k], [r, a, k], [r, a, f], [l, a, f], material, shade);
  }

  beveledBox(x,y,z,w,h,d,edge,material,shade=1) {
    const q=Math.min(edge,h*.42,w*.42,d*.42);
    // A bevel smaller than a few centimetres, or on a small block, is not worth 52 extra triangles.
    if(q<.012||Math.max(w,h,d)<.45)return this.box(x,y,z,w,h,d,material,shade);
    const rings=[
      [-h*.5,w*.5-q,d*.5-q],[-h*.5+q,w*.5,d*.5],
      [h*.5-q,w*.5,d*.5],[h*.5,w*.5-q,d*.5-q]
    ].map(([height,X,Z],i)=>{
      const e=i===0||i===3?q*.20:q;
      return [[-X+e,Z],[X-e,Z],[X,Z-e],[X,-Z+e],[X-e,-Z],[-X+e,-Z],[-X,-Z+e],[-X,Z-e]]
        .map(([a,b])=>[x+a,y+height,z+b]);
    });
    for(let i=0;i<8;i++){
      const j=(i+1)%8;
      for(let k=0;k<3;k++)this.quad(rings[k][i],rings[k][j],rings[k+1][j],rings[k+1][i],material,shade);
      this.tri([x,y+h*.5,z],rings[3][i],rings[3][j],material,shade);
      this.tri([x,y-h*.5,z],rings[0][j],rings[0][i],material,shade);
    }
  }

  rod(a, b, ra, rb, material, sides = 8, shade = 1, phase = 0, caps = false) {
    sides = roundSides(sides, Math.max(ra, rb));
    const line = normal(sub(b, a));
    const helper = Math.abs(line[1]) > .95 ? [0, 0, 1] : [0, 1, 0];
    const u = normal(cross(line, helper));
    const v = cross(line, u);
    const ring = i => {
      const angle = i * 2 * Math.PI / sides + phase;
      return add(mul(u, Math.cos(angle)), mul(v, Math.sin(angle)));
    };
    for (let i = 0; i < sides; i++) {
      const p = ring(i);
      const q = ring(i + 1);
      const aa = add(a, mul(p, ra)), aq = add(a, mul(q, ra));
      const bb = add(b, mul(p, rb)), bq = add(b, mul(q, rb));
      this.quad(aa, aq, bq, bb, material, shade);
      if (caps && ra > .001) this.tri(a, aq, aa, material, shade * .92);
      if (caps && rb > .001) this.tri(b, bb, bq, material, shade);
    }
  }

  upload(gl, transform, elevation = 0, normalTransform) {
    const count = this.values.length / 10;
    // Material IDs passed 255, so material and shade are 16-bit integers at the end of each vertex.
    const stride = 32;
    const packed = new ArrayBuffer(count * stride);
    const floats = new Float32Array(packed);
    const signed = new Int16Array(packed);
    const shorts = new Uint16Array(packed);
    for (let vertex = 0; vertex < count; vertex++) {
      const source = vertex * 10;
      const target = vertex * stride;
      const [x, y, z, nx, ny, nz, u, v, material, shade] = this.values.slice(source, source + 10);
      const p = transform ? transform(x, y, z) : [x, y, z];
      const n=normalTransform?normal(normalTransform(nx,ny,nz,y)):[nx,ny,nz];
      floats.set([p[0], p[1] + elevation, p[2]], target / 4);
      for (let axis = 0; axis < 3; axis++) signed[(target + 12) / 2 + axis] = Math.round(n[axis] * 32767);
      shorts[(target + 28) / 2] = material;
      shorts[(target + 30) / 2] = Math.round(shade * 128);
      floats.set([u, v], (target + 20) / 4);
    }
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, packed, gl.STATIC_DRAW);
    for (const [index, width, type, normalize, offset] of [
      [0, 3, gl.FLOAT, false, 0], [1, 3, gl.SHORT, true, 12],
      [2, 2, gl.FLOAT, false, 20], [3, 2, gl.UNSIGNED_SHORT, false, 28]
    ]) {
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index, width, type, normalize, stride, offset);
    }
    gl.bindVertexArray(null);
    this.values.length = 0;
    return { vao, buffer, count };
  }
}

// Splits a mesh into square chunks of the ground plan by triangle centre, so distant chunks can be
// skipped. `place` maps mesh coordinates to world coordinates (identity when omitted).
export function splitMesh(mesh, place = (x, y, z) => [x, y, z], cell = 12) {
  const chunks = new Map();
  const v = mesh.values;
  for (let t = 0; t < v.length; t += 30) {
    let cx = 0, cz = 0;
    const corners = [];
    for (let k = 0; k < 3; k++) {
      const o = t + k * 10, [x, , z] = place(v[o], v[o + 1], v[o + 2]);
      corners.push([x, z]);
      cx += x / 3; cz += z / 3;
    }
    const key = `${Math.floor(cx / cell)},${Math.floor(cz / cell)}`;
    let chunk = chunks.get(key);
    if (!chunk) chunks.set(key, chunk = { mesh: new Mesh(), x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
    for (let i = t; i < t + 30; i++) chunk.mesh.values.push(v[i]);
    for (const [x, z] of corners) {
      chunk.x0 = Math.min(chunk.x0, x); chunk.x1 = Math.max(chunk.x1, x);
      chunk.z0 = Math.min(chunk.z0, z); chunk.z1 = Math.max(chunk.z1, z);
    }
  }
  mesh.values.length = 0;
  return [...chunks.values()];
}
