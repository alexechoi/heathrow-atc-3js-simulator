import * as T from "three";

// Dimensions follow mapped footprints; profiles and details are studied from the
// photographs linked in docs/references.md, rather than reusing one generic shed.
export function buildTerminals({ put, box, cyl }) {
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
  function jetbridge(x, z, side, length = 25, dark = false, angled = 8) {
    // Fixed gallery, pivot, telescoping tunnel, cab, bellows and wheeled support.
    const m = dark ? "dark" : "white";
    box(x + side * 4, 7.3, z, 8, 7, 8, dark ? "dark" : "white");
    box(x + side * 4, 9.3, z - side * 4.05, 7, 2, 0.12, "glass");
    const a = [x + side * 8, 8, z],
      b = [x + side * (length + 8), 8, z + angled];
    const dx = b[0] - a[0],
      dz = b[2] - a[2],
      len = Math.hypot(dx, dz),
      rot = -Math.atan2(dz, dx);
    box((a[0] + b[0]) / 2, 8, (a[2] + b[2]) / 2, len, 3.7, 3.5, m, rot);
    box((a[0] + b[0]) / 2, 10, (a[2] + b[2]) / 2, len, 0.35, 3.7, "steel", rot);
    for (let k = 4; k < len; k += 3) {
      const u = k / len;
      box(a[0] + dx * u, 8, a[2] + dz * u, 0.14, 3.6, 3.65, "steel", rot);
    }
    box(b[0], 7.9, b[2], 5, 4.4, 5, m, rot);
    box(b[0] + side * 2.8, 7.9, b[2], 1.4, 3.5, 3.6, "dark", rot);
    cyl(b[0] - side * 1.8, 3.5, b[2], 0.35, 7);
    for (const zz of [-1.6, 1.6])
      box(b[0] - side * 1.8, 0.75, b[2] + zz, 1.5, 1.5, 0.5, "dark");
  }
  function barrel({ x, z, w, d, eave, rise, main = false }) {
    // T5 has a shallow ogee roof, closed glazed gables, thin silver fascia,
    // and a solid service level. Satellite ends have low, flat annex roofs.
    const profile = (u) =>
      eave + rise * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
    const coreD = main ? d : d - 46;
    box(x, 3.3, z, w - 2, 6.6, d, "concrete");
    box(x, (eave + 6) / 2, z, w - 2, eave - 6, coreD, "glass");
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
    // T5A's transverse rooflights and roof-mounted service cradles.
    for (let zz = -coreD / 2 + 16; zz < coreD / 2 - 8; zz += main ? 18 : 42) {
      if (main)
        skin(
          x,
          z,
          w - 5,
          coreD,
          (u) => profile(u) + 0.09,
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
        );
    if (main) {
      // Departures viaduct, glazed pedestrian links and repeated canopy modules.
      box(x - w / 2 - 22, 9, z, 17, 1.2, d + 20, "dark");
      for (let zz = -d / 2 + 12; zz < d / 2; zz += 27) {
        box(x - w / 2 - 22, 12, z + zz, 20, 0.45, 20, "white");
        cyl(x - w / 2 - 30, 6, z + zz, 0.45, 12);
        box(x - w / 2 - 9, 9, z + zz, 18, 3.6, 5, "glass");
      }
    }
  }
  barrel({ x: -1894, z: -43, w: 171, d: 391, eave: 29, rise: 11, main: true });
  barrel({ x: -1432, z: 37, w: 58, d: 433, eave: 18, rise: 5.2 });
  barrel({ x: -1071, z: 26, w: 46, d: 345, eave: 17, rise: 4.8 });

  // Terminal 2B is a flat-roofed pier with projecting dark gate pods.
  const x = 1217,
    z = -19,
    w = 66,
    d = 522;
  box(x, 5, z, w, 10, d, "concrete");
  box(x, 14, z, w, 8, d, "glass");
  box(x, 18.6, z, w + 3, 1.2, d + 3, "cladding");
  box(x, 19.3, z, w - 3, 0.15, d - 3, "gravel");
  for (const side of [-1, 1]) {
    serviceRoad(x + side * (w / 2 + 19), z, 7, d + 10);
    box(x + side * (w / 2 + 1), 9.5, z, 1, 1.2, d, "steel");
    for (let zz = -d / 2 + 25; zz < d / 2; zz += 52) {
      box(x + side * (w / 2 + 5), 10.5, z + zz, 12, 13, 12, "dark");
      box(x + side * (w / 2 + 11.1), 13, z + zz, 0.2, 5, 10, "glass");
      jetbridge(x + side * (w / 2 + 11), z + zz, side, 17, true, side * 9);
    }
  }
  for (let zz = -235; zz < 235; zz += 22)
    box(x, 19.5, z + zz, 2, 0.2, 11, "rooflight");

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
    const profile = (u) => 32 + 7 * Math.sin(u * Math.PI * 2 - 0.8);
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
