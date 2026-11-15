import { Mesh, cross, normal, sub } from './mesh.js';
import { TAU, clamp } from './terrain.js';
import { BASE, ANGLE, ENTRY, FLOORS, world, entryTop } from './layout.js';

const SKIN = 13;
const HAIR = 14;
const COAT = 15;
const SEAM = 16;
const CLOTH = 17;
const BOOT = 18;
const EYE = 19;
const IRIS = 20;
const LIP = 21;
const BRASS = 22;
const LINEN = 23;
const SPINE = [
  ['pelvis', -1, [0, .939, .000]],
  ['chest', 0, [0, 1.183, .002]],
  ['head', 1, [0, 1.532, .019]],
  ['armL', 1, [-.193, 1.435, .003]],
  ['foreL', 3, [-.244, 1.185, -.002]],
  ['handL', 4, [-.277, .970, .025]],
  ['armR', 1, [.193, 1.435, .003]],
  ['foreR', 6, [.244, 1.185, -.002]],
  ['handR', 7, [.277, .970, .025]],
  ['legL', 0, [-.095, .942, .006]],
  ['shinL', 9, [-.103, .509, .010]],
  ['bootL', 10, [-.103, .118, -.001]],
  ['legR', 0, [.095, .942, .006]],
  ['shinR', 12, [.103, .509, .010]],
  ['bootR', 13, [.103, .118, -.001]],
  ['skirt', 0, [0, 1.056, .007]]
];
const BODY = Object.fromEntries(SPINE.map(([name], i) => [name, i]));
const ALL_BONES = SPINE.length;

function ringSurface(mesh, frame, heightStep, sides, mat, tone, materialAt, phase = 0, uvAt) {
  const p = (i, j) => frame(i, TAU * (j % sides) / sides + phase);
  const create = (i, j) => {
    const before = p(Math.max(0, i - 1), j);
    const after = p(Math.min(heightStep, i + 1), j);
    const facing = normal(cross(sub(p(i, j + 1), p(i, j + sides - 1)), sub(after, before)));
    return Math.hypot(...facing) > .05 ? facing : [Math.sin(j*TAU/sides)*.18,i < heightStep*.5 ? -1 : 1,Math.cos(j*TAU/sides)*.18];
  };
  for (let i = 0; i < heightStep; i++) {
    for (let j = 0; j < sides; j++) {
      const a = p(i, j), b = p(i, j + 1), c = p(i + 1, j + 1), d = p(i + 1, j);
      const nn = [create(i, j), create(i, j + 1), create(i + 1, j + 1), create(i + 1, j)];
      const uv = uvAt ? [a,b,c,d].map(uvAt)
        : [[j/sides, i/heightStep], [(j+1)/sides, i/heightStep], [(j+1)/sides,(i+1)/heightStep], [j/sides,(i+1)/heightStep]];
      const variant = materialAt ? materialAt(i, TAU * (j + .5) / sides + phase) : mat;
      mesh.tri(a,b,c,variant,tone,[nn[0],nn[1],nn[2]],[uv[0],uv[1],uv[2]]);
      mesh.tri(a,c,d,variant,tone,[nn[0],nn[2],nn[3]],[uv[0],uv[2],uv[3]]);
    }
  }
}

function profile(mesh, bands, sides, material, tone = 1, deform, materialAt, phase) {
  ringSurface(mesh, (i, a) => {
    const [y, cx, z, w, front, back] = bands[i];
    const cos = Math.cos(a);
    const v = [cx + w*Math.sin(a), y, z + (cos < 0 ? back : front) * cos];
    if (deform) deform(v, a, i);
    return v;
  }, bands.length-1, sides, material, tone, materialAt, phase);
}

function ellipsoid(mesh, x, y, z, w, h, depth, mat, tint, sides = 14, layers = 7, tilt = 0, uvAt) {
  ringSurface(mesh, (i, a) => {
    const q = Math.PI * (i/layers - .5);
    const yy = Math.sin(q)*h;
    const zz = Math.cos(q)*Math.cos(a)*depth;
    const drag = Math.sin(tilt);
    return [
      x + Math.cos(q)*Math.sin(a)*w,
      y + yy * Math.cos(tilt) - zz * drag,
      z + zz * Math.cos(tilt) + yy * drag
    ];
  }, layers, sides, mat, tint, undefined, 0, uvAt);
}

const gaussian = (x, mean, width) => Math.exp(-Math.pow((x-mean)/width, 2));

function face(mesh, detailed, outer) {
  const head = [
    [1.507,0,.012,.055,.059,.060],[1.551,0,.025,.051,.060,.060],
    [1.571,0,.030,.062,.066,.067],[1.597,0,.025,.073,.077,.071],
    [1.620,0,.022,.077,.078,.077],[1.643,0,.022,.082,.072,.080],
    [1.662,0,.024,.086,.074,.088],[1.679,0,.021,.086,.075,.090],
    [1.696,0,.019,.085,.081,.089],[1.722,0,.014,.083,.086,.086],
    [1.746,0,.017,.074,.075,.078],[1.768,0,.017,.055,.052,.057],
    [1.792,0,.020,.018,.019,.022],[1.795,0,.020,.002,.002,.002]
  ];
  const faceShape = (v, a) => {
    if (Math.cos(a) < .14) return;
    const [x,y] = v;
    const side = Math.abs(x);
    const nose = .026*gaussian(side,0,.023)*gaussian(y,1.664,.026);
    const bridge = .013*gaussian(side,0,.013)*gaussian(y,1.689,.028);
    const cheeks = .014*gaussian(side,.052,.023)*gaussian(y,1.653,.023);
    const eyeHollows = .012*gaussian(side,.040,.021)*gaussian(y,1.683,.013);
    const mouth = .008*gaussian(side,0,.041)*gaussian(y,1.615,.019);
    v[2] += nose + bridge + cheeks - eyeHollows + mouth;
  };
  profile(mesh, head, detailed ? 38 : 20, SKIN, outer ? .85 : 1.02, faceShape);
  for (const side of [-1, 1]) {
    ellipsoid(mesh, side*.079, 1.655, .018, .015, .027, .026, SKIN, .86, 14, 6, -.12);
    ellipsoid(mesh, side*.086, 1.657, .031, .0075, .015, .014, LIP, .74, 10, 5, -.13);
  }
  ellipsoid(mesh, 0, 1.661, .107, .017, .012, .016, SKIN, .99, 13, 7, -.15);
  for (const side of [-1, 1]) {
    ellipsoid(mesh, side*.011, 1.654, .114, .005, .0032, .0056, LIP, .48, 8, 4);
    const x=side*.036;
    ellipsoid(mesh, x, 1.684, .086, .018, .0063, .012, EYE, .86, 13, 6);
    const eyeX=x-side*.001;
    ellipsoid(mesh, eyeX, 1.684, .096, .0062, .0061, .0029, IRIS, 1.01, 12, 5, 0,
      ([a,b])=>[.5+(a-eyeX)/.0124,.5+(b-1.684)/.0122]);
    if (detailed) {
      ellipsoid(mesh, x-.002, 1.686, .099, .0016, .0014, .0006, EYE, .96, 7, 4);
      for (const row of [.042,.051]) {
        mesh.rod([x-side*.023,1.699- Math.abs(.047-row)*.5,.087],
          [x+side*.017,1.698-Math.abs(.047-row)*.4,.080], .0018,.0012,HAIR,4,.79);
      }
    }
  }
  ellipsoid(mesh, 0, 1.619, .105, .026, .0041, .006, LIP, .77, 14, 5);
  ellipsoid(mesh, 0, 1.612, .105, .023, .0048, .0058, LIP, .92, 14, 5);
  const hair = [
    [1.665,0,.018,.077,.059,.093],[1.706,0,.018,.086,.078,.092],
    [1.741,-.003,.018,.089,.091,.091],[1.774,-.007,.018,.079,.083,.085],
    [1.797,-.011,.018,.058,.066,.063],[1.807,-.015,.02,.027,.031,.026],[1.808,-.015,.02,.004,.003,.003]
  ];
  const wrap = (v, a, step) => {
    const front = Math.max(0,Math.cos(a));
    v[1] += .059*Math.pow(front,.92)*Math.exp(-step*.70);
    v[1] += .0031*Math.sin(a*9+step*.73)+.0025*Math.sin(a*17-step*.819);
    v[2] += .0037*Math.cos(a*13+step*.8);
  };
  profile(mesh,hair,detailed ? 44 : 25,HAIR,outer ? .72 : .98,wrap);
  if (detailed) {
    for (let j=0;j<8;j++) {
      const a = -.86 + j*.265;
      const w = .008 + j*.00027;
      mesh.rod([-.050+a*.061,1.768+.012*Math.cos(j*.56),.071],
        [-.049+a*.048,1.796+.003*Math.sin(j),.064], w,w*.5,HAIR,6,.82+j*.025);
    }
  }
}

function torso(mesh, outer, detailed) {
  const coat = [
    [.987,0,-.011,.159,.103,.118],[1.06,0,-.005,.181,.110,.110],
    [1.152,0,.009,.165,.105,.108],[1.266,0,.008,.177,.129,.127],
    [1.358,0,.002,.200,.136,.133],[1.427,0,.002,.207,.098,.113],
    [1.491,0,.002,.139,.080,.085],[1.523,0,.012,.069,.066,.068],
    [1.535,0,.012,.013,.020,.021]
  ];
  const folds = (v, a, step) => {
    const f = .0035*Math.sin(a*7+step*.49)+.0021*Math.cos(a*12-step*.60);
    v[0] += Math.sin(a)*f;
    v[2] += Math.cos(a)*f;
  };
  profile(mesh,coat,detailed ? 32 : 20,COAT,outer ? .77 : 1.01,folds);
  profile(mesh,[[1.463,0,.034,.066,.062,.059],[1.510,0,.027,.069,.065,.062],
    [1.542,0,.022,.060,.059,.057],[1.552,0,.022,.056,.056,.055]],20,LINEN,outer ? .58 : 1.07);
  for(const side of [-1,1]) {
    mesh.quad([0,1.31,.135],[side*.072,1.463,.107],[side*.109,1.487,.073],[side*.063,1.351,.137],SEAM,.98);
    mesh.quad([side*.035,1.194,.114],[side*.111,1.194,.098],[side*.109,1.228,.108],
      [side*.025,1.229,.128],SEAM,.92);
    if (detailed) mesh.rod([side*.137,1.439,.076],[side*.067,1.497,.072],.006,.006,SEAM,6,.88);
  }
  mesh.rod([.009,1.013,.099],[.009,1.358,.145],.0045,.0045,SEAM,5,.72);
  for (let i=0;i<4;i++) {
    ellipsoid(mesh,.024,1.061+i*.079,.105+i*.012,.0089,.0090,.0045,BRASS,.78,9,5);
  }
  if (outer) {
    profile(mesh, [[1.389,-.016,.027,.045,.105,.026],[1.456,-.011,.027,.072,.104,.077],
      [1.505,0,.018,.071,.076,.074],[1.549,0,.017,.066,.067,.064]],20,LINEN,.78);
    mesh.quad([-.039,1.252,.153],[.035,1.253,.152],[.022,1.479,.129],[-.059,1.484,.128],LINEN,.72);
  }
}

function arm(mesh, bone, lower, hand, side, outer, detailed) {
  const m = mesh[bone], l = mesh[lower], h = mesh[hand];
  const sideX = index => SPINE[BODY[index]][2][0];
  const x=sideX(bone), elbow=sideX(lower), wrist=sideX(hand);
  profile(m,[[1.149,elbow,-.015,.045,.049,.049],[1.195,elbow,-.008,.059,.057,.059],
    [1.245,side*.235,-.007,.061,.058,.059],[1.324,side*.218,0,.071,.073,.072],
    [1.384,side*.207,0,.080,.079,.077],[1.437,x,.004,.077,.076,.079],[1.473,x,.009,.050,.060,.066]],
  detailed ? 16 : 12,COAT,outer ? .79 : .96);
  profile(l,[[.937,wrist,.028,.032,.038,.035],[.972,wrist,.023,.040,.042,.042],
    [1.008,side*.271,.006,.043,.049,.047],[1.089,side*.259,0,.051,.054,.051],
    [1.162,elbow,-.009,.060,.051,.054],[1.210,elbow,-.008,.048,.05,.048]],detailed ? 16 : 12,COAT,outer ? .76 : 1.01,
  undefined,i => i===0 ? SEAM : COAT);
  ellipsoid(h,wrist,.920,.026,.032,.053,.026,SKIN,.88,14,7,.11);
  ellipsoid(h,wrist-side*.024,.912,.043,.009,.032,.012,SKIN,1.05,10,6,.3);
  if (detailed) {
    for(let i=0;i<4;i++) ellipsoid(h,wrist-side*(.009-.007*i),.889+i*.004,
      .036+i*.003,.006,.014,.007,SKIN,.89+i*.019,9,5,.22);
  }
}

function lowerBody(mesh, side, names, detailed) {
  const [leg, shin, boot] = names.map(name => mesh[name]);
  const x = side*.100;
  profile(leg,[[.482,x,.015,.050,.050,.048],[.525,x,.012,.069,.067,.064],
    [.64,x,.006,.077,.076,.076],[.78,side*.102,.008,.090,.089,.090],
    [.921,side*.093,.006,.091,.106,.116],[.970,side*.083,.006,.095,.113,.119]],detailed ? 20 : 13,CLOTH,.96);
  profile(shin,[[.10,x,.007,.043,.043,.044],[.203,x,.009,.049,.049,.056],
    [.33,x,-.018,.065,.059,.064],[.455,x,.007,.064,.064,.058],
    [.521,x,.009,.065,.065,.063],[.562,x,.009,.051,.055,.049]],detailed ? 18 : 13,CLOTH,1);
  profile(boot,[[.012,x,.041,.055,.135,.090],[.031,x,.041,.060,.140,.094],
    [.047,x,.046,.057,.132,.095],[.068,x,.047,.055,.129,.094],
    [.092,x,.039,.052,.105,.078],[.136,x,.007,.047,.065,.056],
    [.171,x,.007,.047,.057,.052],[.184,x,.008,.040,.050,.049]],detailed ? 20 : 13,BOOT,.96,
  undefined,i => i===1 ? SEAM : BOOT);
  if (detailed) {
    for(let i=0;i<4;i++) boot.rod([x-.017,.082+i*.013,.116-i*.012],
      [x+.018,.078+i*.013,.116-i*.012],.0026,.0026,LINEN,5,.54);
  }
}

function coatHem(mesh, detailed, outer) {
  profile(mesh,[[.707,0,-.018,.232,.173,.177],[.731,0,-.018,.231,.174,.177],
    [.816,0,-.016,.223,.166,.169],[.925,0,-.010,.209,.154,.156],
    [1.018,0,-.009,.190,.135,.136],[1.070,0,-.007,.180,.123,.123]],
    detailed ? 46 : 28,COAT,outer ? .76 : 1,(p,angle,row) => {
      const fade = 1 - row / 5.6;
      const pleat = (.0032 * Math.sin(angle * 13 + row * .19) + .0075 * Math.cos(angle * 5)) * fade;
      p[0] += Math.sin(angle) * pleat;
      p[1] += (.012 * Math.sin(angle * 2.1) + .0055 * Math.cos(angle * 6)) * fade;
      p[2] += Math.cos(angle) * pleat;
    }, row => row === 0 ? SEAM : COAT);
}

export function buildPerson(gl, outer, detailed) {
  const meshes=Object.fromEntries(SPINE.map(([name]) => [name,new Mesh()]));
  face(meshes.head,detailed,outer);
  torso(meshes.chest,outer,detailed);
  arm(meshes,'armL','foreL','handL',-1,outer,detailed);
  arm(meshes,'armR','foreR','handR',1,outer,detailed);
  lowerBody(meshes,-1,['legL','shinL','bootL'],detailed);
  lowerBody(meshes,1,['legR','shinR','bootR'],detailed);
  coatHem(meshes.skirt,detailed,outer);
  const total = Object.values(meshes).reduce((sum, m) => sum+m.values.length/10,0);
  const vertices = new Float32Array(total*13);
  let to=0;
  for (const [name,index] of Object.entries(BODY)) {
    const data=meshes[name].values;
    const parent=SPINE[index][1];
    const pivot=SPINE[index][2];
    for(let i=0;i<data.length;i+=10) {
      for(let j=0;j<10;j++) vertices[to+j]=data[i+j];
      const mixed = /^(fore|hand|shin|boot|leg|arm)/.test(name) ? .45 * clamp(1-Math.abs(data[i+1]-pivot[1])/.072) : 0;
      vertices[to+10]=index;
      vertices[to+11]=parent < 0 ? index : parent;
      vertices[to+12]=mixed;
      to+=13;
    }
  }
  const vao=gl.createVertexArray(), buffer=gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
  for(const [index,width,offset] of [[0,3,0],[1,3,12],[2,2,24],[3,2,32],[4,3,40]]) {
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index,width,gl.FLOAT,false,52,offset);
  }
  gl.bindVertexArray(null);
  return {vao,buffer,count:total};
}

function rotation(x,y,z) {
  const s=Math.sin, c=Math.cos;
  return [
    c(y)*c(z),c(x)*s(z)+s(x)*s(y)*c(z),s(x)*s(z)-c(x)*s(y)*c(z),
    -c(y)*s(z),c(x)*c(z)-s(x)*s(y)*s(z),s(x)*c(z)+c(x)*s(y)*s(z),
    s(y),-s(x)*c(y),c(x)*c(y)
  ];
}

const transform = (m,p) => [
  m[0]*p[0]+m[3]*p[1]+m[6]*p[2],
  m[1]*p[0]+m[4]*p[1]+m[7]*p[2],
  m[2]*p[0]+m[5]*p[1]+m[8]*p[2]
];

function combine(a,b) {
  return [...transform(a,b.slice(0,3)),...transform(a,b.slice(3,6)),...transform(a,b.slice(6,9))];
}
const sum = (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];

export function personPose(interior, seconds, moving) {
  const secondsForWalk = moving ? seconds : 0;
  const turn=secondsForWalk*(interior?.31:.45);
  const control = Math.sin(turn);
  const speed=Math.abs(Math.cos(turn))*Number(moving)*(interior?1:.69);
  const step = secondsForWalk * 3.89;
  const wave = Math.sin(step);
  const lift = (.008 + .021 * Math.pow(Math.sin(step + .20),2))*speed;
  const facing = .5 * Math.PI * (1 - Math.tanh(Math.cos(turn)*4.75));
  const heading=-ANGLE+Math.PI+facing-.08;
  const x=interior?-1.16+.12*control:.92+.05*control;
  const z=interior?15.85-4.30*control:ENTRY.edge+2.93-.86*control;
  const origin=world(x,0,z);
  origin[1]=BASE+(interior?FLOORS[0]:entryTop(z))+.018;
  const roots=rotation(0,heading,0);
  const anchor=[origin[0],origin[1]+lift,origin[2]];
  const bones=[];
  const matrices=new Float32Array(ALL_BONES*16);
  const angles = {
    pelvis:[.016, .061*wave*speed, .028*wave*speed],
    chest:[-.021, -.119*wave*speed, -.038*wave*speed],
    head:[.020 + Math.sin(secondsForWalk*.97)*.018, .065+.149*Math.sin(secondsForWalk*.68),.012+.023*Math.sin(secondsForWalk*.54)],
    armL:[-.095+.36*wave*speed,0,-.07],
    armR:[-.070-.36*wave*speed,0,.08],
    foreL:[-.18-.22*Math.max(0,wave)*speed,0,-.012],
    foreR:[-.17-.22*Math.max(0,-wave)*speed,0,.014],
    handL:[.066+.10*wave*speed,-.073,.039],
    handR:[.066-.10*wave*speed,.062,-.032],
    legL:[-.37*wave*speed,.04,-.033],
    legR:[.37*wave*speed,-.025,.023],
    shinL:[(.11+.56*Math.max(0,Math.sin(step-.52)))*speed,0,0],
    shinR:[(.11+.56*Math.max(0,-Math.sin(step-.52)))*speed,0,0],
    bootL:[-.29*Math.max(0,wave)*speed,0,0],
    bootR:[-.29*Math.max(0,-wave)*speed,0,0],
    skirt:[.049*wave*speed,.071*wave*speed,-.018*wave*speed]
  };
  for (let i=0;i<SPINE.length;i++) {
    const [name,parent,pivot]=SPINE[i];
    const inherited = parent === -1 ? { basis:roots, p:anchor, pivot:[0,0,0] } : bones[parent];
    const basis = combine(inherited.basis,rotation(...angles[name]));
    const p=sum(inherited.p,transform(inherited.basis,sub(pivot,inherited.pivot)));
    bones.push({basis,p,pivot});
    const offset=sub(p,transform(basis,pivot));
    matrices.set([basis[0],basis[1],basis[2],0,basis[3],basis[4],basis[5],0,
      basis[6],basis[7],basis[8],0,...offset,1],i*16);
  }
  return { matrices, origin };
}
