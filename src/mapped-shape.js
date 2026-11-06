import { Shape, Path } from "three";

// Local x/z coordinates become x/-z before rotating the shape onto the ground.
export function mappedShape(points, holes = []) {
  const shape = new Shape();
  const trace = (path, ring) => {
    ring.forEach(([x, z], i) => (i ? path.lineTo(x, -z) : path.moveTo(x, -z)));
    path.closePath();
  };
  trace(shape, points);
  for (const ring of holes) {
    const hole = new Path();
    trace(hole, ring);
    shape.holes.push(hole);
  }
  return shape;
}

// Illustrative rooftop service units, kept within the mapped building envelope.
// These positions are visual detail, not surveyed equipment locations.
export function roofEquipmentSites(building) {
  const inside = ([x, z], ring) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, az] = ring[i],
        [bx, bz] = ring[j];
      if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax)
        hit = !hit;
    }
    return hit;
  };
  const covered = (p) =>
    inside(p, building.points) &&
    !(building.holes || []).some((ring) => inside(p, ring));
  const xs = building.points.map((p) => p[0]);
  const zs = building.points.map((p) => p[1]);
  const sites = [];
  for (
    let ix = Math.ceil(Math.min(...xs) / 38);
    ix * 38 < Math.max(...xs);
    ix++
  )
    for (
      let iz = Math.ceil(Math.min(...zs) / 38);
      iz * 38 < Math.max(...zs);
      iz++
    ) {
      if ((ix + iz) % 3) continue;
      const x = ix * 38,
        z = iz * 38;
      if (
        [
          [-5, -4],
          [-5, 4],
          [5, -4],
          [5, 4],
        ].every(([dx, dz]) => covered([x + dx, z + dz]))
      )
        sites.push([x, z]);
    }
  return sites;
}
