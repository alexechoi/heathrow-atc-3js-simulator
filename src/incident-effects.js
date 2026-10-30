import * as T from "three";
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+17.;a*=.5;}return v;}`;
function particles(kind, count) {
  const base = new T.PlaneGeometry(1, 1),
    g = new T.InstancedBufferGeometry();
  g.index = base.index;
  g.attributes.position = base.attributes.position;
  g.attributes.uv = base.attributes.uv;
  const seeds = [];
  for (let i = 0; i < count; i++)
    seeds.push(
      (i * 0.61803398875) % 1,
      (i * 0.381966011) % 1,
      (i * 0.754877666) % 1,
      (i * 0.569840291) % 1,
    );
  g.setAttribute(
    "seed",
    new T.InstancedBufferAttribute(new Float32Array(seeds), 4),
  );
  g.instanceCount = count;
  const material = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.NormalBlending,
    uniforms: { time: { value: 0 } },
    defines: { SMOKE: kind },
    vertexShader: `attribute vec4 seed;uniform float time;varying vec2 vUv;varying float vAge;varying float vSeed;varying float vFade;
 void main(){vUv=uv;vSeed=seed.z;float life=SMOKE==1?14.+seed.z*9.:1.3+seed.z*2.1;
 float stagger=seed.w*life;float age=mod(time+stagger,life);vAge=age/life;
 vFade=smoothstep(0.,.12,vAge)*(1.-smoothstep(.64,1.,vAge))*smoothstep(stagger,stagger+.35,time+stagger);
 vec3 center=vec3((seed.x-.5)*20.,0.,(seed.y-.5)*11.);
 if(SMOKE==1){center+=vec3(age*1.7,age*(3.2+seed.z*1.4)+5.,age*.65);}
 else {center+=vec3(sin(age*3.+seed.x*8.)*1.2,age*(4.+seed.z*4.)+2.,cos(age*2.+seed.y*9.)*.8);}
 float size=SMOKE==1?9.+age*2.1:3.5+seed.x*6.;
 vec2 quad=position.xy;float angle=SMOKE==1?seed.z*6.28+age*.08:(seed.z-.5)*.35;
 quad=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*quad;
 if(SMOKE==0)quad.y*=1.7;
 vec4 mv=modelViewMatrix*vec4(center,1.);mv.xy+=quad*size;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float time;varying vec2 vUv;varying float vAge;varying float vSeed;varying float vFade;${noise}
 void main(){vec2 q=vUv*2.-1.;vec2 p=q*2.8+vSeed*35.;p.y-=time*(SMOKE==1?.18:1.7);
 float n=fbm(p+vec2(fbm(p+time*.12),fbm(p+7.))*1.7);
 float radius=length(q);float edge=1.-smoothstep(.32+n*.28,.78+n*.26,radius);
 float alpha;vec3 color;
 if(SMOKE==1){alpha=edge*(.2+.55*n)*vFade*.44;color=mix(vec3(.045,.05,.055),vec3(.26,.27,.28),n*.8+vAge*.35);}
 else{float shape=edge*smoothstep(.18,.64,n+(1.-vUv.y)*.15);alpha=shape*vFade*(1.-vAge)*.85;
 float heat=clamp(n*1.4-vUv.y*.3-vAge*.3,0.,1.);color=mix(vec3(1.4,.055,.003),vec3(2.8,.85,.06),smoothstep(.25,.9,heat));}
 if(alpha<.008)discard;gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,
  });
  const mesh = new T.Mesh(g, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = kind === 1 ? 4 : 3;
  mesh.name = kind === 1 ? "turbulent-smoke" : "turbulent-flames";
  return mesh;
}
export function createIncidentEffect() {
  const group = new T.Group();
  group.name = "incident-effects";
  group.visible = false;
  const fire = particles(0, 48),
    smoke = particles(1, 110);
  group.add(fire, smoke);
  const sparkPositions = new Float32Array(120 * 3),
    sparkGeometry = new T.BufferGeometry();
  sparkGeometry.setAttribute(
    "position",
    new T.BufferAttribute(sparkPositions, 3),
  );
  const sparks = new T.Points(
    sparkGeometry,
    new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      vertexShader:
        "void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(170./max(1.,-p.z),1.,3.);gl_Position=projectionMatrix*p;}",
      fragmentShader:
        "void main(){float a=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(3.,.8,.08,a);}",
    }),
  );
  sparks.frustumCulled = false;
  group.add(sparks);
  const glow = new T.PointLight(0xff7929, 900, 65, 2);
  glow.position.y = 6;
  group.add(glow);
  let started = 0;
  return {
    group,
    start(incident, time) {
      started = time;
      group.position.set(incident.x, Math.max(1, incident.y - 3), incident.z);
      group.visible = true;
    },
    clear() {
      group.visible = false;
    },
    update(time) {
      if (!group.visible) return;
      const t = Math.max(0.01, time - started);
      fire.material.uniforms.time.value = t;
      smoke.material.uniforms.time.value = t;
      for (let i = 0; i < 120; i++) {
        const age = (t + i * 0.117) % 3.7,
          phase = i * 2.39996;
        sparkPositions[i * 3] = Math.cos(phase) * age * 5 + age * 2;
        sparkPositions[i * 3 + 1] = Math.max(
          0,
          age * (13 + (i % 7)) - age * age * 3,
        );
        sparkPositions[i * 3 + 2] = Math.sin(phase) * age * 4;
      }
      sparkGeometry.attributes.position.needsUpdate = true;
      glow.intensity = 800 + Math.sin(t * 18) * 160 + Math.sin(t * 31) * 80;
    },
  };
}
