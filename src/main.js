import { createIncidentEffect } from "./incident-effects.js";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { buildGeographicAirport } from "./geographic-airport.js";
import { loadGeography, IMAGERY_CREDIT } from "./geography.js";
import { loadMaterials, materialState } from "./materials.js";
import { createPostProcessing } from "./postprocessing.js";
import { aircraft, loadAirlineMarkings } from "./aircraft.js";
import { Simulation, RUNWAYS, FINISHED, HOLDING_AREAS } from "./simulation.js";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/space-grotesk";
import "./style.css";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const AIRLINES = {
  BA: "British Airways",
  VS: "Virgin Atlantic",
  EK: "Emirates",
  SQ: "Singapore Airlines",
};
let trafficFilter = "arrival";
const canvas = $("#world");
let renderer;
try {
  renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
} catch (e) {
  $("#intro").innerHTML =
    "<h2>WebGL is unavailable.</h2><p>Please open this experience in a browser with hardware acceleration enabled.</p>";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.72;
renderer.outputColorSpace = T.SRGBColorSpace;
const scene = new T.Scene();
scene.background = new T.Color(0xb9c6c7);
scene.fog = new T.FogExp2(0xb3bcc1, 0.000095);
const camera = new T.PerspectiveCamera(43, innerWidth / innerHeight, 2, 200000);
camera.position.set(3600, 2200, 3600);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 - 0.025;
controls.minDistance = 70;
controls.maxDistance = 38000;
controls.maxTargetRadius = 9000;
const hemi = new T.HemisphereLight(0xb1d4ef, 0x514430, 1.1);
scene.add(hemi);
const sun = new T.DirectionalLight(0xffc38b, 3.1);
sun.position.set(-5000, 1600, -2600);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, {
  left: -2800,
  right: 2800,
  top: 2300,
  bottom: -2300,
  near: 100,
  far: 12000,
});
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias = 0.25;
sun.shadow.bias = -0.00001;
scene.add(sun);
// CC0 photographic skies from Poly Haven. Both are bundled for offline-capable rendering.
$("#loading-detail").textContent =
  "Reading the weather and lighting the airfield…";
const hdrLoader = new HDRLoader();
const [sunsetHDR, dayHDR] = await Promise.all([
  hdrLoader.loadAsync("/assets/sunset.hdr"),
  hdrLoader.loadAsync("/assets/sky.hdr"),
]);
for (const tex of [sunsetHDR, dayHDR])
  tex.mapping = T.EquirectangularReflectionMapping;
scene.background = sunsetHDR;
scene.backgroundIntensity = 0.7;
scene.backgroundRotation.y = 0.7;
scene.environment = sunsetHDR;
scene.environmentIntensity = 0.55;
scene.environmentRotation.y = 0.7;
const atmosphere = new T.Mesh(
  new T.SphereGeometry(90000, 32, 16),
  new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      skyMap: { value: sunsetHDR },
      horizon: { value: scene.fog.color },
      strength: { value: 0.7 },
    },
    vertexShader: `varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D skyMap;uniform vec3 horizon;uniform float strength;varying vec3 vWorld;void main(){vec3 d=normalize(vWorld-cameraPosition);vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5+.1114,asin(clamp(d.y,-1.,1.))/3.14159265+.5);uv.x=fract(uv.x);vec3 sky=texture2D(skyMap,uv).rgb*strength;float blend=smoothstep(-.02,.2,d.y);gl_FragColor=vec4(mix(horizon,sky,blend),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
  }),
);
scene.add(atmosphere);
$("#loading-detail").textContent =
  "Loading surface materials and satellite imagery…";
await Promise.all([loadMaterials(), loadAirlineMarkings()]);
const geography = await loadGeography();
$("#loading-detail").textContent = "Opening the tower…";
const airport = buildGeographicAirport(scene, geography);
const post = createPostProcessing(renderer, scene, camera);
document.querySelector("#imagery-credit").textContent = IMAGERY_CREDIT;
document.querySelector("#imagery-credit").title = geography.near
  ? "Live Esri satellite imagery, aligned to mapped Heathrow geometry."
  : "Imagery could not load; displaying mapped procedural surfaces.";
const sim = new Simulation();
sim.reset(true);
let playing = false,
  selectedId = sim.planes[0].id,
  view = "overview",
  paused = false,
  speed = 1,
  cinematic = false,
  cinemaTime = 0,
  day = "golden",
  previousDay = "golden",
  sound = false,
  drawing = false,
  drawPoints = [],
  lastTime = performance.now(),
  elapsed = 0,
  uiTimer = 0,
  toastTimer,
  frameCounter = 0,
  fpsTime = 0,
  fpsSamples = 0;
const models = new Map(),
  labels = new Map();
const routeGroup = new T.Group();
scene.add(routeGroup);
// A chart overlay keeps the off-airport stacks legible at radar scale.
const holdChart = new T.Group();
const holdMaterial = new T.LineDashedMaterial({
  color: 0xb6d7c8,
  dashSize: 160,
  gapSize: 100,
  transparent: true,
  opacity: 0.65,
  depthTest: false,
  fog: false,
});
for (const area of HOLDING_AREAS) {
  const points = [];
  for (let i = 0; i <= 32; i++) {
    const a = -Math.PI / 2 + (i / 32) * Math.PI;
    points.push(
      new T.Vector3(
        area.x + 800 + Math.cos(a) * 700,
        100,
        area.z + Math.sin(a) * 700,
      ),
    );
  }
  for (let i = 0; i <= 32; i++) {
    const a = Math.PI / 2 + (i / 32) * Math.PI;
    points.push(
      new T.Vector3(
        area.x - 800 + Math.cos(a) * 700,
        100,
        area.z + Math.sin(a) * 700,
      ),
    );
  }
  points.push(points[0]);
  const line = new T.Line(
    new T.BufferGeometry().setFromPoints(points),
    holdMaterial,
  );
  line.computeLineDistances();
  line.renderOrder = 10;
  holdChart.add(line);
}
holdChart.visible = false;
scene.add(holdChart);
const routeMat = new T.LineBasicMaterial({
  color: 0xc5edb6,
  transparent: true,
  opacity: 0.65,
});
const trailMat = new T.LineBasicMaterial({
  color: 0xe4eadb,
  transparent: true,
  opacity: 0.22,
});
const raycaster = new T.Raycaster(),
  mouse = new T.Vector2();
const floor = new T.Plane(new T.Vector3(0, 1, 0), 0);
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
  if (sound) speak(text);
}
let audioCtx;
function toggleSound() {
  sound = !sound;
  $("#sound").textContent = sound ? "Sound on" : "Sound off";
  if (sound) {
    audioCtx ??= new AudioContext();
    audioCtx.resume();
    const osc = audioCtx.createOscillator(),
      gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(950, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
    speak("Heathrow tower. Good evening. You have control.");
  } else window.speechSynthesis?.cancel();
}
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(
    text
      .replace(/BAW/g, "Speedbird ")
      .replace(/VIR/g, "Virgin ")
      .replace(/27R/g, "two seven right")
      .replace(/27L/g, "two seven left"),
  );
  u.lang = "en-GB";
  u.rate = 1.05;
  u.volume = 0.65;
  window.speechSynthesis.speak(u);
}
function selected() {
  return sim.planes.find((p) => p.id === selectedId && !FINISHED.has(p.state));
}
function select(id) {
  selectedId = id;
  trafficFilter = sim.planes.find((p) => p.id === id)?.kind || "arrival";
  if (!playing) start(false);
  $("#command").classList.remove("hidden");
  updateUI();
}
function start(reset = true) {
  if (reset) {
    sim.reset(false);
    trafficFilter = "arrival";
    selectedId = sim.planes[0].id;
    clearModels();
  }
  playing = true;
  document.body.classList.add("playing");
  sim.demo = false;
  if (reset) setView("overview");
  paused = false;
  $("#pause").innerHTML = '<i class="pause-icon"></i>';
  $("#intro").classList.add("hidden");
  $("#game-stats").classList.remove("hidden");
  $("#command").classList.remove("hidden");
  $("#tip").classList.remove("hidden");
  $("#mode-label").textContent = "YOU HAVE CONTROL";
  toast("Heathrow control: arrivals, ground and tower are on your desk.");
  $("#shift-report").classList.add("hidden");
  clearIncident();
  updateUI();
}
function clearModels() {
  for (const m of models.values()) scene.remove(m);
  models.clear();
  for (const l of labels.values()) l.remove();
  labels.clear();
}
function setView(v) {
  view = v;
  scene.fog.density = v === "radar" ? 0.000008 : 0.000095;
  holdChart.visible = v === "radar";
  controls.enabled = !cinematic;
  drawing = false;
  document.body.classList.remove("drawing");
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === v),
  );
  const p = selected() || sim.planes[0];
  if (v === "overview") {
    camera.position.set(2900, 1500, 2900);
    controls.target.set(-160, 0, -130);
  }
  if (v === "radar") {
    camera.position.set(0, 30000, 1);
    controls.target.set(0, 0, 0);
  }
  if (v === "tower") {
    camera.position.copy(airport.tower).add(new T.Vector3(0, 4, 0));
    controls.target.set(p.x, p.y, p.z);
  }
  if (v === "follow") {
    camera.position.set(p.x + 125, p.y + 70, p.z + 145);
    controls.target.set(p.x, p.y, p.z);
  }
  controls.update();
}
function setDay(next) {
  day =
    typeof next === "string"
      ? next
      : day === "golden"
        ? "day"
        : day === "day"
          ? "night"
          : "golden";
  const configs = {
    golden: [0xffd2a4, 3.1, 0.85, 0.85, 0xbac8cb, 2700],
    day: [0xfff2e5, 3, 0.75, 0.9, 0xc0d3dc, 7000],
    night: [0xa0b8e0, 0.35, 0.7, 0.9, 0x152a3c, -200],
  };
  const [color, int, h, ex, fog, y] = configs[day];
  sun.color.setHex(color);
  sun.intensity = int;
  sun.position.y = y;
  hemi.intensity = h;
  renderer.toneMappingExposure = ex;
  scene.fog.color.setHex(fog);
  scene.background = day === "day" ? dayHDR : sunsetHDR;
  scene.environment = scene.background;
  scene.backgroundIntensity =
    day === "night" ? 0.08 : day === "day" ? 0.8 : 0.7;
  scene.environmentIntensity = day === "night" ? 0.15 : 0.55;
  atmosphere.material.uniforms.skyMap.value = scene.background;
  atmosphere.material.uniforms.strength.value = scene.backgroundIntensity;
  materialState.interior.value = day === "night" ? 1.6 : 0.35;
  materialState.wetness.value = day === "night" ? 0.5 : 0.22;
  airport.lights.forEach((light) => {
    light.material.opacity = day === "night" ? 1 : 0.16;
    light.material.size = day === "night" ? 3 : 1.2;
  });
  post.preset(day);
  $("#daylight span").textContent = {
    golden: "Golden hour",
    day: "Daylight",
    night: "Blue hour",
  }[day];
}
const shots = [
  {
    title: "London is on your frequency.",
    sub: "HEATHROW CONTROL · AN OPEN-SOURCE THREE.JS EXPERIENCE",
    duration: 9,
  },
  {
    title: "Cleared to land. Two seven left.",
    sub: "WIDE-BODY ARRIVALS · WESTERLY OPERATIONS",
    duration: 8,
  },
  {
    title: "A small city. Always moving.",
    sub: "TERMINAL 5 · SATELLITE CONCOURSES · RAMP OPERATIONS",
    duration: 8,
  },
  {
    title: "After dark. Still in control.",
    sub: "87 METRES ABOVE THE AIRFIELD · HEATHROW TOWER",
    duration: 7,
  },
  {
    title: "Two runways. One controller.",
    sub: "PLAY HEATHROW-SIMULATOR.ALEXCHOI.XYZ · BUILT WITH THREE.JS",
    duration: 10,
  },
];
const filmDuration = shots.reduce((a, s) => a + s.duration, 0);
function enterFilm() {
  previousDay = day;
  cinematic = true;
  scene.fog.density = 0.000095;
  holdChart.visible = false;
  redrawRoutes();
  cinemaTime = 0;
  sim.reset(true);
  clearModels();
  selectedId = sim.planes[0].id;
  controls.enabled = false;
  $("#interface").classList.add("hidden");
  $("#labels").classList.add("hidden");
  $("#film").classList.remove("hidden");
  document.body.classList.remove("clean");
  paused = false;
}
function exitFilm() {
  setDay(previousDay);
  cinematic = false;
  controls.enabled = true;
  $("#interface").classList.remove("hidden");
  $("#labels").classList.remove("hidden");
  $("#film").classList.add("hidden");
  sim.reset(!playing);
  clearModels();
  selectedId = sim.planes[0].id;
  setView("overview");
  updateUI();
}
function cinema(t) {
  let tt = t % filmDuration,
    idx = 0;
  while (tt > shots[idx].duration && idx < shots.length - 1) {
    tt -= shots[idx++].duration;
  }
  const u = tt / shots[idx].duration;
  const mood = idx === 3 ? "night" : "golden";
  if (day !== mood) setDay(mood);
  const p = sim.planes[0];
  let pos, target;
  if (idx === 0) {
    const a = 0.55 + u * 0.42;
    pos = new T.Vector3(Math.cos(a) * 3900, 1650 - u * 350, Math.sin(a) * 3900);
    target = new T.Vector3(-100, 0, 0);
  }
  if (idx === 1) {
    pos = new T.Vector3(p.x + 105 + u * 40, p.y + 45, p.z + 125);
    target = new T.Vector3(p.x - 20, p.y, p.z);
  }
  if (idx === 2) {
    pos = new T.Vector3(-1650 + u * 300, 105 + u * 60, 580 - u * 600);
    target = new T.Vector3(-1432, 20, 37);
  }
  if (idx === 3) {
    pos = airport.tower
      .clone()
      .add(new T.Vector3(15 + u * 50, 12 + u * 35, 20));
    target = new T.Vector3(1400 - u * 1800, 30, -710);
  }
  if (idx === 4) {
    const a = 2.15 - u * 0.5;
    pos = new T.Vector3(Math.cos(a) * 3700, 1600 + u * 500, Math.sin(a) * 3700);
    target = new T.Vector3(-100, 0, 0);
  }
  camera.position.copy(pos);
  camera.lookAt(target);
  $("#film-title").textContent = shots[idx].title;
  $("#film-sub").textContent = shots[idx].sub;
  $("#film-index").textContent = `0${idx + 1} / 05`;
  $(".film-progress i").style.width =
    `${((t % filmDuration) / filmDuration) * 100}%`;
}
function updateModels(dt) {
  const active = new Set();
  const radarLabels = [];
  for (const p of sim.planes) {
    if (FINISHED.has(p.state)) continue;
    active.add(p.id);
    let m = models.get(p.id);
    if (!m) {
      m = aircraft(p.airline, p.type);

      scene.add(m);
      models.set(p.id, m);
      const label = document.createElement("button");
      label.className = "plane-label";
      label.addEventListener("click", () => select(p.id));
      $("#labels").append(label);
      labels.set(p.id, label);
    }
    m.position.set(p.x, p.y + (m.userData.groundHeight || 5) - 5, p.z);
    m.rotation.set(0, -p.heading, 0);
    m.rotateX(p.state === "crashed" ? 0.22 : p.bank || 0);
    m.rotateZ(p.pitch || 0);
    const gear = m.getObjectByName("gear");
    if (gear) gear.visible = p.y < 110;
    const nav = m.getObjectByName("nav");
    if (nav) nav.visible = Math.sin(elapsed * 6) > -0.1;
    if (frameCounter % 15 === 0) {
      p.trail.push(new T.Vector3(p.x, p.y, p.z));
      if (p.trail.length > 30) p.trail.shift();
    }
    const projected = new T.Vector3(p.x, p.y + 18, p.z).project(camera);
    const label = labels.get(p.id);
    label.classList.toggle(
      "radar-label",
      view === "radar" && innerWidth >= 800,
    );
    label.style.display =
      projected.z > 1 ||
      Math.abs(projected.x) > 1 ||
      Math.abs(projected.y) > 1 ||
      (view === "radar" &&
        camera.position.y > 12000 &&
        p.kind === "departure" &&
        p.y < 100 &&
        p.id !== selectedId)
        ? "none"
        : "block";
    label.style.left = (projected.x * 0.5 + 0.5) * innerWidth + "px";
    label.style.top = (-projected.y * 0.5 + 0.5) * innerHeight + "px";
    label.classList.toggle("selected", p.id === selectedId);
    label.innerHTML = `${p.id}<small>${Math.round((p.y * 3.281) / 100) * 100} FT · ${p.kind === "departure" ? p.controller : p.holdName || p.runway || "INBOUND"}</small>`;
    if (
      view === "radar" &&
      innerWidth >= 800 &&
      label.style.display !== "none"
    ) {
      radarLabels.push({
        label,
        selected: p.id === selectedId,
        x: (projected.x * 0.5 + 0.5) * innerWidth,
        y: (-projected.y * 0.5 + 0.5) * innerHeight,
      });
    }
  }
  if (radarLabels.length) positionRadarLabels(radarLabels);
  for (const [id, m] of models)
    if (!active.has(id)) {
      scene.remove(m);
      models.delete(id);
      labels.get(id)?.remove();
      labels.delete(id);
    }
}
function positionRadarLabels(items) {
  const width = 118,
    height = 36,
    gap = 6;
  const occupied = $$(
    "header, .traffic, #command, #game-stats, .view-toolbar, .weather, footer",
  )
    .filter(
      (el) =>
        el.getClientRects().length &&
        getComputedStyle(el).visibility !== "hidden",
    )
    .map((el) => el.getBoundingClientRect());
  const overlaps = (a, b) =>
    a.left < b.right + gap &&
    a.right + gap > b.left &&
    a.top < b.bottom + gap &&
    a.bottom + gap > b.top;
  items.sort((a, b) => Number(b.selected) - Number(a.selected));
  for (const item of items) {
    const candidates = [];
    for (const dy of [
      -height - 10,
      10,
      -height - 52,
      52,
      -height - 94,
      94,
      -height - 136,
      136,
      -height - 178,
      178,
      -height - 220,
      220,
    ])
      for (const dx of [
        14,
        -width - 14,
        -width / 2,
        width + 24,
        -width * 2 - 24,
      ]) {
        const left = Math.max(
          12,
          Math.min(innerWidth - width - 12, item.x + dx),
        );
        const top = Math.max(
          12,
          Math.min(innerHeight - height - 12, item.y + dy),
        );
        candidates.push({
          left,
          top,
          right: left + width,
          bottom: top + height,
        });
      }
    const box =
      candidates.find((c) => !occupied.some((r) => overlaps(c, r))) ||
      candidates[0];
    occupied.push(box);
    const { label } = item;
    label.style.left = `${box.left}px`;
    label.style.top = `${box.top}px`;
    const anchorX = Math.max(0, Math.min(width, item.x - box.left));
    const anchorY = Math.max(0, Math.min(height, item.y - box.top));
    const dx = item.x - box.left - anchorX,
      dy = item.y - box.top - anchorY;
    for (const [key, value] of Object.entries({
      "leader-x": `${anchorX}px`,
      "leader-y": `${anchorY}px`,
      "leader-length": `${Math.hypot(dx, dy)}px`,
      "leader-angle": `${Math.atan2(dy, dx)}rad`,
      "track-x": `${item.x - box.left - 3}px`,
      "track-y": `${item.y - box.top - 3}px`,
    }))
      label.style.setProperty(`--${key}`, value);
  }
}
function redrawRoutes() {
  while (routeGroup.children.length) {
    const o = routeGroup.children[0];
    routeGroup.remove(o);
    o.geometry.dispose();
  }
  if (cinematic) return;
  for (const p of sim.planes) {
    if (FINISHED.has(p.state)) continue;
    if (p.trail.length > 1) {
      routeGroup.add(
        new T.Line(new T.BufferGeometry().setFromPoints(p.trail), trailMat),
      );
    }
    if (p.id === selectedId && p.route.length) {
      routeGroup.add(
        new T.Line(
          new T.BufferGeometry().setFromPoints([
            new T.Vector3(p.x, p.y, p.z),
            ...p.route.map((q) => new T.Vector3(q.x, q.y + 3, q.z)),
          ]),
          routeMat,
        ),
      );
    }
  }
  if (drawing && drawPoints.length > 1)
    routeGroup.add(
      new T.Line(
        new T.BufferGeometry().setFromPoints(
          drawPoints.map((p) => new T.Vector3(p.x, 320, p.z)),
        ),
        routeMat,
      ),
    );
}
function updateUI() {
  const active = sim.planes.filter((p) => !FINISHED.has(p.state));
  const arrivals = active.filter((p) => p.kind !== "departure");
  const departures = active.filter((p) => p.kind === "departure");
  $("#traffic-count").textContent = String(active.length).padStart(2, "0");
  $("#arrival-tab").textContent = `Arrivals ${arrivals.length}`;
  $("#departure-tab").textContent = `Departures ${departures.length}`;
  $$("[data-traffic]").forEach((b) =>
    b.classList.toggle("active", b.dataset.traffic === trafficFilter),
  );
  const listed = trafficFilter === "departure" ? departures : arrivals;
  $("#flight-list").innerHTML =
    listed
      .map((p) => {
        const alert = [...sim.conflicts, ...sim.runwayConflicts].some((c) =>
          c.split("/").includes(p.id),
        );
        const status =
          p.state === "holding-short"
            ? "HOLD SHORT"
            : p.state === "approach"
              ? `ILS ${p.runway}`
              : p.groundBlocked
                ? "GIVE WAY"
                : p.state.replaceAll("-", " ").toUpperCase();
        return `<button class="flight-row ${p.id === selectedId ? "selected" : ""}" data-flight="${p.id}"><span class="airline-mark" title="${AIRLINES[p.airline]}"><img src="/assets/airlines/${p.airline}.png" alt="${AIRLINES[p.airline]}" width="32" height="32"></span><span class="flight-info"><b>${p.id}</b><small>${p.kind === "departure" ? "To " : ""}${p.origin} · ${p.kind === "departure" ? `STAND ${p.stand}` : p.holdName || p.type}</small></span><span class="flight-data">${p.y < 15 ? p.runway || "GROUND" : Math.round((p.y * 3.281) / 100) * 100}<small class="${alert ? "alert" : ""}">${alert ? "CONFLICT" : status}</small></span></button>`;
      })
      .join("") || '<p class="traffic-empty">Next flight is on its way.</p>';
  $$("[data-flight]").forEach(
    (b) => (b.onclick = () => select(b.dataset.flight)),
  );
  $("#landed").textContent = String(sim.landed).padStart(2, "0");
  $("#departed").textContent = String(sim.departed).padStart(2, "0");
  $("#score").textContent = String(sim.score).padStart(4, "0");
  $("#strikes").textContent = `${sim.strikes} / 3`;
  const alert = sim.conflicts.size || sim.runwayConflicts.size;
  if (playing)
    $("#mode-label").textContent = sim.over
      ? "SHIFT ENDED"
      : "YOU HAVE CONTROL";
  $("#separation-status").textContent = sim.over
    ? "SHIFT ENDED"
    : alert
      ? "TRAFFIC CONFLICT"
      : "CONTINUOUS TRAFFIC ACTIVE";
  $("#separation-status").style.color = alert || sim.over ? "#ffa494" : "";
  if (!selected() && active.length) selectedId = (listed[0] || active[0]).id;
  const p = selected();
  $("#command").classList.toggle("hidden", !playing || !p || sim.over);
  if (p) {
    const departure = p.kind === "departure";
    $(".runway-buttons").classList.toggle(
      "hidden",
      departure &&
        !["holding-short", "entering-runway", "lineup", "takeoff"].includes(
          p.state,
        ),
    );
    $(".command-extra").classList.toggle("hidden", departure);
    const controllable =
      !sim.over &&
      (departure
        ? p.state === "holding-short"
        : !["rollout", "crashed"].includes(p.state));
    $("#selected-title").textContent = p.id;
    $("#selected-logo").src = `/assets/airlines/${p.airline}.png`;
    $("#selected-logo").alt = AIRLINES[p.airline];
    $("#selected-type").textContent =
      `${departure ? "DEP" : "ARR"} · ${p.type}`;
    const groundAction =
      {
        "at-gate": ["pushback", "Approve pushback"],
        "await-taxi": ["taxi", "Issue taxi clearance"],
        "await-tower": ["handoff", "Accept tower handover"],
      }[p.state] ||
      (departure && p.state === "departure" && p.y >= 250 && !p.handedOff
        ? ["handoff", "Handoff to London Departure"]
        : null);
    $("#ground-action").classList.toggle("hidden", !groundAction);
    if (groundAction) {
      $("#ground-action").dataset.action = groundAction[0];
      $("#ground-action").textContent = groundAction[1];
    }
    $("#controller-channel").textContent = departure
      ? `${p.controller} · ${p.controller === "GROUND" ? `STAND ${p.stand} → ${p.holdingPoint}` : p.controller === "TOWER" ? `RUNWAY ${p.runway}` : "CLIMB-OUT"}`
      : `${p.controller || "APPROACH"} · ${p.holdName || "HEATHROW ARRIVALS"}`;
    $("#command-hint").textContent = departure
      ? {
          "at-gate": `To ${p.destination}. Requesting pushback from stand ${p.stand}.`,
          pushback: "Tug pushing back along the stand lead-in.",
          "await-taxi": `Pushback complete. Assign the ground route to ${p.holdingPoint}.`,
          taxiing: p.groundBlocked
            ? "Holding for ground traffic ahead."
            : `Following mapped taxiways to ${p.holdingPoint} · ${Math.round(p.speed * 1.944)} KT`,
          "await-tower": `Holding short ${p.holdingPoint}. Ground is transferring the flight to Tower.`,
          "holding-short": `Tower has control. Check runway ${p.runway} and final before takeoff.`,
        }[p.state] ||
        `${p.state.toUpperCase()} · ${p.runway} · ${Math.round(p.speed * 1.944)} KT`
      : drawing
        ? "Drag from the selected aircraft toward your next fix. Release to assign."
        : p.runway
          ? `Cleared ${p.runway}. Keep the runway and final clear.`
          : p.state === "vectoring"
            ? `Following your vector · ${p.route.length} route points remaining.`
            : `${p.holdName ? `${p.holdName} · assigned ${Math.round(p.holdAltitude / 0.3048).toLocaleString()} FT` : "Inbound"} · fuel reserve in ${Math.max(0, Math.ceil((480 - p.age) / 60))} sim min.`;
    $$("[data-runway]").forEach((b) => {
      const occupied = sim.runwayTraffic(b.dataset.runway, p).length;
      b.disabled =
        !controllable || (departure && b.dataset.runway !== p.runway);
      b.classList.toggle("occupied", !!occupied);
      b.querySelector("b").textContent = departure
        ? "CLEAR TAKEOFF"
        : "CLEAR TO LAND";
      b.querySelector("small").textContent = occupied
        ? "⚠ TRAFFIC ON RUNWAY / FINAL"
        : `${b.dataset.runway === "27R" ? "NORTH" : "SOUTH"} · RUNWAY AVAILABLE`;
    });
    $("#hold").textContent = departure ? "Hold short" : "↻ Hold";
    $("#hold").disabled = !controllable;
    $("#go-around").disabled = departure || !controllable;
    $("#draw").disabled = departure || !controllable;
  }
  $("#shift-report").classList.toggle("hidden", !sim.over || cinematic);
  if (sim.over) {
    $("#shift-reason").textContent = sim.reason;
    $("#shift-result").textContent =
      `${sim.landed} landed · ${sim.departed} departed · ${sim.score} points`;
  }
  if (playing && p && !sim.over) {
    const list = $("#flight-list");
    const available =
      $("#command").getBoundingClientRect().top -
      list.getBoundingClientRect().top -
      $(".traffic-footer").offsetHeight -
      14;
    list.style.maxHeight = `${Math.max(50, available)}px`;
  } else $("#flight-list").style.maxHeight = "";
  $("#clock").textContent =
    new Date(Date.UTC(2026, 5, 21, 17, 42, sim.time))
      .toISOString()
      .slice(11, 19) + " Z";
}
function command(id) {
  if (!playing) start();
  if (sim.over) return;
  const p = selected();
  if (!p) return;
  if (id === "pushback") sim.pushback(p);
  else if (id === "taxi") sim.taxi(p);
  else if (id === "handoff") sim.handoff(p);
  else if (id === "hold") sim.hold(p);
  else if (id === "go-around") sim.goAround(p);
  else {
    if (sim.runwayTraffic(id, p).length)
      toast(
        `Runway ${id} has conflicting traffic. Hold the departure or send the arrival around.`,
      );
    sim.clear(p, id);
  }
  drawing = false;
  controls.enabled = true;
  document.body.classList.remove("drawing");
  updateUI();
}
$$("[data-traffic]").forEach(
  (b) =>
    (b.onclick = () => {
      trafficFilter = b.dataset.traffic;
      const p = sim.planes.find(
        (p) =>
          !FINISHED.has(p.state) && (p.kind || "arrival") === trafficFilter,
      );
      if (p && playing) selectedId = p.id;
      updateUI();
    }),
);
$("#retry-shift").onclick = () => start();
$("#start").onclick = () => start();
$("#restart").onclick = () => start();
$("#cinematic").onclick = enterFilm;
$("#exit-film").onclick = exitFilm;
$("#sound").onclick = toggleSound;
$("#daylight").onclick = setDay;
$$("[data-view]").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
$$("[data-runway]").forEach(
  (b) => (b.onclick = () => command(b.dataset.runway)),
);
$("#ground-action").onclick = () => command($("#ground-action").dataset.action);
$("#hold").onclick = () => command("hold");
$("#go-around").onclick = () => command("go-around");
$("#draw").onclick = () => {
  if (!playing) start();
  const flight = selected();
  if (!flight || flight.kind === "departure" || sim.over) return;
  setView("radar");
  // Frame the selected flight and the airport together while drawing.
  controls.target.set(flight.x * 0.4, 0, flight.z * 0.4);
  camera.position.set(
    flight.x * 0.4,
    Math.max(13000, Math.hypot(flight.x, flight.z) * 2.2),
    flight.z * 0.4 + 1,
  );
  controls.update();
  drawing = true;
  controls.enabled = false;
  document.body.classList.add("drawing");
  $("#tip").textContent =
    "Drag a vector path across the map. Then choose 27R or 27L.";
  toast("Draw a path on the map, then assign the runway.");
  updateUI();
};
function togglePause() {
  paused = !paused;
  $("#pause").innerHTML = paused
    ? '<i class="play-icon"></i>'
    : '<i class="pause-icon"></i>';
}
$("#pause").onclick = togglePause;
$("#speed").onclick = () => {
  speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
  $("#speed").textContent = speed + "×";
};
$("#hide-ui").onclick = () => document.body.classList.toggle("clean");
$("#help").onclick = () => $("#help-dialog").showModal();
$("#close-help").onclick = () => $("#help-dialog").close();
$("#help-play").onclick = () => {
  $("#help-dialog").close();
  start();
};
let pointerDown = false,
  downPos;
function worldPoint(e) {
  mouse.set(
    (e.clientX / innerWidth) * 2 - 1,
    (-e.clientY / innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(mouse, camera);
  return raycaster.ray.intersectPlane(floor, new T.Vector3());
}
canvas.addEventListener("pointerdown", (e) => {
  downPos = { x: e.clientX, y: e.clientY };
  if (drawing) {
    e.preventDefault();
    pointerDown = true;
    const flight = selected();
    drawPoints = flight ? [new T.Vector3(flight.x, 0, flight.z)] : [];
    canvas.setPointerCapture(e.pointerId);
    const p = worldPoint(e);
    if (p) drawPoints.push(p);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (pointerDown && drawing) {
    const p = worldPoint(e);
    if (p && (!drawPoints.length || p.distanceTo(drawPoints.at(-1)) > 180))
      drawPoints.push(p);
  }
});
canvas.addEventListener("pointercancel", () => {
  pointerDown = false;
  drawing = false;
  drawPoints = [];
  controls.enabled = true;
  document.body.classList.remove("drawing");
  updateUI();
});
canvas.addEventListener("pointerup", (e) => {
  if (pointerDown && drawing) {
    pointerDown = false;
    if (sim.vector(selected(), drawPoints)) {
      toast(
        "Route assigned. Aircraft is following your vector; assign a runway when ready.",
      );
    }
    drawing = false;
    redrawRoutes();
    controls.enabled = true;
    document.body.classList.remove("drawing");
    $("#tip").textContent =
      "Select a flight → assign a runway. Keep the final approach clear.";
    updateUI();
    return;
  }
  if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) < 5) {
    worldPoint(e);
    const hit = raycaster.intersectObjects([...models.values()], true)[0];
    if (hit) {
      let root = hit.object;
      while (root.parent && root.parent !== scene) root = root.parent;
      const item = [...models].find(([id, m]) => m === root);
      if (item) select(item[0]);
    }
  }
});
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === "Escape") {
    if (cinematic) exitFilm();
    document.body.classList.remove("clean");
    drawing = false;
    controls.enabled = true;
    document.body.classList.remove("drawing");
  }
  if (e.code === "Space" && !$("#help-dialog").open) {
    e.preventDefault();
    togglePause();
  }
  if (e.key.toLowerCase() === "h") document.body.classList.toggle("clean");
  if (e.key.toLowerCase() === "f") cinematic ? exitFilm() : enterFilm();
  if (e.key.toLowerCase() === "m") toggleSound();
  if (["1", "2", "3", "4"].includes(e.key) && !cinematic)
    setView(["overview", "tower", "follow", "radar"][Number(e.key) - 1]);
});
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post.resize(innerWidth, innerHeight);
});
renderer.info.autoReset = false;
const incidentEffect = createIncidentEffect();
scene.add(incidentEffect.group);
let shownIncident = null;
function clearIncident() {
  shownIncident = null;
  incidentEffect.clear();
}
function updateIncident() {
  if (sim.incident && sim.incident !== shownIncident) {
    shownIncident = sim.incident;
    selectedId = sim.incident.flights[0];
    setView("follow");
    incidentEffect.start(sim.incident, elapsed);
  }
  if (!sim.incident) incidentEffect.clear();
  incidentEffect.update(elapsed);
}
function renderScene() {
  renderer.info.reset();
  post.render();
}
function step(dt) {
  elapsed += dt;
  frameCounter++;
  if (!paused) {
    const simDt = dt * (cinematic ? 2 : speed * 2);
    for (let remain = simDt; remain > 0; remain -= 0.1)
      sim.tick(Math.min(remain, 0.1));
    airport.update(sim.time);
    if (cinematic) cinemaTime += dt;
  }
  if (cinematic) {
    cinema(cinemaTime);
  } else if (view === "follow") {
    const p = selected() || sim.planes[0];
    const desired = new T.Vector3(
      p.x - Math.cos(p.heading) * 125,
      p.y + 70,
      p.z - Math.sin(p.heading) * 125 + 145,
    );
    camera.position.lerp(desired, 1 - Math.exp(-dt * 2));
    controls.target.lerp(new T.Vector3(p.x, p.y, p.z), 1 - Math.exp(-dt * 5));
    controls.update();
  } else if (view === "tower") {
    const p = selected() || sim.planes[0];
    camera.position.copy(airport.tower).add(new T.Vector3(0, 4, 0));
    controls.target.lerp(new T.Vector3(p.x, p.y, p.z), 1 - Math.exp(-dt));
    controls.update();
  } else controls.update();
  updateModels(dt);
  updateIncident();
  if (frameCounter % 6 === 0) redrawRoutes();
  uiTimer += dt;
  if (uiTimer > 0.35) {
    uiTimer = 0;
    updateUI();
    if (sim.events.length) {
      const event = sim.events.at(-1);
      sim.events = [];
      if (playing && !cinematic) toast(event);
    }
  }
  renderScene();
}
let manual = new URLSearchParams(location.search).has("capture");
function animate(now) {
  if (!manual) {
    const frameSeconds = (now - lastTime) / 1000;
    step(Math.min(frameSeconds, 0.05));
    fpsTime += frameSeconds;
    fpsSamples++;
    if (fpsTime > 1) {
      $("#fps").textContent = Math.round(fpsSamples / fpsTime) + " FPS";
      fpsSamples = 0;
      fpsTime = 0;
    }
  }
  lastTime = now;
  requestAnimationFrame(animate);
}
setView("follow");
setDay("golden");
updateUI();
step(0.016);
requestAnimationFrame(animate);
window.__HEATHROW__ = {
  ready: true,
  sim,
  renderer,
  scene,
  camera,
  post,
  step,
  start,
  select,
  setView,
  enterFilm,
  exitFilm,
  command,
  setDay,
  get state() {
    return {
      playing,
      view,
      cinematic,
      drawing,
      selectedId,
      day,
      paused,
      planes: sim.planes.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        z: p.z,
        state: p.state,
        route: p.route.length,
      })),
      landed: sim.landed,
      departed: sim.departed,
      over: sim.over,
      score: sim.score,
      strikes: sim.strikes,
      drawCalls: renderer.info.render.calls,
      geography: airport.geography,
    };
  },
  captureFrame(t) {
    manual = true;
    if (!cinematic) enterFilm();
    while (cinemaTime < t) {
      const dt = Math.min(1 / 30, t - cinemaTime);
      sim.tick(dt * 2);
      cinemaTime += dt;
      elapsed += dt;
    }
    airport.update(sim.time);
    updateModels(0);
    cinema(t);
    renderScene();
    // Offline capture must finish the GPU work before Chromium composites a frame.
    renderer.getContext().finish();
  },
};
$("#loading").classList.add("hidden");
if (new URLSearchParams(location.search).has("demo")) enterFilm();
if (new URLSearchParams(location.search).has("play")) start();
