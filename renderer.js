import { Mesh, add, sub, mul, dot, cross, normal } from './mesh.js';
import { BASE, LIMITS, coastMap, islandMesh, shorelineRocks, meadow } from './terrain.js';
import { cathedral } from './cathedral.js';
import { ANGLE, CENTER, ROOF_INDEX, SPIRE_HEIGHT, envelopeNormal, envelopeTransform, world, worldNormal } from './layout.js';
import { buildPerson, personPose } from './character.js';
import * as shader from './shaders.js';

export const SUN = [-.695, .452, .559];
const BLACK = [0, 0, 0];
const SITE=[...CENTER,Math.cos(ANGLE),Math.sin(ANGLE)];
const NO_PERSON=[0,-200,0];
const LEVELS = [
  { effect: .12, fps: 20, shadow: false, grass: false, antialias: false },
  { effect: .62, fps: 24, shadow: false, grass: false, antialias: false },
  { effect: 1, fps: 30, shadow: true, grass: true, antialias: true }
];

function camera(eye, forward) {
  const right = normal(cross(forward, [0, 1, 0]));
  const up = normal(cross(right, forward));
  return { right, up, view: new Float32Array([
    right[0], up[0], -forward[0], 0,
    right[1], up[1], -forward[1], 0,
    right[2], up[2], -forward[2], 0,
    -dot(right, eye), -dot(up, eye), dot(forward, eye), 1
  ]) };
}

function product(a, b) {
  const result = new Float32Array(16);
  for (let c = 0; c < 16; c += 4) {
    for (let r = 0; r < 4; r++) {
      result[c + r] = a[r]*b[c] + a[4 + r]*b[c + 1] + a[8 + r]*b[c + 2] + a[12 + r]*b[c + 3];
    }
  }
  return result;
}

function projection(tanFov, aspect, near, far) {
  const z = (far + near) / (near - far);
  return new Float32Array([1/(aspect*tanFov), 0, 0, 0, 0, 1/tanFov, 0, 0, 0, 0, z, -1, 0, 0, 2*far*near/(near-far), 0]);
}

class Program {
  constructor(gl, sources) {
    this.gl = gl;
    this.raw = gl.createProgram();
    this.locations = new Map();
    const compiled = sources.map(([type, source]) => {
      const handle = gl.createShader(type);
      gl.shaderSource(handle, source);
      gl.compileShader(handle);
      if (!gl.getShaderParameter(handle, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(handle);
        gl.deleteShader(handle);
        throw new Error(message);
      }
      gl.attachShader(this.raw, handle);
      return handle;
    });
    gl.linkProgram(this.raw);
    for (const handle of compiled) gl.deleteShader(handle);
    if (!gl.getProgramParameter(this.raw, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.raw));
  }

  use() {
    this.gl.useProgram(this.raw);
    return this;
  }

  loc(name) {
    if (!this.locations.has(name)) this.locations.set(name, this.gl.getUniformLocation(this.raw, name));
    return this.locations.get(name);
  }

  f(name, v) { this.gl.uniform1f(this.loc(name), v); }
  i(name, v) { this.gl.uniform1i(this.loc(name), v); }
  v2(name, v) { this.gl.uniform2fv(this.loc(name), v); }
  v3(name, v) { this.gl.uniform3fv(this.loc(name), v); }
  v4(name,v){this.gl.uniform4fv(this.loc(name),v);}
  mat(name, m) { this.gl.uniformMatrix4fv(this.loc(name), false, m); }
}

function texture(gl, internalFormat, width, height, format, type, data, linear = true) {
  const result = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, result);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);
  const filter = linear ? gl.LINEAR : gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return result;
}

function bind(gl, unit, tex) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
}

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, stencil: false, powerPreference: 'low-power'
    });
    if (!gl) throw new Error('WebGL 2 is unavailable.');
    this.canvas = canvas;
    this.gl = gl;
    this.screen = gl.createVertexArray();
    this.pixels = null;
    this.high = null;
    this.vegetation = null;
    this.shadow = null;
    this.shadowFailed = false;
    this.antialiasFailed = false;
    const program = (vert, frag) => new Program(gl, [[gl.VERTEX_SHADER, vert], [gl.FRAGMENT_SHADER, frag]]);
    this.sky = program(shader.backdropVertex, shader.backdropFragment);
    this.water = program(shader.waterVertex, shader.waterFragment);
    this.stone = program(shader.stoneVertex, shader.stoneFragment);
    this.personProgram = program(shader.personVertex, shader.stoneFragment);
    this.people = new Map();
    this.decals = program(shader.stoneVertex, shader.decalFragment);
    this.shadowProgram = program(shader.shadowVertex, shader.shadowFragment);
    this.post = program(shader.backdropVertex, shader.antialiasFragment);
    const map = coastMap();
    this.map = texture(gl, gl.RGBA8, map.width, map.height, gl.RGBA, gl.UNSIGNED_BYTE, map.data);
    this.materials = null;
    this.craft = null;
    this.surfaces = null;
    this.decor = null;
    this.terrain = null;
    this.fabric = null;
    this.altarpiece = null;
    this.materialLayerCount=0;
    this.stainedGlass = null;
    const low = new Mesh();
    islandMesh(low, false);
    this.low = low.upload(gl);
    const rocks = new Mesh();
    shorelineRocks(rocks);
    this.rocks = rocks.upload(gl);
    const architecture=cathedral();
    this.exterior=architecture.exterior.upload(gl,envelopeTransform,BASE,envelopeNormal);
    this.supports=architecture.walkExterior.upload(gl,world,BASE,worldNormal);
    this.roof=architecture.roofExterior.upload(gl,world,BASE,worldNormal);
    this.interior=architecture.interior.upload(gl,envelopeTransform,BASE,envelopeNormal);
    this.pendingFloors=architecture.walkFloors;
    this.floors=Array(this.pendingFloors.length).fill(null);
    this.glassLight=architecture.decals.upload(gl,world,BASE,worldNormal);
    const target=[CENTER[0],SPIRE_HEIGHT*.40,CENTER[1]];
    const toLight=camera(add(target,mul(SUN,183)),mul(SUN,-1));
    const ortho=new Float32Array([1/60,0,0,0,0,1/103,0,0,0,0,-2/319,0,0,0,-349/319,1]);
    this.lightMatrix = product(ortho, toLight.view);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(...BLACK, 1);
  }

  installLayerArray({width,height,data,depth}) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, width, height, depth, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    return texture;
  }

  installMaterials(pixels) {
    const next=this.installLayerArray(pixels);
    if(this.materials)this.gl.deleteTexture(this.materials);
    this.materials=next;
    this.materialLayerCount=pixels.depth;
  }

  installCraft(pixels) {
    const next=this.installLayerArray(pixels);
    if(this.craft)this.gl.deleteTexture(this.craft);
    this.craft=next;
  }

  installSurfaces(pixels) {
    const next=this.installLayerArray(pixels);
    if(this.surfaces)this.gl.deleteTexture(this.surfaces);
    this.surfaces=next;
  }

  installDecor(pixels) {
    const next=this.installLayerArray(pixels);
    if(this.decor)this.gl.deleteTexture(this.decor);
    this.decor=next;
    this.decorLayers=pixels.depth;
  }

  installTerrain(pixels) {
    const next=this.installLayerArray(pixels);
    if(this.terrain)this.gl.deleteTexture(this.terrain);
    this.terrain=next;
  }

  installFabric(pixels) {
    const next=this.installLayerArray(pixels);
    if(this.fabric)this.gl.deleteTexture(this.fabric);
    this.fabric=next;
  }

  installArt(name,{width,height,data}) {
    const gl=this.gl;
    if(this[name])gl.deleteTexture(this[name]);
    this[name]=texture(gl,gl.RGBA8,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  dimensions(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.releasePixels();
  }

  releasePixels() {
    if (!this.pixels) return;
    const gl = this.gl;
    gl.deleteFramebuffer(this.pixels.frame);
    gl.deleteRenderbuffer(this.pixels.depth);
    gl.deleteTexture(this.pixels.color);
    this.pixels = null;
  }

  antialias(width, height) {
    if (this.pixels) return this.pixels;
    if (this.antialiasFailed) return null;
    const gl = this.gl;
    const frame = gl.createFramebuffer();
    const color = texture(gl, gl.RGBA8, width, height, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    const ready = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    this.pixels = { frame, color, depth };
    if (!ready) {
      this.releasePixels();
      this.antialiasFailed = true;
      return null;
    }
    return this.pixels;
  }

  draw(item) {
    this.gl.bindVertexArray(item.vao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, item.count);
  }

  floor(index) {
    if(!this.floors[index]){
      this.floors[index]=this.pendingFloors[index].upload(this.gl,world,BASE,worldNormal);
      this.pendingFloors[index]=null;
    }
    return this.floors[index];
  }

  highDetail() {
    if (this.high) return;
    const terrain = new Mesh();
    const plants = new Mesh();
    islandMesh(terrain, true);
    meadow(plants, 2950);
    this.high = terrain.upload(this.gl);
    this.vegetation = plants.upload(this.gl);
  }

  shadowMap() {
    if (this.shadow || this.shadowFailed) return this.shadow;
    const gl = this.gl;
    const size = Math.min(1536, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const depth = texture(gl, gl.DEPTH_COMPONENT24, size, size, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null, false);
    const frame = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      gl.viewport(0, 0, size, size);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      this.shadowProgram.use().mat('uMatrix', this.lightMatrix);
      for (const item of [this.high,this.rocks,this.supports,this.exterior,this.roof]) this.draw(item);
      this.shadow = { depth, size };
    } else {
      this.shadowFailed = true;
      gl.deleteTexture(depth);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(frame);
    return this.shadow;
  }

  render(pose, quality, time, personTime = 0, moving = false) {
    const gl = this.gl;
    const level = LEVELS[quality];
    const {eye,forward,interior,fov,floor=0,walking=false}=pose;
    const { width, height } = this.canvas;
    const aspect = width/height;
    const tan = Math.tan(fov * Math.PI / 360);
    const { right, up, view } = camera(eye, forward);
    const matrix = product(projection(tan, aspect, interior||walking?.085:.45,4600), view);
    if (!interior && level.grass) this.highDetail();
    const shadow = !interior && level.shadow ? this.shadowMap() : null;
    const aa = level.antialias ? this.antialias(width, height) : null;
    if (!aa) this.releasePixels();
    gl.bindFramebuffer(gl.FRAMEBUFFER, aa?.frame ?? null);
    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    const person=floor<2?personPose(interior,personTime,moving):null;
    const setupMaterials = program => {
      const mat = program.use();
      mat.mat('uMatrix', matrix);
      mat.mat('uLight', this.lightMatrix);
      mat.v3('uEye', eye);
      mat.v3('uPerson',person?.origin??NO_PERSON);
      mat.v4('uSite',SITE);
      mat.i('uInterior', interior);
      mat.f('uEffect', level.effect);
      mat.f('uTime', time);
      mat.i('uHasShadow', !!shadow);
      mat.i('uHasMaterials',!!this.materials);
      mat.i('uLayers',this.materialLayerCount);
      mat.i('uMaterials', 3);
      mat.i('uHasStainedGlass', !!this.stainedGlass);
      mat.i('uStainedGlass',4);
      mat.i('uCraft',5);
      mat.i('uHasCraft',!!this.craft);
      mat.i('uAltarpiece',6);
      mat.i('uHasAltarpiece',!!this.altarpiece);
      mat.i('uSurfaces',7);
      mat.i('uHasSurfaces',!!this.surfaces);
      mat.i('uDecor',8);
      mat.i('uHasDecor',!!this.decor);
      mat.i('uDecorLayers',this.decor?this.decorLayers:0);
      mat.i('uTerrain',9);
      mat.i('uHasTerrain',!!this.terrain);
      mat.i('uFabric',10);
      mat.i('uHasFabric',!!this.fabric);
      mat.f('uFloor',floor);
      mat.i('uShadow', 1);
      mat.v2('uShadowStep', shadow ? [1/shadow.size,1/shadow.size] : [0,0]);
      return mat;
    };
    bind(gl, 1, shadow?.depth ?? this.map);
    gl.activeTexture(gl.TEXTURE0 + 3);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.materials);
    bind(gl,4,this.stainedGlass??this.map);
    gl.activeTexture(gl.TEXTURE0+5);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.craft??this.materials);
    bind(gl,6,this.altarpiece??this.map);
    gl.activeTexture(gl.TEXTURE0+7);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.surfaces??this.materials);
    gl.activeTexture(gl.TEXTURE0+8);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.decor??this.surfaces??this.materials);
    gl.activeTexture(gl.TEXTURE0+9);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.terrain??this.decor??this.materials);
    gl.activeTexture(gl.TEXTURE0+10);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.fabric??this.decor??this.materials);
    setupMaterials(this.stone);
    if (!interior) {
      this.draw(quality === 2 ? this.high : this.low);
      this.draw(this.rocks);
      if(level.grass)this.draw(this.vegetation);
      this.draw(this.supports);
    }else if(floor===3||floor>=ROOF_INDEX-1){
      this.stone.i('uInterior',false);
      this.draw(this.low);
      this.draw(this.rocks);
      this.stone.i('uInterior',true);
    }
    this.draw(this.exterior);
    this.draw(this.roof);
    if(interior||walking){
      this.draw(this.interior);
      for(let level=0;level<this.floors.length;level++){
        // The raised wing never needs all furnishings below it in the same frame.
        if(Math.abs(floor-level)<(quality===0?2:4) || (floor===0&&level===4&&quality===2))
          this.draw(this.floor(level));
      }
      if(interior&&floor<2&&quality>0){
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        const glass = this.decals.use();
        glass.mat('uMatrix', matrix);
        glass.i('uHasStainedGlass', !!this.stainedGlass);
        glass.i('uStainedGlass', 4);
        this.draw(this.glassLight);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
    }
    const toPerson=person?sub(person.origin,eye):null;
    const distance=toPerson?Math.hypot(...toPerson):Infinity;
    if (person && distance < 90 && dot(forward,toPerson)>-2) {
      const detailed = quality === 2 && distance < 23;
      const actor = (interior ? 2 : 0) + Number(detailed);
      if (!this.people.has(actor)) this.people.set(actor, buildPerson(gl, !interior, detailed));
      setupMaterials(this.personProgram).mat('uBones[0]', person.matrices);
      this.draw(this.people.get(actor));
    }

    gl.bindVertexArray(this.screen);
    const water=this.water.use();
    water.mat('uMatrix',matrix);
    water.v3('uEye',eye);
    water.v2('uLimits',LIMITS);
    water.f('uEffect',level.effect);
    water.f('uTime',time);
    water.i('uMap',0);
    bind(gl,0,this.map);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.depthMask(false);
    const sky=this.sky.use();
    sky.v3('uForward',forward);
    sky.v3('uRight',right);
    sky.v3('uUp',up);
    sky.v2('uLens',[tan*aspect,tan]);
    sky.f('uTime',time);
    sky.f('uEffect',quality===0?0:level.effect);
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.depthMask(true);

    if (aa) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.DEPTH_TEST);
      gl.bindVertexArray(this.screen);
      const fx = this.post.use();
      fx.v2('uPixel', [1/width,1/height]);
      fx.i('uSource', 2);
      bind(gl, 2, aa.color);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  static fps(quality) { return LEVELS[quality].fps; }
}
