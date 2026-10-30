import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { aircraft } from "./aircraft.js";
import {
  groundMaterial,
  facadeMaterial,
  roofMaterial,
  wallMaterial,
  claddingMaterial,
  runwayMaterial,
  turfMaterial,
} from "./materials.js";
import { buildTerminals } from "./terminal-architecture.js";
import { buildRunwayMarkings } from "./runway-markings.js";
import { RUNWAYS, GROUND_LAYOUT } from "./simulation.js";
function random(seed = 37) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function buildGeographicAirport(scene, { data, near, far }) {
  const rand = random(),
    group = new T.Group();
  scene.add(group);
  const batches = new Map();
  const mats = {
    glass: facadeMaterial(),
    cladding: claddingMaterial(),
    rooflight: new T.MeshStandardMaterial({
      color: 0x729598,
      metalness: 0.35,
      roughness: 0.32,
      side: T.DoubleSide,
    }),
    gravel: new T.MeshStandardMaterial({ color: 0x8d8778, roughness: 1 }),
    runway: runwayMaterial(),
    paint: new T.MeshStandardMaterial({
      color: 0xe4e4d9,
      roughness: 0.94,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    yellow: new T.MeshStandardMaterial({ color: 0xd5af46, roughness: 0.95 }),
    asphalt: runwayMaterial(0x77796f),
    apron: runwayMaterial(0x898b80, true),
    turf: turfMaterial(),
    airfieldBase: turfMaterial(),
    rubber: new T.MeshStandardMaterial({
      color: 0x141a1a,
      roughness: 0.98,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    house: facadeMaterial("house"),
    roof: roofMaterial(),
    concrete: wallMaterial(),
    steel: new T.MeshStandardMaterial({
      color: 0xaeb6b5,
      metalness: 0.7,
      roughness: 0.32,
    }),
    white: new T.MeshStandardMaterial({ color: 0xd4d8d1, roughness: 0.6 }),
    dark: new T.MeshStandardMaterial({ color: 0x263039, roughness: 0.65 }),
    warm: new T.MeshStandardMaterial({
      color: 0xffe0aa,
      emissive: 0xffc285,
      emissiveIntensity: 2,
    }),
    red: new T.MeshStandardMaterial({ color: 0x795447, roughness: 0.9 }),
  };
  // Large airport viewing distances make coplanar centimetre offsets unstable.
  // Give each ground layer a deterministic depth bias as well as its elevation.
  for (const [key, bias] of Object.entries({
    apron: 4,
    airfieldBase: 5,
    turf: 3,
    asphalt: 2,
    runway: 1,
    yellow: -1,
    paint: -2,
    rubber: -2,
  })) {
    mats[key].polygonOffset = true;
    mats[key].polygonOffsetFactor = bias;
    mats[key].polygonOffsetUnits = bias;
  }
  function put(g, mat, x = 0, y = 0, z = 0, ry = 0) {
    g.rotateY(ry);
    g.translate(x, y, z);
    (batches.get(mat) || batches.set(mat, []).get(mat)).push(
      g.index ? g.toNonIndexed() : g,
    );
  }
  function box(x, y, z, w, h, d, mat = "concrete", ry = 0) {
    put(new T.BoxGeometry(w, h, d), mat, x, y, z, ry);
  }
  function cyl(x, y, z, r, h, mat = "steel", n = 10) {
    put(new T.CylinderGeometry(r, r, h, n), mat, x, y, z);
  }
  function shape(points) {
    const s = new T.Shape();
    points.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    s.closePath();
    return s;
  }
  const W = 7600,
    H = 5200;
  const c = document.createElement("canvas");
  c.width = 4096;
  c.height = Math.round((4096 * H) / W);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#626a4e";
  ctx.fillRect(0, 0, c.width, c.height);
  if (near) ctx.drawImage(near.image, 0, 0, c.width, c.height);
  ctx.translate(c.width / 2, c.height / 2);
  ctx.scale(c.width / W, c.height / H);
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = 4096;
  maskCanvas.height = Math.round((4096 * H) / W);
  const mc = maskCanvas.getContext("2d");
  mc.fillStyle = "#000";
  mc.fillRect(0, 0, mc.canvas.width, mc.canvas.height);
  mc.translate(mc.canvas.width / 2, mc.canvas.height / 2);
  mc.scale(mc.canvas.width / W, mc.canvas.height / H);
  function path(ct, pts, width, color, fill = false) {
    ct.beginPath();
    pts.forEach(([x, z], i) => (i ? ct.lineTo(x, z) : ct.moveTo(x, z)));
    ct.fillStyle = ct.strokeStyle = color;
    ct.lineWidth = width;
    ct.lineJoin = "round";
    ct.lineCap = "round";
    if (fill) {
      ct.closePath();
      ct.fill();
    } else ct.stroke();
  }
  // Mapped apron and taxiway polygons replace baked satellite aircraft with clean PBR surfaces.
  for (const a of data.aeroways)
    if (a.kind === "apron" && a.points.length > 3) {
      path(ctx, a.points, 0, "#91958d", true);
      path(mc, a.points, 0, "#00ff00", true);
    }
  for (const a of data.aeroways)
    if (a.kind === "taxiway") {
      path(ctx, a.points, a.width || 23, "#727a73");
      path(mc, a.points, a.width || 23, "#0000ff");
      path(ctx, a.points, 0.75, "#d4bb6d");
    }
  for (const a of data.aeroways)
    if (a.kind === "parking_position") {
      path(ctx, a.points, 0.65, "#d7ba68");
    }
  // Full runway lengths include displaced thresholds. Markings are redrawn at game scale.
  for (const [id, r] of Object.entries(RUNWAYS)) {
    const lo = r.threshold - r.length,
      hi = r.threshold;
    path(
      ctx,
      [
        [lo, r.z],
        [hi, r.z],
      ],
      50,
      "#333b3f",
    );
    path(
      mc,
      [
        [lo, r.z],
        [hi, r.z],
      ],
      50,
      "#0000ff",
    );
  }
  // The PBR mask leaves geographic imagery outside the pavement unaltered.
  const probe = document.createElement("canvas");
  probe.width = maskCanvas.width;
  probe.height = maskCanvas.height;
  const pc = probe.getContext("2d");
  pc.drawImage(c, 0, 0, probe.width, probe.height);
  const pixels = pc.getImageData(0, 0, probe.width, probe.height).data;
  const maskPixels = mc.getImageData(0, 0, probe.width, probe.height);
  for (let i = 0; i < pixels.length; i += 4) {
    if (
      maskPixels.data[i + 1] + maskPixels.data[i + 2] === 0 &&
      pixels[i + 1] > pixels[i + 2] * 1.22 &&
      pixels[i + 1] > pixels[i] * 0.9
    ) {
      maskPixels.data[i] = 255;
    }
  }
  mc.putImageData(maskPixels, 0, 0);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 16;
  const mask = new T.CanvasTexture(maskCanvas);
  mask.anisotropy = 4;
  const ground = new T.Mesh(
    new T.PlaneGeometry(W, H),
    groundMaterial(map, mask),
  );
  ground.name = "satellite-ground";
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  // A ring, not another full plane: overlapping kilometre-scale ground planes
  // otherwise compete for depth and can hide the detailed airfield at low angles.
  const outerPieces = [];
  for (const [x, z, w, h] of [
    [0, -(16000 + H / 2) / 2, 32000, 16000 - H / 2],
    [0, (16000 + H / 2) / 2, 32000, 16000 - H / 2],
    [-(16000 + W / 2) / 2, 0, 16000 - W / 2, H],
    [(16000 + W / 2) / 2, 0, 16000 - W / 2, H],
  ]) {
    const g = new T.PlaneGeometry(w, h);
    g.rotateX(-Math.PI / 2);
    g.translate(x, -0.1, z);
    const p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++)
      uv.setXY(i, p.getX(i) / 32000 + 0.5, 0.5 - p.getZ(i) / 32000);
    outerPieces.push(g);
  }
  const outer = new T.Mesh(
    mergeGeometries(outerPieces),
    new T.MeshStandardMaterial({
      map: far || null,
      color: far ? 0xffffff : 0x637055,
      roughness: 1,
    }),
  );

  outer.name = "far-satellite";
  group.add(outer);
  function stripe(points, width, mat, y = 0.06) {
    const positions = [],
      uv = [];
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1],
        [bx, bz] = points[i];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.01) continue;
      const dx = ((-(bz - az) / len) * width) / 2,
        dz = (((bx - ax) / len) * width) / 2;
      for (const [x, z] of [
        [ax + dx, az + dz],
        [bx + dx, bz + dz],
        [ax - dx, az - dz],
        [bx + dx, bz + dz],
        [bx - dx, bz - dz],
        [ax - dx, az - dz],
      ]) {
        positions.push(x, y, z);
        uv.push(x / 10, z / 10);
      }
    }
    if (!positions.length) return;
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    put(g, mat);
  }
  // The playable airfield has modeled ground; imagery provides the geographic
  // reference and distant surroundings, never a stretched close-range floor.
  const airfieldOutline = [
    [-2290, -930],
    [2010, -940],
    [2170, -625],
    [2910, -600],
    [3070, -160],
    [2890, 430],
    [2110, 750],
    [1740, 860],
    [1620, 1400],
    [1260, 1660],
    [530, 1640],
    [260, 1230],
    [-1390, 1220],
    [-2190, 950],
    [-2330, 310],
    [-2380, -300],
  ];
  const airfieldSurface = new T.ShapeGeometry(shape(airfieldOutline));
  airfieldSurface.rotateX(-Math.PI / 2);
  put(airfieldSurface, "airfieldBase", 0, 0.005, 0);
  // Crisp mapped pavement outlines and narrow taxi/stand paint at close range.
  // OSM stand aprons stop at their operational boundary, leaving service roads
  // and terminal curtilages out. Pave those precincts, then restore mapped turf.
  for (const [x1, z1, x2, z2] of [
    [-2040, -390, -890, 375],
    [-830, -395, 1000, 375],
    [1790, -390, 2830, 440],
    [1075, -360, 1365, 335],
  ]) {
    const g = new T.PlaneGeometry(x2 - x1, z2 - z1);
    g.rotateX(-Math.PI / 2);
    put(g, "apron", (x1 + x2) / 2, 0.015, (z1 + z2) / 2);
  }
  for (const pts of data.grass || []) {
    if (pts.some(([x, z]) => Math.abs(x) > 3300 || Math.abs(z) > 2100))
      continue;
    const g = new T.ShapeGeometry(shape(pts));
    g.rotateX(-Math.PI / 2);
    put(g, "turf", 0, 0.045, 0);
  }
  for (const a of data.aeroways) {
    if (a.kind === "apron") {
      const g = new T.ShapeGeometry(shape(a.points));
      g.rotateX(-Math.PI / 2);
      put(g, "apron", 0, 0.025, 0);
    }
    if (a.kind === "taxiway") {
      stripe(a.points, (a.width || 23) + 12, "apron", 0.024);
      stripe(a.points, a.width || 23, "asphalt", 0.03);
      stripe(a.points, 0.23, "yellow", 0.065);
    }
    if (a.kind === "parking_position") stripe(a.points, 0.18, "yellow", 0.07);
  }
  for (const r of data.roads) {
    if (
      r.kind !== "service" ||
      r.points.some(([x, z]) => x < -2100 || x > 2850 || z < -900 || z > 1550)
    )
      continue;
    stripe(r.points, 6, "asphalt", 0.05);
  }
  // Urban buildings are extruded from real OSM footprints. OSM heights are used when available.
  const special = new Set([23231957, 23479613, 23479729, 294572024, 133146402]);
  for (const b of data.buildings) {
    if (special.has(b.id)) continue;
    const pts = b.points;
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length,
      cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    if (Math.abs(cx) > 4200 || Math.abs(cz) > 3000) continue;
    const airportBuilding = Math.abs(cx) < 2400 && cz > -460 && cz < 1550;
    let h = b.height;
    if (b.terminal) h = Math.max(h, 16);
    const g = new T.ExtrudeGeometry(shape(pts), {
      depth: h,
      bevelEnabled: false,
      steps: 1,
    });
    g.rotateX(-Math.PI / 2);
    put(g, airportBuilding ? "cladding" : "house");
    const roof = new T.ShapeGeometry(shape(pts));
    roof.rotateX(-Math.PI / 2);
    put(roof, airportBuilding || h > 12 ? "gravel" : "red", 0, h + 0.06, 0);
    if (h > 12 && Math.abs(cx) < 2100 && Math.abs(cz) < 1450) {
      box(cx, h + 1.4, cz, 8, 2.8, 6, "dark");
      box(cx, h + 2.85, cz, 8.5, 0.2, 6.5, "steel");
    }
  }
  buildTerminals({ put, box, cyl });
  const markingCount = buildRunwayMarkings({ runways: RUNWAYS, put, box });
  // The real tower position, from OSM's aircraft_control node.
  const towerX = -337.7,
    towerZ = -60.2;
  cyl(towerX, 35, towerZ, 5.4, 70, "concrete", 16);
  box(towerX, 5, towerZ, 26, 10, 23, "glass");
  put(new T.CylinderGeometry(15, 8, 8, 12), "steel", towerX, 73, towerZ);
  put(new T.CylinderGeometry(16, 14, 9, 12), "glass", towerX, 81, towerZ);
  put(new T.CylinderGeometry(18, 16, 2, 12), "roof", towerX, 87, towerZ);
  cyl(towerX, 95, towerZ, 0.4, 15);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    box(
      towerX + Math.sin(a) * 15,
      81,
      towerZ + Math.cos(a) * 15,
      0.5,
      9,
      0.5,
      "steel",
    );
  }
  // Gate centreline endpoints provide real stand locations and headings.
  const parked = new T.Group();
  let parkedCount = 0;
  const positions = [];
  const parkingOrder = data.aeroways
    .filter((a) => a.kind === "parking_position")
    .map((a) => ({ a, order: rand() }))
    .sort((a, b) => a.order - b.order)
    .map((o) => o.a);
  for (const a of parkingOrder) {
    if (
      a.kind !== "parking_position" ||
      a.points.length < 2 ||
      parkedCount >= 140
    )
      continue;
    const p = a.points.at(-1),
      q = a.points.at(-2);
    if (Math.abs(p[0]) > 2100 || Math.abs(p[1]) > 1550) continue;
    if (positions.some((v) => Math.hypot(p[0] - v[0], p[1] - v[1]) < 43))
      continue;
    if (
      GROUND_LAYOUT.gates.some(
        (g) =>
          g.wayId === a.id ||
          Math.hypot(g.position[0] - p[0], g.position[1] - p[1]) < 85,
      )
    )
      continue;
    const dir = new T.Vector2(p[0] - q[0], p[1] - q[1]).normalize();
    const x = p[0] - dir.x * 29,
      z = p[1] - dir.y * 29;
    const plane = aircraft(parkedCount % 7 === 0 ? "VS" : "BA", false);
    plane.position.set(x, plane.userData.groundHeight || 5, z);
    plane.rotation.y = -Math.atan2(dir.y, dir.x);
    parked.add(plane);
    positions.push(p);
    parkedCount++;
    box(x + 15, 1.5, z + 23, 7, 3, 2.8, "white");
    box(x - 10, 1, z + 23, 5, 2, 2, "yellow");
    // A stand's equipment, service lanes and safety clearances give the apron scale.
    for (let j = 0; j < 4; j++) {
      box(x + 19 + j * 3.2, 0.8, z + 26, 2.5, 1.1, 1.5, "steel");
      for (const zz of [-0.6, 0.6])
        box(x + 19 + j * 3.2, 0.35, z + 26 + zz, 1.8, 0.55, 0.22, "dark");
    }
    const angle = Math.atan2(dir.y, dir.x),
      cs = Math.cos(angle),
      sn = Math.sin(angle);
    const local = (u, v) => [x + u * cs - v * sn, z + u * sn + v * cs];
    stripe(
      [local(-30, -27), local(22, -27), local(22, 27), local(-30, 27)],
      0.22,
      "paint",
      0.075,
    );
    for (const side of [-1, 1])
      stripe(
        [local(-32, side * 29), local(28, side * 29)],
        0.14,
        "yellow",
        0.08,
      );
  }
  parked.updateMatrixWorld(true);
  // Shared parked-aircraft geometry stays on the GPU once per material, rather
  // than copying every fuselage, wheel and engine for every stand.
  const planeBatches = new Map();
  parked.traverse((o) => {
    if (!o.isMesh) return;
    const key = o.geometry.uuid + ":" + o.material.uuid;
    if (!planeBatches.has(key))
      planeBatches.set(key, {
        geometry: o.geometry,
        material: o.material,
        matrices: [],
      });
    planeBatches.get(key).matrices.push(o.matrixWorld.clone());
  });
  for (const { geometry, material, matrices } of planeBatches.values()) {
    const mesh = new T.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  // Airfield light fixtures are small, emissive points; bloom spreads only the brightest radiance.
  const glow = document.createElement("canvas");
  glow.width = 32;
  glow.height = 32;
  const gc = glow.getContext("2d"),
    gr = gc.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "#fff");
  gr.addColorStop(0.12, "#fff");
  gr.addColorStop(0.4, "#ffffff77");
  gr.addColorStop(1, "#ffffff00");
  gc.fillStyle = gr;
  gc.fillRect(0, 0, 32, 32);
  const glowTex = new T.CanvasTexture(glow);
  const lightPoints = { white: [], blue: [], green: [], red: [] };
  for (const r of Object.values(RUNWAYS)) {
    const hi = r.threshold,
      lo = hi - r.length;
    for (let x = lo; x < hi; x += 60) {
      lightPoints.white.push(x, 0.8, r.z - 26, x, 0.8, r.z + 26, x, 0.3, r.z);
    }
    for (let d = 30; d < 720; d += 30)
      for (const z of [-4, 0, 4]) lightPoints.white.push(hi + d, 1, r.z + z);
    for (let z = -22; z < 23; z += 3) {
      lightPoints.green.push(hi, 1, r.z + z);
      lightPoints.red.push(lo, 1, r.z + z);
    }
  }
  for (const a of data.aeroways)
    if (a.kind === "taxiway") {
      for (let i = 1; i < a.points.length; i++) {
        const p = a.points[i - 1],
          q = a.points[i],
          d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        for (let t = 0; t < d; t += 45) {
          const u = t / d;
          lightPoints.green.push(
            p[0] + (q[0] - p[0]) * u,
            0.3,
            p[1] + (q[1] - p[1]) * u,
          );
        }
      }
    }
  const lights = [];
  for (const [name, pts] of Object.entries(lightPoints)) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    const color = new T.Color(
      { white: 0xffdda7, blue: 0x579bff, green: 0x74ffd0, red: 0xff4131 }[name],
    ).multiplyScalar(3);
    const p = new T.Points(
      g,
      new T.PointsMaterial({
        color,
        size: 4.5,
        map: glowTex,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        toneMapped: false,
      }),
    );
    group.add(p);
    lights.push(p);
  }
  for (const p of positions.filter((_, i) => i % 3 === 0)) {
    cyl(p[0] + 30, 13, p[1] + 25, 0.45, 26);
    box(p[0] + 30, 26, p[1] + 25, 10, 1, 2, "dark");
    for (const dx of [-3, 0, 3])
      box(p[0] + 30 + dx, 25.5, p[1] + 26, 2, 1, 1, "warm");
  }
  // Tree clusters only grow inside mapped woodland polygons; none are sprinkled over aprons or reservoirs.
  function inside(x, z, pts) {
    let yes = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i],
        b = pts[j];
      if (
        a[1] > z !== b[1] > z &&
        x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
      )
        yes = !yes;
    }
    return yes;
  }
  const trees = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 1),
    new T.MeshStandardMaterial({ color: 0x475d36, roughness: 1 }),
    9000,
  );
  const dummy = new T.Object3D();
  let count = 0;
  for (const wood of data.woods) {
    const xs = wood.map((p) => p[0]),
      zs = wood.map((p) => p[1]),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    const tries = Math.min(800, ((maxX - minX) * (maxZ - minZ)) / 90);
    for (let i = 0; i < tries && count < 9000; i++) {
      const x = minX + rand() * (maxX - minX),
        z = minZ + rand() * (maxZ - minZ);
      if (!inside(x, z, wood)) continue;
      const h = 5 + rand() * 9;
      dummy.position.set(x, h * 0.7, z);
      dummy.scale.set(h * 0.55, h * 0.7, h * 0.55);
      dummy.rotation.y = rand() * 6;
      dummy.updateMatrix();
      trees.setMatrixAt(count, dummy.matrix);
      trees.setColorAt(
        count,
        new T.Color().setHSL(0.21 + rand() * 0.06, 0.23, 0.18 + rand() * 0.12),
      );
      count++;
    }
  }
  trees.count = count;
  group.add(trees);
  for (const [key, geos] of batches) {
    if (!geos.length) continue;
    const mesh = new T.Mesh(mergeGeometries(geos), mats[key]);
    mesh.name = `airport:${key}`;
    mesh.castShadow = ![
      "paint",
      "rubber",
      "runway",
      "asphalt",
      "apron",
      "yellow",
      "turf",
      "airfieldBase",
    ].includes(key);
    mesh.receiveShadow = true;
    group.add(mesh);
    geos.forEach((g) => g.dispose());
  }
  const vehicles = [];
  for (let i = 0; i < 12; i++) {
    const v = new T.Group(),
      body = new T.Mesh(new T.BoxGeometry(7, 3, 2.8), mats.white);
    body.position.y = 2;
    v.add(body);
    const cabin = new T.Mesh(new T.BoxGeometry(2, 1.4, 2.9), mats.dark);
    cabin.position.set(2, 3, 0);
    v.add(cabin);
    group.add(v);
    vehicles.push(v);
  }
  const roads = data.roads
    .filter(
      (r) =>
        r.kind === "service" &&
        r.points.length > 5 &&
        r.points.every((p) => Math.abs(p[0]) < 2100 && Math.abs(p[1]) < 500),
    )
    .slice(0, 12);
  return {
    group,
    lights,
    tower: new T.Vector3(towerX, 85, towerZ),
    geography: {
      buildings: data.buildings.length,
      airfieldFeatures: data.aeroways.length,
      satellite: !!near,
      parked: parkedCount,
      vectorMarkings: markingCount,
    },
    update(t) {
      vehicles.forEach((v, i) => {
        const r = roads[i % roads.length];
        if (!r) return;
        const u = (t * 0.08 + i) % (r.points.length - 1),
          j = Math.floor(u),
          a = r.points[j],
          b = r.points[j + 1];
        v.position.set(
          T.MathUtils.lerp(a[0], b[0], u - j),
          0,
          T.MathUtils.lerp(a[1], b[1], u - j),
        );
        v.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      });
    },
  };
}
