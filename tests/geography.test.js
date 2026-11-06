import test from "node:test";
import assert from "node:assert/strict";
import data from "../public/data/heathrow.json" with { type: "json" };
import { ShapeGeometry } from "three";
import { mappedShape } from "../src/mapped-shape.js";

const area = (points) =>
  Math.abs(
    points.reduce((sum, a, i) => {
      const b = points[(i + 1) % points.length];
      return sum + a[0] * b[1] - b[0] * a[1];
    }, 0),
  ) / 2;

test("Terminal 3 retains its mapped concourses and open courtyard", () => {
  const t3 = data.buildings.find((b) => b.name === "Terminal 3");
  assert.ok(t3, "The main T3 building cannot be omitted from the airport");
  assert.equal(t3.sourceType, "relation");
  assert.equal(t3.sourceId, 18911624);
  assert.equal(t3.holes.length, 1);
  assert.ok(area(t3.holes[0]) > 100, "Keep the courtyard open");
  assert.ok(area(t3.points) - area(t3.holes[0]) > 100000);
  const xs = t3.points.map((p) => p[0]);
  const zs = t3.points.map((p) => p[1]);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 650);
  assert.ok(Math.max(...zs) - Math.min(...zs) > 670);
  assert.equal(
    new Set(data.buildings.map((b) => b.id)).size,
    data.buildings.length,
  );
  const roof = new ShapeGeometry(mappedShape(t3.points, t3.holes));
  const vertices = roof.attributes.position,
    indices = roof.index;
  let roofArea = 0;
  for (let i = 0; i < indices.count; i += 3) {
    const points = [0, 1, 2].map((j) => {
      const index = indices.getX(i + j);
      return [vertices.getX(index), vertices.getY(index)];
    });
    roofArea += area(points);
  }
  assert.ok(
    Math.abs(roofArea - (area(t3.points) - area(t3.holes[0]))) < 1,
    "Rendered roof triangles must leave the courtyard open",
  );
  roof.dispose();
});
