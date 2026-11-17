import { Mesh } from './mesh.js';
import { BASE, WIDTH, LENGTH, NAVE, WING, APSE, ENTRY, ENTRY_STEPS, FLOORS, ROOF_HEIGHT, ROOF_INDEX, CRYPT, CRYPT_STAIR, DEPTHS,
  UPPER_AISLE, UPPER_ROOM, HUT, HUT_STEP, inRoofHut, world, entryTop, buildingDistance } from './layout.js';
import { CRAFT, decorateNave, decorateGallery, bridgeMoulding, chapterLibrary, bellChamber } from './ornament.js';
import { SURFACE } from './surfaces.js';
import { bellWinch, sanctuaryObjects, weatheredCrate, workshopObjects } from './furnishings.js';
import { ground, coast, clamp, lerp } from './terrain.js';
import { baptistery, marinersChapel, treasury, scriptorium, roofGarden, forecourt, roomName } from './chapels.js';
import { crypt, cryptName } from './crypt.js';
import { depths } from './depths.js';
import { FABRIC } from './fabric.js';
import { naveHangings, chapelCeilings, upperCeilings, gutterTrough, nicheAndScreen, churchFurnishings } from './chapels.js';

const OAK=4, FLOOR=6, TRIM=9, LIGHT=11, BRONZE=22, LINEN=23;
const GRANITE=25, MARBLE=26, DARK_MARBLE=27, COPPER=29, GILT=31;
const RADIUS=.30;
const floors=[], obstacles=[], flights=[];
const between=(value,a,b)=>value>=a && value<=b;
const rect=(x0,x1,z0,z1)=>({x0,x1,z0,z1});
const mid=(a,b)=>(a+b)*.5;
const wingLow=WING.back+.86, wingHigh=WING.front-.86;
const galleryStart=NAVE.back+1.18, galleryEnd=11.28*LENGTH-.39;
const inner=7.15, outer=NAVE.x-.67;
const stair={x0:8.05,x1:11.18,z0:4.45,z1:16.57};
const flightWidth=1.49;
const names=['1階 · 身廊','2階 · 回廊','3階 · 聖遺物室','4階 · 展望回廊','5階 · 古文書室','6階 · 鐘室','屋上テラス'];
const connection=[8.24,11.31];

function box(m,r,y0,y1,mat,shade=1){
  m.box(mid(r.x0,r.x1),mid(y0,y1),mid(r.z0,r.z1),r.x1-r.x0,y1-y0,r.z1-r.z0,mat,shade);
}
function block(m,r,y0,y1,mat,shade=1){
  box(m,r,y0,y1,mat,shade);
  obstacles.push({...r,y0,y1});
}
function solid(r,y0,y1){
  obstacles.push({...r,y0,y1});
}
const kit={block,solid,deck:(...a)=>deck(...a),rail:(...a)=>rail(...a),flight:(...a)=>stairFlight(...a)};
function deck(m,r,y,mat=FLOOR,deep=.33){
  box(m,r,y-deep,y,mat,.96);
  floors.push({...r,y});
}

function rail(m,a,b,y,z=y){
  const dx=b[0]-a[0], dz=b[1]-a[1];
  const length=Math.hypot(dx,dz);
  if(length<.05)return;
  m.rod([a[0],y+1.08,a[1]],[b[0],z+1.08,b[1]],.055,.055,SURFACE.handrail,8,.95);
  m.rod([a[0],y+.094,a[1]],[b[0],z+.094,b[1]],.034,.034,SURFACE.railIron,6,.83);
  const count=Math.ceil(length/.53);
  for(let i=0;i<=count;i++){
    const t=i/count;
    const x=a[0]+dx*t, h=lerp(y,z,t), v=a[1]+dz*t;
    const post=i%5===0?.053:.025;
    m.rod([x,h+.02,v],[x,h+1.065,v],post,post,SURFACE.railIron,6,.91);
    if(post>.035)m.rod([x,h+1.055,v],[x,h+1.192,v],.076,.020,SURFACE.brass,7,.87);
  }
  obstacles.push({segment:[a,b],low:y,high:z,y0:Math.min(y,z)-.05,y1:Math.max(y,z)+1.18});
}
function guard(m,r,y,open){
  const edges=[
    ['west',r.x0,r.z0,r.z1,false],['east',r.x1,r.z0,r.z1,false],
    ['north',r.z0,r.x0,r.x1,true],['south',r.z1,r.x0,r.x1,true]
  ];
  for(const [name,p,start,end,alongX] of edges){
    let at=start;
    const onEdge=(a,b)=>rail(m,alongX?[a,p]:[p,a],alongX?[b,p]:[p,b],y);
    for(const [a,b] of open[name]??[]){
      if(a>at)onEdge(at,Math.min(a,end));
      at=Math.max(at,b);
    }
    if(end>at)onEdge(at,end);
  }
}

function shaft(m,x,z,w,d,y){
  for(const [base,top,margin,mat] of [[y,-.80,.38,GRANITE],[-.80,-.43,.19,GRANITE],[-.43,-.06,0,TRIM]]){
    box(m,rect(x-w/2-margin,x+w/2+margin,z-d/2-margin,z+d/2+margin),base,top,mat,.91);
  }
}

function foundation(m){
  const tx=5.47*WIDTH, tz=13.75*LENGTH;
  for(const s of [-1,1]){
    shaft(m,s*tx,tz,4.88*WIDTH,4.90*LENGTH,-5.61);
    shaft(m,s*(WING.x-2.23),mid(WING.back,WING.front),4.65,WING.front-WING.back-.44,-5.61);
    for(const z of [-8.44,4.87,8.13])shaft(m,s*8.87*WIDTH,z*LENGTH,1.58,1.82,-2.9);
  }
  box(m,rect(-3.02*WIDTH,3.02*WIDTH,11.22*LENGTH,NAVE.front),-1.2,-.014,GRANITE,.88);
  deck(m,rect(-ENTRY.half,ENTRY.half,ENTRY.inner,ENTRY.edge),FLOORS[0],GRANITE,.41);
  const tread=ENTRY.length/ENTRY_STEPS;
  for(let i=0;i<ENTRY_STEPS;i++){
    const a=ENTRY.edge+i*tread,b=a+tread,y=entryTop(mid(a,b));
    box(m,rect(-ENTRY.half,ENTRY.half,a,b),y-1.08,y,FABRIC.stoneSteps,.92);
    box(m,rect(-ENTRY.half-.05,ENTRY.half+.05,b-.092,b+.026),y-.094,y+.004,FABRIC.stoneSteps,1.08);
    for(const side of [-1,1]){
      const x=side*(ENTRY.half+.13);
      block(m,rect(x-.14,x+.14,a-.008,b+.008),y-.36,y+.68,GRANITE,.87);
      box(m,rect(x-.20,x+.20,a,b),y+.65,y+.74,TRIM,1.02);
    }
  }
  forecourt(m,kit);
}

function flame(m,x,y,z){
  m.rod([x,y,z],[x,y+.048,z],.082,.051,SURFACE.brass,8,.91,0,true);
  m.rod([x,y+.04,z],[x,y+.236,z],.035,.028,SURFACE.brass,7,.91);
  m.rod([x,y+.229,z],[x,y+.432,z],.028,.024,LINEN,8,1.02,0,true);
  m.rod([x,y+.432,z],[x+.010,y+.51,z],.023,.002,LIGHT,7,1.10);
}
function pendant(m,x,y,z,size=1,chain=1.2){
  m.rod([x,y+.35*size,z],[x,y+.35*size+chain,z],.030,.030,SURFACE.railIron,6,.79);
  m.rod([x,y+.18*size,z],[x,y+.38*size,z],.347*size,.081*size,SURFACE.brass,10,1.02,0,true);
  m.rod([x,y-.20*size,z],[x,y+.19*size,z],.226*size,.237*size,LIGHT,8,.89);
  m.rod([x,y-.267*size,z],[x,y-.186*size,z],.318*size,.227*size,COPPER,10,.92,0,true);
  for(let index=0;index<6;index++){
    const a=index*Math.PI/3,u=x+Math.cos(a)*size*.245,v=z+Math.sin(a)*size*.245;
    m.rod([u,y-.191*size,v],[u,y+.23*size,v],.019*size,.019*size,SURFACE.railIron,6,.84);
  }
}

function hall(m,decals){
  const y=FLOORS[0],cs=CRYPT_STAIR;
  // The nave floor leaves an opening over the flight down to the crypt.
  for(const r of [rect(-NAVE.x,NAVE.x,NAVE.back,cs.z0),rect(-NAVE.x,NAVE.x,cs.z1,NAVE.front-.72),
    rect(-NAVE.x,cs.x0,cs.z0,cs.z1),rect(cs.x1,NAVE.x,cs.z0,cs.z1)])deck(m,r,y);
  deck(m,rect(-WING.x,-NAVE.x,WING.back,WING.front),y);
  deck(m,rect(NAVE.x,WING.x,WING.back,WING.front),y);
  deck(m,rect(-3.04*WIDTH,3.04*WIDTH,NAVE.front-.74,NAVE.front-.08),y);
  for(let i=0;i<6;i++){
    const a=Math.PI+i/6*Math.PI,b=Math.PI+(i+1)/6*Math.PI;
    const r=[APSE.rx*Math.cos(a),y,NAVE.back+APSE.rz*Math.sin(a)];
    const q=[APSE.rx*Math.cos(b),y,NAVE.back+APSE.rz*Math.sin(b)];
    m.tri([0,y,NAVE.back],q,r,FLOOR,1);
    m.quad(r,q,[q[0],-.36,q[2]],[r[0],-.36,r[2]],GRANITE,.89);
  }
  m.quad([-1.56,y+.007,25.73],[1.56,y+.007,25.73],[1.56,y+.007,-19.37],[-1.56,y+.007,-19.37],
    SURFACE.runner,1,[0,1,0],[[0,0],[1,0],[1,18.6],[0,18.6]]);
  for(const side of [-1,1]){
    for(let j=0;j<12;j++){
      const x=side*4.63,z=22.65-j*1.74,w=4.08;
      for(const dx of [-w*.5+.12,w*.5-.12]){
        const bx=x+dx;
        box(m,rect(bx-.09,bx+.09,z-.32,z+.36),y,y+.944,SURFACE.pewOak,.82);
        m.rod([bx,y+.90,z+.23],[bx,y+1.22,z+.24],.118,.061,SURFACE.handrail,8,.98);
        m.rod([bx,y+.155,z+.305],[bx,y+.155,z+.505],.045,.045,SURFACE.railIron,6,.91);
      }
      m.beveledBox(x,y+.46,z,w,.113,.55,.035,SURFACE.pewOak,.91);
      m.beveledBox(x,y+.784,z+.264,w,.509,.113,.038,SURFACE.pewOak,.86);
      m.beveledBox(x,y+1.055,z+.27,w+.09,.104,.162,.036,SURFACE.handrail,1);
      m.beveledBox(x,y+.151,z+.477,w-.18,.056,.239,.018,SURFACE.pewOak,.76);
      m.beveledBox(x,y+.197,z+.477,w-.24,.064,.221,.026,SURFACE.kneeler,.97);
      obstacles.push({...rect(x-w*.5-.055,x+w*.5+.055,z-.34,z+.597),y0:y,y1:y+1.15});
    }
    for(const z of [-21.689,-15.626,-9.593,2.963,9.03,15.1,21.11,29.88]){
      const x=side*3.95*WIDTH;
      obstacles.push({...rect(x-.94,x+.94,z-1.04,z+1.04),y0:y,y1:22.2});
    }
  }
  const altar=-23.86;
  block(m,rect(-1.78,1.78,altar-.53,altar+.62),y,y+1.13,MARBLE,.96);
  m.beveledBox(0,y+1.15,altar,3.94,.21,1.39,.051,MARBLE,1.14);
  m.box(0,y+1.27,altar,3.56,.033,1.40,LINEN,1.05);
  m.beveledBox(0,y+.15,altar,3.69,.23,1.21,.036,CRAFT.serpentine,.92);
  for(const x of [-1.3,0,1.3]){
    m.beveledBox(x,y+.57,altar+.627,.94,.62,.054,.016,CRAFT.jasper,1.03);
    m.beveledBox(x,y+.57,altar+.669,.52,.43,.037,.012,CRAFT.ivory,1.04);
  }
  for(let i=0;i<54;i++){
    const x=(i/54*2-1)*1.78,a=((i+1)/54*2-1)*1.78;
    const p=v=>altar+.714+Math.sin(v*30)*.022+Math.cos(v*16)*.013;
    const h=v=>y+.92+Math.sin(v*28)*.016;
    m.quad([x,h(x),p(x)],[a,h(a),p(a)],[a,y+1.29,altar+.714],[x,y+1.29,altar+.714],LINEN,1.12);
    m.quad([x,h(x)+.051,p(x)+.006],[a,h(a)+.051,p(a)+.006],
      [a,h(a)+.078,p(a)+.006],[x,h(x)+.078,p(x)+.006],GILT,.96);
  }
  for(const x of [-1.45,-1.02,-.61,.61,1.02,1.45])flame(m,x,y+1.281,altar-.11);
  m.rod([0,y+1.26,altar-.39],[0,y+2.30,altar-.39],.045,.036,BRONZE,9,.99);
  m.rod([-.30,y+1.96,altar-.39],[.30,y+1.96,altar-.39],.042,.042,GILT,8,.96);
  sanctuaryObjects(m,y+1.290,altar+.33);
  decorateNave(m,y,block);
  baptistery(m,kit);
  marinersChapel(m,kit);
  naveHangings(m);
  chapelCeilings(m,0);
  nicheAndScreen(m,kit);
  churchFurnishings(m,kit);
  crypt(m,kit);
  for(const [x,z,w,d] of [[.05,15.7,5.5,6.7],[.05,5.3,5.1,5.9],[8.05,-3.79,7.6,5.4],[.85,-11.56,5.4,4.1],[1.39,-21.07,5.1,5]]){
    decals.quad([x-w*.5,y+.013,z+d*.4],[x+w*.5,y+.013,z+d*.21],
      [x+w*.44,y+.013,z-d*.55],[x-w*.56,y+.013,z-d*.30],3,.95);
  }
}

function stairFlight(m,r,low,high,up,mat=FABRIC.stoneSteps){
  const count=Math.ceil((high-low)/.172),tread=(r.z1-r.z0)/count;
  flights.push({...r,low,high,up,count});
  for(let i=1;i<=count;i++){
    const y=lerp(low,high,i/count);
    const z=r.z0+(up>0?i-1:count-i)*tread;
    box(m,rect(r.x0,r.x1,z-.001,z+tread+.001),y-.29,y,mat,i%9===0?.88:1);
    const rim=up>0?z:z+tread;
    box(m,rect(r.x0,r.x1,rim-.022,rim+.030),y-.052,y+.004,mat,1.12);
  }
  for(const x of [r.x0,r.x1]){
    rail(m,[x,r.z0],[x,r.z1],up>0?low:high,up>0?high:low);
  }
}

function staircase(m,index){
  const {x0,x1,z0,z1}=stair;
  const y=FLOORS[index], top=FLOORS[index+1], landing=mid(y,top);
  deck(m,rect(x0,x1,z0-.85,z0),y,GRANITE);
  deck(m,rect(x0,x1,z1,z1+1.55),landing,GRANITE);
  rail(m,[x0,z1+1.55],[x1,z1+1.55],landing);
  rail(m,[x0,z1],[x0,z1+1.55],landing);
  rail(m,[x1,z1],[x1,z1+1.55],landing);
  stairFlight(m,rect(x0,x0+flightWidth,z0,z1),y,landing,1);
  stairFlight(m,rect(x1-flightWidth,x1,z0,z1),landing,top,-1);
}

function gallery(m,index){
  const y=FLOORS[index], stone=index===2?DARK_MARBLE:index===3?MARBLE:FLOOR;
  const left=rect(-outer,-inner,galleryStart,galleryEnd);
  const right=rect(inner,outer,galleryStart,galleryEnd);
  const s=stair;
  for(const r of [left,rect(inner,outer,galleryStart,s.z0),rect(inner,s.x0,s.z0,s.z1+1.55),
    rect(s.x1,outer,s.z0,s.z1+1.55),rect(inner,outer,s.z1+1.55,galleryEnd)])deck(m,r,y,stone);
  const bridgeRanges=[[galleryStart,galleryStart+2.18],[-5.65,-3.14],[galleryEnd-2.07,galleryEnd]];
  if(index===1){
    treasury(m,kit);
    scriptorium(m,kit);
    chapelCeilings(m,1);
  }
  guard(m,left,y,{west:[[wingLow,wingHigh]],east:bridgeRanges});
  guard(m,right,y,{east:[[wingLow,wingHigh]],west:bridgeRanges});
  rail(m,[s.x0,s.z0],[s.x0,s.z1+1.55],y);
  rail(m,[s.x1,s.z0],[s.x1,s.z1+1.55],y);
  rail(m,[s.x0,s.z1+1.55],[s.x1,s.z1+1.55],y);
  for(const [a,b] of bridgeRanges){
    deck(m,rect(-inner,inner,a,b),y,stone);
    rail(m,[-inner,a],[inner,a],y);
    rail(m,[-inner,b],[inner,b],y);
    bridgeMoulding(m,y,a,b,inner);
  }
  const edge=WING.x-.86;
  for(const side of [-1,1]){
    const [x0,x1]=side<0?[-edge,-outer]:[outer,edge];
    const r=rect(x0,x1,wingLow,wingHigh);
    deck(m,r,y,stone);
    guard(m,r,y,{[side<0?'east':'west']:[[wingLow,wingHigh]]});
    if(index===2){
      const x=side*17.02,z=-6.40;
      block(m,rect(x-.78,x+.78,z-.75,z+.79),y,y+.91,GRANITE,.88);
      m.beveledBox(x,y+.989,z,1.76,.162,1.82,.042,MARBLE,1);
      m.beveledBox(x,y+1.165,z,1.11,.241,.84,.045,GILT,.96);
      m.beveledBox(x,y+1.337,z,.87,.132,.59,.045,BRONZE,1.06);
      for(const t of [-.42,.42])flame(m,x+t,y+1.117,z+.64);
    }
    if(index===3){
      for(const z of [-6.93,-.39]){
        const x=side*16.58;
        m.beveledBox(x,y+.48,z,1.73,.155,.45,.038,OAK,.91);
        for(const dx of [-.69,.69])box(m,rect(x+dx-.086,x+dx+.086,z-.17,z+.17),y,y+.51,GRANITE,.9);
        obstacles.push({...rect(x-.87,x+.87,z-.23,z+.23),y0:y,y1:y+.56});
      }
    }
    decorateGallery(m,y,index,side,block);
    for(const z of [-16.4,-.71,7.84,16.9]){
      if(side>0&&z>4)continue;
      const x=side*(inner+.40);
      m.rod([x,y+.28,z],[x,y+.93,z],.08,.04,BRONZE,7,.93);
      flame(m,x,y+.91,z);
    }
  }
}

function aisleDeck(m,index,mat){
  const a=UPPER_AISLE,s=stair,y=FLOORS[index],end=s.z1+1.55;
  for(const r of [rect(a.x0,a.x1,a.z0,s.z0),rect(a.x0,s.x0,s.z0,end),
    rect(s.x1,a.x1,s.z0,end),rect(a.x0,a.x1,end,a.z1)])deck(m,r,y,mat,.36);
  // The northern mouths of both flights open onto the same landing.
  rail(m,[s.x0,s.z0],[s.x0,end],y);
  rail(m,[s.x1,s.z0],[s.x1,end],y);
  rail(m,[s.x0,end],[s.x1,end],y);
}

function upperRooms(m,index){
  const y=FLOORS[index];
  const library=index===4;
  const room=UPPER_ROOM;
  deck(m,room,y,library?CRAFT.parquet:CRAFT.lichenSlate,.44);
  aisleDeck(m,index,FABRIC.terracottaTiles);
  const aisle=UPPER_AISLE;
  guard(m,aisle,y,{north:[connection],east:[[aisle.z0,aisle.z1]]});
  guard(m,room,y,{south:[connection],north:[[room.x0,room.x1]]});
  for(const z of [7.22,15.35]){
    const x=10.18;
    const hanger=library?y+2.73:y+2.92;
    pendant(m,x,hanger,z,.73,1.91);
  }
  upperCeilings(m,index);
  if(library)chapterLibrary(m,y,block);
  else {
    bellChamber(m,y,block);
    bellWinch(m,y,block);
  }
}

function hut(m,y){
  const h=HUT;
  const middle=mid(h.x0,h.x1);
  const front=h.z1+.21,rear=h.z0-.21;
  const inside=rect(h.x0+.11,h.x1-.11,h.z0+.13,h.z1-.13);
  deck(m,inside,y+HUT_STEP,CRAFT.deck,.23);
  for(const wall of [rect(h.x0,h.x0+.19,h.z0,h.doorA),rect(h.x0,h.x0+.19,h.doorB,h.z1),
    rect(h.x1-.20,h.x1,h.z0,h.z1),rect(h.x0,h.x1,h.z0,h.z0+.20),rect(h.x0,h.x1,h.z1-.19,h.z1)]){
    block(m,wall,y,y+2.52,FABRIC.brickPeel,.94);
  }
  box(m,rect(h.x0,h.x0+.20,h.doorA,h.doorB),y+2.11,y+2.52,CRAFT.blackOak,.94);
  for(const [x,z] of [[h.x0,h.z0],[h.x0,h.z1],[h.x1,h.z0],[h.x1,h.z1],
    [h.x0+.045,h.doorA],[h.x0+.045,h.doorB]]){
    m.rod([x,y,z],[x,y+2.53,z],.087,.066,CRAFT.blackOak,4,.93);
  }
  box(m,rect(h.x0- .024,h.x0+.25,h.doorA,h.doorB),y,y+.074,CRAFT.deck,.93);
  const outerLeft=h.x0-.29,outerRight=h.x1+.29;
  for(const x of [outerLeft,outerRight]){
    gutterTrough(m,[x,y+2.36,rear-.024],[x,y+2.36,front+.045],.075);
    const down=x<middle?h.x0-.10:h.x1+.10;
    m.rod([down,y+.11,front-.23],[down,y+2.28,front-.23],.029,.033,SURFACE.lead,9,1);
    m.rod([down,y+2.279,front-.23],[x,y+2.377,front-.23],.035,.039,SURFACE.lead,8,.97);
  }
  for(const [a,b] of [[outerLeft,middle],[middle,outerRight]]){
    const y0=y+(a===middle?3.87:2.42),y1=y+(b===middle?3.87:2.42);
    m.quad([a,y0,front],[b,y1,front],[b,y1,rear],[a,y0,rear],CRAFT.copper,1,
      [a===middle?.42:-.42,.90,0],[[0,0],[2,0],[2,2.3],[0,2.3]]);
    for(let i=0;i<=8;i++){
      const z=lerp(rear,front,i/8);
      m.rod([a,y0+.011,z],[b,y1+.011,z],.023,.027,CRAFT.copper,5,.84);
    }
  }
  for(const z of [h.z0+.005,h.z1-.005]){
    m.tri([h.x0,y+2.44,z],[h.x1,y+2.44,z],[middle,y+3.79,z],CRAFT.brick,.95);
    // A louvred vent in each gable; the viewer outside sees u running to the right.
    const out=z<(h.z0+h.z1)/2?-1:1, lx=out<0?[middle+.35,middle-.35]:[middle-.35,middle+.35], zz=z+out*.012;
    m.quad([lx[0],y+2.62,zz],[lx[1],y+2.62,zz],[lx[1],y+3.2,zz],[lx[0],y+3.2,zz],FABRIC.louvre,1,[0,0,out],[[0,0],[1,0],[1,1],[0,1]]);
    m.rod([h.x0-.10,y+2.52,z],[middle,y+3.87,z],.052,.049,CRAFT.blackOak,5,.91);
    m.rod([middle,y+3.87,z],[h.x1+.10,y+2.52,z],.049,.052,CRAFT.blackOak,5,.91);
  }
  m.rod([middle,y+3.87,rear],[middle,y+3.87,front],.071,.071,CRAFT.copper,8,.91);
  for(const z of [h.z0+.27,mid(h.z0,h.z1),h.z1-.25]) {
    m.rod([h.x0+.14,y+2.46,z],[h.x1-.14,y+2.46,z],.093,.093,CRAFT.blackOak,4,.90);
    m.rod([h.x0+.04,y+2.48,z],[middle,y+3.77,z],.070,.055,CRAFT.blackOak,4,.88);
    m.rod([h.x1-.04,y+2.48,z],[middle,y+3.77,z],.070,.055,CRAFT.blackOak,4,.88);
  }
  const work=rect(h.x1-1.01,h.x1-.26,h.z0+.42,h.z1-.51);
  block(m,work,y+.11,y+.96,CRAFT.blackOak,.89);
  m.beveledBox(mid(work.x0,work.x1),y+.97,mid(work.z0,work.z1),.88,.15,work.z1-work.z0+.09,.027,CRAFT.deck,.97);
  workshopObjects(m,mid(work.x0,work.x1),y+1.046,mid(work.z0,work.z1));
  m.beveledBox(h.x1-.248,y+1.63,mid(h.z0,h.z1),.075,.32,2.19,.019,CRAFT.deck,.91);
  for(const [z,reach] of [[h.z0+1.01,.54],[h.z0+1.66,.31],[h.z1-.98,.65]]){
    m.rod([h.x1-.315,y+1.74,z],[h.x1-.348,y+1.74-reach,z+.041],.028,.029,CRAFT.blackOak,7,.96);
    m.beveledBox(h.x1-.359,y+1.71,z,.09,.093,.24,.021,SURFACE.oiler,.93);
  }
  pendant(m,h.x0+1.04,y+2.00,h.z1-.95,.52,.49);
  const trivet=rect(h.x0+.47,h.x0+.99,h.z0+.29,h.z0+.83);
  block(m,trivet,y+.10,y+.58,CRAFT.wicker,.86);
  for(let loops=0;loops<3;loops++) {
    const path=Array.from({length:28},(_,i)=>{
      const angle=i/27*Math.PI*2,a=.16+loops*.044;
      return [h.x1-.67+Math.cos(angle)*a,y+1.047+loops*.028,h.z0+.77+Math.sin(angle)*a];
    });
    for(let i=1;i<path.length;i++)m.rod(path[i-1],path[i],.026,.025,CRAFT.hemp,5,.89);
  }
}

function parapet(m,a,b,y){
  const flat=Math.abs(a[1]-b[1])<.01;
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length<.08)return;
  const x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]);
  const z0=Math.min(a[1],b[1]),z1=Math.max(a[1],b[1]);
  const panel=flat?rect(x0,x1,z0-.151,z1+.151):rect(x0-.151,x1+.151,z0,z1);
  block(m,panel,y-.055,y+.82,CRAFT.fieldstone,.92);
  // Battlement masonry dressed onto both faces of the panel (metre UVs, lower 80% of the picture).
  for(const side of [-1,1]){
    const off=.155*side;
    const P=(t,h)=>flat?[lerp(x0,x1,t),h,(z0+z1)/2+off]:[(x0+x1)/2+off,h,lerp(z0,z1,t)];
    m.quad(P(0,y-.05),P(1,y-.05),P(1,y+.815),P(0,y+.815),FABRIC.battlement,.96,undefined,
      [[0,1/.42],[length,1/.42],[length,.2/.42],[0,.2/.42]]);
  }
  const head=flat?rect(x0-.025,x1+.025,z0-.218,z1+.218):rect(x0-.218,x1+.218,z0-.025,z1+.025);
  box(m,head,y+.79,y+.93,CRAFT.flags,1.03);
  const count=Math.floor(length/1.04);
  for(let i=0;i<count;i++){
    const t=(i+.5)/count;
    const x=lerp(a[0],b[0],t),z=lerp(a[1],b[1],t);
    m.beveledBox(x,y+1.016,z,flat?.45:.37,.29,flat?.37:.45,.037,CRAFT.fieldstone,.99);
    if(i%4===0){
      const rectMoss=flat?rect(x-.27,x+.29,z+.214,z+.223):rect(x-.223,x-.214,z-.26,z+.24);
      box(m,rectMoss,y+.801,y+.924,CRAFT.lichen,.82);
    }
  }
}

function roofTerrace(m){
  const a=UPPER_AISLE,r=UPPER_ROOM,y=ROOF_HEIGHT;
  deck(m,r,y,FABRIC.terraceSlabs,.48);
  aisleDeck(m,ROOF_INDEX,CRAFT.lichenSlate);
  parapet(m,[r.x0,r.z0],[r.x1,r.z0],y);
  parapet(m,[r.x1,r.z0],[r.x1,r.z1],y);
  parapet(m,[r.x0,r.z0],[r.x0,r.z1],y);
  parapet(m,[r.x0,r.z1],[connection[0],r.z1],y);
  parapet(m,[connection[1],r.z1],[r.x1,r.z1],y);
  parapet(m,[a.x0,a.z1],[a.x1,a.z1],y);
  // The stair door straddles the common wall, so leave the opening unguarded.
  parapet(m,[a.x0,a.z1],[a.x0,r.z1],y);
  parapet(m,[a.x1,a.z1],[a.x1,r.z1],y);
  hut(m,y);
  weatheredCrate(m,17.75,y,-3.04,block);
  roofGarden(m,kit);
  for(const [x,z] of [[13.12,-1.95],[17.04,1.31]]){
    block(m,rect(x-.58,x+.58,z-.235,z+.235),y,y+.51,CRAFT.fieldstone,.91);
    m.beveledBox(x,y+.55,z,1.31,.119,.54,.033,CRAFT.deck,.95);
  }
}

export function buildWalkways(){
  floors.length=obstacles.length=flights.length=0;
  const walkExterior=new Mesh(),roofExterior=new Mesh(),walkFloors=FLOORS.slice(0,ROOF_INDEX).map(()=>new Mesh()),decals=new Mesh();
  const underFloors=DEPTHS.map(()=>new Mesh());
  foundation(walkExterior);
  hall(walkFloors[0],decals);
  for(let i=1;i<4;i++)gallery(walkFloors[i],i);
  for(let i=4;i<ROOF_INDEX;i++)upperRooms(walkFloors[i],i);
  for(let i=0;i<ROOF_INDEX;i++)staircase(walkFloors[i],i);
  roofTerrace(roofExterior);
  depths(underFloors,kit);
  return {walkExterior,roofExterior,walkFloors,decals,underFloors};
}

export const CRYPT_LEVEL=-1;
export const DEEPEST_LEVEL=-1-DEPTHS.length;
// Underground levels are not storeys of FLOORS: their walkers keep floor 0 and are told apart by
// height. Level -1 is the crypt, -2 to -7 the levels below it (the deepest is the cathedral).
const UNDER_Y=[CRYPT.y,...DEPTHS.map(d=>d.y)];
export function levelOf(actor){
  if(!actor.interior||actor.y>=FLOORS[0]-.21)return actor.floor;
  for(let i=0;i<UNDER_Y.length;i++)if(UNDER_Y[i]<=actor.y+.21)return -(i+1);
  return -UNDER_Y.length;
}
const ARRIVALS=[[9.9,3.6,0],[-9.9,4.4,Math.PI],[9.9,3.6,0],[-9.9,4.4,Math.PI],[9.9,3.6,0],[0,-12,Math.PI]];
export function arrivalYaw(index){return index<CRYPT_LEVEL?ARRIVALS[-index-2][2]:null;}
export function visitFloor(index,atEntrance=false){
  if(index===CRYPT_LEVEL)return {x:-9.6,z:17.3,y:CRYPT.y,interior:true,floor:0};
  if(index<CRYPT_LEVEL){
    const [x,z]=ARRIVALS[-index-2];
    return {x,z,y:DEPTHS[-index-2].y,interior:true,floor:0};
  }
  const y=FLOORS[index];
  if(index===0&&atEntrance)return {x:0,z:NAVE.front+1.74,y:entryTop(NAVE.front+1.74),interior:false,floor:0};
  if(index===0)return {x:0,z:24.9,y,interior:true,floor:0};
  if(index<4)return {x:-.22,z:galleryEnd-1.06,y,interior:true,floor:index};
  if(index===4)return {x:10.45,z:1.22,y,interior:true,floor:index};
  if(index===5)return {x:10.45,z:-2.78,y,interior:true,floor:index};
  return {x:10.49,z:-4.16,y,interior:false,floor:ROOF_INDEX};
}

function free(x,z,y,inside){
  if(inside&&buildingDistance(x,z)>-RADIUS)return false;
  if(inside&&z<NAVE.back){
    const dx=x/APSE.rx,dz=(z-NAVE.back)/APSE.rz;
    const t=(Math.atan2(dz,dx)+2*Math.PI)%(2*Math.PI);
    const segment=clamp(Math.floor((t-Math.PI)/(Math.PI/6)),0,5);
    const a=Math.PI+(segment+.5)*Math.PI/6;
    if(dx*Math.cos(a)+dz*Math.sin(a)>Math.cos(Math.PI/12)-RADIUS/APSE.rx)return false;
  }
  const doorway=Math.abs(x)<=ENTRY.half-RADIUS&&z>ENTRY.inner-.45&&z<ENTRY.edge+ENTRY.length+.05&&y<1.1;
  if(!doorway&&z>NAVE.front-.83&&z<NAVE.front+.24&&Math.abs(x)<5.1)return false;
  for(const item of obstacles){
    if(item.y0>=y+1.70||item.y1<=y+.26)continue;
    if(item.segment){
      const [a,b]=item.segment, dx=b[0]-a[0], dz=b[1]-a[1];
      const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz));
      if(Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)>RADIUS+.065)continue;
      const height=lerp(item.low,item.high,t);
      if(y+.24<=height+1.18&&y+1.65>=height-.07)return false;
    }else if(between(x,item.x0-RADIUS,item.x1+RADIUS)&&between(z,item.z0-RADIUS,item.z1+RADIUS))return false;
  }
  return true;
}

export function nextPosition(actor,dx,dz){
  if(!dx&&!dz)return actor;
  const x=actor.x+dx,z=actor.z+dz;
  const door=Math.abs(x)<ENTRY.half-.09&&z>=ENTRY.inner-.25;
  const onStructure=actor.floor===ROOF_INDEX || (buildingDistance(x,z)<-.032&&(actor.interior||(door&&z<NAVE.front+.12)));
  if(!free(x,z,actor.y,onStructure&&!door))return actor;
  if(!onStructure&&!door&&buildingDistance(x,z)<RADIUS)return actor;
  const lo=actor.y-.31,hi=actor.y+.275;
  let height=-Infinity;
  const candidate=y=>{if(between(y,lo,hi))height=Math.max(height,y);};
  if(onStructure){
    for(const r of floors)if(between(x,r.x0,r.x1)&&between(z,r.z0,r.z1))candidate(r.y);
    if(z<NAVE.back&&Math.hypot(x/APSE.rx,(z-NAVE.back)/APSE.rz)<.99)candidate(FLOORS[0]);
    for(const r of flights){
      if(!between(x,r.x0,r.x1)||!between(z,r.z0,r.z1))continue;
      const t=(z-r.z0)/(r.z1-r.z0);
      candidate(lerp(r.low,r.high,Math.max(1,Math.ceil((r.up>0?t:1-t)*r.count))/r.count));
    }
  }else{
    const [a,,b]=world(x,0,z);
    if(coast(a,b)>1.55)candidate(ground(a,b)-BASE);
    if(door&&z<ENTRY.edge+ENTRY.length+.021)candidate(entryTop(z));
  }
  if(!Number.isFinite(height))return actor;
  const roof=height>=ROOF_HEIGHT-.057;
  const index=roof?ROOF_INDEX:FLOORS.findIndex(y=>Math.abs(y-height)<.098);
  const interior=roof?inRoofHut(x,z):onStructure;
  return {x,z,y:height,interior,floor:index<0?actor.floor:index};
}
export function locationName(actor){
  if(actor.floor===ROOF_INDEX && actor.y>=ROOF_HEIGHT-.057)
    return actor.interior?'屋上 · 管理小屋':roomName(ROOF_INDEX,actor.x,actor.z)??names[ROOF_INDEX];
  if(!actor.interior)return roomName(0,actor.x,actor.z,true)??'島の外周';
  const level=levelOf(actor);
  if(level===CRYPT_LEVEL)return actor.y>CRYPT.y+.21?'1階 ↔ 地下1階 · 階段':cryptName(actor.z);
  if(level<CRYPT_LEVEL){
    const i=-level-2;
    // The cathedral's sanctuary is raised half a metre above its nave.
    if(actor.y<=DEPTHS[i].y+(i===DEPTHS.length-1?.8:.21))return DEPTHS[i].name;
    return i===DEPTHS.length-1?'地下6階 ↔ 地下大聖堂 · 大階段':`地下${i+1}階 ↔ 地下${i+2}階 · 階段`;
  }
  if(Math.abs(actor.y-FLOORS[actor.floor])>.21){
    const level=Math.max(0,FLOORS.findLastIndex(y=>y<=actor.y));
    return level===ROOF_INDEX-1?'6階 ↔ 屋上 · 階段':`${level+1}階 ↔ ${level+2}階 · 階段`;
  }
  return roomName(actor.floor,actor.x,actor.z)??names[actor.floor];
}
