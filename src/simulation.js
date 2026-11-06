import groundLayout from "../public/data/heathrow-ground.json" with { type: "json" };
export const GROUND_LAYOUT = groundLayout;
// Deterministic game simulation. Metres, seconds, radians; compressed arcade spacing.
export const RUNWAYS = {
  "27R": { z: -710, threshold: 1898, length: 3902 },
  "27L": { z: 710, threshold: 1844, length: 3660 },
};
// Four geographically compressed external holds, kept clear of the airport.
export const HOLDING_AREAS = [
  { name: "BOVINGDON", x: -6500, z: -8500 },
  { name: "LAMBOURNE", x: 8500, z: -7000 },
  { name: "BIGGIN", x: 8500, z: 7500 },
  { name: "OCKHAM", x: -6000, z: 8500 },
];
// Scenario stack levels: 6,000 ft base, 1,000 ft between aircraft.
export const HOLD_BASE_ALTITUDE = 6000 * 0.3048;
export const HOLD_LEVEL_SPACING = 1000 * 0.3048;
function racetrack(p) {
  const radius = 700,
    leg = 1600,
    arc = Math.PI * radius,
    total = leg * 2 + arc * 2;
  let d = (((p.holdDistance || 0) % total) + total) % total,
    x,
    z,
    h;
  if (d < leg) {
    x = -leg / 2 + d;
    z = -radius;
    h = 0;
  } else if ((d -= leg) < arc) {
    const a = -Math.PI / 2 + d / radius;
    x = leg / 2 + Math.cos(a) * radius;
    z = Math.sin(a) * radius;
    h = a + Math.PI / 2;
  } else if ((d -= arc) < leg) {
    x = leg / 2 - d;
    z = radius;
    h = Math.PI;
  } else {
    d -= leg;
    const a = Math.PI / 2 + d / radius;
    x = -leg / 2 + Math.cos(a) * radius;
    z = Math.sin(a) * radius;
    h = a + Math.PI / 2;
  }
  p.x = p.holdCenter.x + x;
  p.z = p.holdCenter.z + z;
  p.heading = h;
  p.bank = Math.sin(h) === 0 ? 0 : -0.18;
}
export const SEPARATION = { horizontal: 450, vertical: 90 };
export const FINISHED = new Set([
  "landed",
  "departed",
  "diverted",
  "cancelled",
]);
const GROUND = new Set([
  "at-gate",
  "pushback",
  "await-taxi",
  "taxiing",
  "await-tower",
  "holding-short",
  "entering-runway",
  "lineup",
  "rollout",
]);
export function separationConflict(a, b) {
  return (
    !FINISHED.has(a.state) &&
    !FINISHED.has(b.state) &&
    !GROUND.has(a.state) &&
    !GROUND.has(b.state) &&
    a.state !== "crashed" &&
    b.state !== "crashed" &&
    Math.hypot(a.x - b.x, a.z - b.z) < SEPARATION.horizontal &&
    Math.abs(a.y - b.y) < SEPARATION.vertical
  );
}
export function approachPoints(id) {
  const r = RUNWAYS[id];
  return [
    { x: r.threshold + 2300, y: 180, z: r.z },
    { x: r.threshold + 1200, y: 85, z: r.z },
    { x: r.threshold + 80, y: 7, z: r.z },
    { x: r.threshold - 1150, y: 5, z: r.z },
  ];
}
const templates = [
  ["BAW283", "Los Angeles", "B789", "BA", 3600, 180, 710],
  ["VIR12", "Boston", "A35K", "VS", 5200, 340, -1700],
  ["UAE7", "Dubai", "A388", "EK", 6700, 550, 1800],
  ["BAW472", "Barcelona", "A20N", "BA", -3700, 650, -2800],
  ["SIA322", "Singapore", "B77W", "SQ", -5800, 800, 2400],
];
function flight(t, id = t[0]) {
  return {
    id,
    origin: t[1],
    type: t[2],
    airline: t[3],
    kind: "arrival",
    x: t[4],
    y: t[5],
    z: t[6],
    heading: Math.PI,
    speed: 75,
    state: "inbound",
    route: [],
    runway: null,
    holdPhase: 0,
    age: 0,
    trail: [],
  };
}
export class Simulation {
  constructor() {
    this.reset();
  }
  reset(demo = false) {
    Object.assign(this, {
      time: 0,
      landed: 0,
      departed: 0,
      score: 0,
      strikes: 0,
      over: false,
      reason: "",
      incident: null,
      demo,
      events: [],
      conflicts: new Set(),
      runwayConflicts: new Set(),
      spawnAt: 40,
      departureAt: 32,
      serial: 0,
    });
    this.planes = templates.map((t, i) => ({
      ...flight(t),
      speed: 72 + i * 3,
      holdPhase: i,
    }));
    if (demo) {
      this.clear(this.planes[0], "27L");
      this.clear(this.planes[1], "27R");
      Object.assign(this.planes[0], {
        route: approachPoints("27L").slice(1),
        x: 3000,
        y: 95,
        z: 710,
      });
    } else {
      for (let i = 1; i < this.planes.length; i++)
        this.placeInHold(this.planes[i], i - 1);
      this.spawnDeparture("27R");
      this.spawnDeparture("27L");
      this.spawnDeparture("27R");
      this.spawnDeparture("27L");
      // The shift opens with traffic already at different operational stages.
      const deps = this.planes.filter((p) => p.kind === "departure");
      const ready = deps[0],
        taxi = deps[1];
      const hold = groundLayout.holds[ready.runway].position;
      Object.assign(ready, {
        x: hold[0],
        z: hold[1],
        state: "await-tower",
        controller: "GROUND",
        heading: Math.PI,
      });
      const path = taxi.taxiRoute;
      taxi.route = path.slice(Math.max(0, path.length - 18));
      taxi.x = taxi.route[0].x;
      taxi.z = taxi.route[0].z;
      taxi.state = "taxiing";
      taxi.speed = 7;
      taxi.heading = Math.atan2(
        taxi.route[1].z - taxi.z,
        taxi.route[1].x - taxi.x,
      );
    }
  }
  spawnDeparture(runway) {
    const busy = new Set(
      this.planes
        .filter((p) => p.kind === "departure" && !FINISHED.has(p.state))
        .map((p) => p.stand),
    );
    const i = this.serial,
      t = templates[i % templates.length];
    const terminal = { BA: "T5", VS: "T3", EK: "T3", SQ: "T2" }[t[3]];
    const gates = groundLayout.gates.filter((g) => g.terminal === terminal);
    const gate = gates
      .slice(this.serial % gates.length)
      .concat(gates.slice(0, this.serial % gates.length))
      .find((g) => !busy.has(g.stand));
    if (!gate) return null;
    this.serial++;
    const waypoints = (points) => points.map(([x, z]) => ({ x, y: 5, z }));
    const p = {
      ...flight(t, t[0].replace(/\d+/, String(600 + i))),
      kind: "departure",
      destination: t[1],
      runway,
      stand: gate.stand,
      terminal,
      holdingPoint: groundLayout.holds[runway].name,
      controller: "GROUND",
      x: gate.position[0],
      y: 5,
      z: gate.position[1],
      heading: gate.heading,
      speed: 0,
      state: "at-gate",
      pushRoute: waypoints(gate.pushback),
      taxiRoute: waypoints(gate.routes[runway]),
      entryRoute: waypoints(groundLayout.holds[runway].entry),
      handedOff: false,
    };
    this.planes.push(p);
    return p;
  }
  opposingGroundTraffic(p) {
    const edge = (a, b) =>
      `${a.x.toFixed(1)},${a.z.toFixed(1)}>${b.x.toFixed(1)},${b.z.toFixed(1)}`;
    const reversed = new Set(
      p.taxiRoute.slice(1).map((point, i) => edge(point, p.taxiRoute[i])),
    );
    return this.planes.some((other) => {
      if (other === p || !["pushback", "taxiing"].includes(other.state))
        return false;
      const route =
        other.state === "pushback"
          ? other.taxiRoute
          : [{ x: other.x, z: other.z }, ...other.route];
      return route
        .slice(1)
        .some((point, i) => reversed.has(edge(route[i], point)));
    });
  }
  pushback(p) {
    if (!p || this.over || p.state !== "at-gate") return false;
    if (this.opposingGroundTraffic(p)) {
      p.groundBlocked = true;
      this.events.push(
        `${p.id}, opposing taxi traffic. Remain on stand and request pushback when clear.`,
      );
      return false;
    }
    p.groundBlocked = false;
    if (
      this.planes.some(
        (q) =>
          q !== p &&
          ["taxiing", "pushback"].includes(q.state) &&
          Math.hypot(q.x - p.x, q.z - p.z) < 95,
      )
    ) {
      p.groundBlocked = true;
      this.events.push(
        `${p.id}, stand ${p.stand}, pushback blocked by ground traffic.`,
      );
      return false;
    }
    p.route = p.pushRoute.slice(1).map((q) => ({ ...q }));
    p.state = "pushback";
    this.events.push(`Ground: ${p.id}, stand ${p.stand}, pushback approved.`);
    return true;
  }
  taxi(p) {
    if (!p || this.over || p.state !== "await-taxi") return false;
    if (this.opposingGroundTraffic(p)) {
      p.groundBlocked = true;
      this.events.push(
        `${p.id}, taxi route in use. Hold position and request again when clear.`,
      );
      return false;
    }
    p.groundBlocked = false;
    p.route = p.taxiRoute.map((q) => ({ ...q }));
    p.state = "taxiing";
    this.events.push(
      `Ground: ${p.id}, taxi via the assigned route. Hold short ${p.holdingPoint}, runway ${p.runway}.`,
    );
    return true;
  }
  handoff(p) {
    if (!p || this.over) return false;
    if (p.state === "await-tower") {
      p.state = "holding-short";
      p.controller = "TOWER";
      this.events.push(
        `Tower: ${p.id}, handover accepted. Hold short runway ${p.runway}.`,
      );
      return true;
    }
    if (p.state === "departure" && p.y >= 250 && !p.handedOff) {
      p.handedOff = true;
      p.controller = "DEPARTURE";
      this.events.push(`${p.id}, contact London Departure. Good flight.`);
      return true;
    }
    return false;
  }
  runwayTraffic(id, except) {
    const r = RUNWAYS[id];
    return this.planes.filter(
      (p) =>
        p !== except &&
        p.runway === id &&
        !FINISHED.has(p.state) &&
        (["entering-runway", "lineup", "takeoff", "rollout"].includes(
          p.state,
        ) ||
          (p.state === "departure" && p.y < 90) ||
          (p.state === "approach" && p.x < r.threshold + 1600 && p.y < 150)),
    );
  }
  clear(p, id) {
    if (!p || this.over || FINISHED.has(p.state) || !RUNWAYS[id]) return false;
    if (p.kind === "departure") {
      if (
        p.state !== "holding-short" ||
        p.controller !== "TOWER" ||
        id !== p.runway
      )
        return false;
      p.route = p.entryRoute.map((q) => ({ ...q }));
      p.state = "entering-runway";
      this.events.push(
        `Tower: ${p.id}, runway ${id}, cleared for takeoff.${this.runwayTraffic(id, p).length ? " WARNING: conflicting runway traffic." : ""}`,
      );
      return true;
    }
    if (["rollout", "crashed"].includes(p.state)) return false;
    const points = approachPoints(id);
    if (
      p.x < points[0].x &&
      p.x > points[1].x &&
      Math.abs(p.z - RUNWAYS[id].z) < 350
    )
      points.shift();
    p.route = [...(p.state === "vectoring" ? p.route : []), ...points];
    p.routeStart ??= { x: p.x, y: p.y, z: p.z };
    p.state = "approach";
    p.holdName = null;
    p.holdAltitude = null;
    p.controller = "TOWER";
    p.runway = id;
    this.events.push(
      `${p.id}, cleared to land runway ${id}.${this.runwayTraffic(id, p).length ? " WARNING: conflicting runway traffic." : ""}`,
    );
    return true;
  }
  reserveHoldAltitude(p, area, minimum = HOLD_BASE_ALTITUDE) {
    const traffic = this.planes.filter(
      (q) =>
        q !== p &&
        !FINISHED.has(q.state) &&
        q.state !== "crashed" &&
        (q.holdName === area.name ||
          (Math.abs(q.x - area.x) < 2000 && Math.abs(q.z - area.z) < 1200)),
    );
    let level = Math.max(
      0,
      Math.ceil((minimum - HOLD_BASE_ALTITUDE) / HOLD_LEVEL_SPACING - 1e-9),
    );
    let altitude;
    do {
      altitude = HOLD_BASE_ALTITUDE + level++ * HOLD_LEVEL_SPACING;
    } while (
      traffic.some((q) =>
        [
          q.y,
          ...(q.holdName === area.name && q.holdAltitude != null
            ? [q.holdAltitude]
            : []),
        ].some(
          (occupied) => Math.abs(occupied - altitude) < HOLD_LEVEL_SPACING - 1,
        ),
      )
    );
    return altitude;
  }
  placeInHold(p, index) {
    p.holdCenter = HOLDING_AREAS[index % 4];
    p.holdName = p.holdCenter.name;
    p.holdAltitude = this.reserveHoldAltitude(p, p.holdCenter);
    p.y = p.holdAltitude;
    p.controller = "APPROACH";
    p.speed = 105;
    p.holdDistance = 0;
    p.state = "holding";
    p.runway = null;
    p.route = [];
    racetrack(p);
  }
  hold(p) {
    if (
      !p ||
      this.over ||
      FINISHED.has(p.state) ||
      ["rollout", "crashed"].includes(p.state)
    )
      return false;
    if (p.kind === "departure") {
      if (!["holding-short", "await-tower"].includes(p.state)) return false;
      this.events.push(`${p.id}, hold short runway ${p.runway}.`);
      return true;
    }
    if (["holding", "to-hold"].includes(p.state)) {
      this.events.push(
        `${p.id}, maintain ${p.holdName} hold at ${Math.round(p.holdAltitude / 0.3048)} feet.`,
      );
      return true;
    }
    const area = HOLDING_AREAS.reduce((a, b) =>
      Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z)
        ? a
        : b,
    );
    p.holdCenter = area;
    p.holdName = area.name;
    p.holdDistance = 0;
    p.runway = null;
    p.state = "to-hold";
    const altitude = this.reserveHoldAltitude(
      p,
      area,
      Math.max(HOLD_BASE_ALTITUDE, p.y),
    );
    p.holdAltitude = altitude;
    p.controller = "APPROACH";
    p.route = [{ x: area.x - 800, y: altitude, z: area.z - 700 }];
    p.routeStart = { x: p.x, y: p.y, z: p.z };
    this.events.push(
      `${p.id}, proceed to ${area.name} hold. Climb ${Math.round((altitude * 3.281) / 100) * 100} feet.`,
    );
    return true;
  }
  goAround(p) {
    if (
      !p ||
      this.over ||
      p.kind === "departure" ||
      FINISHED.has(p.state) ||
      ["rollout", "crashed"].includes(p.state)
    )
      return false;
    p.route = [
      { x: p.x - 1300, y: 450, z: p.z },
      { x: p.x - 2000, y: 700, z: p.z - 1800 },
    ];
    p.state = "go-around";
    p.holdName = null;
    p.holdAltitude = null;
    p.routeStart = { x: p.x, y: p.y, z: p.z };
    p.runway = null;
    this.events.push(`${p.id}, go around. Climb and maintain 2,300 feet.`);
    return true;
  }
  vector(p, points) {
    if (
      !p ||
      this.over ||
      p.kind === "departure" ||
      points.length < 2 ||
      FINISHED.has(p.state) ||
      ["rollout", "crashed"].includes(p.state)
    )
      return false;
    p.route = points.map((v) => ({ x: v.x, y: Math.max(p.y, 300), z: v.z }));
    p.route = p.route.map((q) => ({ ...q, kind: "vector" }));
    p.routeStart = { x: p.x, y: p.y, z: p.z };
    p.state = "vectoring";
    p.holdName = null;
    p.holdAltitude = null;
    p.controller = "APPROACH";
    p.runway = null;
    return true;
  }
  fail(reason) {
    this.over = true;
    this.reason = reason;
    this.events.push(`Shift ended · ${reason}`);
  }
  strike(reason) {
    if (this.demo || this.over) return;
    this.strikes++;
    this.score = Math.max(0, this.score - 50);
    this.events.push(reason);
    if (this.strikes >= 3) this.fail(reason);
  }
  finish(p, state) {
    p.state = state;
    p.finishedAt = this.time;
    p.route = [];
  }
  moveDeparture(p, dt) {
    p.bank = 0;
    if (
      ["at-gate", "await-taxi", "await-tower", "holding-short"].includes(
        p.state,
      )
    )
      return;
    if (["pushback", "taxiing", "entering-runway"].includes(p.state)) {
      const q = p.route[0];
      if (!q) return;
      const dx = q.x - p.x,
        dz = q.z - p.z,
        d = Math.hypot(dx, dz);
      const movingHeading = Math.atan2(dz, dx);
      // Ground control meters traffic on shared taxiways; no teleporting or overtaking.
      p.groundBlocked =
        p.state !== "entering-runway" &&
        this.planes.some((other) => {
          if (
            other === p ||
            !GROUND.has(other.state) ||
            other.state === "at-gate"
          )
            return false;
          const distance = Math.hypot(other.x - p.x, other.z - p.z);
          const ahead =
            (other.x - p.x) * Math.cos(movingHeading) +
            (other.z - p.z) * Math.sin(movingHeading);
          if (distance >= 85 || ahead <= 5) return false;
          if (
            ["taxiing", "pushback"].includes(p.state) &&
            ["taxiing", "pushback"].includes(other.state)
          ) {
            // Reserve a merge for the flight already nearest its shared node.
            // This also prevents circular yielding at curved junctions.
            const key = (point) =>
              `${point.x.toFixed(1)},${point.z.toFixed(1)}`;
            const distances = new Map();
            let x = other.x,
              z = other.z,
              total = 0;
            for (const point of other.route) {
              total += Math.hypot(point.x - x, point.z - z);
              distances.set(key(point), total);
              x = point.x;
              z = point.z;
            }
            x = p.x;
            z = p.z;
            total = 0;
            for (const point of p.route) {
              total += Math.hypot(point.x - x, point.z - z);
              const theirs = distances.get(key(point));
              if (theirs !== undefined) {
                if (
                  total + 5 < theirs ||
                  (Math.abs(total - theirs) <= 5 && p.age > other.age)
                )
                  return false;
                break;
              }
              x = point.x;
              z = point.z;
            }
          }
          return true;
        });
      if (p.groundBlocked) {
        p.speed = 0;
        return;
      }
      const reversing = p.state === "pushback";
      p.speed = reversing ? 3 : p.state === "entering-runway" ? 7 : 9;
      if (!reversing) {
        const diff = Math.atan2(
          Math.sin(movingHeading - p.heading),
          Math.cos(movingHeading - p.heading),
        );
        p.heading += Math.max(-0.45 * dt, Math.min(0.45 * dt, diff));
        if (Math.abs(diff) > 0.4) p.speed = 4;
      }
      if (d <= p.speed * dt + 0.05) {
        p.x = q.x;
        p.z = q.z;
        p.route.shift();
        if (!p.route.length) {
          p.speed = 0;
          if (p.state === "pushback") {
            p.state = "await-taxi";
            this.events.push(
              `Ground: ${p.id}, pushback complete. Request taxi clearance.`,
            );
          } else if (p.state === "taxiing") {
            p.state = "await-tower";
            this.events.push(
              `Ground → Tower: ${p.id} holding at ${p.holdingPoint}. Ready for handover.`,
            );
          } else {
            p.state = "lineup";
            p.lineupTime = 3;
            p.heading = Math.PI;
          }
        }
      } else {
        p.x += (dx / d) * p.speed * dt;
        p.z += (dz / d) * p.speed * dt;
      }
    } else if (p.state === "lineup") {
      p.lineupTime -= dt;
      if (p.lineupTime <= 0) {
        p.state = "takeoff";
        this.events.push(`${p.id}, rolling runway ${p.runway}.`);
      }
    } else if (p.state === "takeoff" || p.state === "departure") {
      p.heading = Math.PI;
      p.speed = Math.min(135, p.speed + 3.1 * dt);
      p.x -= p.speed * dt;
      if (p.speed >= 78) {
        p.y += Math.min(15, (p.speed - 73) * 0.5) * dt;
        p.pitch = 0.1;
      }
      if (p.y > 12) p.state = "departure";
      if (p.y >= 250 && !p.handoffRequested) {
        p.handoffRequested = true;
        this.events.push(
          `Tower: ${p.id} climbing out. Transfer to London Departure.`,
        );
      }
      if (p.x < -6500) {
        this.finish(p, "departed");
        this.departed++;
        if (p.handedOff) {
          this.score += 100;
          this.events.push(`+100 · ${p.id} safely handed to London Departure.`);
        } else
          this.strike(
            `${p.id} left tower airspace without a departure handover.`,
          );
      }
    }
  }
  tick(dt) {
    if (this.over) return;
    this.time += dt;
    for (const p of this.planes) {
      if (FINISHED.has(p.state)) continue;
      p.age += dt;
      if (
        !this.demo &&
        p.age > (p.kind === "departure" ? 900 : 480) &&
        (p.kind === "departure" ? GROUND.has(p.state) : p.state !== "rollout")
      ) {
        this.finish(p, p.kind === "departure" ? "cancelled" : "diverted");
        this.strike(
          `${p.id} ${p.kind === "departure" ? "cancelled after excessive ground delay" : "diverted: fuel reserve reached"}.`,
        );
        continue;
      }
      if (p.kind === "departure") {
        this.moveDeparture(p, dt);
        continue;
      }
      if (p.route.length) {
        const q = p.route[0];
        const dist = Math.hypot(q.x - p.x, q.z - p.z);
        const start = p.routeStart || { x: p.x, z: p.z };
        const sx = q.x - start.x,
          sz = q.z - start.z,
          segmentLength = Math.hypot(sx, sz);
        const projection = segmentLength
          ? ((p.x - start.x) * sx + (p.z - start.z) * sz) /
            (segmentLength * segmentLength)
          : 0;
        let carrot = q;
        if (q.kind === "vector") {
          let remaining = 500;
          let from = {
            x: start.x + sx * Math.max(0, Math.min(1, projection)),
            z: start.z + sz * Math.max(0, Math.min(1, projection)),
          };
          for (const point of p.route) {
            const length = Math.hypot(point.x - from.x, point.z - from.z);
            if (length >= remaining) {
              carrot = {
                x: from.x + ((point.x - from.x) * remaining) / length,
                z: from.z + ((point.z - from.z) * remaining) / length,
              };
              break;
            }
            remaining -= length;
            carrot = point;
            from = point;
          }
        }
        const target = Math.atan2(carrot.z - p.z, carrot.x - p.x);
        const diff = Math.atan2(
          Math.sin(target - p.heading),
          Math.cos(target - p.heading),
        );
        const turn = p.state === "rollout" ? 0.7 : 0.18;
        p.heading += Math.max(-turn * dt, Math.min(turn * dt, diff));
        p.bank = Math.max(-0.4, Math.min(0.4, -diff * 0.65));
        const speed =
          p.state === "rollout"
            ? Math.max(15, p.speed - dt * 1.2)
            : p.state === "approach"
              ? 70
              : 90;
        p.speed = speed;
        const reached =
          q.kind === "vector"
            ? dist < 180 || (projection >= 1 && dist < 700)
            : dist < (q.y === 7 || p.state === "rollout" ? 95 : 220);
        if (reached) {
          p.routeStart = { ...q };
          p.route.shift();
          if (p.state === "approach" && q.y === 7) {
            p.state = "rollout";
            p.y = 5;
            this.events.push(`${p.id}, welcome to Heathrow. Vacate when able.`);
          }
          if (!p.route.length) {
            if (p.state === "rollout") {
              this.finish(p, "landed");
              this.landed++;
              this.score += 100;
              this.events.push(`+100 · ${p.id} safely on stand.`);
            } else if (p.state === "to-hold") {
              p.state = "holding";
              p.y = q.y;
              p.holdDistance = 0;
              racetrack(p);
            } else this.hold(p);
          }
        } else {
          p.x += Math.cos(p.heading) * speed * dt;
          p.z += Math.sin(p.heading) * speed * dt;
          p.y = Math.max(
            5,
            p.y + (q.y - p.y) * Math.min(1, (speed * dt) / dist),
          );
        }
      } else if (p.state === "holding") {
        p.holdDistance = (p.holdDistance || 0) + dt * p.speed;
        racetrack(p);
      } else {
        p.x += Math.cos(p.heading) * p.speed * dt;
        p.z += Math.sin(p.heading) * p.speed * dt;
        if (p.age > 35 || Math.abs(p.x) > 8500) this.hold(p);
      }
      if (this.demo && p.state === "holding" && p.age > 50) {
        p.x = 6000 + (this.serial % 3) * 1500;
        p.z = this.serial % 2 ? 710 : -710;
        p.y = 280;
        this.clear(p, this.serial++ % 2 ? "27L" : "27R");
        p.heading = Math.PI;
      }
    }
    const active = this.planes.filter((p) => !FINISHED.has(p.state));
    const now = new Set(),
      runwayNow = new Set();
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i],
          b = active[j],
          key = [a.id, b.id].sort().join("/");
        const distance = Math.hypot(a.x - b.x, a.z - b.z),
          vertical = Math.abs(a.y - b.y);
        if (
          !this.demo &&
          !["at-gate", "await-taxi"].includes(a.state) &&
          !["at-gate", "await-taxi"].includes(b.state) &&
          distance < 55 &&
          vertical < 18
        ) {
          this.incident = {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            z: (a.z + b.z) / 2,
            flights: [a.id, b.id],
          };
          a.state = b.state = "crashed";
          this.fail(
            `${a.id} / ${b.id}: ${this.incident.y < 25 ? "runway collision" : "mid-air collision"}.`,
          );
          return;
        }
        if (separationConflict(a, b)) {
          now.add(key);
          if (!this.conflicts.has(key))
            this.strike(
              `Separation alert: ${a.id} / ${b.id}. Vector apart or go around.`,
            );
        }
        const incurs =
          (a.kind === "departure" &&
            ["entering-runway", "lineup", "takeoff"].includes(a.state) &&
            this.runwayTraffic(a.runway, a).includes(b)) ||
          (b.kind === "departure" &&
            ["entering-runway", "lineup", "takeoff"].includes(b.state) &&
            this.runwayTraffic(b.runway, b).includes(a));
        if (incurs) {
          runwayNow.add(key);
          if (!this.runwayConflicts.has(key))
            this.strike(
              `Runway conflict: ${a.id} / ${b.id}. Send the arrival around.`,
            );
        }
      }
    this.conflicts = now;
    this.runwayConflicts = runwayNow;
    if (this.over) return;
    if (
      this.time >= this.spawnAt &&
      active.filter((p) => p.kind !== "departure").length < 7
    ) {
      this.spawnAt = this.time + 40;
      const i = this.serial++,
        t = templates[i % templates.length];
      const p = {
        ...flight(t, t[0].replace(/\d+/, String(1000 + i))),
        x: 6500 + (i % 2) * 1800,
        y: 400 + (i % 3) * 160,
        z: i % 2 ? 2100 : -2200,
        speed: 80,
      };
      this.planes.push(p);
      if (!this.demo) this.placeInHold(p, i % 4);
      this.events.push(
        `${p.id} inbound from ${p.origin}, ${p.holdName || "on approach"}.`,
      );
      if (this.demo) this.clear(p, i % 2 ? "27L" : "27R");
    }
    if (
      !this.demo &&
      this.time >= this.departureAt &&
      active.filter((p) => p.kind === "departure").length < 8
    ) {
      this.departureAt = this.time + 65;
      const p = this.spawnDeparture(this.serial % 2 ? "27L" : "27R");
      if (p)
        this.events.push(
          `${p.id} to ${p.destination}, requesting pushback at ${p.terminal} stand ${p.stand}.`,
        );
      else this.departureAt = this.time + 10; // Wait for a compatible stand.
    }
    // Keep a short history without accumulating aircraft during an endless session.
    this.planes = this.planes.filter(
      (p) => !FINISHED.has(p.state) || this.time - p.finishedAt < 120,
    );
    if (this.events.length > 40) this.events.splice(0, this.events.length - 40);
  }
}
