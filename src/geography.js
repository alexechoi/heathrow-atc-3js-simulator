import * as T from 'three';
// A local metre-scaled Web Mercator frame, shared with scripts/build-geodata.py.
export const ORIGIN={lon:-.46064,lat:51.47122};
const R=6378137,k=Math.cos(ORIGIN.lat*Math.PI/180),ox=R*ORIGIN.lon*Math.PI/180,oy=R*Math.log(Math.tan(Math.PI/4+ORIGIN.lat*Math.PI/360));
export const IMAGERY_CREDIT='Imagery © Esri, Vantor, Earthstar Geographics · Geometry © OpenStreetMap contributors';
export function imageryURL(width,height,pixels=4096){const bbox=[ox-width/2/k,oy-height/2/k,ox+width/2/k,oy+height/2/k].join(',');const params=new URLSearchParams({bbox,bboxSR:'3857',imageSR:'3857',size:`${pixels},${Math.round(pixels*height/width)}`,format:'jpg',f:'image'});return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params}`;}
export async function loadGeography(){const data=await fetch('/data/heathrow.json').then(r=>{if(!r.ok)throw new Error('Airport geometry unavailable');return r.json();});const loader=new T.TextureLoader();const timed=url=>Promise.race([loader.loadAsync(url),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Imagery timed out')),20000))]);const images=await Promise.allSettled([timed(imageryURL(7600,5200)),timed(imageryURL(32000,32000,2048))]);for(const r of images)if(r.status==='fulfilled'){r.value.colorSpace=T.SRGBColorSpace;r.value.anisotropy=8;}
return {data,near:images[0].status==='fulfilled'?images[0].value:null,far:images[1].status==='fulfilled'?images[1].value:null};}
