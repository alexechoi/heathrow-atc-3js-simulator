import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { aircraft } from './aircraft.js';
export const RUNWAYS={ '27R':{z:-710,length:3902,threshold:1901},'27L':{z:710,length:3660,threshold:1710}};
export function random(seed=17){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function buildAirport(scene){
 const rand=random();const group=new T.Group();scene.add(group);const batches=new Map();
 const mats={concrete:new T.MeshStandardMaterial({color:0xa3a5a0,roughness:.88}),roof:new T.MeshStandardMaterial({color:0xb7c1c3,metalness:.55,roughness:.38}),glass:new T.MeshStandardMaterial({color:0x355a60,metalness:.58,roughness:.24}),steel:new T.MeshStandardMaterial({color:0xb9c4c2,metalness:.55,roughness:.4}),dark:new T.MeshStandardMaterial({color:0x3a4549,roughness:.8}),white:new T.MeshStandardMaterial({color:0xd3d7d0,roughness:.7}),warm:new T.MeshStandardMaterial({color:0xf2d7a1,emissive:0xe6ac60,emissiveIntensity:.8}),red:new T.MeshStandardMaterial({color:0xb44537,roughness:.8})};
 function put(g,mat,x,y,z,ry=0){g.rotateY(ry);g.translate(x,y,z);if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(g);}
 function box(x,y,z,w,h,d,mat='concrete',r=0){put(new T.BoxGeometry(w,h,d),mat,x,y,z,r);}
 function cyl(x,y,z,r,h,mat='steel',n=12){put(new T.CylinderGeometry(r,r,h,n),mat,x,y,z);}
 // A locally generated surface keeps the entire airport self-contained.
 const c=document.createElement('canvas');c.width=8192;c.height=6144;const ctx=c.getContext('2d');const W=6400,H=4800,s=c.width/W;
 ctx.fillStyle='#576043';ctx.fillRect(0,0,c.width,c.height);
 for(let i=0;i<140000;i++){const a=rand();ctx.fillStyle=a>.5?'rgba(153,140,89,.025)':'rgba(28,42,22,.03)';ctx.fillRect(rand()*c.width,rand()*c.height,2+rand()*16,2+rand()*10);}
 ctx.translate(c.width/2,c.height/2);ctx.scale(s,s);
 function rect(x,z,w,d,color){ctx.fillStyle=color;ctx.fillRect(x-w/2,z-d/2,w,d);}
 function line(points,width,color,dash=[]){ctx.beginPath();points.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
 // Residential street texture continues up to the airport boundary, avoiding an empty island.
 for(let x=-3200;x<3200;x+=210)for(let z=-2400;z<2400;z+=230){if(Math.abs(x)<2350&&Math.abs(z)<1400)continue;rect(x+105,z+115,210,230,'#656750');rect(x+5,z+115,10,230,'#3c4445');rect(x+105,z+5,210,10,'#3c4445');for(let n=0;n<6;n++){rect(x+25+n*30,z+42,17,35,'#888577');rect(x+25+n*30,z+190,17,35,'#7e7d6b');rect(x+25+n*30,z+95,20,55,'#515b3b');rect(x+25+n*30,z+143,20,35,'#56613d');}}
 // Landside roads, perimeter road and terminal aprons.
 line([[-2380,-1020],[2110,-1020],[2300,-830],[2300,980],[2020,1140],[-2200,1140],[-2410,700],[-2380,-1020]],17,'#52585a');
 line([[-2450,-1050],[-2450,1250]],38,'#4c5354');line([[-2450,-1050],[-2450,1250]],1,'#c7c3ad',[8,10]);
 rect(-1200,0,1350,1120,'#767a77');rect(570,-80,1710,1120,'#7c807c');rect(620,1120,1340,430,'#737a75');
 for(const z of [-500,-385,395,510]){line([[-2050,z],[1990,z]],27,'#646d6c');line([[-2050,z],[1990,z]],1.4,'#ceb975');}
 for(const x of [-2090,-1840,-1360,-820,-240,340,880,1350,1840,2060]){line([[x,-710],[x+80,-510],[x+80,510],[x,710]],26,'#626b68');line([[x,-710],[x+80,-510],[x+80,510],[x,710]],1.2,'#d4bb6a');}
 for(const [id,r] of Object.entries(RUNWAYS)){
  const center=id==='27R'?-50:-120;const lo=center-r.length/2,hi=center+r.length/2;
  rect(center,r.z,r.length+100,70,'#777c71');rect(center,r.z,r.length,50,'#343b3e');
  line([[lo,r.z-23],[hi,r.z-23]],.8,'#cbd0c5');line([[lo,r.z+23],[hi,r.z+23]],.8,'#cbd0c5');line([[lo+180,r.z],[hi-180,r.z]],1.8,'#d9ddd0',[30,30]);
  for(const side of [-1,1]){const end=side<0?lo:hi;for(let j=-4;j<=4;j++){if(j===0)continue;rect(end-side*38,r.z+j*4.8,32,2.8,'#dbe0d3');}for(const off of [300,450,600])for(const dz of [-16,16])rect(end-side*off,r.z+dz,off===300?40:22,off===300?6:3,'#cdd3c7');
   ctx.save();ctx.translate(end-side*110,r.z);ctx.rotate(side>0?-Math.PI/2:Math.PI/2);ctx.fillStyle='#e2e5d7';ctx.textAlign='center';ctx.font='bold 20px sans-serif';ctx.fillText(side>0?id:'09'+(id==='27R'?'L':'R'),0,7);ctx.restore();
   for(let i=0;i<90;i++){line([[end-side*(150+rand()*500),r.z+(rand()-.5)*13],[end-side*(720+rand()*260),r.z+(rand()-.5)*13]],.4+rand()*1.1,'rgba(18,25,28,.24)');}
  }
 }
 // Apron wear: repaired concrete panels, oil stains and tyre scuffs.
 for(let i=0;i<4500;i++){const x=-1800+rand()*3300,z=-350+rand()*700;rect(x,z,8+rand()*30,8+rand()*24,rand()>.5?'rgba(25,34,31,.035)':'rgba(205,206,187,.035)');}
 // Concrete slab joints, parking stand boxes, yellow lead-in lines.
 ctx.strokeStyle='#4d59582c';ctx.lineWidth=.5;
 for(let x=-1800;x<1450;x+=30)line([[x,-360],[x,360]],.35,'#4b555628');
 for(let z=-360;z<360;z+=30)line([[-1800,z],[1450,z]],.35,'#4b555628');
 const stands=[];
 function terminal(x,z,w,d,name,arched=true){
  box(x,14,z,w,28,d,'glass');box(x,2,z,w+8,4,d+8,'concrete');
  // Curved barrel roof sampled across the terminal width.
  if(arched){const verts=[],uvs=[],inds=[];const n=24;for(let j=0;j<=1;j++)for(let i=0;i<=n;i++){const u=i/n;verts.push(x-w/2+u*w,29+Math.sin(u*Math.PI)*13,z+(j-.5)*(d+10));uvs.push(u,j);}for(let i=0;i<n;i++){let a=i,b=i+1,cc=i+n+1,dd=cc+1;inds.push(a,cc,b,b,cc,dd);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(inds);geo.computeVertexNormals();put(geo,'roof',0,0,0);}
  else box(x,30,z,w+5,3,d+6,'roof');
  for(let zz=z-d/2;zz<=z+d/2;zz+=14){box(x-w/2-.3,16,zz,.8,28,.8,'steel');box(x+w/2+.3,16,zz,.8,28,.8,'steel');}
  for(let xx=-w/2;xx<=w/2;xx+=10)box(x+xx,29+Math.cos(xx/w*Math.PI)*13+.15,z,.35,.4,d+10,'steel');
  for(const y of [10,20,28]){box(x,y,z-d/2,w,.7,.7,'steel');box(x,y,z+d/2,w,.7,.7,'steel');box(x-w/2,y,z,.7,.7,d,'steel');box(x+w/2,y,z,.7,.7,d,'steel');}
  for(let zz=z-d/2+35;zz<z+d/2-20;zz+=77)for(const side of [-1,1]){
   const sx=x+side*(w/2+53);stands.push({x:sx,z:zz,side});
   line([[sx+side*45,zz],[sx-side*30,zz]],1.1,'#e0bd61');line([[sx+side*35,zz-32],[sx-side*40,zz-32],[sx-side*40,zz+32],[sx+side*35,zz+32]],.7,'#d1ccc0');
   box(x+side*(w/2+13),7,zz-18,28,5,5,'white');box(x+side*(w/2+30),7,zz-11,18,5,5,'white',side*-.55);cyl(x+side*(w/2+35),3,zz-7,1,6);
   // Ramp equipment.
   box(sx,2,zz+24,9,4,3,'white');box(sx-10,1,zz+23,4,2,2,'warm');
  }
  const cv=document.createElement('canvas');cv.width=512;cv.height=128;const ct=cv.getContext('2d');ct.fillStyle='#dfe7da';ct.font='600 72px sans-serif';ct.textAlign='center';ct.fillText(name,256,87);const tx=new T.CanvasTexture(cv);const sign=new T.Mesh(new T.PlaneGeometry(60,15),new T.MeshBasicMaterial({map:tx,transparent:true,side:T.DoubleSide}));sign.position.set(x,34,z+d/2+1);group.add(sign);
 }
 terminal(-1640,0,170,400,'TERMINAL 5');terminal(-1190,0,55,410,'5B');terminal(-800,0,55,420,'5C');
 terminal(580,-30,150,250,'TERMINAL 2');terminal(1060,-30,60,470,'2B');
 terminal(20,120,170,250,'TERMINAL 3',false);terminal(290,-240,70,250,'3',false);
 terminal(660,1120,90,490,'TERMINAL 4',false);
 // Landside carparks and access roads.
 for(let k=0;k<4;k++){box(-1920+k*60,9,0,48,18,340,'concrete');for(let j=0;j<6;j++)box(-1920+k*60,3+j*3,0,51,.5,344,'white');}
 for(let k=0;k<5;k++){box(1650+k*65,11,-120,50,22,160,'roof');}
 // Heathrow's 87 m control tower with its offset faceted cab.
 const towerX=330,towerZ=290;
 put(new T.CylinderGeometry(5,8,70,16),'concrete',towerX,35,towerZ);box(towerX,7,towerZ,38,14,28,'glass');
 put(new T.CylinderGeometry(15,10,8,10),'steel',towerX,73,towerZ);put(new T.CylinderGeometry(16,15,9,10),'glass',towerX,81,towerZ);put(new T.CylinderGeometry(17,16,2,10),'roof',towerX,87,towerZ);
 cyl(towerX,95,towerZ,.45,15);for(let i=0;i<10;i++){const a=i*Math.PI/5;box(towerX+Math.sin(a)*15.5,81,towerZ+Math.cos(a)*15.5,.6,9,.6,'steel');}
 // Airport lights as a single point cloud per colour.
 const lights={white:[],blue:[],green:[],red:[]};
 for(const r of Object.values(RUNWAYS)){const hi=r.threshold,lo=hi-r.length;for(let x=lo;x<=hi;x+=60){for(const dz of [-27,27])lights.white.push(x,.8,r.z+dz);lights.white.push(x,.35,r.z);}for(let dx=60;dx<750;dx+=30){for(const dz of [-4,0,4])lights.white.push(hi+dx,1,r.z+dz);}for(let z=-23;z<=23;z+=3){lights.green.push(hi,1,r.z+z);lights.red.push(lo,1,r.z+z);}}
 for(const z of [-500,-385,395,510])for(let x=-2050;x<2000;x+=50){lights.blue.push(x,1,z-16,x,1,z+16);lights.green.push(x,.3,z);}
 const glow=document.createElement('canvas');glow.width=32;glow.height=32;const gc=glow.getContext('2d');const gr=gc.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(.15,'#fff');gr.addColorStop(.35,'#ffffff77');gr.addColorStop(1,'#ffffff00');gc.fillStyle=gr;gc.fillRect(0,0,32,32);const glowTex=new T.CanvasTexture(glow);
 const lightGroups=[];for(const [key,points] of Object.entries(lights)){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));const m=new T.PointsMaterial({color:{white:0xffdcb5,blue:0x6295ff,green:0x73ffc7,red:0xff584b}[key],size:key==='white'?7:5,map:glowTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending});const p=new T.Points(g,m);group.add(p);lightGroups.push(p);}
 // Ramp floodlight masts.
 for(const x of [-1800,-1430,-1000,-520,750,1350])for(const z of [-300,300]){cyl(x,13,z,.6,26);box(x,26,z,12,1.4,3,'dark');for(const dx of [-4,0,4])box(x+dx,25.5,z+1,2,1,1,'warm');}
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
 const noise=new Uint8Array(256*256*4);for(let i=0;i<noise.length;i+=4){const n=100+rand()*80;noise[i]=noise[i+1]=noise[i+2]=n;noise[i+3]=255;}const bump=new T.DataTexture(noise,256,256);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.set(160,120);bump.needsUpdate=true;const ground=new T.Mesh(new T.PlaneGeometry(W,H),new T.MeshStandardMaterial({map:texture,bumpMap:bump,bumpScale:.3,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;group.add(ground);
 // Outer London: fields, reservoirs and a dense, low-rise urban horizon.
 const terrain=new T.Mesh(new T.PlaneGeometry(65000,65000),new T.MeshStandardMaterial({color:0x68745a,roughness:1}));terrain.rotation.x=-Math.PI/2;terrain.position.y=-2;group.add(terrain);
 for(const [x,z,w,d] of [[-3700,2350,1500,1100],[-2400,2900,1100,950]]){const lake=new T.Mesh(new T.CircleGeometry(1,48),new T.MeshStandardMaterial({color:0x3c646f,metalness:.6,roughness:.25}));lake.rotation.x=-Math.PI/2;lake.scale.set(w,d,1);lake.position.set(x,-.7,z);group.add(lake);}
 // Dense residential blocks follow a street grid, with hipped roofs and gardens.
 const townCanvas=document.createElement('canvas');townCanvas.width=4096;townCanvas.height=4096;const tc=townCanvas.getContext('2d');tc.fillStyle='#555e43';tc.fillRect(0,0,4096,4096);const ts=4096/18000;tc.translate(2048,2048);tc.scale(ts,ts);
 for(let x=-8500;x<8500;x+=210)for(let z=-7500;z<7500;z+=230){if(Math.abs(x)<2800&&Math.abs(z)<1900)continue;tc.fillStyle=['#66644f','#5d634d','#686450','#535e45'][Math.floor(rand()*4)];tc.fillRect(x+8,z+8,194,214);tc.fillStyle='#3e4341';tc.fillRect(x,z,10,230);tc.fillRect(x,z,210,10);tc.fillStyle='#7d7865';tc.fillRect(x+11,z+11,4,209);}
 const townTexture=new T.CanvasTexture(townCanvas);townTexture.colorSpace=T.SRGBColorSpace;const town=new T.Mesh(new T.PlaneGeometry(18000,18000),new T.MeshStandardMaterial({map:townTexture,roughness:1}));town.rotation.x=-Math.PI/2;town.position.y=-1.8;group.add(town);
 const houseGeo=new T.BoxGeometry(1,1,1),houseMat=new T.MeshStandardMaterial({roughness:1});const houses=new T.InstancedMesh(houseGeo,houseMat,11000);const roofs=new T.InstancedMesh(new T.ConeGeometry(.72,1,4).rotateY(Math.PI/4),new T.MeshStandardMaterial({roughness:1}),11000);const dummy=new T.Object3D();let count=0;
 for(let i=0;i<16000&&count<11000;i++){let bx=Math.floor((rand()-.5)*65)*210,bz=Math.floor((rand()-.5)*55)*230;let x=bx+25+Math.floor(rand()*5)*32,z=bz+(rand()>.5?35:195);if(Math.abs(x)<2650&&Math.abs(z)<1500)continue;if(x<-2000&&x>-5200&&z>1400&&z<4000)continue;const h=6+rand()*4,w=11+rand()*5,d=14+rand()*5;dummy.position.set(x,h/2-1,z);dummy.scale.set(w,h,d);dummy.rotation.y=0;dummy.updateMatrix();houses.setMatrixAt(count,dummy.matrix);houses.setColorAt(count,new T.Color().setHSL(.065+rand()*.03,.15+rand()*.1,.22+rand()*.2));dummy.position.y=h+1;dummy.scale.set(w+2,5,d+2);dummy.updateMatrix();roofs.setMatrixAt(count,dummy.matrix);roofs.setColorAt(count,new T.Color().setHSL(.035+rand()*.04,.12+rand()*.22,.13+rand()*.13));count++;}houses.count=count;roofs.count=count;group.add(houses,roofs);
 const trunks=new T.InstancedMesh(new T.CylinderGeometry(.6,.9,1,5),new T.MeshStandardMaterial({color:0x4f4838}),5000);const trees=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0x34462b,roughness:1}),5000);for(let i=0;i<5000;i++){let x=(rand()-.5)*13000,z=(rand()-.5)*9000;if(Math.abs(x)<2350&&Math.abs(z)<1300){z=(z<0?-1:1)*(1300+rand()*250);}const h=6+rand()*7;if(x>1900&&x<3200&&(Math.abs(z-710)<80||Math.abs(z+710)<80))z+=220;dummy.position.set(x,h,z);dummy.scale.set(4+rand()*5,h*.7,4+rand()*5);dummy.updateMatrix();trees.setMatrixAt(i,dummy.matrix);dummy.position.y=h*.5;dummy.scale.set(1,h,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);}group.add(trees,trunks);
 for(const [mat,geos] of batches){const mesh=new T.Mesh(mergeGeometries(geos.map(g=>g.index?g.toNonIndexed():g)),mats[mat]);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);geos.forEach(g=>g.dispose());}
 // Parked aircraft placed nose-in to each concourse.
 const parked=new T.Group();stands.forEach((s,i)=>{if(i%5===0)return;const plane=aircraft(i%9===0?'VS':'BA',i%7===0);plane.rotation.y=s.side===1?Math.PI:0;plane.position.set(s.x,5,s.z);parked.add(plane);});
 parked.updateMatrixWorld(true);const parkedBatches=new Map();parked.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const arr=parkedBatches.get(o.material)||[];arr.push(g.index?g.toNonIndexed():g);parkedBatches.set(o.material,arr);});for(const [mat,geos] of parkedBatches){const m=new T.Mesh(mergeGeometries(geos),mat);m.castShadow=true;m.receiveShadow=true;group.add(m);geos.forEach(g=>g.dispose());}
 const vehicles=[];for(let i=0;i<10;i++){const g=new T.Group();const body=new T.Mesh(new T.BoxGeometry(8,3,3),mats.white);body.position.y=2;g.add(body);const wind=new T.Mesh(new T.BoxGeometry(2,1.8,3.05),mats.glass);wind.position.set(2,3,0);g.add(wind);group.add(g);vehicles.push(g);}
 return {group,lights:lightGroups,tower:new T.Vector3(towerX,85,towerZ),update(t){vehicles.forEach((v,i)=>{v.position.set(((t*(i%2?-5:6)+i*310+2000)%4000)-2000,0,i%2?-350:350);});}};
}
