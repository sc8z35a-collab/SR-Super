import { Renderer } from './renderer.js';
import { add, sub, normal } from './mesh.js';
import { clamp, ground, lerp } from './terrain.js';
import { BASE, ROOF_INDEX, world, worldNormal } from './layout.js';
import { visitFloor, nextPosition, locationName, levelOf, CRYPT_LEVEL } from './walkways.js';
import { SURFACE_LAYERS } from './surfaces.js';
import { DECOR_LAYERS } from './decor.js';
import { TERRAIN_LAYERS } from './landcover.js';
import { FABRIC_LAYERS } from './fabric.js';

const el = id => document.getElementById(id);
const canvas = el('scene');
const stage = el('stage');
const entry = el('entry');
const enter = el('enter');
const fullHelp = el('full-help');
const settings = el('settings');
const settingsButton = el('settings-button');
const buttons = [...document.querySelectorAll('[data-view]')];
const floorDialog=el('floors');
const floorButton=el('floor-button');
const joystick=el('joystick');
const stickKnob=el('stick-knob');
const floorLinks=[...document.querySelectorAll('[data-floor]')];
const movementKeys=new Map([['KeyW',[0,1]],['KeyS',[0,-1]],['KeyA',[-1,0]],['KeyD',[1,0]]]);
const pressed=new Set();
const stick={id:null,x:0,y:0};
const landscape = matchMedia('(orientation: landscape)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const fullscreenApp = matchMedia('(display-mode: fullscreen), (display-mode: standalone)');
const presets={
  island:{focus:world(0,72,0),yaw:-.945,pitch:.233,radius:279,fov:40},
  front:{focus:world(.31,79,7.6),yaw:-1.46,pitch:-.06,radius:243,fov:43},
  coast:{focus:world(0,49,3.1),yaw:-.541,pitch:-.116,radius:111,fov:62}
};
let mode='walk';
let walker=visitFloor(0,true);
let look={yaw:0,pitch:.14};
let cameraFloor=walker.y;
let stride=0;
let lastSimulation=0;
let displayedLocation='';
const qualityCopy = [
  '簡易描画・人物の動きを停止。最大20 fps。',
  '簡易地形・波と質感の負荷を抑制。最大24 fps。',
  '高精細の石材・装飾・影・光芒を描画。最大30 fps。'
];

function preferences() {
  const defaults = { resolution: 400, quality: 2, motion: !reducedMotion.matches };
  try {
    const saved = JSON.parse(localStorage.getItem('tidal-cathedral-display')) || {};
    return {
      resolution: [400, 320, 240].includes(saved.resolution) ? saved.resolution : defaults.resolution,
      quality: [0, 1, 2].includes(saved.quality) ? saved.quality : defaults.quality,
      motion: typeof saved.motion === 'boolean' ? saved.motion : defaults.motion
    };
  } catch {
    return defaults;
  }
}
const options = preferences();
let view = { ...presets.island };
let animation = null;
let renderer = null;
let active = false;
let failed = false;
let starting = false;
let exitedStandalone = false;
let dirty = true;
let pendingFrame = 0;
let nextFrameAt = 0;
let lastDrawAt = 0;
let waterTime = 0;
let personTime = 0;
let lastFrameInterior = false;
let atlasRequest=0,atlasSizes={};
const layerGroups=[
  {name:'materials',sizes:[128,384],layers:40,cols:8,method:'installMaterials'},
  {name:'craft',sizes:[112,288],layers:36,cols:6,method:'installCraft'},
  {name:'surfaces',sizes:[96,256],layers:SURFACE_LAYERS,cols:6,method:'installSurfaces'},
  {name:'decor',sizes:[96,256],layers:DECOR_LAYERS,cols:6,method:'installDecor'},
  {name:'terrain',sizes:[128,384],layers:TERRAIN_LAYERS,cols:6,method:'installTerrain'},
  {name:'fabric',sizes:[128,256],layers:FABRIC_LAYERS,cols:6,method:'installFabric'}
];
async function imagePixels(name,depth,columns=depth) {
  try {
    const img=new Image();
    img.src=new URL(name,import.meta.url);
    await img.decode();
    // Atlases hold square tiles; an older atlas may hold fewer layers than the code knows about.
    const width=img.naturalWidth/columns;
    const height=columns>1?width:img.naturalHeight/Math.ceil(depth/columns);
    if(columns>1)depth=Math.min(depth,columns*Math.floor(img.naturalHeight/height));
    const sheet=Object.assign(document.createElement('canvas'),{width,height});
    const context=sheet.getContext('2d',{willReadFrequently:true});
    const data=new Uint8Array(width*height*4*depth);
    for(let i=0;i<depth;i++){
      context.drawImage(img,(i%columns)*width,Math.floor(i/columns)*height,width,height,0,0,width,height);
      data.set(context.getImageData(0,0,width,height).data,i*width*height*4);
    }
    return {width,height,data,depth};
  }catch{return null;}
}
async function loadAtlas(){
  const owner=renderer;
  if(!owner)return;
  const request=++atlasRequest;
  const current=()=>renderer===owner&&request===atlasRequest;
  const detailed=options.quality===2;
  await Promise.all(layerGroups.map(async group=>{
    const target=group.sizes[Number(detailed)];
    const load=async size=>{
      const image=await imagePixels(`./${group.name}-${size}.webp`,group.layers,group.cols);
      if(!current()||!image)return;
      owner[group.method](image);
      atlasSizes[group.name]=size;
      invalidate();
    };
    try{
      if(detailed&&!atlasSizes[group.name])await load(group.sizes[0]);
      if(current()&&target!==atlasSizes[group.name])await load(target);
    }catch(error){console.warn('Material detail could not be updated.',error.message);}
  }));
}

function fullElement() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

function isStandalone() {
  return fullscreenApp.matches || navigator.standalone === true;
}

function size() {
  if (!renderer || !active) return;
  const { width: w, height: h } = canvas.getBoundingClientRect();
  if (!h || !w) return;
  const height = options.resolution;
  const width = Math.max(1, Math.round(w / h * height));
  if (renderer.canvas.width !== width || renderer.canvas.height !== height) renderer.dimensions(width, height);
  invalidate();
}

function setUI(value) {
  el('hud').hidden = !value;
  el('show-ui').hidden = value;
}

function failure(message, recoverable = true) {
  failed = true;
  el('loading').hidden = true;
  el('fault').hidden = false;
  el('fault-text').textContent = message;
  el('retry').hidden = !recoverable;
  el('hud').hidden = true;
  el('show-ui').hidden = true;
  console.warn(message);
}

function initialize() {
  if (starting || failed || renderer || !active) return;
  starting = true;
  el('loading').hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    starting = false;
    if (renderer || !active) return;
    try {
      renderer = new Renderer(canvas);
      const created = renderer;
      atlasSizes={};
      loadAtlas();
      for(const [name,url] of [['stainedGlass','./stained-glass.webp'],['altarpiece','./altarpiece.webp']]){
        imagePixels(url,1).then(pixels=>{
          if(!pixels||renderer!==created)return;
          created.installArt(name,pixels);
          invalidate();
        });
      }
      setUI(true);
      size();
    } catch (error) {
      const unsupported = error.message === 'WebGL 2 is unavailable.';
      failure(unsupported ? '3D描画にはWebGL 2対応のブラウザが必要です。'
        : '3Dシーンを開けませんでした。再読み込みしてください。', !unsupported);
      console.error(error);
    }
  }));
}

function syncMode() {
  if (fullElement()) {
    fullHelp.hidden = true;
    if (screen.orientation?.lock && !active) screen.orientation.lock('landscape').catch(() => {});
  }
  active = landscape.matches && Boolean(fullElement() || (isStandalone() && !exitedStandalone));
  stage.hidden = !active;
  entry.hidden = active;
  if (!active) {
    if(settings.open)settings.close();
    if(floorDialog.open)floorDialog.close();
    stopInput();
    cancelFrame();
    return;
  }
  if (!renderer) initialize();
  else size();
}

function showFullscreenHelp() {
  if (fullElement()) return;
  fullHelp.textContent = '全画面表示に対応したブラウザで開くか、ホーム画面に追加して起動してください。';
  fullHelp.hidden = false;
}

async function openScene() {
  if (!landscape.matches) return;
  exitedStandalone = false;
  if (isStandalone()) {
    syncMode();
    return;
  }
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  fullHelp.hidden = true;
  try {
    if (!request) throw new Error('Fullscreen is unavailable');
    const pending = root.requestFullscreen ? request.call(root, { navigationUI: 'hide' }) : request.call(root);
    enter.disabled = true;
    if (pending?.then) {
      await pending;
      if (fullElement()) syncMode();
      else showFullscreenHelp();
    } else {
      setTimeout(showFullscreenHelp, 900);
    }
  } catch (error) {
    console.warn('Fullscreen request failed.', error.message);
    showFullscreenHelp();
  } finally {
    enter.disabled = false;
  }
}

async function closeScene() {
  if (fullElement()) {
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
    if (exitFullscreen) await exitFullscreen.call(document);
  } else {
    exitedStandalone = true;
  }
  syncMode();
  enter.focus({ preventScroll: true });
}

function refreshMode(){
  const walking=mode==='walk';
  const label=walking?locationName(walker):'';
  if(label!==displayedLocation){
    el('location').textContent=label;
    displayedLocation=label;
  }
  joystick.hidden=!walking;
  floorButton.hidden=!walking;
  el('view-reticle').hidden=!walking;
  el('zoom').hidden=walking;
  el('gesture').textContent=walking
    ?'左のパッドで移動・画面をドラッグして視点を操作'
    :'ドラッグで回転・ピンチで拡大';
  for(const btn of buttons)btn.setAttribute('aria-pressed',btn.dataset.view===mode);
  for(const btn of floorLinks){
    if(walking&&Number(btn.dataset.floor)===levelOf(walker))btn.setAttribute('aria-current','true');
    else btn.removeAttribute('aria-current');
  }
}
function pose(){
  if(mode==='walk'){
    const f=Math.cos(look.pitch);
    const forward=worldNormal(Math.sin(look.yaw)*f,Math.sin(look.pitch),-Math.cos(look.yaw)*f);
    const bob=reducedMotion.matches?0:Math.sin(stride*9.7)*.018;
    const eye=world(walker.x,BASE+cameraFloor+1.66+bob,walker.z);
    return {eye,forward,interior:walker.interior,walking:true,floor:walker.floor,fov:61};
  }
  const across=Math.cos(view.pitch);
  const offset=[Math.sin(view.yaw)*across*view.radius,Math.sin(view.pitch)*view.radius,Math.cos(view.yaw)*across*view.radius];
  const eye=add(view.focus,offset);
  eye[1]=Math.max(eye[1],1.65,ground(eye[0],eye[2])+1.55);
  return {eye,forward:normal(sub(view.focus,eye)),interior:false,fov:view.fov};
}
function choose(name){
  if(name===mode)return;
  const wasWalking=mode==='walk';
  mode=name;
  stopInput();
  animation=null;
  if(name!=='walk'){
    const goal={...presets[name]};
    if(wasWalking||reducedMotion.matches||options.quality===0)view=goal;
    else{
      const delta=goal.yaw-view.yaw;
      goal.yaw=view.yaw+Math.atan2(Math.sin(delta),Math.cos(delta));
      animation={from:{...view},goal,start:performance.now()};
    }
  }
  refreshMode();
  invalidate();
}
function setFloor(index){
  choose('walk');
  walker=visitFloor(index);
  cameraFloor=walker.y;
  const poses=[[0,.09],[-.035,-.14],[-.035,-.14],[-.035,-.14],[.93,.055],[1.14,.155],[1.25,.012]];
  const [yaw,pitch]=index===CRYPT_LEVEL?[.86,.02]:poses[index];
  look={yaw,pitch};
  stopInput();
  refreshMode();
  invalidate();
}
function movement(){
  const v=[stick.x,-stick.y];
  for(const key of pressed){
    const [x,z]=movementKeys.get(key);
    v[0]+=x;v[1]+=z;
  }
  const gain=Math.max(1,Math.hypot(...v));
  return [v[0]/gain,v[1]/gain];
}
function walk(dt,[x,z]){
  if(x||z){
    const scale=(walker.interior?3.48:3.03)*dt;
    const s=Math.sin(look.yaw),c=Math.cos(look.yaw);
    const dx=(c*x+s*z)*scale,dz=(s*x-c*z)*scale;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.085));
    const before=walker;
    for(let i=0;i<steps;i++){
      walker=nextPosition(walker,dx/steps,0);
      walker=nextPosition(walker,0,dz/steps);
    }
    if(walker!==before){
      stride+=Math.hypot(walker.x-before.x,walker.z-before.z);
      if(locationName(walker)!==displayedLocation)refreshMode();
      dirty=true;
    }
  }
  if(Math.abs(cameraFloor-walker.y)>.001){
    cameraFloor=lerp(cameraFloor,walker.y,1-Math.exp(-dt*14.5));
    if(Math.abs(cameraFloor-walker.y)<.008)cameraFloor=walker.y;
    dirty=true;
  }
}

function advance(now) {
  const { from, goal, start } = animation;
  const t = clamp((now - start) / 620);
  const ease = t * t * (3 - 2 * t);
  view = {
    focus: from.focus.map((p, i) => lerp(p, goal.focus[i], ease)),
    yaw: lerp(from.yaw, goal.yaw, ease),
    pitch: lerp(from.pitch, goal.pitch, ease),
    radius: lerp(from.radius, goal.radius, ease),
    fov: lerp(from.fov, goal.fov, ease)
  };
  if (t === 1) animation = null;
}

function cancelFrame() {
  if (pendingFrame) cancelAnimationFrame(pendingFrame);
  pendingFrame = 0;
  nextFrameAt = 0;
  lastDrawAt = 0;
  lastSimulation=0;
}

function schedule() {
  if (!pendingFrame && active && renderer && !failed && !document.hidden) pendingFrame = requestAnimationFrame(draw);
}

function invalidate() {
  dirty = true;
  schedule();
}

function draw(now){
  pendingFrame=0;
  if(!active||!renderer||failed||document.hidden)return;
  const onFoot=mode==='walk';
  const vector=onFoot?movement():[0,0];
  const isWalking=onFoot&&(Math.hypot(...vector)>.004||Math.abs(cameraFloor-walker.y)>.001);
  const dt=lastSimulation?Math.min(.061,(now-lastSimulation)*.001):1/60;
  lastSimulation=now;
  if(isWalking&&!settings.open&&!floorDialog.open)walk(dt,vector);
  const inside=onFoot&&walker.interior;
  const moving=options.motion&&options.quality>0;
  const animated=options.motion&&(!inside||isWalking||(moving&&walker.floor<2));
  if((animated||animation||dirty)&&now+1.1>=nextFrameAt){
    if(animation)advance(now);
    const step=animated&&lastDrawAt?Math.min(.095,(now-lastDrawAt)/1000):0;
    if(!inside||walker.floor>=ROOF_INDEX-1)waterTime+=step;
    if(inside!==lastFrameInterior)personTime=0;
    else if(moving)personTime+=step;
    lastFrameInterior=inside;
    const period=1000/Renderer.fps(options.quality);
    nextFrameAt=Math.max(now+period*.65,(nextFrameAt||now)+period);
    lastDrawAt=animated?now:0;
    dirty=false;
    renderer.render(pose(),options.quality,waterTime,personTime,moving);
    el('loading').hidden=true;
  }
  if(animated||animation||dirty||isWalking)schedule();
  else{nextFrameAt=0;lastSimulation=0;lastDrawAt=0;}
}
function rotate(dx,dy){
  animation=null;
  const scale=(mode==='walk'?1.47:1.08)/Math.max(155,canvas.clientHeight);
  if(mode==='walk'){
    look.yaw+=dx*scale;
    look.pitch=clamp(look.pitch-dy*scale,-1.494,1.494);
  }else{
    view.yaw+=dx*scale;
    view.pitch=clamp(view.pitch+dy*scale,-.35,1.23);
  }
  invalidate();
}
function zoom(factor){
  if(mode==='walk')return;
  animation=null;
  view.radius=clamp(view.radius*factor,85,455);
  invalidate();
}

const touches = new Map();
const pinch = () => {
  const [[ax, ay], [bx, by]] = [...touches.values()].slice(0, 2);
  return Math.hypot(bx - ax, by - ay);
};
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || touches.size >= (mode==='walk'?1:2)) return;
  canvas.setPointerCapture(event.pointerId);
  touches.set(event.pointerId, [event.clientX, event.clientY]);
});
canvas.addEventListener('pointermove', event => {
  if (!touches.has(event.pointerId)) return;
  const [x, y] = touches.get(event.pointerId);
  const distance = touches.size === 2 ? pinch() : 0;
  touches.set(event.pointerId, [event.clientX, event.clientY]);
  if (touches.size === 1) rotate(event.clientX - x, event.clientY - y);
  else if (distance > 6) zoom(distance / Math.max(6, pinch()));
});
for (const handler of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(handler, event => touches.delete(event.pointerId));
}
canvas.addEventListener('wheel', event => {
  if (!active) return;
  event.preventDefault();
  zoom(Math.exp(clamp(event.deltaY, -140, 140) * .003));
}, { passive: false });
document.addEventListener('keydown',event=>{
  if(!active||settings.open||floorDialog.open||event.altKey||event.metaKey||event.ctrlKey)return;
  const angles={ArrowLeft:[-23,0],ArrowRight:[23,0],ArrowUp:[0,-23],ArrowDown:[0,23]};
  if(mode==='walk'&&movementKeys.has(event.code)){
    pressed.add(event.code);
    invalidate();
  }else if(angles[event.key])rotate(...angles[event.key]);
  else if(event.key==='+'||event.key==='=')zoom(.87);
  else if(event.key==='-')zoom(1.15);
  else return;
  event.preventDefault();
});
document.addEventListener('keyup',event=>{if(pressed.delete(event.code))invalidate();});
function updateStick(event){
  const b=joystick.getBoundingClientRect(),radius=Math.max(1,b.width*.357);
  const x=(event.clientX-b.left-b.width*.5)/radius,y=(event.clientY-b.top-b.height*.5)/radius;
  const length=Math.hypot(x,y);
  const gain=length>.12?Math.min(1,(length-.12)/.88)/length:0;
  stick.x=x*gain;stick.y=y*gain;
  stickKnob.style.transform=`translate(${stick.x*radius}px,${stick.y*radius}px)`;
  invalidate();
}
function releaseStick(){
  if(stick.id!==null&&joystick.hasPointerCapture(stick.id))joystick.releasePointerCapture(stick.id);
  stick.id=null;stick.x=stick.y=0;
  stickKnob.style.transform='';
}
function stopInput(){
  releaseStick();
  pressed.clear();
  for(const id of touches.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  touches.clear();
}
joystick.addEventListener('pointerdown',event=>{
  if(!active||mode!=='walk'||stick.id!==null||event.button!==0)return;
  joystick.setPointerCapture(event.pointerId);
  stick.id=event.pointerId;
  updateStick(event);
});
joystick.addEventListener('pointermove',event=>{if(stick.id===event.pointerId)updateStick(event);});
for(const kind of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(kind,event=>{
  if(stick.id===event.pointerId)releaseStick();
});
window.addEventListener('blur',stopInput);

function updateOptions() {
  document.querySelector(`input[name="resolution"][value="${options.resolution}"]`).checked = true;
  document.querySelector(`input[name="quality"][value="${options.quality}"]`).checked = true;
  el('motion').checked = options.motion;
  el('resolution-label').textContent = `${options.resolution}p`;
  el('quality-detail').textContent = qualityCopy[options.quality];
}

enter.addEventListener('click', openScene);
el('exit').addEventListener('click', closeScene);
el('hide-ui').addEventListener('click', () => {
  stopInput();
  setUI(false);
  el('show-ui').focus();
});
el('show-ui').addEventListener('click', () => {
  setUI(true);
  el('hide-ui').focus();
});
el('retry').addEventListener('click', () => location.reload());
el('fault-back').addEventListener('click', closeScene);
el('less').addEventListener('click', () => zoom(1.16));
el('more').addEventListener('click', () => zoom(.86));
for (const button of buttons) button.addEventListener('click', () => choose(button.dataset.view));
settingsButton.addEventListener('click', () => {
  if (settings.open) return;
  stopInput();
  settings.showModal();
  settingsButton.setAttribute('aria-expanded', 'true');
});
settings.addEventListener('close', () => settingsButton.setAttribute('aria-expanded', 'false'));
settings.addEventListener('click', event => {
  if (event.target !== settings) return;
  const r = settings.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) settings.close();
});
el('settings-close').addEventListener('click', () => settings.close());
settings.addEventListener('change', event => {
  const { name, id, value, checked } = event.target;
  if (name === 'resolution') options.resolution = Number(value);
  if(name==='quality'){options.quality=Number(value);loadAtlas();}
  if (id === 'motion') options.motion = checked;
  if (!options.motion) lastDrawAt = 0;
  try { localStorage.setItem('tidal-cathedral-display', JSON.stringify(options)); } catch {}
  updateOptions();
  size();
});

floorButton.addEventListener('click',()=>{
  stopInput();
  floorDialog.showModal();
  floorButton.setAttribute('aria-expanded','true');
});
floorDialog.addEventListener('close',()=>floorButton.setAttribute('aria-expanded','false'));
el('floors-close').addEventListener('click',()=>floorDialog.close());
for(const button of floorLinks)button.addEventListener('click',()=>{
  setFloor(Number(button.dataset.floor));
  floorDialog.close();
});

canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  cancelFrame();
  renderer = null;
  failure('3D描画を一時停止しました。再開を待つか、再読み込みしてください。');
});
canvas.addEventListener('webglcontextrestored', () => {
  failed = false;
  el('fault').hidden = true;
  initialize();
});

document.addEventListener('visibilitychange', () => {
  if(document.hidden){stopInput();cancelFrame();}
  else invalidate();
});
for (const change of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(change, syncMode);
landscape.addEventListener('change', () => {
  syncMode();
  if (!landscape.matches && fullElement() && !isStandalone()) closeScene().catch(() => {});
});
fullscreenApp.addEventListener('change', syncMode);
new ResizeObserver(size).observe(stage);
updateOptions();
refreshMode();
syncMode();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}), { once: true });
}
