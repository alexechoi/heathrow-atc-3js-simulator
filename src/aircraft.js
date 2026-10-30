import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const cache=new Map();
const materials={white:new T.MeshStandardMaterial({color:0xe4e6df,metalness:.28,roughness:.35}),navy:new T.MeshStandardMaterial({color:0x172c48,metalness:.3,roughness:.4}),red:new T.MeshStandardMaterial({color:0xb82536,roughness:.4}),metal:new T.MeshStandardMaterial({color:0xabb4b7,metalness:.75,roughness:.35}),black:new T.MeshStandardMaterial({color:0x101a20,roughness:.7}),glass:new T.MeshStandardMaterial({color:0x173944,metalness:.7,roughness:.16})};
function build(airline='BA',heavy=false){
 const buckets={};
 function add(geo,mat,pos=[0,0,0],rot=[0,0,0],scale=[1,1,1]){const m=new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(...scale));geo.applyMatrix4(m);(buckets[mat]??=[]).push(geo);}
 // Local +X is the nose. Dimensions are based on a 787-class widebody.
 const profile=[[-31,0.2],[-28,1],[-24,2.35],[-18,2.85],[14,2.85],[23,2.55],[28,1.8],[31,.5],[31.4,0]];
 const body=new T.LatheGeometry(profile.map(([x,r])=>new T.Vector2(heavy?r*1.25:r,x)),32);add(body,'white',[0,0,0],[0,0,-Math.PI/2]);
 const belly=new T.LatheGeometry([[-27,.3],[-22,1.9],[-16,2.65],[16,2.65],[24,1.9],[29,.4]].map(([x,r])=>new T.Vector2(r,x)),24,0,Math.PI);add(belly,'navy',[0,-.25,0],[Math.PI/2,0,-Math.PI/2]);
 function foil(points,thickness,mat){const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const g=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false});g.rotateX(Math.PI/2);add(g,mat);}
 for(const side of [-1,1]){
  foil([[7,side*2],[-8,side*29],[-13,side*30],[-5,side*5],[-14,side*2]],.55,'white');
  foil([[-4,side*9],[-10,side*25],[-11.5,side*25],[-6.2,side*9]],.62,'metal');
  foil([[-22,side*1],[-28,side*11.8],[-31,side*12.4],[-29,side*2]],.35,'white');
  // Engine nacelles, intake lips, dark ducts and fan blades.
  const engine=new T.CylinderGeometry(1.65,1.4,5.7,24,1,true);add(engine,'white',[3,-2.1,side*9],[0,0,Math.PI/2]);
  add(new T.TorusGeometry(1.5,.18,8,28),'metal',[5.85,-2.1,side*9],[0,Math.PI/2,0]);
  add(new T.CylinderGeometry(1.43,1.43,.15,24),'black',[5.6,-2.1,side*9],[0,0,Math.PI/2]);
  add(new T.ConeGeometry(.48,1,16),'metal',[5.8,-2.1,side*9],[0,0,-Math.PI/2]);
  for(let k=0;k<12;k++){const a=k*Math.PI/6;add(new T.BoxGeometry(.08,.12,1.02),'metal',[5.72,-2.1+Math.sin(a)*.8,side*9+Math.cos(a)*.8],[a,0,0]);}
  add(new T.BoxGeometry(5,1.8,.8),'metal',[0,-.4,side*9]);
  if(heavy){const outer=new T.CylinderGeometry(1.45,1.25,5.3,24,1,true);add(outer,'white',[-2,-1.6,side*18],[0,0,Math.PI/2]);add(new T.TorusGeometry(1.3,.16,8,24),'metal',[.65,-1.6,side*18],[0,Math.PI/2,0]);add(new T.CylinderGeometry(1.25,1.25,.1,24),'black',[.4,-1.6,side*18],[0,0,Math.PI/2]);for(let x=-20;x<22;x+=1.2)add(new T.SphereGeometry(.19,6,5),'glass',[x,2.2,side*2.9],[0,0,0],[.8,1.1,.16]);}
  // Passenger windows and doors are geometry, so they remain crisp in close views.
  for(let x=-20;x<24;x+=1.18){add(new T.SphereGeometry(.21,6,5),'glass',[x,.9,side*2.73],[0,0,0],[.8,1.3,.16]);}
  for(const x of [-19,-5,11,23]){add(new T.BoxGeometry(1.1,2.15,.045),'metal',[x,.4,side*2.74]);add(new T.BoxGeometry(.94,1.95,.05),'white',[x,.4,side*2.77]);}
  add(new T.BoxGeometry(4,.9,.1),'glass',[26,1.5,side*1.55],[0,side*.32,-.12]);
  // Raked wingtips.
  add(new T.BoxGeometry(3,.8,.25),'navy',[-11,1,side*29.4],[side*.45,0,-.1]);
 }
 const fin=new T.Shape();fin.moveTo(-28,0);fin.lineTo(-28,11.8);fin.lineTo(-24,11.8);fin.lineTo(-16,0);fin.closePath();
 add(new T.ExtrudeGeometry(fin,{depth:.6,bevelEnabled:false}),airline==='VS'?'red':'navy',[0,0,-.3]);
 // Original geometric livery, loosely evoking the airline colours.
 const stripe=new T.Shape();stripe.moveTo(-27,3);stripe.lineTo(-27,9);stripe.lineTo(-24.8,10.7);stripe.lineTo(-20.3,2);stripe.closePath();
 add(new T.ExtrudeGeometry(stripe,{depth:.64,bevelEnabled:false}),'white',[0,0,-.32]);
 const red=new T.Shape();red.moveTo(-27,4);red.lineTo(-27,6);red.lineTo(-22.5,3);red.lineTo(-21,1.4);red.closePath();add(new T.ExtrudeGeometry(red,{depth:.67,bevelEnabled:false}),'red',[0,0,-.335]);
 const group=new T.Group();for(const [mat,geos] of Object.entries(buckets)){const m=new T.Mesh(mergeGeometries(geos.map(g=>g.index?g.toNonIndexed():g)),materials[mat]);m.castShadow=true;m.receiveShadow=true;group.add(m);geos.forEach(g=>g.dispose());}
 const titleCanvas=document.createElement('canvas');titleCanvas.width=512;titleCanvas.height=64;const tc=titleCanvas.getContext('2d');tc.fillStyle=airline==='VS'?'#a5162c':'#1b2d4b';tc.font='bold 35px serif';tc.textAlign='center';tc.fillText({BA:'BRITISH AIRWAYS',VS:'virgin atlantic',EK:'EMIRATES',SQ:'SINGAPORE AIRLINES'}[airline]||'HEATHROW',256,43);const titleTexture=new T.CanvasTexture(titleCanvas);titleTexture.colorSpace=T.SRGBColorSpace;const titleMat=new T.MeshStandardMaterial({map:titleTexture,transparent:true,roughness:.5,depthWrite:false});for(const side of [-1,1]){const title=new T.Mesh(new T.PlaneGeometry(14,1.75),titleMat);title.position.set(13,1.55,side*(heavy?3.45:2.5));if(side<0)title.rotation.y=Math.PI;group.add(title);}
 const gear=new T.Group();for(const [x,z] of [[22,0],[-5,-4],[-5,4]]){const strut=new T.Mesh(new T.CylinderGeometry(.16,.16,2,6),materials.metal);strut.position.set(x,-3.3,z);gear.add(strut);for(const dz of [-.4,.4]){const w=new T.Mesh(new T.CylinderGeometry(.65,.65,.35,12),materials.black);w.rotation.x=Math.PI/2;w.position.set(x,-4.3,z+dz);gear.add(w);}}gear.name='gear';group.add(gear);
 const nav=new T.Group();for(const [z,color] of [[-30,0xff2929],[30,0x73ffb0],[0,0xffffff]]){const m=new T.Mesh(new T.SphereGeometry(.35,6,6),new T.MeshBasicMaterial({color}));m.position.set(z===0?-29:-11,1,z);nav.add(m);}nav.name='nav';group.add(nav);
 if(heavy)group.scale.setScalar(1.12);
 return group;
}
export function aircraft(airline='BA',heavy=false){const key=airline+heavy;if(!cache.has(key))cache.set(key,build(airline,heavy));return cache.get(key).clone(true);}
