import * as T from "three";

// Paint is metre-scaled vector geometry, independent of satellite/canvas resolution.
export function buildRunwayMarkings({ runways, put, box }) {
  const glyphs = {
    0: [
      [0, 0, 5, 1],
      [0, 0, 1, 7],
      [4, 0, 1, 7],
      [0, 6, 5, 1],
    ],
    2: [
      [0, 0, 5, 1],
      [4, 0, 1, 3.5],
      [0, 3, 5, 1],
      [0, 3, 1, 4],
      [0, 6, 5, 1],
    ],
    7: [
      [0, 0, 5, 1],
      [4, 0, 1, 7],
    ],
    9: [
      [0, 0, 5, 1],
      [0, 0, 1, 4],
      [0, 3, 5, 1],
      [4, 0, 1, 7],
      [0, 6, 5, 1],
    ],
    L: [
      [0, 0, 1, 7],
      [0, 6, 5, 1],
    ],
    R: [
      [0, 0, 1, 7],
      [0, 0, 5, 1],
      [4, 0, 1, 4],
      [0, 3, 5, 1],
      [3, 4, 1, 1],
      [4, 5, 1, 2],
    ],
  };
  let count = 0;
  for (const [id, r] of Object.entries(runways)) {
    const hi = r.threshold,
      lo = hi - r.length;
    box((hi + lo) / 2, 0.1, r.z, r.length, 0.02, 50, "runway");
    for (const side of [-1, 1]) {
      const end = side > 0 ? hi : lo;
      function rect(inward, lateral, len, width, mat = "paint") {
        const g = new T.PlaneGeometry(len, width);
        g.rotateX(-Math.PI / 2);
        put(g, mat, end - side * inward, 0.13, r.z - side * lateral);
        count++;
      }
      rect(r.length / 2, 24, r.length, 0.9);
      rect(r.length / 2, -24, r.length, 0.9);
      for (const half of [-1, 1])
        for (let j = 0; j < 6; j++) rect(22, half * (3.5 + j * 3.15), 30, 1.8);
      const designation = side > 0 ? id : "09" + (id === "27R" ? "L" : "R");
      function glyph(char, inward, lateral, scaleU, scaleV) {
        if (char === "7") {
          const pts = [
            [0, 0],
            [5, 0],
            [5, 1],
            [2.2, 7],
            [0.8, 7],
            [3.65, 1.05],
            [0, 1.05],
          ];
          const shape = new T.Shape();
          pts.forEach(([u, v], i) => {
            const x = end - side * (inward + (7 - v) * scaleV),
              z = r.z - side * (lateral + (u - 2.5) * scaleU);
            i ? shape.lineTo(x, -z) : shape.moveTo(x, -z);
          });
          shape.closePath();
          const g = new T.ShapeGeometry(shape);
          g.rotateX(-Math.PI / 2);
          put(g, "paint", 0, 0.13, 0);
          count++;
          return;
        }
        for (const [u, v, w, h] of glyphs[char])
          rect(
            inward + (7 - v - h / 2) * scaleV,
            lateral + (u + w / 2 - 2.5) * scaleU,
            h * scaleV,
            w * scaleU,
          );
      }
      glyph(designation[0], 77, -5, 1.5, 2.6);
      glyph(designation[1], 77, 5, 1.5, 2.6);
      glyph(designation[2], 48, 0, 1.35, 2.3);
      for (const off of [150, 300, 450, 600, 750, 900]) {
        const n = off <= 300 ? 3 : off <= 600 ? 2 : 1;
        for (const half of [-1, 1])
          for (let j = 0; j < n; j++) rect(off, half * (9 + j * 3), 22.5, 1.8);
      }
      for (const half of [-1, 1]) rect(400, half * 13, 45, 6);
      // Rubber deposited in the touchdown zone. Thin strips preserve the paint edges.
      for (let i = 0; i < 36; i++) {
        const d = 190 + ((i * 71) % 310),
          length = 100 + ((i * 29) % 220);
        rect(
          d + length / 2,
          ((i * 13) % 100) / 10 - 5,
          length,
          0.12 + (i % 4) * 0.09,
          "rubber",
        );
      }
    }
    for (let x = lo + 120; x < hi - 120; x += 60) {
      const g = new T.PlaneGeometry(30, 0.9);
      g.rotateX(-Math.PI / 2);
      put(g, "paint", x, 0.134, r.z);
      count++;
    }
  }
  return count;
}
