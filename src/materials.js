import * as T from "three";
export const materialState = {
  wetness: { value: 0.22 },
  interior: { value: 0.35 },
};
const textures = {};
let shaderSerial = 0;
export async function loadMaterials() {
  const loader = new T.TextureLoader();
  await Promise.all(
    [
      "asphalt_02",
      "concrete",
      "concrete_floor_02",
      "aerial_grass_rock",
    ].flatMap((name) =>
      ["diff", "nor_gl", "rough"].map(async (kind) => {
        const t = await loader.loadAsync(
          `/assets/textures/${name}_${kind}_1k.jpg`,
        );
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.anisotropy = 8;
        if (kind === "diff") t.colorSpace = T.SRGBColorSpace;
        textures[name + "_" + kind] = t;
      }),
    ),
  );
}
function worldShader(material, uniforms, code, patch) {
  // The callbacks close over different shader strings. Three's default callback
  // string cache key cannot distinguish them, so every variant needs its own key.
  const shaderKey = `heathrow-surface-${shaderSerial++}`;
  material.customProgramCacheKey = () => shaderKey;
  material.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = "varying vec3 vSurfaceWorld;\n" + s.vertexShader;
    s.vertexShader = s.vertexShader.replace(
      "#include <worldpos_vertex>",
      "#include <worldpos_vertex>\nvec4 surfacePos=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nsurfacePos=instanceMatrix*surfacePos;\n#endif\nvSurfaceWorld=(modelMatrix*surfacePos).xyz;",
    );
    s.fragmentShader =
      "varying vec3 vSurfaceWorld;\n" + code + "\n" + s.fragmentShader;
    patch(s);
  };
  return material;
}
export function groundMaterial(map, mask) {
  const m = new T.MeshPhysicalMaterial({
    map,
    polygonOffset: true,
    polygonOffsetFactor: 6,
    polygonOffsetUnits: 6,
    roughness: 0.8,
    metalness: 0.02,
    clearcoat: 0.035,
    clearcoatRoughness: 0.5,
  });
  const uniforms = { uMask: { value: mask }, uWet: materialState.wetness };
  for (const [short, name] of [
    ["Grass", "aerial_grass_rock"],
    ["Concrete", "concrete_floor_02"],
    ["Asphalt", "asphalt_02"],
  ])
    for (const [key, kind] of [
      ["Color", "diff"],
      ["Normal", "nor_gl"],
      ["Rough", "rough"],
    ])
      uniforms["u" + short + key] = { value: textures[name + "_" + kind] };
  return worldShader(
    m,
    uniforms,
    `
uniform sampler2D uMask,uGrassColor,uGrassNormal,uGrassRough,uConcreteColor,uConcreteNormal,uConcreteRough,uAsphaltColor,uAsphaltNormal,uAsphaltRough;
uniform float uWet;
float terrainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float terrainNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(terrainHash(i),terrainHash(i+vec2(1,0)),f.x),mix(terrainHash(i+vec2(0,1)),terrainHash(i+vec2(1,1)),f.x),f.y);}
`,
    (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
vec3 surfaceWeights=texture2D(uMask,vMapUv).rgb;
vec2 grassUV=vSurfaceWorld.xz/6.;vec2 concreteUV=vSurfaceWorld.xz/14.;vec2 asphaltUV=vSurfaceWorld.xz/7.;
vec3 grassSample=mix(texture2D(uGrassColor,grassUV).rgb,texture2D(uGrassColor,mat2(.8,-.6,.6,.8)*grassUV*.43+vec2(11.7,8.1)).rgb,.5);
vec3 concreteSample=texture2D(uConcreteColor,concreteUV).rgb;
vec3 asphaltSample=texture2D(uAsphaltColor,asphaltUV).rgb;
vec3 surfaceMod=vec3(1.);
// Blend photograph-scale grass detail with irregular dry patches. No repeated
// broad texture stripes or rocky relief on a closely mown airfield.
float meadow=terrainNoise(vSurfaceWorld.xz*.014)*.6+terrainNoise(vSurfaceWorld.xz*.047)*.4;
vec3 grassTint=mix(vec3(.88,.91,.72),vec3(1.04,1.03,.87),meadow);
surfaceMod=mix(surfaceMod,clamp(grassSample*3.,.78,1.13)*grassTint,surfaceWeights.r*.58);
surfaceMod=mix(surfaceMod,clamp(concreteSample*2.8,.55,1.5),surfaceWeights.g*.75);
surfaceMod=mix(surfaceMod,clamp(asphaltSample*3.5,.5,1.4),surfaceWeights.b*.7);
diffuseColor.rgb*=surfaceMod;
diffuseColor.rgb*=1.-uWet*.14*(surfaceWeights.g+surfaceWeights.b);
`,
      );
      s.fragmentShader = s.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float surfaceRough=dot(surfaceWeights,vec3(texture2D(uGrassRough,grassUV).r,texture2D(uConcreteRough,concreteUV).r,texture2D(uAsphaltRough,asphaltUV).r));
roughnessFactor=mix(.96,clamp(surfaceRough,.45,1.),min(1.,dot(surfaceWeights,vec3(1.))));roughnessFactor-=uWet*.42*(surfaceWeights.g+surfaceWeights.b);
`,
      );
      s.fragmentShader = s.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
vec3 surfaceN=(texture2D(uGrassNormal,grassUV).xyz*2.-1.)*surfaceWeights.r+(texture2D(uConcreteNormal,concreteUV).xyz*2.-1.)*surfaceWeights.g+(texture2D(uAsphaltNormal,asphaltUV).xyz*2.-1.)*surfaceWeights.b;
float normalFade=exp(-length(vSurfaceWorld-cameraPosition)*.0025);
normal=normalize(normal+mat3(viewMatrix)*vec3(surfaceN.x,0.,surfaceN.y)*.17*normalFade);
`,
      );
    },
  );
}
export function facadeMaterial(kind = "terminal") {
  const terminal = kind === "terminal";
  if (terminal) return terminalGlazing();
  const m = new T.MeshPhysicalMaterial({
    color: terminal ? 0x527379 : 0xa18d76,
    roughness: terminal ? 0.21 : 0.85,
    metalness: terminal ? 0.5 : 0,
    clearcoat: terminal ? 0.85 : 0,
    clearcoatRoughness: 0.14,
    envMapIntensity: terminal ? 1.9 : 0.4,
  });
  return worldShader(
    m,
    { uInterior: materialState.interior },
    `uniform float uInterior;float facadeHash(vec2 p){return fract(sin(dot(p,vec2(117.13,61.71)))*43758.53);}`,
    (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec3 surfN=normalize(cross(dFdx(vSurfaceWorld),dFdy(vSurfaceWorld)));
float along=abs(surfN.x)>.5?vSurfaceWorld.z:vSurfaceWorld.x;
vec2 panelUV=vec2(along/${terminal ? "3.6" : "3.2"},vSurfaceWorld.y/${terminal ? "4.0" : "3.2"});
vec2 panelCell=floor(panelUV),panel=fract(panelUV);vec2 aa=max(fwidth(panelUV),vec2(.003));
float pane=smoothstep(.07-aa.x,.07+aa.x,panel.x)*(1.-smoothstep(.93-aa.x,.93+aa.x,panel.x))*smoothstep(.12-aa.y,.12+aa.y,panel.y)*(1.-smoothstep(.89-aa.y,.89+aa.y,panel.y));
float paneSeed=facadeHash(panelCell);
vec3 windowTint=mix(vec3(.16,.28,.31),vec3(.48,.57,.54),paneSeed);
vec3 eye=normalize(cameraPosition-vSurfaceWorld);vec2 parallax=panel+vec2(eye.x+eye.z,-eye.y)*.25;
float interiorFloor=smoothstep(.25,.29,fract(parallax.y))*(1.-smoothstep(.3,.65,fract(parallax.y)));
float blinds=step(.65,paneSeed)*(.7+.3*sin(panel.y*70.));
vec3 room=mix(vec3(.09,.13,.15),vec3(.31,.25,.15),interiorFloor);
${terminal ? "diffuseColor.rgb=mix(diffuseColor.rgb*.7,windowTint*.7+room*.3,pane);" : "diffuseColor.rgb*=.8+.2*sin(vSurfaceWorld.y*14.);diffuseColor.rgb=mix(diffuseColor.rgb,windowTint,pane*.75);"}
`,
      );
      s.fragmentShader = s.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float lit=step(${terminal ? ".2" : ".7"},paneSeed)*pane;
totalEmissiveRadiance+=vec3(1.,.65,.28)*lit*uInterior*(.08+interiorFloor*.22)*(1.-blinds*.4);
`,
      );
    },
  );
}
export function roofMaterial() {
  const m = new T.MeshStandardMaterial({
    color: 0xbdbfba,
    roughness: 0.64,
    metalness: 0.28,
    side: T.DoubleSide,
  });
  return worldShader(m, {}, "", (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
float coord=vSurfaceWorld.z*1.1;float aa=max(fwidth(coord),.01);float seam=1.-smoothstep(.012,.012+aa,min(fract(coord),1.-fract(coord)));
diffuseColor.rgb*=1.-seam*.07;
float grime=.94+.06*sin(vSurfaceWorld.x*.14)*sin(vSurfaceWorld.z*.07);diffuseColor.rgb*=grime;
`,
    );
  });
}
function terminalGlazing() {
  return worldShader(
    new T.MeshPhysicalMaterial({
      color: 0x26464b,
      roughness: 0.22,
      metalness: 0.38,
      clearcoat: 0.6,
      envMapIntensity: 1.3,
      side: T.DoubleSide,
    }),
    { uInterior: materialState.interior },
    "uniform float uInterior;",
    (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec3 sn=normalize(cross(dFdx(vSurfaceWorld),dFdy(vSurfaceWorld)));
float along=abs(sn.x)>.5?vSurfaceWorld.z:vSurfaceWorld.x;
vec2 grid=vec2(along/2.8,vSurfaceWorld.y/2.1);
vec2 edge=min(fract(grid),1.-fract(grid));
vec2 aa=max(fwidth(grid),vec2(.0002));
float frame=1.-smoothstep(.015,.015+aa.x,edge.x)*smoothstep(.017,.017+aa.y,edge.y);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.18,.23,.23),frame*.3);
float frit=sin(vSurfaceWorld.y*34.);float fade=1.-smoothstep(.3,1.6,fwidth(vSurfaceWorld.y*34.));
diffuseColor.rgb*=1.+frit*.06*fade;
`,
      );
      s.fragmentShader = s.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
float floorBand=1.-smoothstep(.1,.5,abs(fract(vSurfaceWorld.y/7.)-.83));
totalEmissiveRadiance+=vec3(.7,.67,.47)*uInterior*.12*floorBand;
`,
      );
    },
  );
}
export function claddingMaterial() {
  return worldShader(
    new T.MeshStandardMaterial({
      color: 0x979b96,
      roughness: 0.78,
      metalness: 0.12,
    }),
    { uInterior: materialState.interior },
    "uniform float uInterior;",
    (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float band=step(.28,fract(vSurfaceWorld.y/6.))*step(fract(vSurfaceWorld.y/6.),.7)*step(4.,vSurfaceWorld.y);
vec3 sn=normalize(cross(dFdx(vSurfaceWorld),dFdy(vSurfaceWorld)));band*=1.-abs(sn.y);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.07,.13,.145),band);
float seam=1.-smoothstep(.015,.08,min(fract(vSurfaceWorld.y/.8),1.-fract(vSurfaceWorld.y/.8)));
diffuseColor.rgb*=1.-seam*.09;
`,
      );
    },
  );
}
export function runwayMaterial(color = 0x343938, concrete = false) {
  return worldShader(
    new T.MeshStandardMaterial({ color, roughness: 0.94, side: T.DoubleSide }),
    {
      uAsphalt: {
        value:
          textures[concrete ? "concrete_floor_02_diff" : "asphalt_02_diff"],
      },
    },
    "uniform sampler2D uAsphalt;",
    (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec3 asphalt=texture2D(uAsphalt,vSurfaceWorld.xz/5.).rgb;
diffuseColor.rgb*=mix(vec3(1.),clamp(asphalt*4.,.7,1.25),${concrete ? ".3" : ".6"});
float repair=.95+.05*sin(vSurfaceWorld.x*.031)*sin(vSurfaceWorld.z*.43);
diffuseColor.rgb*=repair;
${concrete ? `vec2 slab=vSurfaceWorld.xz/5.;vec2 e=min(fract(slab),1.-fract(slab));vec2 aa=max(fwidth(slab),vec2(.0001));float joint=1.-smoothstep(.003,.003+aa.x,e.x)*smoothstep(.003,.003+aa.y,e.y);diffuseColor.rgb*=1.-joint*.1;float variation=fract(sin(dot(floor(slab),vec2(12.9898,78.233)))*43758.5453);diffuseColor.rgb*=.96+.07*variation;` : ""}
`,
      );
    },
  );
}
export function turfMaterial() {
  return worldShader(
    new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
    {
      uTurf: { value: textures.aerial_grass_rock_diff },
      uGreen: { value: new T.Color(0x637348) },
      uDry: { value: new T.Color(0x8b815a) },
    },
    `uniform sampler2D uTurf;uniform vec3 uGreen,uDry;
float th(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float tn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(th(i),th(i+vec2(1,0)),f.x),mix(th(i+vec2(0,1)),th(i+vec2(1,1)),f.x),f.y);}
`,
    (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec2 p=vSurfaceWorld.xz;
float variation=tn(p*.012)*.55+tn(p*.057)*.3+tn(p*.24)*.15;
vec3 tex=mix(texture2D(uTurf,p/4.8).rgb,texture2D(uTurf,mat2(.8,-.6,.6,.8)*p/13.1).rgb,.5);
diffuseColor.rgb=mix(uGreen,uDry,smoothstep(.27,.8,variation));
diffuseColor.rgb*=clamp(tex*3.4,.72,1.17);
`,
      );
    },
  );
}
export function wallMaterial() {
  const tex = textures.concrete_diff.clone();
  tex.repeat.set(4, 2);
  tex.needsUpdate = true;
  return new T.MeshStandardMaterial({
    map: tex,
    color: 0xbabcb5,
    roughness: 0.9,
  });
}
