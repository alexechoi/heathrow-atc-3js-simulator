import { detailedAircraft } from "./aircraft-models.js";
export { loadAircraftModels } from "./aircraft-models.js";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { bodyLivery, tailLivery, engineLogo } from "./aircraft-liveries.js";
export { loadAirlineMarkings } from "./aircraft-liveries.js";
export const AIRFRAMES = {
  B789: {
    length: 62.81,
    span: 60.12,
    rx: 2.88,
    ry: 2.98,
    fin: 11.8,
    engine: 1.75,
    gear: 5.5,
  },
  A35K: {
    length: 73.79,
    span: 64.75,
    rx: 2.98,
    ry: 3.05,
    fin: 11.5,
    engine: 1.9,
    gear: 5.7,
  },
  A388: {
    length: 72.72,
    span: 79.75,
    rx: 3.57,
    ry: 4.15,
    fin: 16.4,
    engine: 1.9,
    gear: 7.2,
  },
  B77W: {
    length: 73.86,
    span: 64.8,
    rx: 3.1,
    ry: 3.14,
    fin: 12.9,
    engine: 2.08,
    gear: 6.1,
  },
  A20N: {
    length: 37.57,
    span: 35.8,
    rx: 1.98,
    ry: 2.05,
    fin: 8.1,
    engine: 1.3,
    gear: 3.8,
  },
  A320: {
    length: 37.57,
    span: 35.8,
    rx: 1.98,
    ry: 2.05,
    fin: 8.1,
    engine: 1.15,
    gear: 3.8,
  },
};
const cache = new Map();
const shared = {
  white: new T.MeshStandardMaterial({
    color: 0xe9eceb,
    roughness: 0.32,
    metalness: 0.18,
  }),
  wing: new T.MeshStandardMaterial({
    color: 0xbec4c9,
    roughness: 0.36,
    metalness: 0.3,
  }),
  alloy: new T.MeshStandardMaterial({
    color: 0xb7c3cf,
    roughness: 0.22,
    metalness: 0.85,
  }),
  dark: new T.MeshStandardMaterial({ color: 0x15191c, roughness: 0.75 }),
  intake: new T.MeshBasicMaterial({ color: 0x10151a, side: T.DoubleSide }),
  fan: new T.MeshStandardMaterial({
    color: 0x424d57,
    roughness: 0.43,
    metalness: 0.65,
    side: T.DoubleSide,
  }),
  rubber: new T.MeshStandardMaterial({ color: 0x111417, roughness: 0.95 }),
  glass: new T.MeshPhysicalMaterial({
    color: 0x172a3b,
    roughness: 0.12,
    metalness: 0.35,
    clearcoat: 1,
  }),
};
const profile = [
  [-0.5, 0.006, 0.25],
  [-0.47, 0.22, 0.22],
  [-0.4, 0.67, 0.12],
  [-0.31, 0.95, 0],
  [-0.23, 1, 0],
  [0.26, 1, 0],
  [0.35, 0.96, -0.02],
  [0.405, 0.81, -0.12],
  [0.45, 0.59, -0.23],
  [0.48, 0.32, -0.32],
  [0.5, 0.008, -0.36],
];
function cross(t, s) {
  const noses = {
    A35K: [0.39, 0.27, 0.62],
    B77W: [0.375, 0.3, 0.58],
    A388: [0.375, 0.56, 0.5],
    A320: [0.35, 0.28, 0.57],
    B789: [0.38, 0.3, 0.6],
  };
  const [start, droop, roundness] = noses[s.type];
  if (t >= start) {
    const u = T.MathUtils.clamp((t - start) / (0.5 - start), 0, 1);
    return {
      r: Math.max(0.003, Math.pow(1 - u * u, roundness)),
      cy: -s.ry * droop * u * u,
    };
  }
  if (t >= -0.23) return { r: 1, cy: 0 };
  let i = 0;
  while (i < 3 && t > profile[i + 1][0]) i++;
  const a = profile[i],
    b = profile[i + 1],
    h = b[0] - a[0],
    u = T.MathUtils.clamp((t - a[0]) / h, 0, 1);
  const interpolate = (k) => {
    const slope = (j) => {
      if (j === 0)
        return (
          (profile[1][k] - profile[0][k]) / (profile[1][0] - profile[0][0])
        );
      if (j === 4) return 0;
      const left =
        (profile[j][k] - profile[j - 1][k]) /
        (profile[j][0] - profile[j - 1][0]);
      const right =
        (profile[j + 1][k] - profile[j][k]) /
        (profile[j + 1][0] - profile[j][0]);
      return left * right > 0 ? (2 * left * right) / (left + right) : 0;
    };
    return (
      (2 * u ** 3 - 3 * u * u + 1) * a[k] +
      (u ** 3 - 2 * u * u + u) * h * slope(i) +
      (-2 * u ** 3 + 3 * u * u) * b[k] +
      (u ** 3 - u * u) * h * slope(i + 1)
    );
  };
  return { r: interpolate(1), cy: interpolate(2) * s.ry };
}
function shell(s, segments = 240, rings = 80) {
  const pos = [],
    uv = [],
    idx = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments - 0.5,
      { r, cy } = cross(t, s);
    for (let j = 0; j <= rings; j++) {
      const a = (j / rings) * Math.PI * 2;
      pos.push(
        t * s.length,
        Math.cos(a) * s.ry * r + cy,
        Math.sin(a) * s.rx * r,
      );
      uv.push(i / segments, 1 - j / rings);
      if (i < segments && j < rings) {
        const k = i * (rings + 1) + j;
        idx.push(k, k + 1, k + rings + 1, k + 1, k + rings + 2, k + rings + 1);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function aerofoil(sections, side = 1) {
  const pos = [],
    uv = [],
    idx = [],
    n = 32;
  for (let i = 0; i < sections.length; i++) {
    const [z, le, te, y, thickness] = sections[i],
      chord = le - te;
    for (const face of [1, -1])
      for (let j = 0; j <= n; j++) {
        const u = j / n;
        const h =
          5 *
          thickness *
          chord *
          (0.2969 * Math.sqrt(u) -
            0.126 * u -
            0.3516 * u * u +
            0.2843 * u ** 3 -
            0.1015 * u ** 4);
        pos.push(le - u * chord, y + h * face, z * side);
        uv.push(
          u,
          (z - sections[0][0]) / (sections.at(-1)[0] - sections[0][0]),
        );
      }
  }
  const stride = (n + 1) * 2;
  for (let i = 0; i < sections.length - 1; i++)
    for (let f = 0; f < 2; f++)
      for (let j = 0; j < n; j++) {
        const a = i * stride + f * (n + 1) + j,
          b = a + stride;
        const tri = [a, b, a + 1, a + 1, b, b + 1];
        if (side > 0 === (f === 0))
          for (let k = 0; k < 6; k += 3)
            idx.push(tri[k], tri[k + 2], tri[k + 1]);
        else idx.push(...tri);
      }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Surface-conforming cockpit panels; the crown stays painted, glazing wraps
// around the drooped nose at flight-deck height rather than across the roof.
function cockpitPanel(s, side, corners, offset = 0.035) {
  const positions = [],
    uv = [],
    indices = [],
    n = 32;
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const u = i / n,
        v = j / n;
      const top = corners[0].map((a, k) =>
        T.MathUtils.lerp(a, corners[1][k], u),
      );
      const bottom = corners[3].map((a, k) =>
        T.MathUtils.lerp(a, corners[2][k], u),
      );
      const z = T.MathUtils.lerp(top[0], bottom[0], v);
      const y = T.MathUtils.lerp(top[1], bottom[1], v);
      // Project the windshield onto the nose along the longitudinal axis.
      // Specifying physical heights keeps its brow level in front elevation.
      let lo = 0.26,
        hi = 0.4999;
      for (let k = 0; k < 24; k++) {
        const t = (lo + hi) / 2,
          { r, cy } = cross(t, s);
        const rho = ((y - cy) / (s.ry * r)) ** 2 + (z / (s.rx * r)) ** 2;
        if (rho > 1) hi = t;
        else lo = t;
      }
      positions.push((lo + hi) * 0.5 * s.length + offset, y, side * z);
      uv.push(u, v);
      if (i < n && j < n) {
        const k = j * (n + 1) + i,
          f = [k, k + 1, k + n + 1, k + 1, k + n + 2, k + n + 1];
        for (let q = 0; q < 6; q += 3)
          indices.push(
            ...(side < 0
              ? [f[q], f[q + 2], f[q + 1]]
              : [f[q], f[q + 1], f[q + 2]]),
          );
      }
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
const wingStations = {
  A35K: [
    [1.9, 12, -12.5, -1.65, 0.12],
    [10, 5.3, -12.5, -0.85, 0.11],
    [20, -3, -14, 0.3, 0.095],
    [28.6, -10.8, -14.8, 1.45, 0.08],
    [30.3, -12.1, -15, 1.8, 0.075],
    [31.3, -13, -15.2, 2.2, 0.07],
    [31.95, -13.8, -15.4, 3, 0.065],
    [32.25, -14.35, -15.6, 3.85, 0.055],
    [32.375, -14.7, -15.75, 4.5, 0.045],
  ],
  A388: [
    [2.4, 11, -17, -2.1, 0.125],
    [12, 6, -18, -1.1, 0.12],
    [24, -2, -19, 0.5, 0.105],
    [36, -12.8, -18.3, 2.1, 0.08],
    [39.875, -16.2, -18.5, 2.75, 0.065],
  ],
  B77W: [
    [2, 10, -13.5, -1.7, 0.12],
    [10.8, 3.4, -14.5, -0.9, 0.11],
    [22, -6.5, -16.6, 0.65, 0.09],
    [29.8, -13.5, -17.6, 2.05, 0.075],
    [32.4, -17, -18.4, 2.6, 0.045],
  ],
  A320: [
    [1.3, 4.6, -5.1, -1, 0.12],
    [5.8, 1.4, -5.6, -0.55, 0.11],
    [13.9, -4.1, -6.65, 0.45, 0.09],
    [16.6, -5.9, -7.2, 0.9, 0.075],
    [17.3, -6.45, -7.45, 1.65, 0.065],
    [17.9, -7.05, -7.65, 3.1, 0.045],
  ],
  B789: [
    [1.9, 9, -11, -1.5, 0.12],
    [10.2, 2.3, -12, -0.8, 0.1],
    [21, -7, -14, 0.8, 0.085],
    [28.1, -13.4, -15.8, 2, 0.07],
    [30.06, -16, -16.6, 2.8, 0.04],
  ],
};
function wingAt(stations, z) {
  let i = 0;
  while (i < stations.length - 2 && z > stations[i + 1][0]) i++;
  const a = stations[i],
    b = stations[i + 1],
    u = T.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
  return a.map((v, k) => T.MathUtils.lerp(v, b[k], u));
}
const wingMaterials = new Map();
function wingMaterial(type) {
  if (wingMaterials.has(type)) return wingMaterials.get(type);
  const c = document.createElement("canvas");
  c.width = c.height = 2048;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#d5d9db";
  ctx.fillRect(0, 0, 2048, 2048);
  // Corrosion protection, spoilers, ailerons and flap joints are flush paint.
  ctx.fillStyle = "#aeb5ba";
  ctx.fillRect(360, 230, 930, 1600);
  ctx.strokeStyle = "#737e85";
  ctx.lineWidth = 1.3;
  const panel = (x, y, w, h) => ctx.strokeRect(x, y, w, h);
  for (let k = 0; k < 7; k++) {
    panel(1210, 490 + k * 176, 260, 164);
    panel(1505, 490 + k * 176, 525, 164);
  }
  panel(1470, 160, 570, 315);
  panel(1505, 1730, 530, 170);
  ctx.beginPath();
  ctx.moveTo(210, 90);
  ctx.lineTo(210, 1960);
  ctx.stroke();
  ctx.strokeStyle = "#9aa2a7";
  ctx.lineWidth = 0.8;
  for (let y = 340; y < 1940; y += 100) {
    ctx.beginPath();
    ctx.moveTo(230, y);
    ctx.lineTo(1460, y);
    ctx.stroke();
  }
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 16;
  const material = new T.MeshStandardMaterial({
    map,
    roughness: 0.43,
    metalness: 0.2,
  });
  wingMaterials.set(type, material);
  return material;
}
function build(airline, type) {
  const s = { ...AIRFRAMES[type], type },
    L = s.length,
    S = s.span / 2;
  const group = new T.Group();
  group.userData = { type, airline, groundHeight: s.gear };
  const buckets = new Map();
  const add = (g, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => {
    g.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(...pos),
        new T.Quaternion().setFromEuler(new T.Euler(...rot)),
        new T.Vector3(...scale),
      ),
    );
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(g);
  };
  const bodyMat = new T.MeshStandardMaterial({
    map: bodyLivery(airline, s),
    roughness: 0.36,
    metalness: 0.19,
  });
  add(shell(s), bodyMat);
  const enginePaint = new T.MeshStandardMaterial({
    color: { BA: 0x092957, VS: 0xb91339, EK: 0xe8e9e5, SQ: 0xe7e9e5 }[airline],
    roughness: 0.27,
    metalness: 0.28,
  });
  const markings = new T.MeshStandardMaterial({
    map: engineLogo(airline),
    transparent: true,
    depthWrite: false,
    roughness: 0.36,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  add(
    new T.SphereGeometry(1, 36, 20),
    airline === "BA" ? enginePaint : shared.white,
    [-L * 0.025, -s.ry * 0.65, 0],
    [0, 0, 0],
    [L * 0.17, s.ry * 0.4, s.rx * 1.25],
  );
  for (const side of [-1, 1]) {
    const stations = wingStations[type];
    add(aerofoil(stations, side), wingMaterial(type));
    add(
      aerofoil(
        [
          [s.rx * 0.65, -L * 0.32, -L * 0.47, 1, 0.09],
          [S * 0.23, -L * 0.405, -L * 0.485, 1.7, 0.075],
          [S * 0.39, -L * 0.455, -L * 0.495, 2.4, 0.05],
        ],
        side,
      ),
      shared.wing,
    );
    // Fairings follow the swept trailing edge and sit beneath the wing.
    for (const fraction of [0.28, 0.44, 0.62]) {
      const z = S * fraction,
        [, le, te, y] = wingAt(stations, z);
      add(
        new T.SphereGeometry(1, 24, 12),
        shared.white,
        [te + 0.4, y - 0.38, side * z],
        [0, 0, 0],
        [type === "A320" ? 1.45 : 2.65, 0.28, 0.34],
      );
    }
    if (type === "A388") {
      const fence = new T.Shape();
      fence.moveTo(-18.9, 1.65);
      fence.lineTo(-18.5, 5.05);
      fence.quadraticCurveTo(-18.2, 5.3, -17.95, 4.85);
      fence.lineTo(-16.25, 2.8);
      fence.closePath();
      add(
        new T.ExtrudeGeometry(fence, { depth: 0.1, bevelEnabled: false }),
        enginePaint,
        [0, 0, side * S - 0.05],
      );
    }
    // Smooth swept pylons, shaped nacelles, recessed fan discs and exhaust cones.
    for (const engineIndex of type === "A388" ? [0, 1] : [0]) {
      const ez = side * S * (engineIndex ? 0.57 : 0.3),
        ex = L * (engineIndex ? -0.055 : 0.075),
        ey = -s.ry * 0.72 - 1.1,
        rad = s.engine * (engineIndex ? 0.93 : 1),
        len = rad * 3.65;
      const nacelleProfile = [
        [-len * 0.5, rad * 0.78],
        [-len * 0.36, rad * 0.96],
        [len * 0.12, rad],
        [len * 0.43, rad * 0.88],
        [len * 0.48, rad * 0.82],
      ];
      const g = new T.LatheGeometry(
        nacelleProfile.map(([x, r]) => new T.Vector2(r, x)),
        40,
      );
      g.rotateZ(-Math.PI / 2);
      add(g, enginePaint, [ex, ey, ez]);
      add(
        new T.TorusGeometry(rad * 0.82, rad * 0.065, 10, 40),
        shared.alloy,
        [ex + len * 0.48, ey, ez],
        [0, Math.PI / 2, 0],
      );
      add(
        new T.CylinderGeometry(rad * 0.74, rad * 0.82, len * 0.28, 40, 1, true),
        shared.intake,
        [ex + len * 0.34, ey, ez],
        [0, 0, Math.PI / 2],
      );
      add(
        new T.CircleGeometry(rad * 0.75, 40),
        shared.intake,
        [ex + len * 0.2, ey, ez],
        [0, Math.PI / 2, 0],
      );
      for (let k = 0; k < 26; k++) {
        const a = (k / 26) * Math.PI * 2,
          blade = new T.Shape();
        blade.moveTo(0.28, 0);
        blade.quadraticCurveTo(rad * 0.58, 0.18, rad * 0.73, 0.02);
        blade.lineTo(rad * 0.72, -0.13);
        blade.quadraticCurveTo(rad * 0.5, -0.04, 0.28, -0.07);
        blade.closePath();
        const bg = new T.ShapeGeometry(blade);
        bg.rotateZ(a);
        bg.rotateY(Math.PI / 2);
        add(bg, shared.fan, [ex + len * 0.205, ey, ez]);
      }
      add(
        new T.ConeGeometry(rad * 0.2, rad * 0.5, 20),
        shared.alloy,
        [ex + len * 0.29, ey, ez],
        [0, 0, -Math.PI / 2],
      );
      add(
        new T.ConeGeometry(rad * 0.48, len * 0.4, 28),
        shared.alloy,
        [ex - len * 0.42, ey, ez],
        [0, 0, Math.PI / 2],
      );
      const pylon = new T.Shape(),
        wy = wingAt(stations, Math.abs(ez))[3] - ey;
      pylon.moveTo(-2, rad * 0.65);
      pylon.lineTo(2.4, rad * 0.65);
      pylon.lineTo(0.65, wy + 0.02);
      pylon.lineTo(-2, wy + 0.02);
      pylon.closePath();
      add(
        new T.ExtrudeGeometry(pylon, { depth: 0.44, bevelEnabled: false }),
        shared.wing,
        [ex - 1, ey, ez - 0.22],
      );
      if (type === "B789")
        for (let k = 0; k < 18; k++) {
          const a = (k * Math.PI) / 9;
          add(
            new T.ConeGeometry(0.17, 0.6, 3),
            enginePaint,
            [
              ex - len * 0.5 - 0.12,
              ey + Math.cos(a) * rad * 0.78,
              ez + Math.sin(a) * rad * 0.78,
            ],
            [0, 0, Math.PI / 2],
          );
        }
      const label = new T.PlaneGeometry(rad * 1.4, rad * 0.7);
      add(
        label,
        markings,
        [ex, ey, ez + side * (rad + 0.012)],
        [0, side < 0 ? Math.PI : 0, 0],
      );
    }
    const wide = type === "A388" ? 2.8 : type === "A320" ? 1.8 : 2.72;
    const h = type === "A388" ? 1.05 : type === "A320" ? 0.95 : 1.3;
    const panes = [
      [
        [0.035, h],
        [wide * 0.61, h * 0.98],
        [wide * 0.64, h * 0.27],
        [0.035, h * 0.29],
      ],
      [
        [wide * 0.64, h * 0.97],
        [wide * 0.96, h * 0.68],
        [wide * 0.97, h * 0.2],
        [wide * 0.67, h * 0.27],
      ],
    ];
    if (type === "A35K") {
      add(
        cockpitPanel(
          s,
          side,
          [
            [0.012, h + 0.12],
            [wide, h * 0.77],
            [wide * 1.015, h * 0.11],
            [0.012, h * 0.2],
          ],
          0.07,
        ),
        shared.dark,
      );
    }
    for (const pane of panes)
      add(cockpitPanel(s, side, pane, 0.13), shared.glass);
  }
  // Fin proportions and texture orientation are independent of fuselage markings.
  const finPoints = [
    [-L * 0.465, 1],
    [-L * 0.455, s.fin],
    [-L * 0.397, s.fin],
    [-L * 0.253, 1],
  ];
  for (const side of [-1, 1]) {
    const sh = new T.Shape(finPoints.map(([x, y]) => new T.Vector2(x, y)));
    const geo = new T.ShapeGeometry(sh);
    const pos = geo.attributes.position,
      uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++)
      uv.setXY(
        i,
        (pos.getX(i) + L * 0.465) / (L * 0.212),
        (pos.getY(i) - 1) / (s.fin - 1),
      );
    add(
      geo,
      new T.MeshStandardMaterial({
        map: tailLivery(airline, side < 0),
        side: T.DoubleSide,
        roughness: 0.32,
        metalness: 0.16,
      }),
      [0, 0, side * 0.17],
    );
  }
  const finEdge = new T.Shape(finPoints.map(([x, y]) => new T.Vector2(x, y)));
  add(
    new T.ExtrudeGeometry(finEdge, { depth: 0.32, bevelEnabled: false }),
    enginePaint,
    [0, 0, -0.16],
  );
  // Radio aerials, wing-root fairing and tail APU outlet.
  add(
    new T.SphereGeometry(1, 24, 12),
    shared.white,
    [-2, -s.ry * 0.7, 0],
    [0, 0, 0],
    [L * 0.15, s.ry * 0.6, s.rx * 1.2],
  );
  add(
    new T.CylinderGeometry(0.22, 0.32, 0.9, 16),
    shared.dark,
    [-L * 0.495, 0.6, 0],
    [0, 0, Math.PI / 2],
  );
  for (const x of [-L * 0.13, L * 0.16])
    add(
      new T.BoxGeometry(0.8, 0.65, 0.08),
      shared.white,
      [x, s.ry + 0.22, 0],
      [0, 0, -0.25],
    );
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(
      geos.map((g) => (g.index ? g.toNonIndexed() : g)),
    );
    const m = new T.Mesh(merged, mat);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    for (const g of geos) g.dispose();
  }
  const gear = new T.Group();
  gear.name = "gear";
  const wheel = (x, y, z, r) => {
    const tyre = new T.Mesh(
      new T.CylinderGeometry(r, r, 0.32, 20),
      shared.rubber,
    );
    tyre.rotation.x = Math.PI / 2;
    tyre.position.set(x, y, z);
    gear.add(tyre);
    const hub = new T.Mesh(
      new T.CylinderGeometry(r * 0.44, r * 0.44, 0.34, 16),
      shared.alloy,
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(tyre.position);
    gear.add(hub);
  };
  const gearLayout = {
    A35K: [
      [L * 0.365, 0, 1, false],
      [-5.2, -5.3, 3, true],
      [-5.2, 5.3, 3, true],
    ],
    B77W: [
      [L * 0.355, 0, 1, false],
      [-5.5, -5.5, 3, true],
      [-5.5, 5.5, 3, true],
    ],
    A388: [
      [L * 0.365, 0, 1, false],
      [-5, -6.9, 2, true],
      [-5, 6.9, 2, true],
      [-9.2, -2.7, 3, true],
      [-9.2, 2.7, 3, true],
    ],
    A320: [
      [L * 0.35, 0, 1, false],
      [-2.5, -3.8, 1, true],
      [-2.5, 3.8, 1, true],
    ],
    B789: [
      [L * 0.355, 0, 1, false],
      [-4.7, -4.9, 2, true],
      [-4.7, 4.9, 2, true],
    ],
  }[type];
  const link = (a, b, r, mat = shared.alloy) => {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      delta = end.clone().sub(start);
    const mesh = new T.Mesh(
      new T.CylinderGeometry(r, r, delta.length(), 12),
      mat,
    );
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.normalize(),
    );
    gear.add(mesh);
  };
  for (const [x, z, axles, main] of gearLayout) {
    const r = main ? (type === "A320" ? 0.57 : 0.68) : 0.46,
      y = -s.gear + r;
    const attach = -s.ry * 0.65;
    link([x, attach, z], [x, y + 0.25, z], main ? 0.18 : 0.11);
    link([x, y + 0.25, z], [x, y + 1.1, z], main ? 0.13 : 0.08, shared.white);
    link([x + 1.25, attach, z], [x, y + 0.6, z], 0.085);
    if (axles > 1)
      link(
        [x - (axles - 1) * 0.56, y, z],
        [x + (axles - 1) * 0.56, y, z],
        0.17,
        shared.dark,
      );
    for (let a = 0; a < axles; a++) {
      const wx = x + (a - (axles - 1) / 2) * 1.12;
      link([wx, y, z - 0.48], [wx, y, z + 0.48], 0.12);
      for (const side of [-1, 1]) wheel(wx, y, z + side * 0.43, r);
    }
    const door = new T.Mesh(
      new T.BoxGeometry(main ? 1.15 : 0.6, main ? 1.1 : 0.85, 0.065),
      shared.white,
    );
    door.position.set(x, attach - 0.35, z + (z < 0 ? -0.3 : 0.3));
    gear.add(door);
  }
  group.userData.wheelCount = gearLayout.reduce((n, g) => n + g[2] * 2, 0);
  group.add(gear);
  const nav = new T.Group();
  nav.name = "nav";
  for (const [x, y, z, color] of [
    [wingStations[type].at(-1)[1], wingStations[type].at(-1)[3], -S, 0xff2929],
    [wingStations[type].at(-1)[1], wingStations[type].at(-1)[3], S, 0x62ffbc],
    [-L * 0.49, 1, 0, 0xffffff],
  ]) {
    const m = new T.Mesh(
      new T.SphereGeometry(0.16, 6, 6),
      new T.MeshBasicMaterial({ color }),
    );
    m.position.set(x, y, z);
    nav.add(m);
  }
  group.add(nav);
  return group;
}
export function aircraft(airline = "BA", type = "B789") {
  const parked = typeof type === "boolean";
  if (parked) type = type ? "A388" : "B789";
  const imported = detailedAircraft(airline, type, parked);
  if (imported) return imported;
  if (type === "A20N") type = "A320";
  if (!AIRFRAMES[type]) type = "B789";
  const key = airline + type;
  if (!cache.has(key)) cache.set(key, build(airline, type));
  return cache.get(key).clone(true);
}
