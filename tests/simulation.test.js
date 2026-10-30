import test from "node:test";
import assert from "node:assert/strict";
import {
  Simulation,
  separationConflict,
  approachPoints,
} from "../src/simulation.js";
const advance = (s, seconds) => {
  for (let t = 0; t < seconds; t += 0.1) s.tick(0.1);
};
test("a cleared aligned arrival touches down, rolls out and scores once", () => {
  const s = new Simulation();
  s.planes = [s.planes[0]];
  s.spawnAt = Infinity;
  assert.equal(s.clear(s.planes[0], "27L"), true);
  advance(s, 85);
  assert.equal(s.planes[0].state, "landed");
  assert.equal(s.landed, 1);
  assert.equal(s.score, 100);
  advance(s, 20);
  assert.equal(s.score, 100);
});
test("hold cancels clearance, go-around climbs and cancels runway", () => {
  const s = new Simulation();
  const p = s.planes[0];
  s.clear(p, "27R");
  s.hold(p);
  assert.equal(p.runway, null);
  assert.equal(p.state, "holding");
  const y = p.y;
  s.goAround(p);
  advance(s, 12);
  assert.equal(p.runway, null);
  assert.ok(p.y > y);
});
test("drawn vectors are retained before the runway approach", () => {
  const s = new Simulation();
  const p = s.planes[0];
  s.vector(p, [
    { x: 6000, z: 1200 },
    { x: 4500, z: 710 },
  ]);
  s.clear(p, "27L");
  assert.equal(p.route[0].x, 6000);
  assert.equal(p.route[1].x, 4500);
  assert.equal(p.route.at(-1).z, 710);
});
test("separation respects both axes and excludes ground traffic", () => {
  const a = { x: 0, y: 300, z: 0, state: "inbound" };
  assert.equal(separationConflict(a, { ...a, x: 449, y: 389 }), true);
  assert.equal(separationConflict(a, { ...a, x: 451 }), false);
  assert.equal(separationConflict(a, { ...a, y: 391 }), false);
  assert.equal(separationConflict(a, { ...a, state: "rollout" }), false);
});
test("a persistent conflict counts once, three distinct losses end the shift", () => {
  const s = new Simulation();
  s.planes = [
    s.planes[0],
    { ...s.planes[0], id: "TEST2", route: [], x: s.planes[0].x + 50 },
  ];
  s.spawnAt = Infinity;
  s.tick(0.1);
  assert.equal(s.strikes, 1);
  advance(s, 2);
  assert.equal(s.strikes, 1);
  for (let i = 0; i < 2; i++) {
    s.planes[1].y = 1500;
    s.tick(0.1);
    s.planes[1].y = s.planes[0].y;
    s.tick(0.1);
  }
  assert.equal(s.strikes, 3);
  assert.equal(s.over, true);
});
test("runway points descend and finish west of threshold", () => {
  for (const id of ["27L", "27R"]) {
    const p = approachPoints(id);
    assert.ok(p.every((v, i) => !i || v.y <= p[i - 1].y));
    assert.ok(p.at(-1).x < p[0].x);
  }
});
