import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  aircraft,
  AIRFRAMES,
  loadAirlineMarkings,
  loadAircraftModels,
} from "./aircraft.js";
import { buildTerminals, TERMINAL_MODELS } from "./terminal-architecture.js";
import {
  loadMaterials,
  facadeMaterial,
  roofMaterial,
  claddingMaterial,
  wallMaterial,
  runwayMaterial,
} from "./materials.js";
import "./model-viewer.css";
const $ = (s) => document.querySelector(s),
  stage = $("#model-stage"),
  canvas = $("#model-world");
const renderer = new T.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
const scene = new T.Scene();
scene.background = new T.Color(0xbcc5c9);
const camera = new T.PerspectiveCamera(36, 1, 0.2, 10000),
  controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.025;
const hemi = new T.HemisphereLight(0xe0ebf4, 0x716859, 0.8);
scene.add(hemi);
const sun = new T.DirectionalLight(0xfff1db, 2.7);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.00005;
sun.shadow.normalBias = 0.1;
scene.add(sun, sun.target);
const ground = new T.Mesh(
  new T.PlaneGeometry(10000, 10000),
  new T.MeshStandardMaterial({ color: 0xaeb8b5, roughness: 0.9 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
ground.receiveShadow = true;
scene.add(ground);
await Promise.all([
  loadAirlineMarkings(),
  loadAircraftModels(),
  loadMaterials(),
]);
const hdr = await new HDRLoader().loadAsync("/assets/sky.hdr");
hdr.mapping = T.EquirectangularReflectionMapping;
scene.environment = hdr;
scene.environmentIntensity = 0.7;
const entries = [
  {
    id: "BA-B789",
    category: "aircraft",
    title: "British Airways",
    subtitle: "Boeing 787-9",
    airline: "BA",
    type: "B789",
    reference: "https://github.com/IskenderWang/787-family",
    note: "FlightGear exterior geometry, adapted for the browser. BA livery, detailed gear and Rolls-Royce Trent 1000 engines.",
  },
  {
    id: "VS-B789",
    category: "aircraft",
    title: "Virgin Atlantic",
    subtitle: "Boeing 787-9",
    airline: "VS",
    type: "B789",
    reference: "https://github.com/IskenderWang/787-family",
    note: "The same detailed Dreamliner airframe in Virgin Atlantic paint. The airline also operates this aircraft type.",
  },
  {
    id: "VS-A35K",
    category: "aircraft",
    title: "Virgin Atlantic",
    subtitle: "Airbus A350-1000",
    airline: "VS",
    type: "A35K",
    reference:
      "https://commons.wikimedia.org/wiki/File:Virgin_Atlantic_airbus_a350-1000_G-VJAM.jpg",
    note: "Procedural study with a dedicated silhouette, cockpit mask, curved wingtips and three-axle main gear. Further detailing remains.",
  },
  {
    id: "EK-A388",
    category: "aircraft",
    title: "Emirates",
    subtitle: "Airbus A380-800",
    airline: "EK",
    type: "A388",
    reference:
      "https://commons.wikimedia.org/wiki/File:Emirates_Airbus_A380_A6-EOG_Perth_2024_(01).jpg",
    note: "Procedural study of the double-deck fuselage, four-engine wing and Emirates paint. Further detailing remains.",
  },
  {
    id: "SQ-B77W",
    category: "aircraft",
    title: "Singapore Airlines",
    subtitle: "Boeing 777-300ER",
    airline: "SQ",
    type: "B77W",
    reference:
      "https://commons.wikimedia.org/wiki/File:Singapore_Airlines,_Boeing_777-300ER,_9V-SNC_-_LHR_(23932929890).jpg",
    note: "Procedural study with raked wingtips, large nacelles, six-wheel bogies and the Singapore cheatline.",
  },
  {
    id: "BA-A320",
    category: "aircraft",
    title: "British Airways",
    subtitle: "Airbus A320",
    airline: "BA",
    type: "A320",
    reference:
      "https://commons.wikimedia.org/wiki/Category:Airbus_A320_of_British_Airways",
    note: "A separately dimensioned narrowbody study, with a shorter fuselage, two-wheel main gear and a smaller wing.",
  },
  ...Object.entries(TERMINAL_MODELS).map(([id, info]) => ({
    id,
    category: "terminals",
    title: info.name,
    subtitle:
      id === "T2B"
        ? "Mapped 35 m pier core"
        : id === "T5A"
          ? "Main hall · 171 × 391 m"
          : "Mapped Heathrow footprint",
    reference:
      id === "T5A"
        ? "https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_5_from_the_air.jpg"
        : id === "T2A"
          ? "https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_2_under_construction_2012.jpg"
          : id.startsWith("T5")
            ? "https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_5C_Iwelumo-1.jpg"
            : "https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_2B_-_geograph.org.uk_-_5251719.jpg",
    note: "Photo-referenced procedural architecture over the mapped footprint. Articulated jet bridges, roof structure, glazing and service levels. Not a surveyed digital twin.",
  })),
];
let model,
  selected,
  category = "aircraft",
  angle = "perspective",
  wired = false;
function terminal(id) {
  const mats = {
    glass: facadeMaterial(),
    roof: roofMaterial(),
    cladding: claddingMaterial(),
    concrete: wallMaterial(),
    runway: runwayMaterial(),
    steel: new T.MeshStandardMaterial({
      color: 0x9eaaa9,
      roughness: 0.36,
      metalness: 0.65,
    }),
    white: new T.MeshStandardMaterial({ color: 0xe2e5df, roughness: 0.55 }),
    dark: new T.MeshStandardMaterial({ color: 0x253036, roughness: 0.6 }),
    paint: new T.MeshStandardMaterial({ color: 0xe1e4dc, roughness: 0.8 }),
    gravel: new T.MeshStandardMaterial({ color: 0x8c8273, roughness: 1 }),
    rooflight: new T.MeshStandardMaterial({
      color: 0x799798,
      roughness: 0.3,
      metalness: 0.4,
    }),
  };
  const batches = new Map(),
    group = new T.Group();
  const put = (g, mat, x = 0, y = 0, z = 0, ry = 0) => {
    g.rotateY(ry);
    g.translate(x, y, z);
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g.index ? g.toNonIndexed() : g);
  };
  const box = (x, y, z, w, h, d, mat = "concrete", ry = 0) =>
    put(new T.BoxGeometry(w, h, d), mat, x, y, z, ry);
  const cyl = (x, y, z, r, h, mat = "steel", n = 10) =>
    put(new T.CylinderGeometry(r, r, h, n), mat, x, y, z);
  buildTerminals({ put, box, cyl }, id);
  for (const [key, geos] of batches) {
    const m = new T.Mesh(mergeGeometries(geos), mats[key]);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    geos.forEach((g) => g.dispose());
  }
  const { center } = TERMINAL_MODELS[id];
  group.position.set(-center[0], 0, -center[1]);
  return group;
}
function setAngle(value) {
  angle = value;
  const bounds = new T.Box3().setFromObject(model),
    center = bounds.getCenter(new T.Vector3()),
    size = bounds.getSize(new T.Vector3());
  const framingPoints = [];
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox;
    for (const x of [b.min.x, b.max.x])
      for (const y of [b.min.y, b.max.y])
        for (const z of [b.min.z, b.max.z])
          framingPoints.push(
            new T.Vector3(x, y, z).applyMatrix4(o.matrixWorld),
          );
  });
  const extent = Math.max(size.x, size.y, size.z),
    dir = {
      perspective: new T.Vector3(1, 0.42, 1.25),
      side: selected.type
        ? new T.Vector3(0, 0.035, 1)
        : new T.Vector3(1, 0.12, 0),
      front: selected.type
        ? new T.Vector3(1, 0.035, 0)
        : new T.Vector3(0.12, 0.18, 1),
      top: new T.Vector3(0.001, 1, 0.001),
    }[angle].normalize();
  scene.fog = new T.Fog(0xbcc5c9, extent * 6, extent * 20);
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(dir, extent * 2);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  // Fit each mesh’s bounding corners in the available canvas at each viewpoint.
  let max = 0;
  for (const point of framingPoints) {
    const p = point.clone().project(camera);
    max = Math.max(max, Math.abs(p.x), Math.abs(p.y));
  }
  camera.position
    .copy(center)
    .addScaledVector(dir, extent * 2 * Math.max(0.35, max / 0.9));
  // Perspective depth means a single proportional fit can clip a long pier.
  for (let pass = 0; pass < 12; pass++) {
    camera.lookAt(center);
    camera.updateMatrixWorld();
    let projected = 0;
    for (const point of framingPoints) {
      const p = point.clone().project(camera);
      projected = Math.max(projected, Math.abs(p.x), Math.abs(p.y));
    }
    if (projected <= 0.9) break;
    const distance = camera.position.distanceTo(center) * 1.12;
    camera.position.copy(center).addScaledVector(dir, distance);
  }
  controls.minDistance = extent * 0.15;
  controls.maxDistance = extent * 5;
  camera.near = Math.max(0.1, extent * 0.001);
  camera.updateProjectionMatrix();
  sun.position
    .copy(center)
    .add(new T.Vector3(extent * 0.4, extent, extent * 0.6));
  sun.target.position.copy(center);
  Object.assign(sun.shadow.camera, {
    left: -extent * 0.75,
    right: extent * 0.75,
    top: extent * 0.75,
    bottom: -extent * 0.75,
    near: 1,
    far: extent * 4,
  });
  sun.shadow.camera.updateProjectionMatrix();
  document
    .querySelectorAll("[data-angle]")
    .forEach((b) => b.classList.toggle("active", b.dataset.angle === angle));
  controls.update();
  render();
}
function render() {
  renderer.render(scene, camera);
}
function select(id) {
  selected = entries.find((e) => e.id === id);
  category = selected.category;
  if (model) {
    scene.remove(model);
    if (model.userData.viewerTerminal)
      model.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
  }
  model = selected.type
    ? aircraft(selected.airline, selected.type)
    : terminal(selected.id);
  model.userData.viewerTerminal = !selected.type;
  if (selected.type) model.position.y = model.userData.groundHeight;
  scene.add(model);
  model.traverse((o) => {
    if (o.isMesh) o.material.wireframe = wired;
  });
  $("#model-name").textContent = selected.type
    ? selected.subtitle
    : selected.title;
  $("#model-kind").textContent = selected.title;
  $("#model-note").textContent = selected.note;
  $("#model-reference").href = selected.reference;
  const dims = selected.type
    ? `${AIRFRAMES[selected.type].length.toFixed(2)} m long · ${AIRFRAMES[selected.type].span.toFixed(2)} m span`
    : `${TERMINAL_MODELS[id].width} m core width · ${TERMINAL_MODELS[id].length} m long`;
  $("#model-dimensions").textContent = dims;
  $("#model-scale").textContent = dims.toUpperCase();
  $("#model-credit").textContent =
    selected.type === "B789"
      ? "787 geometry & livery: FlightGear 787-family contributors · GPL-2.0 · Source and conversion included in repository."
      : "Original procedural model · Geometry references © OpenStreetMap contributors · Airline trademarks belong to their owners.";
  $("#model-list").innerHTML = entries
    .filter((e) => e.category === category)
    .map(
      (e) =>
        `<button class="model-option ${e.id === id ? "active" : ""}" data-model="${e.id}"><b>${e.title}</b><small>${e.subtitle}</small></button>`,
    )
    .join("");
  document
    .querySelectorAll("[data-model]")
    .forEach((b) => (b.onclick = () => select(b.dataset.model)));
  document
    .querySelectorAll("[data-category]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.category === category),
    );
  setAngle(angle);
  history.replaceState(null, "", "#" + id);
}
function resize() {
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  if (model) setAngle(angle);
}
window.addEventListener("resize", resize);
resize();
document
  .querySelectorAll("[data-category]")
  .forEach(
    (b) =>
      (b.onclick = () =>
        select(entries.find((e) => e.category === b.dataset.category).id)),
  );
document
  .querySelectorAll("[data-angle]")
  .forEach((b) => (b.onclick = () => setAngle(b.dataset.angle)));
$("#wireframe").onclick = () => {
  wired = !wired;
  $("#wireframe").classList.toggle("active", wired);
  model.traverse((o) => {
    if (o.isMesh) o.material.wireframe = wired;
  });
  render();
};
controls.addEventListener("change", render);
select(
  entries.some((e) => e.id === location.hash.slice(1))
    ? location.hash.slice(1)
    : "BA-B789",
);
$("#model-loading").remove();
window.__MODELS__ = {
  ready: true,
  select,
  setAngle,
  renderer,
  scene,
  camera,
  entries,
  get model() {
    return model;
  },
};
function animate() {
  requestAnimationFrame(animate);
  controls.update();
}
animate();
