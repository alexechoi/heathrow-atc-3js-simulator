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
  assert.equal(p.state, "to-hold");
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
    { ...s.planes[0], id: "TEST2", route: [], x: s.planes[0].x + 200 },
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

test("departure taxis, lines up, accelerates, climbs and scores once on handoff", () => {
  const s = new Simulation();
  const p = s.planes.find((p) => p.kind === "departure");
  s.planes = [p];
  s.spawnAt = s.departureAt = Infinity;
  assert.equal(s.handoff(p), true);
  assert.equal(s.clear(p, "27R"), true);
  assert.equal(p.state, "entering-runway");
  assert.equal(s.clear(p, "27L"), false);
  const stages = new Set();
  for (let i = 0; i < 1500; i++) {
    s.tick(0.1);
    if (p.state === "departure" && p.y >= 250) s.handoff(p);
    stages.add(p.state);
  }
  for (const stage of [
    "entering-runway",
    "lineup",
    "takeoff",
    "departure",
    "departed",
  ])
    assert.ok(stages.has(stage), stage);
  assert.equal(s.departed, 1);
  assert.equal(s.score, 100);
  assert.ok(p.y > 500);
  advance(s, 10);
  assert.equal(s.score, 100);
});
test("uncleared departures stay behind the holding point", () => {
  const s = new Simulation(),
    p = s.planes.find((p) => p.kind === "departure");
  s.planes = [p];
  s.spawnAt = s.departureAt = Infinity;
  const { x, z } = p;
  advance(s, 90);
  assert.equal(p.state, "await-tower");
  assert.equal(p.x, x);
  assert.equal(p.z, z);
  assert.equal(
    s.vector(p, [
      { x: 0, z: 0 },
      { x: 100, z: 0 },
    ]),
    false,
  );
  assert.equal(s.goAround(p), false);
});
test("runway occupancy warns on clearance and conflicting lineup costs a strike", () => {
  const s = new Simulation(),
    p = s.planes.find((p) => p.kind === "departure");
  const a = s.planes[0];
  Object.assign(a, {
    x: 1200,
    y: 5,
    z: -710,
    state: "rollout",
    runway: "27R",
    route: [{ x: -1000, y: 5, z: -710 }],
    speed: 15,
  });
  s.planes = [p, a];
  s.spawnAt = s.departureAt = Infinity;
  s.handoff(p);
  assert.equal(s.clear(p, "27R"), true);
  assert.match(s.events.at(-1), /WARNING/);
  advance(s, 8);
  assert.equal(s.strikes, 1);
  assert.equal(s.over, false);
  assert.equal(s.runwayConflicts.size, 1);
});
test("mid-air and runway collisions end the shift immediately", () => {
  for (const y of [5, 400]) {
    const s = new Simulation(),
      a = s.planes[0];
    Object.assign(a, {
      x: 0,
      z: 0,
      y,
      state: y === 5 ? "rollout" : "inbound",
      speed: 0,
      route: [],
    });
    const b = { ...a, id: "COLLISION", x: 20, route: [] };
    s.planes = [a, b];
    s.tick(0.1);
    assert.equal(s.over, true);
    assert.equal(a.state, "crashed");
    assert.equal(b.state, "crashed");
    assert.match(s.reason, y === 5 ? /runway collision/ : /mid-air collision/);
    const t = s.time;
    s.tick(10);
    assert.equal(s.time, t);
    s.reset();
    assert.equal(s.over, false);
    assert.equal(s.incident, null);
  }
});
test("continuous arrival and departure streams replenish for a long shift without leaking history", () => {
  const s = new Simulation();
  let arrivals = 0,
    departures = 0;
  const ids = new Set();
  // Emulate completed movements so that capacity keeps freeing across an hour.
  for (let t = 0; t < 3600; t++) {
    for (const p of s.planes)
      if (!ids.has(p.id)) {
        ids.add(p.id);
        p.kind === "departure" ? departures++ : arrivals++;
        s.finish(p, p.kind === "departure" ? "departed" : "landed");
      }
    s.tick(1);
  }
  assert.ok(arrivals > 80);
  assert.ok(departures > 50);
  assert.equal(s.over, false);
  assert.ok(s.planes.length < 15);
  assert.ok(s.events.length <= 40);
});
test("ignored traffic eventually diverts or cancels and three delays lose the shift", () => {
  const s = new Simulation();
  s.planes = s.planes.filter((p) => p.kind === "departure");
  s.spawnDeparture("27R");
  s.spawnAt = s.departureAt = Infinity;
  advance(s, 901);
  assert.equal(s.over, true);
  assert.equal(s.strikes, 3);
  assert.ok(s.planes.filter((p) => p.state === "cancelled").length >= 3);
});

test("replacement departures use free holding slots, never an occupied one", () => {
  const s = new Simulation();
  const first = s.planes.find(
    (p) => p.kind === "departure" && p.runway === "27R",
  );
  const second = s.spawnDeparture("27R");
  s.finish(first, "departed");
  const replacement = s.spawnDeparture("27R");
  assert.ok(
    Math.hypot(second.x - replacement.x, second.z - replacement.z) >= 95,
  );
});

test("a departure completes pushback, mapped taxi, ground/tower handover and departure handover", () => {
  const s = new Simulation(),
    p = s.planes.find((p) => p.state === "at-gate");
  s.planes = [p];
  s.spawnAt = s.departureAt = Infinity;
  assert.equal(
    s.clear(p, p.runway),
    false,
    "Cannot clear takeoff from the gate",
  );
  assert.equal(s.taxi(p), false, "Pushback first");
  assert.equal(s.pushback(p), true);
  advance(s, 120);
  assert.equal(p.state, "await-taxi");
  assert.equal(s.taxi(p), true);
  const route = p.taxiRoute;
  const distanceToRoute = (x, z) =>
    Math.min(
      ...route.slice(1).map((b, i) => {
        const a = route[i],
          dx = b.x - a.x,
          dz = b.z - a.z,
          t = Math.max(
            0,
            Math.min(
              1,
              ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1),
            ),
          );
        return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
      }),
    );
  for (let i = 0; i < 6000 && p.state === "taxiing"; i++) {
    s.tick(0.1);
    assert.ok(
      distanceToRoute(p.x, p.z) < 6.1,
      "Aircraft stays on mapped taxiway segments",
    );
  }
  assert.equal(p.state, "await-tower");
  assert.equal(p.controller, "GROUND");
  assert.equal(s.clear(p, p.runway), false);
  assert.equal(s.handoff(p), true);
  assert.equal(p.controller, "TOWER");
  assert.equal(
    s.clear(p, p.runway === "27R" ? "27L" : "27R"),
    false,
    "No teleporting to the other runway",
  );
  assert.equal(s.clear(p, p.runway), true);
  for (let i = 0; i < 1800; i++) {
    s.tick(0.1);
    if (p.state === "departure" && p.y >= 250) s.handoff(p);
  }
  assert.equal(p.state, "departed");
  assert.equal(p.controller, "DEPARTURE");
  assert.equal(s.score, 100);
  assert.equal(s.over, false);
});
test("all initial and replenished holding traffic stays outside the airport", () => {
  const s = new Simulation();
  s.planes = s.planes.filter((p) => p.state === "holding");
  s.departureAt = Infinity;
  for (let i = 0; i < 1200; i++) {
    s.tick(0.1);
    for (const p of s.planes)
      if (p.state === "holding") assert.ok(Math.hypot(p.x, p.z) > 6500);
  }
  assert.ok(s.planes.length >= 6);
  assert.equal(s.over, false);
});
test("a drawn route with tight samples makes forward progress instead of orbiting a waypoint", () => {
  const s = new Simulation(),
    p = s.planes[0];
  s.planes = [p];
  s.spawnAt = s.departureAt = Infinity;
  Object.assign(p, { x: 5000, z: 3000, y: 600, heading: Math.PI });
  const points = Array.from({ length: 20 }, (_, i) => ({
    x: 5000 - i * 150,
    z: 3000 - Math.sin((i / 19) * Math.PI) * 550,
  }));
  assert.equal(s.vector(p, points), true);
  advance(s, 25);
  assert.ok(p.x < 3800, `Flight made progress: ${p.x}`);
  assert.ok(p.route.length < 12);
  advance(s, 45);
  assert.ok(
    ["to-hold", "holding"].includes(p.state),
    "Completed vector leads to external hold",
  );
});
