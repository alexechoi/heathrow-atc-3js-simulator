import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
// Inspired by the layered lighting approach in mrdoob/slop-newyork; original WebGL2 pipeline.
export function createPostProcessing(renderer, scene, camera) {
  const target = new T.WebGLRenderTarget(innerWidth, innerHeight, {
    type: T.HalfFloatType,
    samples: new URLSearchParams(location.search).has("capture") ? 2 : 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new T.Vector2(innerWidth, innerHeight),
    0.25,
    0.45,
    1.3,
  );
  composer.addPass(bloom);
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      balance: { value: new T.Vector3(1.06, 1, 0.93) },
      contrast: { value: 1.1 },
      saturation: { value: 1.09 },
    },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `uniform sampler2D tDiffuse;uniform vec3 balance;uniform float contrast,saturation;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*balance;float l=dot(c,vec3(.2126,.7152,.0722));c*=pow(max(l,.0001)/.18,contrast-1.);c=mix(vec3(l),c,saturation);vec3 tint=mix(vec3(.95,1.01,1.055),vec3(1.03,1.,.97),smoothstep(.02,.9,l));gl_FragColor=vec4(max(c*tint,0.),1.);}`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  if (new URLSearchParams(location.search).has("capture"))
    composer.addPass(new SMAAPass());
  return {
    composer,
    render() {
      composer.render();
    },
    resize(w, h) {
      composer.setSize(w, h);
    },
    preset(day) {
      grade.uniforms.balance.value.set(
        ...(day === "night"
          ? [0.94, 0.99, 1.08]
          : day === "day"
            ? [1.01, 1, 0.99]
            : [1.06, 1, 0.93]),
      );
      bloom.strength = day === "night" ? 0.42 : 0.24;
    },
  };
}
