import { SURFACE, SURFACE_START, SURFACE_LAYERS } from './surfaces.js';
import { BASE, CRYPT, CRYPT_LIGHTS } from './layout.js';
import { DECOR, DECOR_START, DECOR_LAYERS, DECOR_SHADING, DECOR_FALLBACK, DECOR_GLOW, DECOR_STANDIN } from './decor.js';

const glslVec3 = rows => rows.map(r => `vec3(${r.map(v => Number(v).toFixed(3)).join(',')})`).join(',');

const header = `#version 300 es
precision highp float;
precision highp int;
`;

const common = `
const vec3 SUN = vec3(-.695, .452, .559);
const vec3 SUN_COLOR = vec3(1.0, .80, .57);
const vec3 HORIZON = vec3(.568, .692, .743);

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
             mix(hash21(i + vec2(0,1)), hash21(i + vec2(1)), f.x), f.y);
}
float fbm(vec2 x) {
  const mat2 turn = mat2(.83,.56,-.56,.83);
  float f = .54 * noise2(x);
  x = turn * x * 2.06 + 7.13;
  f += .27 * noise2(x);
  x = turn * x * 2.03 + 12.65;
  f += .125 * noise2(x);
  f += .065 * noise2(turn * x * 2.01 + 4.83);
  return f;
}
vec3 grade(vec3 c) {
  vec3 v = 1.0 - exp(-max(c, vec3(0)) * 1.31);
  return pow(v, vec3(.796));
}
vec3 skyBase(vec3 ray) {
  float y = clamp(ray.y, 0.0, 1.0);
  vec3 c = mix(HORIZON, vec3(.157, .337, .510), pow(smoothstep(0.0,.65,y),.56));
  c = mix(c, vec3(.074,.180,.329), smoothstep(.32,1.0,y) * .55);
  float light = max(dot(ray, SUN), 0.0);
  c += vec3(.60,.335,.126) * (pow(light,7.0) * .27 + pow(light,48.0) * .28);
  c += vec3(.11,.072,.052) * exp(-y * 13.0) * (.36 + .64 * light);
  return c;
}
vec3 sky(vec3 ray, float detail, float time) {
  vec3 color = skyBase(ray);
  if (ray.y > -.026 && detail > .1) {
    vec2 plane = ray.xz / (.193 + max(ray.y, 0.0));
    vec2 p = mat2(.83,-.55,.55,.83) * plane * vec2(1.63,2.04) + vec2(5.47,12.3);
    p += time * vec2(.002, .0011);
    vec2 drift = vec2(fbm(p*.36+9.13),noise2(p*.39));
    vec2 cloudSpace = p+(drift-.5)*1.79;
    float broad = fbm(cloudSpace);
    float wisps = noise2(cloudSpace*5.16) * .082;
    float n = broad + wisps*detail;
    float shade = 0.62*broad + .38*fbm(cloudSpace+vec2(-.43,.39));
    float sunward = clamp(.48 + 4.7*(n-shade),0.0,1.0);
    float outer = smoothstep(.46,.678,n);
    float mass = smoothstep(.55,.755,n);
    float horizonFade = smoothstep(-.010,.184,ray.y);
    vec3 cloudRim = mix(vec3(.780,.853,.904),vec3(1.17,1.025,.79),sunward);
    vec3 cloudCore = mix(vec3(.390,.481,.567),vec3(.846,.823,.742),sunward);
    color = mix(color,mix(cloudRim,cloudCore,mass*.78),outer*horizonFade*.95);
    float cirrus = smoothstep(.45,.70,fbm(vec2(p.x*.55,p.y*2.83)+38.2));
    color = mix(color,vec3(.796,.884,.953),cirrus*cirrus*.36*horizonFade);
  }
  float sunCos = dot(ray, SUN);
  color += vec3(3.1,2.38,1.35) * smoothstep(.999855,.999967,sunCos);
  color += vec3(.18,.125,.07) * pow(max(0.0,sunCos),265.0);
  return color;
}
vec3 stained(vec2 uv, bool roundWindow) {
  vec2 cell;
  float lead;
  float edge;
  if (roundWindow) {
    vec2 q = uv - .5;
    float angle = atan(q.y,q.x) / 6.2831853 + .5;
    float radius = max(length(q),.0005);
    vec2 tess = vec2(angle * 12.0, radius * 12.0 + .12 * cos(angle * 75.3982));
    cell = floor(tess);
    vec2 f = fract(tess);
    lead = min(min(f.x,1.0-f.x)*radius*3.1,min(f.y,1.0-f.y));
    edge = smoothstep(.07,.37,radius);
  } else {
    vec2 tess = uv * vec2(7.0,15.0);
    vec2 q = vec2(tess.x + tess.y*.35, tess.y - tess.x*.41);
    cell = floor(q);
    vec2 f = fract(q);
    lead = min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));
    edge = abs(uv.x-.5)*2.0;
  }
  float i = hash21(cell + 51.0);
  vec3 cobalt = vec3(.037,.235,.597);
  vec3 burgundy = vec3(.58,.034,.084);
  vec3 amber = vec3(.87,.410,.065);
  vec3 turquoise = vec3(.051,.406,.355);
  vec3 color = i < .34 ? cobalt : i < .57 ? burgundy : i < .78 ? amber : turquoise;
  color = mix(color, vec3(.25,.087,.315), edge * .20);
  color *= .73 + .48 * noise2(uv * 42.0) + .22 * sin(uv.y * 21.0 + uv.x * 7.0);
  float aa = clamp(fwidth(lead)*.72,.019,.18);
  vec2 q = uv - vec2(.5,.54);
  float halo = abs(length(q*vec2(1,.48))-.194) + .018*fbm(uv*19.4);
  float border = abs(abs(q.x)-(.41 + .015*sin(uv.y*57.13)));
  float motif = smoothstep(.036,.115,abs(sin(uv.y*37.7+cos(q.x*24.7)))) * (1.0-smoothstep(.28,.39,abs(q.x)));
  if(!roundWindow) {
    color = mix(color, amber*.81, (1.0-smoothstep(.007,.038,halo))*.82);
    color = mix(color, cobalt*.87, (1.0-smoothstep(.01,.038,border))*.82);
    color *= .77+.27*motif;
  }
  float flaws = noise2(uv*119.0+83.1);
  color *= .87+flaws*.24;
  return mix(vec3(.019,.020,.025), color, smoothstep(.033-aa,.044+aa,lead));
}

uniform sampler2D uStainedGlass;
uniform bool uHasStainedGlass;
vec3 lancet(vec2 uv, bool roundWindow) {
  if (roundWindow || !uHasStainedGlass) return stained(uv,roundWindow);
  vec3 panes = texture(uStainedGlass,vec2(uv.x,1.0-uv.y)).rgb;
  return pow(panes,vec3(1.38))*vec3(.99,1.00,1.13);
}
`;

export const backdropVertex = header + `
out vec2 vScreen;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  vScreen = p;
  gl_Position = vec4(p, 1.0, 1.0);
}
`;

export const backdropFragment = header + common + `
in vec2 vScreen;
out vec4 color;
uniform vec3 uForward;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec2 uLens;
uniform float uEffect;
uniform float uTime;
void main() {
  vec3 ray = normalize(uForward + uRight * (vScreen.x*uLens.x) + uUp*(vScreen.y*uLens.y));
  color = vec4(grade(sky(ray, uEffect, uTime)), 1.0);
}
`;

export const shadowVertex = header + `
layout(location = 0) in vec3 aPosition;
uniform mat4 uMatrix;
void main() {
  gl_Position = uMatrix * vec4(aPosition,1.0);
}
`;

export const shadowFragment = header + `
void main() {}
`;

export const stoneVertex = header + `
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec2 aMaterial;
uniform mat4 uMatrix;
uniform mat4 uLight;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec3 vShadow;
flat out vec2 vMaterial;
void main() {
  gl_Position = uMatrix * vec4(aPosition,1.0);
  vWorld = aPosition;
  vNormal = aNormal;
  vUv = aUv;
  vMaterial = vec2(aMaterial.x,aMaterial.y/128.0);
  vShadow = (uLight * vec4(aPosition,1.0)).xyz * .5 + .5;
}
`;

export const stoneFragment = header + common + `
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
in vec3 vShadow;
flat in vec2 vMaterial;
out vec4 color;
uniform vec3 uEye;
uniform sampler2D uShadow;
uniform highp sampler2DArray uMaterials;
uniform highp sampler2DArray uCraft;
uniform highp sampler2DArray uSurfaces;
uniform highp sampler2DArray uDecor;
uniform sampler2D uAltarpiece;
uniform int uLayers;
uniform vec4 uSite;
uniform vec2 uShadowStep;
uniform bool uHasShadow;
uniform bool uHasMaterials;
uniform bool uHasCraft;
uniform bool uHasSurfaces;
uniform bool uHasDecor;
uniform int uDecorLayers;
uniform bool uHasAltarpiece;
uniform bool uInterior;
uniform vec3 uPerson;
uniform float uEffect;
uniform float uTime;
uniform float uFloor;

float luminance(vec3 color){return dot(color,vec3(.24,.60,.16));}
vec4 materialGrain(vec2 at,float layer){
  vec3 c=texture(uMaterials,vec3(at,layer)).rgb;
  if(layer>=8.0&&layer<16.0)return vec4(.5,c.gb,c.r);
  return vec4(c,.5+luminance(c-.5)*.88);
}

float visibility(vec3 n) {
  if (!uHasShadow || uInterior || vShadow.x < 0.0 || vShadow.y < 0.0
    || vShadow.x > 1.0 || vShadow.y > 1.0 || vShadow.z > 1.0) return 1.0;
  float bias = mix(.00235,.00072,max(0.0,dot(n,SUN)));
  float z = vShadow.z - bias;
  float shadow = 0.0;
  for (int i=-1; i<=1; i++) {
    for (int j=-1; j<=1; j++) {
      float s = texture(uShadow,vShadow.xy + vec2(float(i),float(j))*uShadowStep).r;
      shadow += step(z,s);
    }
  }
  return shadow / 9.0;
}

vec2 buildingDirection(vec2 xz){return mat2(uSite.z,-uSite.w,uSite.w,uSite.z)*xz;}
vec2 buildingSpace(vec2 xz){return buildingDirection(xz-uSite.xy);}
float footprintAO(vec3 p) {
  vec2 v = buildingSpace(p.xz);
  vec2 nave = abs(v-vec2(0,3.1))-vec2(12.15,25.6);
  vec2 wing = abs(v-vec2(0,-3.33))-vec2(20.36,6.36);
  float d = min(length(max(nave,0.0)),length(max(wing,0.0)));
  return mix(.61,1.0,smoothstep(.02,2.8,d));
}

vec3 geology(vec3 p, vec3 n, bool rock, bool detailed, out float bump) {
  float bank = smoothstep(.62,.92,n.y);
  float elevation = smoothstep(.48,3.66,p.y);
  vec2 warped = p.xz * .42 + vec2(p.y*.13,-p.y*.24);
  float coarse = detailed ? fbm(warped*.80) : noise2(warped*.73);
  float grit = noise2(warped * 5.4 + p.y * 1.89);
  float bladeField = noise2(p.xz*.075 + 9.46);
  float variation = .62 * coarse + .38 * bladeField;
  vec2 bedding = vec2(p.x*.56+p.z*.28, p.y*.91-p.x*.126+p.z*.159);
  float faults = noise2(vec2(bedding.x*1.64, bedding.y*.71+4.45));
  float cleft = 1.0-smoothstep(.036,.197,abs(faults-.523));
  float phase = bedding.y*4.43 + (coarse-.48)*5.9 + cleft*.46;
  float strata = detailed ? sin(phase) * .53 + .36 * sin(phase * 1.91 + .71) : sin(phase) * .61;
  float split = smoothstep(.34,.72,noise2(vec2(p.x*.86+p.z*.39,p.y*2.92) + coarse*1.39));
  float stripes = clamp(.52 + strata * .31 + split*.12 + .16 * (grit-.5),0.0,1.0);
  vec3 rockHue = mix(vec3(.085,.090,.082),vec3(.356,.344,.286),stripes) * (1.0-cleft*.24);
  rockHue *= .77 + grit*.29 + coarse*.25;
  vec3 slateVein = mix(vec3(.099,.118,.125),vec3(.293,.311,.300),stripes);
  rockHue = mix(rockHue,slateVein,smoothstep(.35,.66,coarse)*.72);
  vec3 dryGrass = vec3(.264,.289,.127);
  vec3 lush = vec3(.079,.168,.049);
  vec3 tundra = mix(lush, dryGrass, smoothstep(.29,.76,variation));
  tundra *= .77+.47*grit+.21*coarse;
  float turf = bank * elevation * (rock ? .30 : .89) * smoothstep(.29,.52,variation + bank*.13);
  float moss = smoothstep(.51,.68,coarse + grit*.09) * elevation * .25;
  vec3 result = mix(rockHue,tundra,turf + (1.0-turf)*moss);
  float sand = smoothstep(.53,.85,n.y) * (1.0-smoothstep(.13,1.30,p.y));
  result = mix(result, mix(vec3(.164,.162,.125),vec3(.357,.324,.224),grit),sand*.72);
  float wetness = 1.0-smoothstep(.12+.25*coarse,1.22+.78*coarse,p.y);
  bump += grit*.24 + (1.0-turf) * (stripes*.50+split*.14-cleft*.46);
  if(uHasMaterials&&uLayers>=40){
    float layer=16.0;
    if(turf>.33)layer=variation>.50?19.0:18.0;
    else if(p.y<.47)layer=sand>.25?23.0:17.0;
    else if(p.y<1.7&&sand>.30)layer=22.0;
    else if(coarse>.62)layer=21.0;
    else if(coarse>.50)layer=20.0;
    vec2 at=vec2(bedding.x*.61,bedding.y*.56)+p.xz*.071;
    if(turf>.33)at=p.xz*.88;
    vec4 grain=materialGrain(at,layer);
    if(layer==20.0||layer==21.0)
      result=mix(result,layer==20.0?vec3(.27,.27,.23):vec3(.37,.22,.10),.33);
    result*=1.0+(grain.rgb-.5)*2.24;
    bump+=(grain.a-.5)*.81*(1.0-.58*turf);
  }
  return result * mix(1.0,.54,wetness) * footprintAO(p);
}

vec3 masonry(vec3 p, vec3 n, float type, bool detailed, out float bump) {
  vec2 xz = buildingSpace(p.xz);
    vec2 d=buildingDirection(n.xz);
  vec3 axis=abs(vec3(d.x,n.y,d.y));
  vec2 q = axis.x > axis.z ? vec2(xz.y,p.y) : vec2(xz.x,p.y);
  if (axis.y > .75) q = xz;
  bool paving=type==6.0||type==25.0;
  float rowHeight=paving?.68:type==9.0?.81:type>=26.0?.96:.56;
  float y = q.y/rowHeight;
  float drift = hash21(vec2(floor(y),17.58));
  float lengthStone=paving?.92:type==9.0?1.17:type>=26.0?1.36:1.07+.46*drift;
  float x = q.x / lengthStone + mod(floor(y),2.0)*.51 + drift*.85;
  vec2 id = floor(vec2(x,y));
  vec2 chip = fract(vec2(x,y));
  float block = hash21(id+38.16);
  float pixels = clamp(max(fwidth(x),fwidth(y))*.49,.017,.32);
  float grain = noise2(q*11.77 + .27 * noise2(q*4.8));
  float pits = detailed ? noise2(q * 36.21 + 7.2) : grain;
  float mineral = noise2(q * 1.28 + vec2(p.y*.075,p.z*.043));
  float mortar = min(min(chip.x,1.0-chip.x),min(chip.y,1.0-chip.y));
  float stagger = (grain-.5)*.061+(pits-.5)*.023;
  float bevel = smoothstep(.018 + stagger-pixels,.075+stagger+pixels,mortar);
  float joint = smoothstep(.022 + stagger-pixels,.038+stagger+pixels,mortar);
  float age = smoothstep(.46,.76,noise2(vec2(q.x*.71,q.y*.24)+71.7) + mineral *.10);
  float patina = clamp(mineral*.39 + age*.77,0.0,1.0);
  vec3 light = vec3(.601,.536,.424);
  vec3 old = vec3(.355,.350,.312);
  if (type == 9.0) { light=vec3(.596,.550,.454); old=vec3(.373,.358,.284); }
  if (type == 6.0) {
    light = mix(vec3(.387,.372,.321),vec3(.483,.447,.367),step(.51,block));
    old = vec3(.250,.258,.233);
  }
  if(type==25.0){light=vec3(.357,.357,.329);old=vec3(.211,.230,.231);}
  if(type==26.0){light=vec3(.724,.704,.633);old=vec3(.527,.535,.507);}
  if(type==27.0){light=vec3(.304,.178,.152);old=vec3(.168,.097,.086);}
  float calcium = smoothstep(.61,.83,noise2(q*3.63+block*.35)+.18*age);
  float stain = smoothstep(.58,.85,noise2(vec2(q.x*1.05,q.y*.235)+38.0));
  vec3 col = mix(light,old,patina*.71) * (.83 + block*.24 + (grain-.5)*.17 + (pits-.5)*.087);
  col = mix(col, col*vec3(.82,.73,.58),stain*.47);
  col = mix(col, col*vec3(1.19,1.18,1.09),calcium*.60);
  float melt=smoothstep(6.25,11.42,p.y);
  float algae = smoothstep(.46,.71,mineral + grain*.12 + age*.04) * (1.0-melt);
  col = mix(col,col*vec3(.65,.76,.51),algae*(type==6.0?.23:.36));
  if(uInterior&&type<25.0)col=mix(col,vec3(.514,.415,.313),.14);
  bump=bevel*.53+grain*.24+pits*.091;
  if(uHasMaterials&&uLayers>=40){
    float layer=floor(block*8.0);
    if(layer==3.0||layer==5.0)col*=mix(vec3(.84,.86,.90),vec3(.94),mineral);
    if(type==9.0)layer=block<.43?6.0:7.0;
    if(type==6.0)layer=27.0;
    if(type==25.0)layer=2.0;
    if(type==26.0)layer=28.0;
    if(type==27.0)layer=29.0;
    vec2 jitter=vec2(block*.68,drift*.54);
    vec4 detail=materialGrain(q*vec2(.79,.86)+jitter,layer);
    col*=1.0+(detail.rgb-.5)*(layer==28.0||layer==29.0?2.26:1.57);
    bump+=(detail.a-.5)*.76;
    if(type<=25.0&&uEffect>.2){
      float pattern=hash21(floor(q*.46)+vec2(5.46,13.6));
      float wind=noise2(vec2(q.x*1.65,q.y*.19)+97.21);
      float exposure=fbm(vec2(q.x*.55+p.x*.031,q.y*.40));
      float wear=8.0;
      if(uInterior){
        if(paving&&pattern>.62)wear=15.0;
        else if(pattern>.77&&wind>.51)wear=14.0;
        else if(pattern>.58)wear=10.0;
        else if(pattern>.39)wear=9.0;
      }else{
        if(melt<.72&&wind>.36){wear=12.0;exposure=max(exposure,1.0-melt);}
        else if(pattern>.79&&p.y<13.0)wear=11.0;
        else if(pattern>.625)wear=13.0;
        else if(pattern>.46)wear=15.0;
        else if(pattern>.31)wear=9.0;
        else if(pattern>.15)wear=10.0;
        else if(wind<.43)wear=14.0;
      }
      vec2 at=q*vec2(.94,.72)+jitter*.32;
      if(wear==12.0||wear==13.0)at=q*vec2(.49,.35);
      vec4 weather=materialGrain(at,wear);
      float impressions=clamp((weather.a-.255)/.72,0.0,1.0);
      float zone=smoothstep(.21,.57,exposure)*smoothstep(.08,.48,wind+.16);
      float fade=1.0-smoothstep(35.0,113.0,distance(vWorld,uEye));
      float strength=impressions*zone*mix(.31,.97,fade);
      if(wear==12.0){
        col=mix(col,vec3(.09,.149,.069)+weather.rgb*.17,strength*.88);
        bump+=strength*.38;
      }else if(wear==11.0){
        col=mix(col,col*vec3(1.38,1.37,1.30),strength*.78);
        bump+=strength*.24;
      }else{
        col*=1.0-strength*(wear<=9.0?.47:wear==10.0?.30:.46);
        float chips=wear==10.0||wear==15.0?.30:.052;
        col+=vec3(.51,.41,.30)*chips*(1.0-smoothstep(.095,.23,abs(impressions-.37)))*zone*fade;
        bump-=strength*(wear<=9.0?.72:.49);
      }
    }
  }
  return mix(col*vec3(.59,.58,.53),col,joint*.73+bevel*.27);
}

vec3 characterMaterial(vec3 p, vec2 uv, float type, out float bump, out float roughness) {
  float fiber = noise2(uv*vec2(72,126));
  float heather = noise2(uv*vec2(26,21)+12.1);
  vec2 thread = uv*vec2(376.9,279.3);
  float moire = 1.0-smoothstep(.80,2.9,max(fwidth(thread.x),fwidth(thread.y)));
  float weave = .50+moire*(smoothstep(.44,.62,.50+.27*sin(thread.x)*sin(thread.y))-.50);
  if (type == 13.0 || type == 21.0) {
    roughness = .52;
    float flesh = noise2(uv*29.7);
    bump = fiber*.071;
    vec3 skin = mix(vec3(.43,.218,.130),vec3(.64,.363,.237),flesh*.59+.27);
    if (type == 21.0) skin = mix(skin,vec3(.386,.101,.078),.64);
    return skin*(.91+.14*fiber);
  }
  if (type == 14.0) {
    roughness = .36;
    float filament = sin(uv.x*507.0 + 9.1*noise2(uv*7.3));
    bump = filament*.072;
    return mix(vec3(.037,.032,.027),vec3(.179,.143,.098),(.32+.35*heather+.18*filament));
  }
  if (type == 19.0) { roughness=.31; return vec3(.71,.697,.63); }
  if (type == 20.0) {
    roughness=.20;
    return mix(vec3(.027,.024,.020),vec3(.089,.077,.045),fiber*.34+weave*.28);
  }
  if (type == 22.0) {
    roughness=.27;
    bump = fiber*.054;
    return mix(vec3(.249,.147,.040),vec3(.76,.552,.189),.44+.37*heather+.12*weave);
  }
  if (type == 23.0) {
    roughness=.85;
    return mix(vec3(.306,.285,.240),vec3(.729,.667,.531),.54+.15*weave+.22*heather);
  }
  if (type == 24.0) {
    roughness=.95;
    float border = 1.0-smoothstep(.009,.022,abs(abs(uv.x-.5)-.423));
    float zig=1.0-smoothstep(.009,.023,abs(abs(uv.x-.5)-.365-.024*sin(uv.y*26.4)));
    vec2 box = abs(fract(uv*vec2(2.0,2.0))-.5);
    float dia=1.0-smoothstep(.022,.053,abs(box.x+box.y-.19));
    float trim=max(border,zig*.77);
    vec3 cl = mix(vec3(.126,.027,.026),vec3(.363,.101,.063),.45+.22*weave+.20*heather);
    return mix(cl,mix(vec3(.409,.263,.113),vec3(.649,.443,.197),weave*.45+.21),max(trim,dia*.47));
  }
  if (type == 18.0) {
    roughness=.43;
    bump=weave*.069+heather*.063;
    return mix(vec3(.037,.023,.018),vec3(.139,.114,.086),heather*.63+.19);
  }
  roughness=type==16.0 ? .65 : .81;
  bump=heather*.078+weave*.061;
  vec3 tint=type==15.0 ? vec3(.066,.117,.139) : type==16.0 ? vec3(.124,.172,.186) : vec3(.084,.080,.074);
  return tint*(.72+.23*heather+.22*weave+.14*fiber);
}

vec3 characterTexture(float type, vec3 base, inout float bump) {
  // The character's material IDs predate the surface atlas and use their own order.
  const float layers[9] = float[9](
    ${SURFACE.skin}.0, ${SURFACE.hair}.0, ${SURFACE.coat}.0, ${SURFACE.stitching}.0, ${SURFACE.trousers}.0,
    ${SURFACE.boot}.0, ${SURFACE.sclera}.0, ${SURFACE.iris}.0, ${SURFACE.lip}.0);
  float layer = layers[int(type)-13] - ${SURFACE_START}.0;
  if(type==20.0){
    vec3 iris = texture(uSurfaces,vec3(vUv,layer)).rgb;
    return max(vec3(.016,.015,.012),pow(iris,vec3(1.65))*.62);
  }
  vec2 coordinates = vUv;
  if(type==14.0) coordinates *= vec2(3.0,1.0);
  if(type>=15.0&&type<=18.0) coordinates *= vec2(2.0,1.5);
  vec3 detail = texture(uSurfaces,vec3(coordinates,layer)).rgb-.5;
  float grain = luminance(detail);
  float strength = type==13.0||type==19.0||type==21.0 ? .59 : 1.61;
  bump += grain*(type==14.0 ? .43 : .36);
  return max(vec3(.012),base*(1.0+grain*strength)+(detail-grain)*.14);
}

vec3 surfaceMaterial(float type,vec3 n,out float bump,out float roughness){
  const vec3 colors[27] = vec3[27](
    vec3(.233,.108,.049), vec3(.295,.174,.081), vec3(.097,.104,.109),
    vec3(.556,.494,.391), vec3(.139,.161,.181), vec3(.300,.076,.067),
    vec3(.230,.067,.043), vec3(.530,.350,.117), vec3(.207,.151,.112),
    vec3(.694,.506,.277), vec3(.680,.465,.229), vec3(.260,.101,.051),
    vec3(.101,.078,.058), vec3(.468,.223,.042), vec3(.330,.068,.047),
    vec3(.711,.659,.515), vec3(.294,.221,.156), vec3(.542,.532,.485),
    vec3(.377,.278,.143), vec3(.142,.177,.191), vec3(.206,.296,.251),
    vec3(.389,.246,.133), vec3(.444,.295,.154), vec3(.679,.501,.277),
    vec3(.486,.390,.263), vec3(.142,.149,.152), vec3(.329,.383,.409));
  const float rough[27] = float[27](
    .47,.32,.61,.82,.52,.94,.65,.34,.73,
    .97,.91,.61,.54,.17,.63,.32,.87,.30,
    .93,.51,.85,.75,.88,.67,.78,.60,.56);
  float layer = type-${SURFACE_START}.0;
  int index = int(layer) - (type>=${SURFACE.parchment}.0 ? 9 : 0);
  vec3 base = colors[index];
  roughness = rough[index];
  bump = 0.0;
  if(!uHasSurfaces)return base;

  vec2 local = buildingSpace(vWorld.xz);
  vec2 axis = abs(buildingDirection(n.xz));
  vec2 surface = abs(n.y)>.70 ? local : vec2(axis.x>axis.y ? local.y : local.x,vWorld.y);
  vec2 uv = surface * 1.20;
  if(type==${SURFACE.pewOak}.0||type==${SURFACE.handrail}.0) uv=surface*vec2(.73,2.08);
  if(type==${SURFACE.doorOak}.0||type==${SURFACE.ebony}.0||type==${SURFACE.pine}.0)uv=surface.yx*vec2(.79,2.05);
  if(type==${SURFACE.railIron}.0||type==${SURFACE.chain}.0||type==${SURFACE.brass}.0)uv=surface*3.40;
  if(type>=${SURFACE.binding}.0&&type<=${SURFACE.cork}.0)uv=surface*2.65;
  if(type==${SURFACE.runner}.0)uv=vUv*vec2(.95,.78);
  if(type==${SURFACE.endGrain}.0)uv=surface*1.8;
  if(type==${SURFACE.feather}.0||type==${SURFACE.seal}.0)uv=vUv;
  if(type==${SURFACE.parchment}.0||type==${SURFACE.illumination}.0||type==${SURFACE.ruler}.0){
    vec3 paint = texture(uSurfaces,vec3(clamp(vUv.x,.008,.992),clamp(1.0-vUv.y,.008,.992),layer)).rgb;
    return pow(paint,vec3(1.51))*.95+vec3(.024,.018,.010);
  }
  vec3 detail = texture(uSurfaces,vec3(uv,layer)).rgb-.5;
  float grain = luminance(detail);
  float pattern = type==${SURFACE.runner}.0||type==${SURFACE.ceramic}.0 ? 2.4 : 1.7;
  base = base*(1.0+grain*pattern)+(detail-grain)*(pattern-.99)*.57;
  if(type==${SURFACE.runner}.0){
    float border = 1.0-smoothstep(.009,.022,abs(abs(vUv.x-.5)-.425));
    float thread = smoothstep(.08,.34,grain);
    base = mix(base,vec3(.645,.367,.092),max(border*.82,thread*.72));
  }
  if(type==${SURFACE.amberGlass}.0){
    float edge = 1.0-max(0.0,dot(n,normalize(uEye-vWorld)));
    base += vec3(.286,.147,.029)*edge*edge;
  }
  bump = grain*(roughness<.40?.35:.91);
  return max(base,vec3(.01));
}

// Decor atlas: photographic albedo generated with GPT Image 2.5 Sunburst (see decor.js).
// shading.x > 0: world-projected repeats per metre; 0: the mesh UVs frame a single picture;
// < 0: mesh UVs measured in metres, repeated -x times per metre.
vec3 decorMaterial(float type, vec3 n, out float bump, out float roughness) {
  const vec3 shading[${DECOR_LAYERS}] = vec3[${DECOR_LAYERS}](${glslVec3(DECOR_SHADING)});
  const vec3 fallback[${DECOR_LAYERS}] = vec3[${DECOR_LAYERS}](${glslVec3(DECOR_FALLBACK)});
  const int standins[${DECOR_STANDIN.length}] = int[${DECOR_STANDIN.length}](${DECOR_STANDIN.join(',')});
  float layer = type-${DECOR_START}.0;
  vec3 s = shading[int(layer)];
  roughness = s.y;
  bump = 0.0;
  if(!uHasDecor) return fallback[int(layer)];
  vec2 uv;
  if(s.x==0.0) uv = vec2(clamp(vUv.x,.006,.994),clamp(1.0-vUv.y,.006,.994));
  else if(s.x<0.0) uv = vUv*-s.x;
  else {
    vec2 local = buildingSpace(vWorld.xz);
    vec2 axis = abs(buildingDirection(n.xz));
    uv = (abs(n.y)>.70 ? local : vec2(axis.x>axis.y ? local.y : local.x,-vWorld.y))*s.x;
  }
  // A layer missing from the loaded atlas borrows another layer's detail, tinted with its own colour.
  bool standin = int(layer)>=uDecorLayers;
  int source = standin ? standins[clamp(int(layer)-${DECOR_LAYERS-DECOR_STANDIN.length},0,${DECOR_STANDIN.length-1})] : int(layer);
  vec3 tex = texture(uDecor,vec3(uv,float(source))).rgb;
  float tone = luminance(tex);
  bump = (tone-.45)*(roughness<.40 ? .28 : .78);
  vec3 base = pow(tex,vec3(1.48))*s.z;
  if(standin) base = fallback[int(layer)]*s.z*clamp(luminance(base)/max(luminance(fallback[source]),.03),.35,1.9);
  if(type==${DECOR.fontWater}.0){
    float facing = max(0.0,dot(n,normalize(uEye-vWorld)));
    base = mix(base,vec3(.20,.34,.37),.28*(1.0-facing));
  }
  if(type==${DECOR.motherOfPearl}.0||type==${DECOR.gems}.0){
    float facing = max(0.0,dot(n,normalize(uEye-vWorld)));
    base *= .86+.38*pow(1.0-facing,2.0);
  }
  return max(base,vec3(.008));
}

vec3 craftMaterial(float type, vec3 n, out float bump, out float roughness) {
  const vec3 palette[36] = vec3[36](
    vec3(.79,.49,.103), vec3(.737,.650,.470), vec3(.214,.112,.057),
    vec3(.36,.113,.066), vec3(.167,.280,.202), vec3(.708,.644,.516),
    vec3(.359,.340,.299), vec3(.902,.758,.440), vec3(.152,.308,.548),
    vec3(.590,.534,.415), vec3(.330,.243,.193), vec3(.715,.614,.479),
    vec3(.394,.341,.273), vec3(.484,.431,.336), vec3(.226,.276,.315),
    vec3(.280,.175,.091), vec3(.092,.243,.197), vec3(.366,.181,.127),
    vec3(.330,.094,.061), vec3(.118,.187,.344), vec3(.132,.199,.133),
    vec3(.771,.588,.330), vec3(.291,.101,.060), vec3(.125,.242,.153),
    vec3(.464,.339,.188), vec3(.370,.180,.134), vec3(.545,.477,.347),
    vec3(.157,.313,.270), vec3(.391,.282,.153), vec3(.190,.180,.164),
    vec3(.273,.304,.245), vec3(.571,.509,.408), vec3(.197,.134,.084),
    vec3(.339,.299,.236), vec3(.469,.371,.240), vec3(.176,.251,.107));
  vec2 local = buildingSpace(vWorld.xz);
  vec2 facing = abs(buildingDirection(n.xz));
  vec2 side = vec2(facing.x>facing.y ? local.y : local.x,vWorld.y);
  vec2 uv = abs(n.y)>.72 ? local : side;
  uv *= .72;
  bool woven = type>=50.0&&type<=58.0;
  bool laid = type==36.0||type==42.0||type==44.0||type==45.0;
  if(laid || type==50.0 || type==51.0) uv = vUv;
  if(type==32.0||type==38.0||type==61.0) uv *= 3.2;
  if(type==60.0) uv = abs(n.y)>.68 ? local*1.6 : vec2(vUv.x*2.0,vUv.y);
  if(type==33.0||type==34.0||type==41.0||type==56.0||type==66.0) uv *= 1.72;
  if(type==47.0||type==59.0||type==62.0||type==65.0) uv = vec2(uv.y,uv.x)*vec2(.9,1.25);
  if(type==53.0||type==54.0||type==55.0) uv *= 2.7;
  vec3 imageDetail = uHasCraft ? texture(uCraft,vec3(uv,type-32.0)).rgb-.5 : vec3(0.0);
  vec3 base = palette[int(type)-32];
  float tone = luminance(imageDetail);
  vec3 chroma = imageDetail-tone;
  float strength = laid || woven || type==41.0 ? 2.24 : 1.66;
  base = base*(1.0+tone*strength) + chroma*(laid||type==50.0||type==51.0 ? .77 : .38);
  if(type==50.0||type==51.0){
    float braid = 1.0-smoothstep(.012,.027,abs(abs(vUv.x-.5)-.465));
    base = mix(base,vec3(.72,.427,.121),max(braid*.83,smoothstep(.10,.32,tone)*.54));
  }
  bump = tone*(type==32.0||type==37.0||woven ? .42 : .91);
  roughness = .74;
  if(type==32.0||type==38.0||type==40.0||type==60.0) roughness = .30;
  if(type==35.0||type==37.0||type==48.0||type==59.0) roughness = .42;
  if(woven||type>=62.0) roughness = .88;
  return max(base,vec3(.011));
}

float shaft(vec3 eye,vec3 ray,float farAway,vec3 start,vec3 end,float radius) {
  vec3 q = eye-start;
  vec3 b = end-start;
  float rr = dot(ray,b), bb=dot(b,b), rq=dot(ray,q), bq=dot(b,q);
  float t = (rr*bq-bb*rq)/max(.008,bb-rr*rr);
  float s = clamp((bq+rr*t)/bb,0.0,1.0);
  t = clamp(rr*s-rq,0.0,farAway);
  s = clamp((bq+rr*t)/bb,0.0,1.0);
  float d = length(q+ray*t-b*s);
  float r = radius*(.52+1.27*s);
  float envelope = smoothstep(.01,.11,s)*(1.0-smoothstep(.78,1.0,s));
  float crossFade = smoothstep(0.0,.24,(bb-rr*rr)/bb);
  return exp(-d*d/(r*r))*envelope*crossFade*min(1.0,farAway*.35);
}
vec3 interiorScattering(vec3 p,float distanceEye) {
  vec2 ee=buildingSpace(uEye.xz);
  vec2 pp=buildingSpace(p.xz);
  vec3 eye=vec3(ee.x,uEye.y-5.45,ee.y);
  vec3 point=vec3(pp.x,p.y-5.45,pp.y);
  vec3 ray=normalize(point-eye);
  float clearBeam=shaft(eye,ray,distanceEye,vec3(11.75,11.04,17.15),vec3(-4.12,.07,7.08),.77);
  float blueBeam=shaft(eye,ray,distanceEye,vec3(11.75,14.22,11.14),vec3(-6.7,.07,-1.78),.52);
  float eastBeam=shaft(eye,ray,distanceEye,vec3(-19.5,18.36,-3.89),vec3(3.89,1.25,-14.0),.79);
  return clearBeam*vec3(.211,.158,.104)*.72 + blueBeam*vec3(.115,.175,.241)*.55
     + eastBeam*vec3(.169,.128,.103)*.59;
}

void main() {
  float type = vMaterial.x;
  bool detailed = uEffect > .85;
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing && type != 8.0) n = -n;
  vec3 view = normalize(uEye-vWorld);
  float distanceEye = distance(uEye,vWorld);
  float shade = vMaterial.y;
  float roughness = .79;
  vec3 base;
  float bump = 0.0;
  if (type == 0.0 || type == 7.0) {
    base = geology(vWorld,n,type==7.0,detailed,bump);
    roughness = mix(.37,.86,smoothstep(.06,1.45,vWorld.y));
  } else if (type==1.0||type==6.0||type==9.0||(type>=25.0&&type<=27.0)) {
    base = masonry(vWorld,n,type,detailed,bump);
    if(type==6.0)roughness=.59;
    if(type==26.0||type==27.0)roughness=.28;
  } else if (type == 2.0 || type == 12.0) {
    float width = type == 2.0 ? 37.0 : 8.0;
    vec2 t = vUv * vec2(width,20.0);
    t.x += mod(floor(t.y),2.0) * .54;
    vec2 f = fract(t);
    float aa = clamp(fwidth(t.y)*.45,.013,.26);
    float row = smoothstep(.073-aa,.108+aa,f.y);
    float joints = smoothstep(.025-aa,.055+aa,min(f.x,1.0-f.x));
    float mottled = noise2(vWorld.xz*.58 + vWorld.y*.73);
    float tile = hash21(floor(t) + 29.1);
    base = mix(vec3(.059,.081,.093),vec3(.155,.193,.214), tile*.56 + .42*mottled);
    base *= (.77 + row*.23) * (.83+joints*.17);
    base = mix(base*.91,base*1.24,smoothstep(.58,.82,mottled));
    bump = .33 * row + joints*.21 + tile*.09;
    if(uHasMaterials&&uLayers>=40){
      vec4 slate=materialGrain(buildingSpace(vWorld.xz)*vec2(.64,.48)+vWorld.y*.17,type==12.0?35.0:38.0);
      base*=1.0+(slate.rgb-.5)*2.09;
      bump+=(slate.a-.5)*.73;
    }
    roughness = type == 12.0 ? .37 : .53;
  } else if (type == 3.0) {
    vec2 pane = vUv;
    if(shade>.81&&shade<.90){
      float story = vUv.y*4.0;
      pane.y = fract(story);
      if(mod(floor(story),2.0)>.5)pane.x=1.0-pane.x;
    }
    vec3 v = lancet(pane,shade>1.13);
    float glint = pow(max(0.0,dot(reflect(-view,n),SUN)),17.0);
    vec3 window = uInterior ? v*2.13+vec3(.030,.020,.018) : v*.47+vec3(.020,.028,.035);
    window += glint*vec3(.215,.216,.197)*.33;
    color = vec4(grade(window),1.0);
    return;
  }else if(type==4.0||type==30.0){
    vec2 local=buildingSpace(vWorld.xz);
    vec2 facing=abs(buildingDirection(n.xz));
    float u=facing.y>facing.x||n.y>.68?local.x:local.y;
    float knot = noise2(vec2(u*3.71,vWorld.y*.73));
    float grain = sin(u*61.6 + 13.0*knot + .74*sin(vWorld.y*4.23 + knot*4.9));
    float boards = smoothstep(.046,.18,fract((u+.031)*5.23));
    base = mix(vec3(.060,.027,.014),vec3(.238,.112,.048),knot*.55+grain*.12+.22)*(.77+boards*.23);
    bump = grain*.19 + .12 * boards;
    if(uHasMaterials&&uLayers>=40){
      vec2 axes=abs(n.y)>.79?vec2(local.y,local.x):vec2(u,vWorld.y);
      vec4 oak=materialGrain(axes*vec2(.92,.68),type==30.0?26.0:knot>.56?25.0:24.0);
      base*=1.0+(oak.rgb-.5)*2.12;
      bump=(oak.a-.5)*.84+.08*boards;
    }
    roughness=type==30.0?.38:.47;
  }else if(type==5.0||type==22.0||type==28.0||type==29.0||type==31.0){
    float grain=noise2(vWorld.xy*2.73+vWorld.z*.78);
    vec3 metal=type==28.0?vec3(.119,.12,.12):type==29.0?vec3(.17,.32,.26)
      :type==31.0?vec3(.68,.51,.18):vec3(.37,.24,.091);
    base=metal*(.78+grain*.52);
    if(uHasMaterials&&uLayers>=40){
      float layer=type==29.0?32.0:type==31.0?39.0:type==28.0?34.0:33.0;
      vec4 pores=materialGrain(vec2(vWorld.x*.58+vWorld.z*.62,vWorld.y)*1.46,layer);
      base*=1.0+(pores.rgb-.5)*1.69;
      bump=(pores.a-.5)*.51;
    }
    roughness=type==28.0?.65:type==29.0?.49:.33;
  } else if (type == 8.0) {
    float t = clamp(vUv.y,0.0,1.0);
    vec3 grass = mix(vec3(.061,.107,.040),vec3(.301,.348,.135),pow(t,.73));
    base = grass * footprintAO(vWorld);
  }else if(type>=13.0&&type<25.0){
    base=characterMaterial(vWorld,vUv,type,bump,roughness);
    if(uHasSurfaces&&type<=21.0){
      base=characterTexture(type,base,bump);
    }else if(uHasMaterials&&uLayers>=40&&(type==15.0||type==16.0||type==23.0||type==24.0)){
      float layer=type==23.0?30.0:type==24.0?31.0:36.0;
      vec2 detail=type==23.0?vec2(vWorld.x+vWorld.z,vWorld.y)*1.33:vUv;
      vec4 fabric=materialGrain(detail,layer);
      if(type==24.0){
        base=mix(base,base*1.28+vec3(.08,.058,.028),smoothstep(.02,.21,luminance(fabric.rgb)-.46)*.74);
        base*=1.0+(materialGrain(vUv*vec2(3.5,2.25),37.0).rgb-.5)*.85;
      }
      base*=1.0+(fabric.rgb-.5)*(type==15.0?1.95:1.38);
      bump+=(fabric.a-.5)*.57;
    }
  } else if(type>=32.0&&type<68.0){
    base = craftMaterial(type,n,bump,roughness);
  } else if(type==68.0){
    vec3 paint = uHasAltarpiece ? texture(uAltarpiece,vec2(vUv.x,1.0-vUv.y)).rgb : vec3(.58,.37,.17);
    base = vec3(.016,.012,.01) + pow(paint,vec3(1.59)) * 1.18;
    roughness = .91;
  } else if((type>=${SURFACE_START}.0&&type<${SURFACE.skin}.0)||
      (type>=${SURFACE.parchment}.0&&type<${SURFACE_START+SURFACE_LAYERS}.0)){
    base=surfaceMaterial(type,n,bump,roughness);
  } else if(type==${DECOR.lanternGlass}.0){
    vec2 glowUv = vec2(vWorld.x+vWorld.z,vWorld.y)*2.0;
    vec3 glow = uHasDecor ? texture(uDecor,vec3(glowUv,${DECOR.lanternGlass-DECOR_START}.0)).rgb : vec3(1.0,.62,.24);
    color = vec4(grade(pow(glow,vec3(1.25))*vec3(1.55,1.12,.78)*shade),1.0);
    return;
  } else if(type>=${DECOR_START}.0&&type<${DECOR_START+DECOR_LAYERS}.0){
    base=decorMaterial(type,n,bump,roughness);
${DECOR_GLOW.map(([name,gain])=>`    if(type==${DECOR[name]}.0){color=vec4(grade(base*vec3(${gain.join(',')})*shade),1.0);return;}`).join('\n')}
  } else if (type == 11.0) {
    color = vec4(grade(vec3(1.39,.80,.286)*shade),1.0);
    return;
  } else {
    base = vec3(.022,.026,.028) * (.85 + .25*noise2(vWorld.xy*2.1));
  }

  if (detailed) {
    vec3 dx = dFdx(vWorld), dy = dFdy(vWorld);
    vec3 u = cross(dy,n), v = cross(n,dx);
    float det = dot(dx,u);
    vec3 slope = sign(det)*(dFdx(bump)*u+dFdy(bump)*v);
    float fade = 1.0-smoothstep(22.0,102.0,distanceEye);
    float amplitude = type>=32.0?.024:type>=13.0&&type<25.0?.0094:type==0.0||type==7.0?.066:.039;
    vec3 relief = amplitude*fade*slope/max(abs(det),.0000037);
    n=normalize(n-relief/(1.0+length(relief)*.92));
  }
  float hemi = .47 + .40 * max(0.0,n.y);
  float sun = max(0.0,dot(n,SUN));
  float lit = visibility(n);
  vec3 ambient = mix(vec3(.274,.321,.407),vec3(.543,.604,.643),hemi);
  if (type==0.0 || type==7.0) ambient += vec3(.052,.070,.060)*(1.0-min(n.y,1.0));
  vec3 direct = SUN_COLOR * sun * lit * 1.23;
  if (type == 8.0) direct += vec3(.073,.058,.027)*lit;
  if (type == 0.0 || type == 7.0) direct *= .87;
  if (uInterior) {
    vec2 pos = buildingSpace(vWorld.xz);
    float stripe=.53+.47*cos((pos.y+1.72)*1.038);
    float side = exp(-abs(abs(pos.x)-10.4)*.079);
    float end = exp(-abs(pos.y+24.8)*.11);
    float endLight = max(0.0,-n.z) * .43 + .27;
    float central = exp(-length((pos-vec2(0.0,-20.6))*vec2(.26,.136)));
    float height = clamp((vWorld.y-5.45)*.043,0.0,1.0);
    float aisle = 1.0-smoothstep(.08,.86,abs(abs(pos.x)-2.65));
    float low = 1.0-smoothstep(5.50,6.10,vWorld.y);
    ambient = vec3(.240,.223,.223) * (.65+.27*hemi+.56*height) * (1.0-aisle*low*.40);
    direct = vec3(.651,.488,.313) * (side*.35+end*endLight+.40*central)
      * ( .38 + .39*stripe + .44*max(0.0,-n.x) + .55*max(0.0,n.y) );
    direct += vec3(.12,.234,.38) * side * (.23+.72*stripe) * (.55+height*.55);
    direct += vec3(.22,.146,.076) * exp(-abs(vWorld.y-10.65)*.22)*.37;
    float candle = 1.0 / (1.0 + length((pos-vec2(0,-23.86))*vec2(.62,.56))*2.8);
    direct += vec3(.98,.48,.147)*candle*(.28+.72*hemi);
    if(uFloor<1.0){
      float altar = exp(-length((pos-vec2(0.0,-24.8))*vec2(.253,.245))-abs(vWorld.y-9.9)*.16);
      direct += vec3(.68,.472,.269)*altar*(.36+.79*max(0.0,dot(n,vec3(.0,.366,.931))));
      if(type==68.0) ambient += vec3(.135,.145,.170);
    }else if(uFloor>=4.0){
      float shore = smoothstep(6.4,19.7,pos.x);
      float daylight = uFloor==5.0 ? 1.0 : .61;
      vec2 normalLocal = buildingDirection(n.xz);
      float glazing = (.18+.82*max(0.0,dot(vec3(normalLocal.x,n.y,normalLocal.y),vec3(.88,.44,.18))));
      direct += vec3(.486,.556,.672)*shore*glazing*daylight;
      float desk = exp(-length((pos-vec2(14.71,-3.8))*vec2(.41,.34)));
      direct += vec3(.53,.287,.10)*desk*(.33+.67*max(n.y,0.0))*(uFloor==4.0?1.0:.26);
    }
    if(uFloor<1.5){
      // Candlelight in the transept chapels (1F) and in the treasury and scriptorium (2F).
      vec2 chapel = vec2(sign(pos.x)*15.9,-3.5);
      float level = vWorld.y-5.45-uFloor*6.5;
      float glow = exp(-length((pos-chapel)*vec2(.29,.23)))*smoothstep(11.2,12.6,abs(pos.x))
        *(1.0-smoothstep(3.2,6.2,level))*step(-.5,level);
      direct += vec3(.70,.45,.21)*glow*(.55+.45*max(0.0,n.y));
    }
    // The crypt is lit only by its torches, candles and the glowing tide channel.
    float crypt = 1.0-smoothstep(${(BASE+CRYPT.ceiling-.3).toFixed(3)},${(BASE+CRYPT.ceiling+.05).toFixed(3)},vWorld.y);
    if(crypt>0.0){
      const vec4 lamps[${CRYPT_LIGHTS.length}] = vec4[${CRYPT_LIGHTS.length}](${CRYPT_LIGHTS.map(l=>`vec4(${l.map(v=>v.toFixed(2)).join(',')})`).join(',')});
      vec3 at = vec3(pos.x,vWorld.y-${BASE.toFixed(2)},pos.y);
      vec2 nl = buildingDirection(n.xz);
      vec3 normalLocal = vec3(nl.x,n.y,nl.y);
      float flame = 0.0;
      for(int i=0;i<${CRYPT_LIGHTS.length};i++){
        vec3 d = lamps[i].xyz-at;
        float r = length(d);
        flame += lamps[i].w*(.3+.7*max(0.0,dot(normalLocal,d/max(r,.001))))/(1.0+r*r*.42);
      }
      float tide = exp(-max(0.0,abs(pos.x)-1.1)*.85)*step(${CRYPT.z0.toFixed(2)},pos.y)*(1.0-smoothstep(16.6,18.2,pos.y))
        *(1.0-smoothstep(-.8,1.6,at.y-(${CRYPT.y.toFixed(2)})));
      ambient = mix(ambient,vec3(.082,.090,.100),crypt);
      direct = mix(direct,vec3(.98,.60,.29)*flame+vec3(.05,.34,.38)*tide,crypt);
    }
    if (type>=13.0 && type<=21.0) {
      float rim = pow(1.0-max(0.0,dot(n,view)),2.1);
      float key = max(0.0,dot(n,normalize(vec3(-.67,.52,-.53))));
      direct += vec3(.361,.309,.272)*key + rim*vec3(.084,.112,.139);
    }
    lit = .17;
  }
  float fresnel = .028 + .19*pow(1.0-max(0.0,dot(view,n)),4.0);
  float spec = pow(max(0.0,dot(normalize(view+SUN),n)),mix(104.0,10.0,roughness));
  vec3 glossy = SUN_COLOR * (fresnel * spec * (1.0-roughness) * lit * 1.27);
  if(uInterior && (type==32.0||type==38.0||type==60.0||type==${SURFACE.brass}.0||type==${SURFACE.silver}.0||
      type==${SURFACE.amberGlass}.0||type==${DECOR.hammeredGold}.0||type==${DECOR.silverFiligree}.0||
      type==${DECOR.gems}.0||type==${DECOR.gildedGesso}.0||type==${DECOR.compassDial}.0||type==${DECOR.fontWater}.0)){
    float polish = pow(max(0.0,dot(normalize(view+vec3(.24,.53,.813)),n)),15.0);
    glossy += base*polish*vec3(.18,.13,.078);
  }
  float contact = 1.0;
  if(type<13.0||type>=24.0) {
    float nearFeet = distance(vWorld.xz,uPerson.xz);
    contact = 1.0 - .47*(1.0-smoothstep(.09,.58,nearFeet))
      * (1.0-smoothstep(.027,.20,abs(vWorld.y-uPerson.y)));
  }
  vec3 c = (base * shade * (ambient + direct)) * contact + glossy;
  if (uInterior) {
    float dust = smoothstep(2.0,42.0,distanceEye)*.163;
    c = mix(c, vec3(.155,.125,.110), dust*.77);
    if (detailed && uFloor<3.0 && uEye.y>${(BASE+CRYPT.ceiling).toFixed(3)}) c += interiorScattering(vWorld,distanceEye);
  } else {
    float haze = 1.0 - exp(-distanceEye*.00137);
    c = mix(c, vec3(.444,.583,.638), haze*.66);
  }
  color = vec4(grade(c),1.0);
}
`;

export const waterVertex = header + `
out vec3 vWorld;
uniform mat4 uMatrix;
void main() {
  vec3 p;
  if (gl_VertexID == 0) p = vec3(-3300,0,-3300);
  else if (gl_VertexID == 1 || gl_VertexID == 4) p = vec3(-3300,0,3300);
  else if (gl_VertexID == 2 || gl_VertexID == 3) p = vec3(3300,0,-3300);
  else p = vec3(3300,0,3300);
  vWorld = p;
  gl_Position = uMatrix * vec4(p,1.0);
}
`;

export const waterFragment = header + common + `
in vec3 vWorld;
out vec4 color;
uniform vec3 uEye;
uniform sampler2D uMap;
uniform vec2 uLimits;
uniform float uTime;
uniform float uEffect;

vec2 bathymetry(vec2 v) {
  vec2 uv = v/uLimits*.5+.5;
  vec2 q = abs(uv-.5);
  vec3 rgb = texture(uMap,uv).rgb;
  float h = dot(rgb.rg,vec2(65280,255))/65535.0 * 24.0 - 14.0;
  float d = max(0.0,-h);
  float distanceFromMapEdge = max(q.x,q.y);
  float coastal = (1.0-smoothstep(8.5,15.0,d))*(1.0-smoothstep(.39,.49,distanceFromMapEdge));
  return vec2(mix(35.0,d,coastal), mix(-17.0,rgb.b*35.0-13.0,coastal));
}
void wave(vec2 pos, vec2 dir, float k, float speed, float weight, inout vec2 g) {
  float phase = dot(pos,dir)*k-uTime*speed;
  float aa = 1.0-smoothstep(.54,2.24,fwidth(phase));
  g += dir * (cos(phase)*weight*aa);
}
void main() {
  vec2 pos = vWorld.xz;
  vec3 v = normalize(uEye-vWorld);
  float farAway = distance(uEye,vWorld);
  vec2 bath = bathymetry(pos);
  float depth = bath.x;
  float shelf = exp(-depth*.156);
  float dist = -bath.y;
  float detailFade = 1.0-smoothstep(15.0,96.0,farAway);
  vec2 g = vec2(0);
  float currents = noise2(pos*.116 + uTime*vec2(.027,-.013));
  float chop = noise2(pos*.182 + vec2(32.14,2.44));
  float outside = smoothstep(26.0,118.0,farAway);
  vec2 flow = vec2(noise2(pos*.083+33.24)-.5,noise2(pos*.104-78.6)-.5);
  vec2 warped = pos + vec2(currents*.8,chop*1.2)*mix(2.0,4.2,shelf) + flow*8.75;
  wave(warped,vec2(.831,.556),.48,.96,.112,g);
  wave(warped,vec2(-.467,.884),.76,.99,.061,g);
  wave(warped,vec2(.974,-.226),1.37,1.31,.053,g);
  wave(warped,vec2(.328,.945),2.51,1.62,.036,g);
  if (uEffect > .45) {
    wave(warped,vec2(-.798,.602),4.45,2.21,.046*detailFade,g);
    wave(warped,vec2(.950,.312),7.70,2.88,.026*detailFade,g);
    wave(warped,vec2(.178,.984),11.61,3.41,.027*detailFade,g);
  }
  vec2 offshore = vec2(noise2(pos*vec2(.128,.255)+uTime*.025)-.5,noise2(pos*vec2(.149,.216)+89.8-uTime*.018)-.5);
  g = (g*(1.0-.71*outside)+offshore*(.13+.065*outside)) * mix(1.0,1.29,shelf);
  vec3 n = normalize(vec3(g.x,1.0,g.y));
  float fresnel = .024 + .88 * pow(1.0-max(.0,dot(n,v)),4.68);
  float raw = noise2(pos*.32 + vec2(uTime*.082,-uTime*.06));
  float variation = uEffect > .6 ? fbm(pos*.44 + vec2(uTime*.039,-uTime*.042)) : raw;
  vec3 under = mix(vec3(.009,.063,.095),vec3(.026,.156,.181),.30 + .43*raw);
  vec3 green = mix(vec3(.041,.219,.205),vec3(.143,.377,.301),variation);
  vec3 tide = mix(vec3(.213,.379,.283),vec3(.281,.426,.335),raw);
  green = mix(green,tide,exp(-depth*.83)*.65);
  under = mix(under,green,shelf*.98);
  if (uEffect > .65 && depth < 6.8) {
    float net = noise2(pos*.94+vec2(g.x,g.y)*1.72);
    float caustic = exp(-abs(net-.50)*26.9) * exp(-depth*.36);
    under += vec3(.072,.102,.068)*caustic*(.42+.58*raw);
    under *= .86+.28*noise2(pos*1.83);
  }
  vec3 ray = reflect(-v,n);
  vec3 reflectedRay=normalize(vec3(ray.x,max(ray.y,.008),ray.z));
  vec3 reflection = skyBase(reflectedRay) * vec3(.62,.81,.88);
  if (uEffect>.8 && reflectedRay.y>.037) {
    vec2 c = reflectedRay.xz/(.193+reflectedRay.y);
    float reflectedCloud = smoothstep(.45,.71,fbm(mat2(.83,-.55,.55,.83)*c*vec2(1.63,2.04)+vec2(5.47,12.3)));
    reflection = mix(reflection,vec3(.587,.636,.606),reflectedCloud*(.21+.43*fresnel));
  }
  float bright = max(0.0,dot(normalize(SUN+v),n));
  float diffuseGlint = pow(bright,28.0)*(.11+.30*raw);
  float sparkles = noise2(pos*2.12 + g*1.2 + vec2(uTime*.22,-uTime*.39));
  float spark = pow(bright,157.0)*(.26+sparkles*.66);
  float scatter = smoothstep(.031,.16,max(.0,g.y+g.x*.72))*(.029+shelf*.033);
  vec3 sea = mix(under,reflection,fresnel) + (diffuseGlint+spark)*SUN_COLOR
    + vec3(.015,.079,.070)*scatter*4.0;

  if (depth < 9.4 && dist < 13.0) {
    float curl = .98 * sin(pos.x*.43+pos.y*.26) + 2.76*(variation-.48);
    float ridges = cos(depth*2.89 + uTime*1.99 + curl + raw*.85);
    float phase = smoothstep(.50,.94,ridges);
    vec2 foamUv = pos*1.28 + vec2(-.13,.075)*uTime + g*.42;
    float feather = uEffect > .45 ? fbm(foamUv) : noise2(foamUv);
    float trail = smoothstep(.39,.69,feather + raw*.13);
    float pullback = .66 + .34 * sin(pos.x*.33+pos.y*.41-uTime*.78);
    float scallop = noise2(pos*.71+36.9);
    float wash = exp(-depth*(1.21+scallop*.99))*( .25 + trail*.73)*(.53+.47*pullback);
    float breaks = phase * smoothstep(.12,.66,depth) * exp(-depth*.28) * trail * pullback;
    float bubble = smoothstep(.594,.735,noise2(pos*3.67-g*.33+uTime*.16))*trail;
    float foam = clamp(wash + breaks*.97 + bubble*(breaks*.61+wash*.18),0.0,.97);
    vec3 froth = mix(vec3(.367,.574,.563),vec3(.844,.904,.841),foam*.79 + .18*raw);
    sea = mix(sea,froth,foam*.97);
  }
  float air = 1.0-exp(-farAway*.0028);
  vec3 horizon = skyBase(normalize(vec3(-v.x,0.0,-v.z)));
  sea = mix(sea,horizon,air);
  color = vec4(grade(sea),1.0);
}
`;

export const personVertex = header + `
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUv;
layout(location=3) in vec2 aMaterial;
layout(location=4) in vec3 aBones;
uniform mat4 uMatrix;
uniform mat4 uLight;
uniform mat4 uBones[16];
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec3 vShadow;
flat out vec2 vMaterial;
void main() {
  mat4 bone = uBones[int(aBones.x)];
  mat4 parent = uBones[int(aBones.y)];
  vec4 vertex = vec4(aPosition,1);
  vec4 p = mix(bone*vertex,parent*vertex,aBones.z);
  gl_Position = uMatrix*p;
  vWorld = p.xyz;
  vNormal = normalize(mix(mat3(bone)*aNormal,mat3(parent)*aNormal,aBones.z));
  vUv=aUv;
  vMaterial=aMaterial;
  vShadow=(uLight*p).xyz*.5+.5;
}
`;

export const decalFragment = header + common + `
in vec2 vUv;
flat in vec2 vMaterial;
out vec4 color;
void main() {
  vec2 p = vUv-.5;
  p.x += .18*p.y;
  float n = noise2(p*6.2+11.49);
  float mask = 1.0-smoothstep(.46+n*.07,.50+n*.07,length(p*vec2(1.0,1.33)));
  float mullion = smoothstep(.025,.060,abs(p.x)+.01);
  vec3 v = lancet(vUv*vec2(.95,.86)+vec2(.021,.072), vMaterial.y>1.5);
  float intensity = max(v.r,max(v.g,v.b));
  color = vec4(grade(v*1.38), mask*mullion*(.04 + intensity*.49));
}
`;

export const antialiasFragment = header + `
in vec2 vScreen;
out vec4 color;
uniform sampler2D uSource;
uniform vec2 uPixel;
float luma(vec3 c) {
  return dot(c, vec3(.299,.587,.114));
}
void main() {
  vec2 uv = vScreen*.5+.5;
  vec3 center = texture(uSource,uv).rgb;
  float mid = luma(center);
  float nw = luma(texture(uSource,uv + vec2(-1,1)*uPixel).rgb);
  float ne = luma(texture(uSource,uv + vec2(1,1)*uPixel).rgb);
  float sw = luma(texture(uSource,uv + vec2(-1,-1)*uPixel).rgb);
  float se = luma(texture(uSource,uv + vec2(1,-1)*uPixel).rgb);
  float lo = min(mid,min(min(nw,ne),min(sw,se)));
  float hi = max(mid,max(max(nw,ne),max(sw,se)));
  if (hi-lo < max(.043,hi*.126)) {
    color = vec4(center,1);
    return;
  }
  vec2 dir = vec2(-((nw+ne)-(sw+se)),(nw+sw)-(ne+se));
  float damping = max((nw+ne+sw+se)*.027,.018);
  dir *= 1.0/(min(abs(dir.x),abs(dir.y))+damping);
  dir = clamp(dir,vec2(-5),vec2(5))*uPixel;
  vec3 inner = (texture(uSource,uv-dir*.167).rgb+texture(uSource,uv+dir*.167).rgb)*.5;
  vec3 outer = inner*.50+(texture(uSource,uv-dir*.5).rgb+texture(uSource,uv+dir*.5).rgb)*.25;
  float light = luma(outer);
  color = vec4(mix(center,(light < lo || light > hi) ? inner : outer,.76),1);
}
`;
