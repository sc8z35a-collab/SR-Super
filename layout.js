export const BASE=5.45;
export const WIDTH=1.62;
export const LENGTH=3/WIDTH;
export const ANGLE=1.558;
export const CENTER=[5,.5];
export const OLD_HEIGHT=37.14;
export const SPIRE_HEIGHT=4*OLD_HEIGHT;
export const FLOORS=[.055,6.55,13.05,19.55,26.05,32.55,39.05];
export const ROOF_INDEX=FLOORS.length-1;
export const ROOF_HEIGHT=FLOORS[ROOF_INDEX];
export const NAVE={x:7.48*WIDTH,front:16.26*LENGTH,back:-11.71*LENGTH};
export const WING={x:12.57*WIDTH,front:1.58*LENGTH,back:-5.18*LENGTH};
export const UPPER_AISLE={x0:7.17,x1:11.34,z0:WING.front-.24,z1:20.59};
export const UPPER_ROOM={x0:7.17,x1:WING.x-.86,z0:WING.back+.84,z1:WING.front+.03};
export const HUT={x0:14.52,x1:18.51,z0:-7.76,z1:-4.00,doorA:-6.99,doorB:-5.27};
export const HUT_STEP=.105;
// The crypt under the front of the nave, reached by a flight down the west aisle.
export const CRYPT={y:-4.45,ceiling:-.275,x0:-11.4,x1:11.4,z0:3.4,z1:27.8};
export const CRYPT_STAIR={x0:-10.75,x1:-8.45,z0:5.0,z1:16.4};
export const CRYPT_COLUMNS={x:[-7.4,-3.6,3.6,7.4],z:[7.0,11.4,15.8,20.2]};
// Underground levels below the crypt, stacked under the nave (local metres). Each has its own lamps,
// [x, height above the base, z, strength], which the shader reads by height band.
const LAMP=(x,h,z,w=1)=>[x,h,z,w];
export const DEPTHS=[
  {key:'cistern',name:'地下2階 · 大貯水槽',y:-9.6,ceiling:-5.15,z0:-20,z1:18.5,color:[.95,.68,.4],ambient:[.05,.075,.07],falloff:.22,
    lamps:[[-10.9,-14],[-10.9,-4],[-10.9,10],[-10.9,16],[10.9,-14],[10.9,-4]].map(([x,z])=>LAMP(x,-7.0,z)).concat([LAMP(0,-6.6,11.5,1.2),LAMP(0,-6.6,-6,1.2),LAMP(4.4,-6.6,1.5)])},
  {key:'catacombs',name:'地下3階 · カタコンベ',y:-14.6,ceiling:-10.15,z0:-20,z1:18.5,color:[1,.62,.3],ambient:[.06,.05,.04],falloff:.3,
    lamps:[LAMP(0,-12.7,-14),LAMP(0,-12.7,-2),LAMP(0,-12.7,10),LAMP(7,-13,-12,.8),LAMP(7,-13,0,.8),LAMP(-6.5,-13,-14,.8),LAMP(-6.5,-13,10,.8),LAMP(0,-12.2,16.3,1.2),LAMP(7.5,-13,16.8,.7)]},
  {key:'mine',name:'地下4階 · 坑道',y:-19.6,ceiling:-15.15,z0:-20,z1:18.5,color:[1,.72,.38],ambient:[.05,.045,.04],falloff:.24,
    lamps:[-15,-8,-1,6,13].map(z=>LAMP(0,-16.5,z)).concat([LAMP(6,-16.8,-10),LAMP(-6,-16.8,-2),LAMP(6,-16.8,12),LAMP(-6,-16.8,14)])},
  {key:'crystal',name:'地下5階 · 水晶洞窟',y:-24.6,ceiling:-20.15,z0:-20,z1:18.5,color:[.45,.62,1],ambient:[.05,.045,.08],falloff:.2,
    lamps:[LAMP(-5,-23.6,-15,1.3),LAMP(0,-23.8,-9,1.3),LAMP(3,-23.8,6,1.3),LAMP(-1,-23.8,15,1.2),LAMP(-7,-23.4,-4,.9),LAMP(6,-23.4,-6,.9),
      LAMP(-4,-23.4,9,.9),LAMP(5,-23.6,13,.8),LAMP(-8,-24.2,-14,.7),LAMP(2,-24.2,-2,.7),LAMP(-3,-24.2,13,.7),LAMP(-9.9,-22.4,6,.8)]},
  {key:'lake',name:'地下6階 · 地底湖',y:-29.6,ceiling:-25.15,z0:-20,z1:18.5,color:[.55,.8,.9],ambient:[.04,.07,.08],falloff:.16,
    lamps:[LAMP(0,-27.6,-17,1.3),LAMP(-8,-28.8,14,1.1),LAMP(-7.5,-27.2,-8),LAMP(7.5,-27.2,-8),LAMP(-7.5,-27.2,4),LAMP(7.5,-27.2,4),LAMP(0,-27,10),LAMP(-9.5,-27,-19,.8)]},
  {key:'cathedral',name:'地下7階 · 地下大聖堂',y:-46,ceiling:-30.4,z0:-20,z1:28,color:[1,.8,.55],ambient:[.09,.075,.06],falloff:.035,
    lamps:[-12,-3,6,15].map(z=>LAMP(0,-37.7,z,2.2)).concat([-11,-5,1,7].map(z=>LAMP(10.8,-38,z,.9)),[LAMP(0,-43.4,24,1.6),LAMP(-6.5,-41,27.5,1.3),LAMP(6.5,-41,27.5,1.3),LAMP(-9.9,-37,-2,.7)])}
];
// Stair flights between levels: E and W run along the walls, G is the cathedral's processional stair.
export const DEPTH_FLIGHTS={E:{x0:8.75,x1:11.05,z0:4.6,z1:16},W:{x0:-11.05,x1:-8.75,z0:-8,z1:3.4},G:{x0:-11.05,x1:-8.75,z0:-18,z1:13}};
// Light sources for the crypt shader: [x, height above the base, z, strength].
export const CRYPT_LIGHTS=[
  ...CRYPT_COLUMNS.z.flatMap(z=>[[-3.0,-2.4,z,1],[3.0,-2.4,z,1]]),
  [0,-3.0,26.35,1.25],[-2.6,-1.95,24.6,.8],[2.6,-1.95,24.6,.8],[-3.6,-3.5,24.75,.7]
];
export function inRoofHut(x,z){
  return x>=HUT.x0+.04&&x<HUT.x1-.04&&z>HUT.z0+.05&&z<HUT.z1-.05;
}
export const APSE={rx:4.40*WIDTH,rz:4.58*LENGTH};
export const ENTRY_STEPS=9;
export const ENTRY={half:1.53,inner:NAVE.front-.82,edge:NAVE.front+.26,length:4.05};
const c=Math.cos(ANGLE),s=Math.sin(ANGLE);
const SHOULDER=24.55;
const SHAFT_SCALE=2.93;
const SPIRE_SCALE=(SPIRE_HEIGHT-SHOULDER*SHAFT_SCALE)/(OLD_HEIGHT-SHOULDER);

export function world(x,y,z) {return [CENTER[0]+c*x-s*z,y,CENTER[1]+s*x+c*z];}
export function worldNormal(x,y,z){return [c*x-s*z,y,s*x+c*z];}
export function local(x,z){
  x-=CENTER[0];z-=CENTER[1];
  return [c*x+s*z,-s*x+c*z];
}
export function shaftHeight(y){return y/SHAFT_SCALE;}
export function opticalHeight(y){
  if(y<=0)return y;
  if(y<=SHOULDER)return y*SHAFT_SCALE;
  return SHOULDER*SHAFT_SCALE+(y-SHOULDER)*SPIRE_SCALE;
}
export function envelopeTransform(x,y,z){return world(x*WIDTH,opticalHeight(y),z*LENGTH);}
export function envelopeNormal(x,y,z,height){
  const scale=height<=0?1:height<=SHOULDER?SHAFT_SCALE:SPIRE_SCALE;
  return worldNormal(x/WIDTH,y/scale,z/LENGTH);
}
const rect=(x,z,{x:half,front,back})=>Math.max(Math.abs(x)-half,z-front,back-z);
export function buildingDistance(x,z){
  const a=Math.max(z-NAVE.back,(Math.hypot(x/APSE.rx,(z-NAVE.back)/APSE.rz)-1)*APSE.rx);
  return Math.min(rect(x,z,NAVE),rect(x,z,WING),a);
}
export function entryTop(z){
  if(z<=ENTRY.edge)return FLOORS[0];
  const t=Math.min(1,(z-ENTRY.edge)/ENTRY.length);
  return FLOORS[0]-.16*Math.ceil(t*ENTRY_STEPS);
}
