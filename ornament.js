import { random, TAU } from './terrain.js';
import { SURFACE } from './surfaces.js';
import { openFolio, studyObjects } from './furnishings.js';

export const CRAFT = Object.freeze({
  leaf:32,ivory:33,carved:34,jasper:35,mosaic:36,veined:37,pewter:38,wax:39,enamel:40,
  relief:41,coffer:42,plaster:43,cosmatesque:44,flags:45,slate:46,parquet:47,serpentine:48,brick:49,
  damask:50,brocade:51,velvet:52,vellum:53,redLeather:54,greenLeather:55,wicker:56,canvas:57,linen:58,
  copper:59,bellBronze:60,hammered:61,lichenSlate:62,fieldstone:63,blackOak:64,deck:65,hemp:66,lichen:67,art:68
});

const LIGHT=11, STONE=1, WALNUT=30;
const TINT=CRAFT;
const bounds=(x,z,w,d)=>({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});

function bands(m,x,z,profile,material,tint,segments=24){
  segments=Math.max(12,Math.round(segments*.67));
  for(let j=0;j<profile.length-1;j++){
    const [h,a]=profile[j], [h1,b]=profile[j+1];
    for(let i=0;i<segments;i++){
      const angle1=i*TAU/segments,angle2=(i+1)*TAU/segments;
      const point=(angle,y,r)=>[x+Math.cos(angle)*r,y,z+Math.sin(angle)*r];
      m.quad(point(angle2,h,a),point(angle1,h,a),point(angle1,h1,b),point(angle2,h1,b),material,tint,
        undefined,[[i/segments,j/(profile.length-1)],[(i+1)/segments,j/(profile.length-1)],
          [(i+1)/segments,(j+1)/(profile.length-1)],[i/segments,(j+1)/(profile.length-1)]]);
    }
  }
}
function contour(m,points,radius,material,detail=7,shade=1){
  for(let i=1;i<points.length;i++)m.rod(points[i-1],points[i],radius,radius,material,detail,shade);
}
function rosette(m,x,y,z,r,material=TINT.leaf,detail=24){
  const outline=Array.from({length:detail+1},(_,i)=>{
    const a=i*TAU/detail,ring=r*(.80+.18*Math.cos(6*a));
    return [x+ring*Math.cos(a),y+ring*Math.sin(a),z];
  });
  contour(m,outline,r*.092,material,5,1.08);
  m.rod([x,y,z-.016],[x,y,z+.036],r*.29,r*.23,TINT.enamel,9,1);
}
function frame(m,x,y,z,width,height,material=TINT.leaf,r=.063){
  const u=width*.5,v=height*.5;
  contour(m,[[x-u,y-v,z],[x+u,y-v,z],[x+u,y+v,z],[x-u,y+v,z],[x-u,y-v,z]],r,material,8,1);
}
function woodPanel(m,x,y,z,w,h,mat,shade=1){
  return m.quad([x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z],mat,shade,[0,0,1]);
}
function pointedLine(x,y,z,width,straight,arch){
  const points=[[x-width/2,y,z],[x-width/2,y+straight,z]];
  for(let i=1;i<=18;i++){
    const t=i/18;
    points.push([x+(t-.5)*width,y+straight+arch*(1-Math.pow(Math.abs(2*t-1),.64)),z]);
  }
  points.push([x+width/2,y,z]);
  return points;
}
function painting(m,x,y,z,width,straight,arch,u0,u1){
  const points=pointedLine(x,y,z,width,straight,arch);
  const uv=(p)=>[u0+(u1-u0)*(p[0]-x+width/2)/width,(p[1]-y)/(straight+arch)];
  for(let j=1;j<points.length-2;j++){
    const a=points[j],b=points[j+1];
    m.quad([a[0],y,z],[b[0],y,z],b,a,TINT.art,1,[0,0,1],
      [uv([a[0],y]),uv([b[0],y]),uv(b),uv(a)]);
  }
  for(const [grow,raise,depth,r,motif] of [[.004,0,.023,.035,TINT.leaf],[.19,.12,.07,.051,TINT.ivory],[.30,.16,.13,.042,TINT.leaf]]){
    contour(m,pointedLine(x,y-.052,z+depth,width+grow,straight+.056,arch+raise),r,motif,8,1.06);
  }
}
function finial(m,x,y,z,h,w){
  m.box(x,y+h*.10,z,w*2.5,h*.20,w*2.4,TINT.carved,.91);
  m.rod([x,y+h*.18,z],[x,y+h*.76,z],w,w*.13,TINT.leaf,7,.99);
  for(let i=0;i<4;i++){
    const a=i*TAU/4;
    const px=x+Math.cos(a)*w*.71,pz=z+Math.sin(a)*w*.71;
    m.rod([px,y+h*.25,pz],[px,y+h*.48,pz],w*.33,.02,TINT.leaf,6,1.07);
  }
  m.rod([x,y+h*.74,z],[x,y+h,z],w*.26,.017,TINT.leaf,6,1.05);
}
function altarStatue(m,x,y,z,scale){
  const s=scale;
  const marble=TINT.veined;
  const robe=[[0,.35],[.12,.40],[.32,.38],[.7,.28],[1.08,.30],[1.32,.24],[1.49,.17],[1.53,.13]];
  bands(m,x,z,robe.map(([h,r])=>[y+h*s,r*s]),marble,.92,22);
  for(let a=0;a<10;a++){
    const angle=a*TAU/10;
    const robeFold=robe.slice(1,7).map(([h,r],i)=>[
      x+Math.cos(angle+.059*i)*(r+.019)*s,
      y+h*s,
      z+Math.sin(angle+.059*i)*(r+.019)*s
    ]);
    contour(m,robeFold,.023*s,marble,6,1.05);
  }
  bands(m,x,z+.01*s,[[1.42,.12],[1.52,.126],[1.61,.143],[1.71,.132],[1.77,.102],[1.81,.021]]
    .map(([h,r])=>[y+h*s,r*s]),marble,1.08,20);
  m.rod([x,y+1.61*s,z+.134*s],[x,y+1.55*s,z+.162*s],.028*s,.034*s,marble,6,1.02);
  m.rod([x-.19*s,y+1.36*s,z+.015],[x-.25*s,y+1.02*s,z+.24*s],.087*s,.066*s,marble,9,.96);
  m.rod([x+.17*s,y+1.34*s,z+.008],[x+.18*s,y+1.09*s,z+.27*s],.085*s,.065*s,marble,9,.97);
  for(const sign of [-1,1]){
    const curls=[[.022,1.79,.037],[.091,1.765,.073],[.132,1.70,.084],[.139,1.63,.054],[.152,1.53,.012]];
    contour(m,curls.map(([u,h,p])=>[x+sign*u*s,y+h*s,z+p*s]),.027*s,TINT.ivory,6,.87);
  }
  m.beveledBox(x-.039*s,y+1.05*s,z+.275*s,.323*s,.262*s,.088*s,.022,TINT.leaf,.98);
  m.box(x,y-.045,z,s*.90,.15,s*.79,TINT.veined,.94);
}

function lectern(m,x,z,y,scale=1){
  m.beveledBox(x,y+.12,z,.91*scale,.22*scale,.76*scale,.059,TINT.carved,.96);
  m.rod([x,y+.19,z],[x,y+1.02*scale,z],.19*scale,.12*scale,TINT.carved,10,.98);
  const upper=y+1.05*scale;
  m.beveledBox(x,upper,z,.88*scale,.17*scale,.65*scale,.037,TINT.carved,.95);
  openFolio(m,x,upper+.086,z,.507*scale,.336*scale);
}
function candle(m,x,y,z,size=1){
  const s=size;
  m.rod([x,y,z],[x,y+.08*s,z],.083*s,.053*s,TINT.pewter,8,.97);
  m.rod([x,y+.057*s,z],[x,y+.282*s,z],.027*s,.026*s,TINT.wax,8,1.08,0,true);
  m.rod([x,y+.282*s,z],[x+.012*s,y+.364*s,z],.022*s,.002,LIGHT,7,1.10);
}
function chandelier(m,x,y,z,d){
  const s=d*.5;
  for(const [r,offset,t,mat] of [[s,.01,.065,TINT.hammered],[s,.138,.044,TINT.leaf],[s*.74,-.12,.039,TINT.bellBronze]]){
    const ring=Array.from({length:33},(_,i)=>{
      const a=i*TAU/32;
      return [x+r*Math.cos(a),y+offset,z+r*Math.sin(a)];
    });
    contour(m,ring,t,mat,6,1);
  }
  for(let i=0;i<10;i++){
    const a=i*TAU/10,u=x+s*Math.cos(a),v=z+s*Math.sin(a);
    candle(m,u,y+.13,v);
    m.rod([u,y+.14,v],[x+.27*Math.cos(a),y+1.05,z+.27*Math.sin(a)],.024,.029,TINT.leaf,6,1.05);
    m.rod([u,y-.08,v],[x+(s-.29)*Math.cos(a),y-.46,z+(s-.29)*Math.sin(a)],.045,.012,TINT.bellBronze,6,.86);
  }
  m.rod([x,y+1.02,z],[x,y+20.3,z],.024,.024,TINT.hammered,7,.76);
  bands(m,x,z,[[y-.65,.041],[y-.48,.19],[y-.20,.34],[y+.12,.22],[y+.56,.08]],TINT.leaf,.92,12);
}

function theRetable(m,y,block){
  const z=-26.52;
  block(m,bounds(0,z,9.88,1.4),y,y+.415,TINT.veined,.96);
  m.beveledBox(0,y+.385,z,9.96,.17,1.53,.052,TINT.veined,1.02);
  m.beveledBox(0,y+.77,z,9.33,.53,1.14,.042,TINT.serpentine,.88);
  m.beveledBox(0,y+1.12,z,9.49,.21,1.22,.039,TINT.veined,.95);
  m.box(0,y+3.61,z-.37,8.86,5.62,.61,TINT.carved,.76);
  m.box(0,y+6.31,z-.20,9.02,.204,1.08,TINT.leaf,.94);
  painting(m,0,y+1.33,z+.072,3.44,3.47,1.73,.25,.75);
  for(const side of [-1,1]){
    const x=side*2.97;
    painting(m,x,y+1.33,z+.054,2.14,3.20,1.09,side<0?.02:.75,side<0?.25:.98);
    for(const k of [side*1.91,side*4.12]){
      bands(m,k,z+.29,[[y+1.05,.23],[y+1.29,.153],[y+5.88,.125],[y+6.17,.22]],TINT.leaf,.98,10);
      finial(m,k,y+6.05,z+.29,1.19,.181);
      rosette(m,k,y+2.46,z+.471,.144,TINT.leaf,19);
    }
    for(const xx of [1.25,2.39,3.60]){
      frame(m,side*xx,y+.73,z+.581,.78,.27,TINT.leaf,.035);
      rosette(m,side*xx,y+.73,z+.62,.115,TINT.leaf,16);
    }
    altarStatue(m,side*4.64,y+1.04,z+.24,.98);
    m.rod([side*.19,y+7.28,z+.16],[side*4.38,y+6.31,z+.16],.066,.077,TINT.leaf,8,.98);
  }
  finial(m,0,y+7.06,z+.20,1.74,.278);
  rosette(m,0,y+6.76,z+.21,.285,TINT.leaf);
}

export function decorateNave(m,y,block){
  theRetable(m,y,block);
  m.quad([-5.88,y+.008,-19.69],[5.88,y+.008,-19.69],[5.88,y+.008,-27.12],[-5.88,y+.008,-27.12],
    TINT.cosmatesque,1,[0,1,0],[[0,0],[3,0],[3,2.1],[0,2.1]]);
  m.quad([-2.16,y+.012,-22.24],[2.16,y+.012,-22.24],[2.16,y+.012,-25.05],[-2.16,y+.012,-25.05],
    TINT.mosaic,1,[0,1,0],[[0,0],[1,0],[1,.75],[0,.75]]);
  for(const side of [-1,1]){
    const x=side*5.54;
    altarStatue(m,x,y+.46,-21.77,1.31);
    block(m,bounds(x,-21.77,1.23,1.04),y,y+.51,TINT.serpentine,.92);
    lectern(m,side*3.53,-16.57,y,1.11);
    for(const z of [-19.87,-14.13,10.18]){
      const px=side*6.26;
      m.rod([px,y+.29,z],[px,y+2.68,z],.095,.056,TINT.bellBronze,9,.95);
      m.beveledBox(px,y+.18,z,.51,.29,.52,.047,TINT.jasper,.89);
      for(let i=-1;i<=1;i++)candle(m,px+.213*i,y+2.51+(.19-Math.abs(i)*.11),z,1.04);
    }
    const x2=side*5.47;
    for(let i=0;i<4;i++){
      const z=-19.56+i*1.24;
      m.beveledBox(x2,y+.57,z,1.11,.17,.84,.048,TINT.velvet,.99);
      m.beveledBox(x2+side*.472,y+1.14,z,.146,1.01,.89,.046,TINT.carved,.96);
      m.beveledBox(x2+side*.51,y+1.72,z,.20,.21,.96,.039,TINT.leaf,.97);
      block(m,bounds(x2,z,1.16,.89),y,y+.51,WALNUT,.86);
    }
  }
  for(const [z,py,r] of [[12.05,7.3,3.75],[4.09,7.36,3.46],[-10.70,8.25,4.26],[-18.16,6.3,2.87]])
    chandelier(m,0,y+py,z,r);
  for(const side of [-1,1]){
    const x=side*3.73;
    for(const z of [-17.1,-8.62]){
      m.rod([x-1.23,y+10.99,z],[x+1.23,y+10.99,z],.053,.053,TINT.bellBronze,8,.93);
      for(let i=0;i<23;i++){
        const a=i/23,b=(i+1)/23;
        const p=(u,h)=>[x+(u-.5)*2.19,h,z+.064*Math.sin(u*29)+.028*Math.sin(u*53)];
        const bottom=u=>y+7.89+.29*Math.pow(Math.abs(u-.5)*2,1.65);
        m.quad(p(a,bottom(a)),p(b,bottom(b)),p(b,y+10.91),p(a,y+10.91),z<-10?TINT.damask:TINT.brocade,1,
          [0,0,1],[[a,0],[b,0],[b,1],[a,1]]);
      }
    }
  }
}

export function bridgeMoulding(m,y,start,end,halfWidth){
  for(const z of [start-.023,end+.023]){
    const face=z<start?-.012:.012;
    m.rod([-halfWidth,y-.244,z],[halfWidth,y-.244,z],.072,.072,TINT.ivory,6,.93);
    for(const x of [-halfWidth*.665,0,halfWidth*.665]){
      const points=pointedLine(x,y-1.39,z,halfWidth*.664,.14,.89).slice(1,-1);
      for(let i=1;i<points.length;i++){
        const [u,h]=points[i-1],[v,j]=points[i];
        m.quad([u,h,z-face],[v,j,z-face],[v,y-.257,z-face],[u,y-.257,z-face],TINT.fieldstone,.94);
      }
      contour(m,points,.091,TINT.relief,6,.90);
      contour(m,points.map(([a,b,c])=>[x+(a-x)*.96,b-.099,c+face]),.034,TINT.ivory,5,1.01);
      if(z>end)rosette(m,x,y-.314,z+.044,.091,TINT.ivory,12);
    }
  }
}

export function decorateGallery(m,y,level,side,block){
  if(level===1){
    for(const z of [-17.1,-10.66,1.08,12.35]){
      if(side>0&&z>3.9)continue;
      const x=side*8.43;
      altarStatue(m,x,y+.43,z,.70);
      block(m,bounds(x,z,.68,.66),y,y+.42,TINT.jasper,.84);
    }
  } else if(level===2){
    const x=side*17.02,z=-6.4;
    for(let i=-2;i<=2;i++){
      m.beveledBox(x+i*.183,y+1.332,z+.435,.122,.093,.035,.016,TINT.enamel,1.16);
      m.rod([x+i*.183,y+1.455,z],[x+i*.183,y+1.615,z],.039,.004,TINT.leaf,6,1);
    }
  } else {
    for(const x of [side*9.3,side*15.40]){
      const z=-7.8;
      m.beveledBox(x,y+.45,z,.52,.92,.63,.033,TINT.veined,.85);
      m.beveledBox(x,y+.98,z,.76,.16,.82,.026,TINT.relief,.91);
      lectern(m,x,z,y+.45,.51);
    }
  }
}

export function chapterLibrary(m,y,block){
  const rng=random(956773);
  for(const [x,w] of [[9.03,2.73],[12,2.7],[14.98,2.7],[17.93,2.63]]){
    const z=-8.08;
    block(m,bounds(x,z,w,.71),y,y+3.52,TINT.carved,.96);
    m.beveledBox(x,y+3.52,z+.02,w+.18,.22,.90,.045,TINT.carved,1.07);
    m.beveledBox(x,y+.18,z+.04,w+.14,.31,.90,.037,TINT.carved,.95);
    for(let r=0;r<5;r++){
      const h=y+.48+r*.575;
      const face=z+.387;
      woodPanel(m,x,h+.225,face,w-.22,.466,TINT.blackOak,.56);
      m.beveledBox(x,h,face+.03,w-.18,.097,.34,.014,TINT.carved,1.03);
      let u=x-w*.5+.132;
      while(u<x+w*.5-.25){
        const w=.058+.105*rng(),h2=.246+.189*rng();
        const patina=rng();
        const mat=patina<.29?SURFACE.binding:patina<.58?TINT.redLeather:TINT.greenLeather;
        const z2=face+.062+.035*rng();
        m.box(u+w*.5,h+.056+h2*.5,z2,w,h2,.198,mat,.72+.46*rng());
        m.box(u+w*.5,h+.057+h2,z2-.015,w*.76,.009,.152,TINT.vellum,1.02);
        for(const at of [.30,.77]){
          m.box(u+w*.5,h+.054+h2*at,z2+.10,w*.91,.016,.013,TINT.leaf,.91);
        }
        u+=w+.025+.042*rng();
      }
    }
    for(const dx of [-w*.5,w*.5]){
      m.rod([x+dx,y+.29,z+.41],[x+dx,y+3.46,z+.41],.063,.051,TINT.leaf,8,.91);
      finial(m,x+dx,y+3.50,z+.38,.46,.14);
    }
  }
  for(const [x,z] of [[14.02,-3.05],[16.9,.08]]){
    block(m,bounds(x,z,1.7,.95),y,y+1.06,TINT.carved,.81);
    m.beveledBox(x,y+1.056,z,1.88,.141,1.04,.039,TINT.carved,.97);
    studyObjects(m,x,y+1.127,z);
    candle(m,x+.76,y+1.136,z-.31,1.18);
    block(m,bounds(x,z+1,.62,.54),y,y+.56,TINT.blackOak,.88);
    m.beveledBox(x,y+.56,z+1,.67,.12,.60,.031,TINT.velvet,1);
  }
  for(const z of [-4.88,-.38]){
    m.quad([8.01,y+5.85,z-1.03],[18.98,y+5.85,z-1.03],[18.98,y+5.85,z+1.03],[8.01,y+5.85,z+1.03],
      TINT.coffer,.91,[0,-1,0],[[0,0],[4,0],[4,1],[0,1]]);
  }
  woodPanel(m,15.29,y+4.37,-8.24,7.65,.97,TINT.plaster,.87);
  frame(m,15.29,y+4.37,-8.15,7.65,.99,TINT.carved,.061);
  for(const x of [12.54,13.91,15.28,16.65,18.02]){
    woodPanel(m,x,y+4.37,-8.219,1.27,.78,TINT.relief,.92);
    rosette(m,x,y+4.37,-8.157,.266,TINT.leaf,16);
  }
  m.beveledBox(9.47,y+.26,-4.08,.68,.47,.65,.031,TINT.wicker,.97);
  m.beveledBox(11.13,y+.19,-5.48,.66,.37,.61,.033,TINT.linen,.85);
}

function bell(m,x,z,y,size){
  const s=size, lower=y+2.20;
  const surface=[[0,.94],[.095,.97],[.19,.91],[.29,.79],[.51,.65],[.77,.56],[1.05,.52],[1.26,.48],[1.40,.41],
    [1.52,.30],[1.57,.21],[1.65,.16]];
  bands(m,x,z,surface.map(([h,r])=>[lower+h*s,r*s]),TINT.bellBronze,1.04,36);
  const hollow=surface.slice(0,7).reverse().map(([h,r])=>[lower+h*s,(r-.05)*s]);
  bands(m,x,z,hollow,TINT.bellBronze,.69,29);
  for(const [h,r] of [[.17,.937],[.35,.752],[1.16,.505]]){
    bands(m,x,z,[[lower+h*s,r*s],[lower+(h+.042)*s,r*s],[lower+(h+.065)*s,(r-.016)*s]],TINT.leaf,.92,29);
  }
  m.rod([x,lower-.033*s,z],[x,lower+.72*s,z],.078*s,.048*s,TINT.hammered,9,.91);
  m.rod([x,lower-.105*s,z],[x,lower+.091*s,z],.125*s,.090*s,TINT.hammered,10,1.06);
  m.rod([x,lower+1.61*s,z],[x,lower+1.86*s,z],.165*s,.129*s,TINT.hammered,11,.96);
  const rope=[];
  for(let i=0;i<=22;i++){
    const t=i/22;
    rope.push([x+.57*s+.13*Math.sin(t*5.7),y+1.16+(3.08+size*.27)*t,z+.29*Math.sin(t*3.34)]);
  }
  contour(m,rope,.046,TINT.hemp,7,.94);
}

export function bellChamber(m,y,block){
  for(const z of [-7.22,-4.78,-2.31,.51]){
    m.beveledBox(15.45,y+4.77,z,7.19,.31,.40,.041,TINT.blackOak,.95);
    for(const x of [12.05,18.90]){
      block(m,bounds(x,z,.28,.36),y,y+4.74,TINT.blackOak,.88);
      m.rod([x,y+3.83,z],[x+(x<16?.91:-.91),y+4.79,z],.123,.139,TINT.blackOak,4,1);
      m.box(x,y+4.36,z+.205,.27,.32,.055,TINT.hammered,.83);
    }
  }
  for(const [x,z,s] of [[14.43,-4.89,1.20],[17.2,-2.69,1.02],[14.69,.35,.74]]){
    bell(m,x,z,y,s);
    m.beveledBox(x,y+2.20+s*1.87,z,2.52,.21,.22,.026,TINT.blackOak,.96);
  }
  for(const [x,z] of [[14.63,-7.06],[18.21,.58]]) {
    m.beveledBox(x,y+.42,z,.66,.84,.69,.033,TINT.fieldstone,.94);
    candle(m,x,y+.856,z,1.10);
  }
  m.quad([13.11,y+.008,-6.10],[17.54,y+.008,-6.10],[17.54,y+.008,-.32],[13.11,y+.008,-.32],
    TINT.flags,.87,[0,1,0],[[0,0],[2,0],[2,2],[0,2]]);
}
