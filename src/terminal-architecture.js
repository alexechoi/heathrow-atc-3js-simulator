import * as T from "three";

// Dimensions follow mapped footprints; profiles and details are studied from the
// photographs linked in docs/references.md, rather than reusing one generic shed.
export const TERMINAL_MODELS = {
  T5A: { name: "Terminal 5A", center: [-1894, -43], width: 171, length: 391 },
  T5B: { name: "Terminal 5B", center: [-1432, 37], width: 58, length: 433 },
  T5C: { name: "Terminal 5C", center: [-1071, 26], width: 46, length: 345 },
  T2B: { name: "Terminal 2B", center: [1217, -19], width: 35, length: 522 },
  T2A: { name: "Terminal 2A", center: [783, 156], width: 304, length: 244 },
};
export function buildTerminals({ put, box, cyl }, only = null) {
  // Reuse the articulated bridge assembly on the end gates as well as the sides.
  const emit = put;
  let assemblyTransform = null;
  put = (g, mat, x = 0, y = 0, z = 0, ry = 0) => {
    if (!assemblyTransform) return emit(g, mat, x, y, z, ry);
    g.rotateY(ry);
    g.translate(x, y, z);
    g.applyMatrix4(assemblyTransform);
    emit(g, mat);
  };
  box = (x, y, z, w, h, d, mat = "concrete", ry = 0) =>
    put(new T.BoxGeometry(w, h, d), mat, x, y, z, ry);
  cyl = (x, y, z, r, h, mat = "steel", n = 10) =>
    put(new T.CylinderGeometry(r, r, h, n), mat, x, y, z);

  function serviceRoad(x, z, width, length) {
    const g = new T.PlaneGeometry(width, length);
    g.rotateX(-Math.PI / 2);
    put(g, "runway", x, 0.055, z);
    for (let zz = z - length / 2; zz < z + length / 2; zz += 9) {
      const dash = new T.PlaneGeometry(0.16, 4);
      dash.rotateX(-Math.PI / 2);
      put(dash, "paint", x, 0.085, zz);
    }
    for (const side of [-1, 1]) {
      const line = new T.PlaneGeometry(0.18, length);
      line.rotateX(-Math.PI / 2);
      put(line, "paint", x + side * (width / 2 - 0.3), 0.085, z);
    }
  }
  function beam(a, b, radius = 0.18, mat = "steel") {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b);
    const delta = end.clone().sub(start);
    const g = new T.CylinderGeometry(radius, radius, delta.length(), 6);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        delta.normalize(),
      ),
    );
    g.translate(...start.add(end).multiplyScalar(0.5).toArray());
    put(g, mat);
  }
  function skin(x, z, w, d, profile, mat = "roof", dz = 0, length = d) {
    const positions = [],
      uv = [],
      indices = [],
      n = 48;
    for (let j = 0; j < 2; j++)
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        positions.push(
          x + (u - 0.5) * w,
          profile(u),
          z + dz + (j - 0.5) * length,
        );
        uv.push(u, j);
      }
    for (let i = 0; i < n; i++)
      indices.push(i, i + n + 1, i + 1, i + 1, i + n + 1, i + n + 2);
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    put(g, mat);
  }
  function gable(x, z, w, profile) {
    const s = new T.Shape();
    s.moveTo(-w / 2, 6);
    for (let i = 0; i <= 48; i++)
      s.lineTo((i / 48 - 0.5) * w, profile(i / 48) - 0.55);
    s.lineTo(w / 2, 6);
    s.closePath();
    const g = new T.ExtrudeGeometry(s, {
      depth: 0.3,
      bevelEnabled: false,
      steps: 1,
    });
    put(g, "glass", x, 0, z);
    for (let xx = -w / 2; xx <= w / 2; xx += w / 18) {
      const h = profile(xx / w + 0.5) - 0.7;
      box(x + xx, h / 2 + 3, z, 0.45, h - 6, 0.55, "steel");
    }
    for (let y = 8; y < profile(0); y += 2.3)
      box(x, y, z, w, 0.12, 0.3, "steel");
  }
  function jetbridge(
    x,
    z,
    side,
    length = 25,
    dark = false,
    angled = 8,
    dual = false,
  ) {
    const housing = dark ? "dark" : "white";
    box(x + side * 3, 7.6, z, 6, 4.6, 5.4, housing);
    box(x + side * 3, 10, z, 6.4, 0.28, 5.8, "steel");
    box(x + side * 3, 8.2, z - 2.76, 4.8, 1.6, 0.08, "glass");
    const pivot = [x + side * 7, 7.7, z];
    cyl(pivot[0], 7.6, z, 2.15, 3.5, housing, 20);
    cyl(pivot[0], 2.7, z, 0.38, 5.4);
    function tunnel(a, b, width, height) {
      const dx = b[0] - a[0],
        dz = b[2] - a[2],
        len = Math.hypot(dx, dz),
        angle = -Math.atan2(dz, dx);
      const cx = (a[0] + b[0]) / 2,
        cz = (a[2] + b[2]) / 2,
        cy = (a[1] + b[1]) / 2;
      box(cx, cy, cz, len, height, width, "white", angle);
      box(
        cx,
        cy + height / 2 + 0.13,
        cz,
        len + 0.3,
        0.26,
        width + 0.24,
        "steel",
        angle,
      );
      box(
        cx,
        cy - height / 2 - 0.1,
        cz,
        len + 0.25,
        0.2,
        width + 0.2,
        "dark",
        angle,
      );
      for (let d = 1; d < len - 0.5; d += 2.4) {
        const u = d / len;
        box(
          a[0] + dx * u,
          cy,
          a[2] + dz * u,
          0.08,
          height + 0.12,
          width + 0.1,
          "steel",
          angle,
        );
      }
      for (const sign of [-1, 1]) {
        const nx = (-dz / len) * sign,
          nz = (dx / len) * sign;
        box(
          cx + nx * (width / 2 + 0.03),
          cy + 0.25,
          cz + nz * (width / 2 + 0.03),
          len - 0.6,
          0.58,
          0.055,
          "glass",
          angle,
        );
      }
    }
    function arm(start, end, raised = false) {
      const joint = [
        start[0] + (end[0] - start[0]) * 0.53,
        start[1],
        start[2] + (end[2] - start[2]) * 0.37,
      ];
      tunnel(start, joint, 3.35, 3.15);
      tunnel(joint, end, 2.9, 2.85);
      const angle = -Math.atan2(end[2] - joint[2], end[0] - joint[0]);
      box(end[0], end[1], end[2], 3.5, 3.5, 3.6, "white", angle);
      box(end[0], end[1] + 0.7, end[2] + 1.83, 2.7, 1.05, 0.06, "glass", angle);
      for (let b = 0; b < 7; b++)
        box(
          end[0] + side * (1.9 + b * 0.18),
          end[1],
          end[2],
          0.13,
          2.85,
          3.2,
          b % 2 ? "dark" : "steel",
          angle,
        );
      const sx = end[0] - side * 2.2,
        sz = end[2];
      for (const v of [-0.8, 0.8])
        cyl(sx, (end[1] - 1.6) / 2, sz + v, 0.18, end[1] - 1.6);
      box(sx, 0.85, sz, 2.6, 0.35, 3.4, "steel");
      for (const v of [-1.5, 1.5])
        for (const u of [-0.65, 0.65]) {
          const wheel = new T.CylinderGeometry(0.55, 0.55, 0.35, 14);
          wheel.rotateX(Math.PI / 2);
          put(wheel, "dark", sx + u, 0.55, sz + v);
        }
      if (!raised) {
        for (let i = 0; i < 13; i++)
          box(
            end[0] - side * (i * 0.42),
            0.3 + i * 0.43,
            end[2] + 3.5,
            0.48,
            0.12,
            1.1,
            "steel",
          );
        for (const v of [3, 4])
          beam(
            [end[0], 1.3, end[2] + v],
            [end[0] - side * 5.2, 6.6, end[2] + v],
            0.055,
          );
      }
    }
    arm(pivot, [x + side * (length + 10), 7.2, z + angled]);
    if (dual)
      arm(
        [pivot[0], 7.7, z - 5],
        [x + side * (length + 17), 7.2, z + angled - 9],
        true,
      );
  }
  function barrel({ x, z, w, d, eave, rise, main = false }) {
    // T5 has a shallow ogee roof, closed glazed gables, thin silver fascia,
    // and a solid service level. Satellite ends have low, flat annex roofs.
    const profile = (u) =>
      eave + rise * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
    const coreD = main ? d : d - 46;
    box(x, 3.3, z, w - 2, 6.6, d, "concrete");
    box(x, (eave + 6) / 2, z, w - 2, eave - 6, coreD, "glass");
    for (const y of main ? [7.2, 13.8, 20.4] : [6.6, 11.8]) {
      for (const side of [-1, 1])
        box(x + side * (w / 2 - 0.7), y, z, 0.55, 0.42, coreD, "steel");
    }
    skin(x, z, w + 5, coreD + 5, profile);
    gable(x, z - coreD / 2 - 0.1, w - 2, profile);
    gable(x, z + coreD / 2 - 0.1, w - 2, profile);
    for (const sign of [-1, 1]) {
      if (!main || sign === 1)
        serviceRoad(x + sign * (w / 2 + 12), z, 7, coreD + 15);
      for (let i = 0; i < 48; i++)
        beam(
          [
            x + (i / 48 - 0.5) * (w + 5),
            profile(i / 48),
            z + sign * (coreD / 2 + 2.5),
          ],
          [
            x + ((i + 1) / 48 - 0.5) * (w + 5),
            profile((i + 1) / 48),
            z + sign * (coreD / 2 + 2.5),
          ],
          0.35,
        );
      box(x + sign * (w / 2 + 2), eave - 0.45, z, 0.7, 0.8, coreD + 5, "steel");
      for (let zz = -coreD / 2; zz <= coreD / 2; zz += main ? 18 : 12) {
        box(
          x + sign * (w / 2 - 0.5),
          eave / 2,
          z + zz,
          0.45,
          eave,
          0.45,
          "steel",
        );
        if (main)
          beam(
            [x + sign * (w / 2 - 4), 7, z + zz],
            [x + sign * (w / 2 + 1), eave - 1, z + zz],
            0.25,
          );
      }
      if (!main) {
        box(x, 4, z + sign * (d / 2 - 10), w + 4, 8, 28, "glass");
        box(x, 8.3, z + sign * (d / 2 - 10), w + 8, 0.7, 30, "steel");
        box(x, 8.7, z + sign * (d / 2 - 10), w - 2, 0.15, 23, "gravel");
      }
    }
    // Exposed shallow roof trusses and the paired gutters visible at the gables.
    for (const end of [-1, 1]) {
      const zz = z + end * (coreD / 2 + 0.32);
      for (let i = 0; i < 16; i++) {
        const u = i / 16,
          v = (i + 1) / 16;
        beam(
          [x + (u - 0.5) * w, profile(u) - 1.6, zz],
          [x + (v - 0.5) * w, profile(v) - 1.6, zz],
          0.12,
        );
        beam(
          [x + (u - 0.5) * w, profile(u) - 1.6, zz],
          [x + (v - 0.5) * w, profile(v) - 0.25, zz],
          0.09,
        );
      }
    }
    // T5A's transverse rooflights and roof-mounted service cradles.
    for (let zz = -coreD / 2 + 16; zz < coreD / 2 - 8; zz += main ? 18 : 42) {
      if (main)
        skin(
          x,
          z,
          w - 5,
          coreD,
          (u) => profile(0.5 + ((u - 0.5) * (w - 5)) / (w + 5)) + 0.16,
          "rooflight",
          zz,
          2.5,
        );
      for (const xx of main ? [-w * 0.29, 0, w * 0.29] : [0]) {
        const y = profile(xx / w + 0.5) + 0.55;
        box(x + xx, y, z + zz, 3.4, 0.65, 4.8, "steel");
        beam([x + xx - 1.3, y + 0.5, z + zz - 2], [x + xx, y + 2, z + zz], 0.1);
        beam([x + xx + 1.3, y + 0.5, z + zz - 2], [x + xx, y + 2, z + zz], 0.1);
      }
    }
    // T5A has landside access on the west; no aircraft gates on that facade.
    for (let zz = -coreD / 2 + 22; zz < coreD / 2 - 8; zz += main ? 35 : 49)
      for (const side of main ? [1] : [-1, 1])
        jetbridge(
          x + (side * w) / 2,
          z + zz,
          side,
          main ? 27 : 22,
          false,
          side * 8,
          !main && Math.round((zz + coreD / 2 - 22) / 49) % 3 === 0,
        );
    if (main) {
      for (const end of [-1, 1])
        for (const fraction of [-0.3, 0, 0.3]) {
          assemblyTransform = new T.Matrix4()
            .makeTranslation(x + w * fraction, 0, z + (end * d) / 2)
            .multiply(new T.Matrix4().makeRotationY((-end * Math.PI) / 2));
          jetbridge(0, 0, 1, 27, false, fraction * 16);
          assemblyTransform = null;
        }
      // Departures viaduct, glazed pedestrian links and repeated canopy modules.
      box(x - w / 2 - 22, 9, z, 17, 1.2, d + 20, "dark");
      for (let zz = -d / 2 + 12; zz < d / 2; zz += 27) {
        box(x - w / 2 - 22, 12, z + zz, 20, 0.45, 20, "white");
        cyl(x - w / 2 - 30, 6, z + zz, 0.45, 12);
        box(x - w / 2 - 9, 9, z + zz, 18, 3.6, 5, "glass");
      }
    }
  }
  if (!only || only === "T5A")
    barrel({
      x: -1894,
      z: -43,
      w: 171,
      d: 391,
      eave: 29,
      rise: 14,
      main: true,
    });
  if (!only || only === "T5B")
    barrel({ x: -1432, z: 37, w: 58, d: 433, eave: 18, rise: 5.2 });
  if (!only || only === "T5C")
    barrel({ x: -1071, z: 26, w: 46, d: 345, eave: 17, rise: 4.8 });

  if (!only || only === "T2B") {
    // Terminal 2B is a flat-roofed pier with projecting dark gate pods.
    const x = 1217,
      z = -19,
      w = 35,
      d = 522;
    box(x, 3.4, z, w, 6.8, d, "cladding");
    box(x, 8.4, z, w, 3.2, d, "glass");
    box(x, 10.8, z, w + 0.3, 1.6, d, "cladding");
    box(x, 14.1, z, w, 5, d, "glass");
    box(x, 18.6, z, w + 3, 1.2, d + 3, "cladding");
    box(x, 19.3, z, w - 3, 0.15, d - 3, "roof");
    for (const side of [-1, 1]) {
      serviceRoad(x + side * (w / 2 + 19), z, 7, d + 10);
      box(x + side * (w / 2 + 1), 9.5, z, 1, 1.2, d, "steel");
      for (let zz = -d / 2 + 43; zz < d / 2; zz += 64) {
        box(x + side * (w / 2 + 5), 10.5, z + zz, 10, 11, 14, "dark");
        box(x + side * (w / 2 + 11.1), 13, z + zz, 0.2, 5, 10, "glass");
        jetbridge(
          x + side * (w / 2 + 11),
          z + zz,
          side,
          22,
          true,
          side * 9,
          true,
        );
      }
    }
    for (let zz = -235; zz < 235; zz += 22)
      box(x, 19.5, z + zz, 2, 0.2, 11, "rooflight");

    for (const end of [-1, 1]) {
      box(x, 12.2, z + end * (d / 2 + 0.4), w + 1, 10, 0.6, "steel");
      box(x, 12.4, z + end * (d / 2 + 0.75), w - 1.6, 7.8, 0.08, "glass");
      box(x, 7.7, z + end * (d / 2 + 3), w + 7, 0.5, 8, "steel");
    }
    for (let zz = -230; zz < 235; zz += 32) {
      for (const side of [-1, 1])
        box(x + side * 11, 19.6, z + zz, 2.7, 0.8, 5.5, "steel");
    }
  }
  if (!only || only === "T2A") {
    // T2A: three shallow waves running east–west, with clerestory strips.
    // Its main hall covers the broad southern portion of the mapped footprint.
    box(783, 12, 156, 304, 24, 244, "cladding");
    box(783, 20, 279, 304, 20, 0.5, "glass");
    box(936, 19, 156, 0.5, 22, 242, "glass");
    const waveWidth = 82;
    for (let j = 0; j < 3; j++) {
      const center = 74 + j * waveWidth;
      const positions = [],
        uv = [],
        indices = [],
        n = 32;
      const profile = (u) => 31 + 4.5 * Math.sin(u * Math.PI * 2 - 0.8);
      for (let a = 0; a < 2; a++)
        for (let i = 0; i <= n; i++) {
          positions.push(
            627 + a * 314,
            profile(i / n),
            center + (i / n - 0.5) * waveWidth,
          );
          uv.push(a, i / n);
        }
      for (let i = 0; i < n; i++)
        indices.push(i, i + 1, i + n + 1, i + 1, i + n + 2, i + n + 1);
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      g.setIndex(indices);
      g.computeVertexNormals();
      put(g, "roof");
      for (const xx of [627, 941]) {
        const s = new T.Shape();
        s.moveTo(center - waveWidth / 2, 23);
        for (let i = 0; i <= n; i++)
          s.lineTo(center + (i / n - 0.5) * waveWidth, profile(i / n));
        s.lineTo(center + waveWidth / 2, 23);
        s.closePath();
        const wall = new T.ShapeGeometry(s);
        wall.rotateY(-Math.PI / 2);
        put(wall, "glass", xx, 0, 0);
      }
      box(784, 32, center + 27, 310, 0.45, 3, "rooflight");
    }
    for (let xx = 640; xx < 940; xx += 20) {
      cyl(xx, 15.5, 291, 0.35, 31);
      box(xx, 13.5, 291, 17, 0.5, 15, "steel");
    }
  }
}
