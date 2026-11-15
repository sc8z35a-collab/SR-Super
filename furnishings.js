import { SURFACE as MAT } from './surfaces.js';

function turn(m,x,y,z,rings,material,sides=16,shade=1){
  for(let i=1;i<rings.length;i++){
    const [a,r]=rings[i-1], [b,s]=rings[i];
    m.rod([x,y+a,z],[x,y+b,z],r,s,material,sides,shade);
  }
}

export function openFolio(m,x,y,z,width,depth,decorated=true){
  m.beveledBox(x,y+.012,z,width+.056,.034,depth+.053,.011,MAT.binding,.98);
  m.box(x,y+.037,z,width-.013,.033,depth-.014,MAT.cork,1.06);
  for(const side of [-1,1]){
    const material=side===1&&decorated?MAT.illumination:MAT.parchment;
    const point=(u,v)=>{
      const fromSpine=side>0?u:1-u;
      const bow=.025*Math.sin(Math.PI*fromSpine*.84);
      return [x+(u-(side>0?0:1))*width*.493,y+.054+bow,z+( .5-v)*depth];
    };
    for(let i=0;i<6;i++){
      const a=i/6,b=(i+1)/6;
      m.quad(point(a,0),point(b,0),point(b,1),point(a,1),material,1,[0,1,0],[[a,0],[b,0],[b,1],[a,1]]);
    }
  }
  m.rod([x,y+.050,z-depth*.48],[x-.006,y+.040,z+depth*.56],.008,.011,MAT.seal,6,.91);
}

function amberVial(m,x,y,z,scale=1){
  const rings=[[0,.083],[.028,.098],[.113,.097],[.152,.080],[.179,.045],[.214,.042],[.226,.052]];
  turn(m,x,y,z,rings.map(([h,r])=>[h*scale,r*scale]),MAT.amberGlass,15,.87);
  m.rod([x,y+.213*scale,z],[x,y+.264*scale,z],.042*scale,.043*scale,MAT.cork,13,.96,0,true);
}

function ceramicPot(m,x,y,z){
  turn(m,x,y,z,[[0,.121],[.036,.166],[.155,.180],[.298,.141],[.342,.105],[.373,.109]],MAT.ceramic,21,1.02);
  turn(m,x,y,z,[[.373,.109],[.373,.090],[.320,.086]],MAT.ceramic,21,.85);
  let prior;
  for(let i=0;i<=12;i++){
    const a=i/12*Math.PI;
    const next=[x+.105+.116*Math.sin(a),y+.154+.082*(1+Math.cos(a)),z];
    if(prior)m.rod(prior,next,.026,.024,MAT.ceramic,7,1.02);
    prior=next;
  }
}

function quill(m,x,y,z){
  const tip=[x+.296,y+.084,z-.087];
  m.rod([x-.064,y+.018,z+.024],tip,.006,.0025,MAT.ebony,6,1.05);
  const spine=[x+.067,y+.043,z-.015];
  const lower=[x+.187,y+.040,z+.066];
  const upper=[x+.157,y+.064,z-.100];
  m.tri(spine,lower,tip,MAT.feather,1,undefined,[[.10,.51],[.53,.12],[.96,.53]]);
  m.tri(upper,spine,tip,MAT.feather,.99,undefined,[[.45,.99],[.10,.51],[.96,.53]]);
}

export function studyObjects(m,x,y,z){
  openFolio(m,x-.23,y,z+.008,.68,.40);
  m.beveledBox(x+.48,y+.019,z-.18,.39,.039,.24,.014,MAT.ebony,.94);
  amberVial(m,x+.49,y+.039,z-.19,.84);
  quill(m,x+.34,y+.012,z+.19);
  m.beveledBox(x+.47,y+.016,z+.34,.31,.026,.16,.005,MAT.parchment,.93);
  m.rod([x+.49,y+.029,z+.343],[x+.49,y+.045,z+.343],.045,.041,MAT.seal,13,1.08,0,true);
}

export function sanctuaryObjects(m,y,z){
  const x=.59;
  turn(m,x,y,z,[[0,.124],[.021,.115],[.052,.069],[.102,.037],[.147,.033],[.165,.052],
    [.199,.09],[.254,.118],[.304,.137],[.323,.132],[.323,.118],[.279,.102]],MAT.silver,22,1.08);
  turn(m,x,y,z,[[.140,.045],[.15,.058],[.168,.051]],MAT.brass,15,.94);
  m.rod([x-.35,y+.008,z+.15],[x-.35,y+.019,z+.15],.137,.142,MAT.silver,24,1.04,0,true);
  openFolio(m,-.78,y,z+.014,.61,.37);
}

function chain(m,x,y,z){
  for(let link=0;link<10;link++){
    let last;
    for(let i=0;i<=10;i++){
      const a=i/10*2*Math.PI, r=Math.cos(a)*.033;
      const p=[x+(link%2?r:0),y-link*.069+Math.sin(a)*.044,z+(link%2?0:r)];
      if(last)m.rod(last,p,.008,.008,MAT.chain,5,.97);
      last=p;
    }
  }
}

export function bellWinch(m,y,block){
  const x=16.42,z=-7.27;
  block(m,{x0:x-.87,x1:x+.87,z0:z-.40,z1:z+.40},y,y+.287,MAT.ebony,.98);
  for(const side of [-1,1]){
    const a=x+side*.65;
    m.beveledBox(a,y+.72,z,.20,1.07,.24,.029,MAT.doorOak,.95);
    m.beveledBox(a,y+1.08,z-.005,.23,.25,.28,.021,MAT.gateIron,1.07);
    m.rod([a,y+.282,z+.32],[a,y+.95,z+.007],.065,.059,MAT.handrail,5,.92);
  }
  const height=y+1.08;
  m.rod([x-.68,height,z],[x+.91,height,z],.086,.086,MAT.gateIron,15,.95);
  for(const side of [-1,1]){
    const a=x+side*.27;
    m.rod([a-.049,height,z],[a+.049,height,z],.252,.252,MAT.endGrain,25,1,0,true);
  }
  let last;
  for(let i=0;i<=120;i++){
    const t=i/120,angle=t*Math.PI*17;
    const p=[x-.244+t*.485,height+Math.cos(angle)*.186,z+Math.sin(angle)*.186];
    if(last)m.rod(last,p,.031,.031,MAT.rope,6,.98);
    last=p;
  }
  m.rod([x+.89,height,z],[x+.89,height-.22,z+.103],.037,.037,MAT.gateIron,8,.99);
  m.rod([x+.87,height-.22,z+.103],[x+1.04,height-.22,z+.103],.049,.049,MAT.handrail,9,1.08,0,true);
  chain(m,x-.37,height-.07,z+.232);
  m.rod([x-.212,height+.176,z-.032],[x-.241,height+.34,z+.025],.031,.027,MAT.rope,9,.98);
}

export function weatheredCrate(m,x,y,z,block){
  const w=.78,d=.59,h=.53;
  block(m,{x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2},y,y+h,MAT.pine,.99);
  for(const side of [-1,1]){
    m.beveledBox(x,y+h-.055,z+side*d*.50,w+.062,.091,.056,.012,MAT.pine,.96);
    m.beveledBox(x+side*w*.43,y+h*.52,z+d*.53,.072,h*.91,.026,.007,MAT.doorOak,.89);
    const p=x+side*w*.34;
    m.rod([p,y+h-.022,z-d*.13],[p,y+h+.013,z-d*.13],.016,.022,MAT.chain,6,.96,0,true);
  }
  m.beveledBox(x,y+h+.068,z,.54,.152,.39,.054,MAT.sailcloth,1.03);
  m.beveledBox(x-.04,y+h+.161,z+.022,.47,.073,.32,.033,MAT.sailcloth,.91);
}

export function workshopObjects(m,x,y,z){
  const canZ=z+.55;
  turn(m,x+.01,y,canZ,[[0,.095],[.035,.128],[.165,.126],[.197,.086],[.214,.049],
    [.254,.034]],MAT.oiler,17,1.08);
  m.rod([x+.005,y+.235,canZ],[x-.258,y+.408,canZ+.015],.031,.012,MAT.oiler,8,.99,0,true);
  m.rod([x+.092,y+.193,canZ],[x+.159,y+.145,canZ+.008],.018,.017,MAT.chain,6,.96);
  amberVial(m,x+.099,y,z-.53);
  ceramicPot(m,x+.09,y,z+.927);
  m.beveledBox(x-.051,y+.022,z+.042,.095,.041,.57,.012,MAT.endGrain,.96);
  const yy=y+.044;
  m.quad([x-.095,yy,z+.317],[x-.007,yy,z+.317],[x-.007,yy,z-.236],[x-.095,yy,z-.236],
    MAT.ruler,1.07,[0,1,0],[[0,0],[0,1],[1,1],[1,0]]);
}
