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
  let i = 0;
  while (i < profile.length - 2 && t > profile[i + 1][0]) i++;
  const a = profile[i],
    b = profile[i + 1];
  const u = T.MathUtils.clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  const f = u * u * (3 - 2 * u);
  return {
    r: T.MathUtils.lerp(a[1], b[1], f),
    cy: T.MathUtils.lerp(a[2], b[2], f) * s.ry,
  };
}
function shell(s, segments = 90, rings = 48) {
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
    n = 18;
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
        uv.push(u, i / (sections.length - 1));
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
  for (const side of [-1, 1]) {
    const winglets = type === "A35K" || type === "A320";
    const sections = [
      [s.rx * 0.65, L * 0.12, -L * 0.17, -s.ry * 0.43, 0.115],
      [S * 0.34, L * 0.025, -L * 0.18, -s.ry * 0.35, 0.1],
      [S * 0.7, -L * 0.12, -L * 0.235, 0.7, 0.085],
      [S * 0.91, -L * 0.205, -L * 0.263, 1.8, 0.075],
      [S, -L * 0.255, -L * 0.283, winglets ? 4.5 : 2.5, 0.05],
    ];
    add(aerofoil(sections, side), shared.wing);
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
    // Flap-track fairings and panel seams articulate the wing instead of flat slabs.
    for (const z of [S * 0.28, S * 0.44, S * 0.61])
      add(
        new T.SphereGeometry(1, 12, 8),
        shared.white,
        [-L * 0.16, -0.8, side * z],
        [0, 0, 0],
        [3.1, 0.32, 0.34],
      );
    for (const fraction of [0.32, 0.52, 0.72]) {
      const z = S * fraction,
        xx = L * (0.04 - fraction * 0.26);
      add(
        new T.BoxGeometry(L * 0.07, 0.025, 0.08),
        shared.dark,
        [xx, Math.max(0.18, 3 * fraction - 1), side * z],
        [0, 0, 0],
      );
    }
    if (type === "A388")
      add(new T.BoxGeometry(1.4, 2.4, 0.12), enginePaint, [
        -L * 0.265,
        2.7,
        side * S,
      ]);
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
      const pylon = new T.Shape();
      pylon.moveTo(-2, -0.2);
      pylon.lineTo(2.7, -0.2);
      pylon.lineTo(0.7, 2.7);
      pylon.lineTo(-2, 2.1);
      pylon.closePath();
      add(
        new T.ExtrudeGeometry(pylon, { depth: 0.48, bevelEnabled: false }),
        shared.wing,
        [ex - 1, ey, ez - 0.24],
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
    // Cockpit panes follow the actual nose surface; A350 has the broad dark mask.
    for (let i = 0; i < 3; i++) {
      const xa = 0.371 + i * 0.025,
        xb = xa + 0.023,
        thetaA = type === "A388" ? 0.98 : 0.85,
        thetaB = type === "A388" ? 1.27 : 1.28;
      const verts = [],
        uv = [],
        indices = [],
        nx = 8,
        ny = 4;
      for (let i = 0; i <= nx; i++)
        for (let j = 0; j <= ny; j++) {
          const t = T.MathUtils.lerp(xa, xb, i / nx),
            angle = T.MathUtils.lerp(thetaA, thetaB, j / ny),
            { r, cy } = cross(t, s);
          verts.push(
            t * L,
            Math.cos(angle) * (s.ry * r + 0.04) + cy,
            side * Math.sin(angle) * (s.rx * r + 0.04),
          );
          uv.push(i / nx, j / ny);
          if (i < nx && j < ny) {
            const k = i * (ny + 1) + j;
            const face = [k, k + ny + 1, k + 1, k + 1, k + ny + 1, k + ny + 2];
            for (let n = 0; n < 6; n += 3)
              indices.push(
                ...(side > 0
                  ? [face[n], face[n + 2], face[n + 1]]
                  : [face[n], face[n + 1], face[n + 2]]),
              );
          }
        }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      g.setIndex(indices);
      g.computeVertexNormals();
      add(g, shared.glass);
    }
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
  for (const [x, z, main] of [
    [L * 0.34, 0, false],
    [-L * 0.07, -s.rx * 0.8, true],
    [-L * 0.07, s.rx * 0.8, true],
    ...(type === "A388"
      ? [
          [-L * 0.12, -s.rx * 1.5, true],
          [-L * 0.12, s.rx * 1.5, true],
        ]
      : []),
  ]) {
    const r = main ? 0.62 : 0.43,
      y = -s.gear + r;
    const strut = new T.Mesh(
      new T.CylinderGeometry(0.12, 0.16, Math.max(0.6, s.gear - s.ry), 10),
      shared.alloy,
    );
    strut.position.set(x, (y - s.ry) / 2, z);
    gear.add(strut);
    const axles = main
      ? type === "A320"
        ? 1
        : type === "B77W" || type === "A35K"
          ? 3
          : 2
      : 1;
    for (let a = 0; a < axles; a++)
      for (const side of [-1, 1])
        wheel(x + (a - (axles - 1) / 2) * 1.05, y, z + side * 0.38, r);
  }
  group.add(gear);
  const nav = new T.Group();
  nav.name = "nav";
  for (const [x, y, z, color] of [
    [-L * 0.26, 2.6, -S, 0xff2929],
    [-L * 0.26, 2.6, S, 0x62ffbc],
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
  if (typeof type === "boolean") type = type ? "A388" : "B789";
  if (!AIRFRAMES[type]) type = "B789";
  const key = airline + type;
  if (!cache.has(key)) cache.set(key, build(airline, type));
  return cache.get(key).clone(true);
}
