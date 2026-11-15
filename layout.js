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
