import * as T from 'three';
export const materialState={wetness:{value:.22},interior:{value:.35}};
const textures={};
export async function loadMaterials(){const loader=new T.TextureLoader();await Promise.all(['asphalt_02','concrete','aerial_grass_rock'].flatMap(name=>['diff','nor_gl','rough'].map(async kind=>{const t=await loader.loadAsync(`/assets/textures/${name}_${kind}_1k.jpg`);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;if(kind==='diff')t.colorSpace=T.SRGBColorSpace;textures[name+'_'+kind]=t;})));}
function worldShader(material,uniforms,code,patch){material.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader='varying vec3 vSurfaceWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 surfacePos=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nsurfacePos=instanceMatrix*surfacePos;\n#endif\nvSurfaceWorld=(modelMatrix*surfacePos).xyz;');s.fragmentShader='varying vec3 vSurfaceWorld;\n'+code+'\n'+s.fragmentShader;patch(s);};return material;}
export function groundMaterial(map,mask){const m=new T.MeshPhysicalMaterial({map,roughness:.8,metalness:.02,clearcoat:.035,clearcoatRoughness:.5});const uniforms={uMask:{value:mask},uWet:materialState.wetness};for(const [short,name] of [['Grass','aerial_grass_rock'],['Concrete','concrete'],['Asphalt','asphalt_02']])for(const [key,kind] of [['Color','diff'],['Normal','nor_gl'],['Rough','rough']])uniforms['u'+short+key]={value:textures[name+'_'+kind]};return worldShader(m,uniforms,`
uniform sampler2D uMask,uGrassColor,uGrassNormal,uGrassRough,uConcreteColor,uConcreteNormal,uConcreteRough,uAsphaltColor,uAsphaltNormal,uAsphaltRough;
uniform float uWet;
`,s=>{
s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
vec3 surfaceWeights=texture2D(uMask,vMapUv).rgb;
vec2 grassUV=vSurfaceWorld.xz/22.;vec2 concreteUV=vSurfaceWorld.xz/14.;vec2 asphaltUV=vSurfaceWorld.xz/7.;
vec3 grassSample=texture2D(uGrassColor,grassUV).rgb;
vec3 concreteSample=texture2D(uConcreteColor,concreteUV).rgb;
vec3 asphaltSample=texture2D(uAsphaltColor,asphaltUV).rgb;
vec3 surfaceMod=vec3(1.);
surfaceMod=mix(surfaceMod,clamp(grassSample*4.,.55,1.7),surfaceWeights.r*.75);
surfaceMod=mix(surfaceMod,clamp(concreteSample*2.8,.55,1.5),surfaceWeights.g*.75);
surfaceMod=mix(surfaceMod,clamp(asphaltSample*3.5,.5,1.4),surfaceWeights.b*.7);
diffuseColor.rgb*=surfaceMod;
diffuseColor.rgb*=1.-uWet*.14*(surfaceWeights.g+surfaceWeights.b);
`);
s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
float surfaceRough=dot(surfaceWeights,vec3(texture2D(uGrassRough,grassUV).r,texture2D(uConcreteRough,concreteUV).r,texture2D(uAsphaltRough,asphaltUV).r));
roughnessFactor=mix(.96,clamp(surfaceRough,.45,1.),min(1.,dot(surfaceWeights,vec3(1.))));roughnessFactor-=uWet*.42*(surfaceWeights.g+surfaceWeights.b);
`);
s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 surfaceN=(texture2D(uGrassNormal,grassUV).xyz*2.-1.)*surfaceWeights.r+(texture2D(uConcreteNormal,concreteUV).xyz*2.-1.)*surfaceWeights.g+(texture2D(uAsphaltNormal,asphaltUV).xyz*2.-1.)*surfaceWeights.b;
float normalFade=exp(-length(vSurfaceWorld-cameraPosition)*.0025);
normal=normalize(normal+mat3(viewMatrix)*vec3(surfaceN.x,0.,surfaceN.y)*.4*normalFade);
`);
});}
export function facadeMaterial(kind='terminal'){
const terminal=kind==='terminal';const m=new T.MeshPhysicalMaterial({color:terminal?0x527379:0xa18d76,roughness:terminal?.21:.85,metalness:terminal?.5:0,clearcoat:terminal?.85:0,clearcoatRoughness:.14,envMapIntensity:terminal?1.9:.4});
return worldShader(m,{uInterior:materialState.interior},`uniform float uInterior;float facadeHash(vec2 p){return fract(sin(dot(p,vec2(117.13,61.71)))*43758.53);}`,s=>{
s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 surfN=normalize(cross(dFdx(vSurfaceWorld),dFdy(vSurfaceWorld)));
float along=abs(surfN.x)>.5?vSurfaceWorld.z:vSurfaceWorld.x;
vec2 panelUV=vec2(along/${terminal?'3.6':'3.2'},vSurfaceWorld.y/${terminal?'4.0':'3.2'});
vec2 panelCell=floor(panelUV),panel=fract(panelUV);vec2 aa=max(fwidth(panelUV),vec2(.003));
float pane=smoothstep(.07-aa.x,.07+aa.x,panel.x)*(1.-smoothstep(.93-aa.x,.93+aa.x,panel.x))*smoothstep(.12-aa.y,.12+aa.y,panel.y)*(1.-smoothstep(.89-aa.y,.89+aa.y,panel.y));
float paneSeed=facadeHash(panelCell);
vec3 windowTint=mix(vec3(.16,.28,.31),vec3(.48,.57,.54),paneSeed);
vec3 eye=normalize(cameraPosition-vSurfaceWorld);vec2 parallax=panel+vec2(eye.x+eye.z,-eye.y)*.25;
float interiorFloor=smoothstep(.25,.29,fract(parallax.y))*(1.-smoothstep(.3,.65,fract(parallax.y)));
float blinds=step(.65,paneSeed)*(.7+.3*sin(panel.y*70.));
vec3 room=mix(vec3(.09,.13,.15),vec3(.31,.25,.15),interiorFloor);
${terminal?'diffuseColor.rgb=mix(diffuseColor.rgb*.7,windowTint*.7+room*.3,pane);':'diffuseColor.rgb*=.8+.2*sin(vSurfaceWorld.y*14.);diffuseColor.rgb=mix(diffuseColor.rgb,windowTint,pane*.75);'}
`);
s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
float lit=step(${terminal?'.2':'.7'},paneSeed)*pane;
totalEmissiveRadiance+=vec3(1.,.65,.28)*lit*uInterior*(.08+interiorFloor*.22)*(1.-blinds*.4);
`);
});}
export function roofMaterial(){const m=new T.MeshStandardMaterial({color:0x9daeb3,roughness:.32,metalness:.7});return worldShader(m,{},'',s=>{s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float coord=vSurfaceWorld.z*.45;float aa=max(fwidth(coord),.01);float seam=1.-smoothstep(.025,.025+aa,min(fract(coord),1.-fract(coord)));
diffuseColor.rgb*=1.-seam*.24;
float grime=.94+.06*sin(vSurfaceWorld.x*.14)*sin(vSurfaceWorld.z*.07);diffuseColor.rgb*=grime;
`);});}
export function wallMaterial(){const tex=textures.concrete_diff.clone();tex.repeat.set(4,2);tex.needsUpdate=true;return new T.MeshStandardMaterial({map:tex,color:0xbabcb5,roughness:.9});}
