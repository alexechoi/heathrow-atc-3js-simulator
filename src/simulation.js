// Deterministic game simulation. Metres, seconds, radians; compressed arcade spacing.
export const RUNWAYS = {
  "27R": { z: -710, threshold: 1898, length: 3902 },
  "27L": { z: 710, threshold: 1844, length: 3660 },
};
export const SEPARATION = { horizontal: 450, vertical: 90 };
export const FINISHED = new Set([
  "landed",
  "departed",
  "diverted",
  "cancelled",
]);
const GROUND = new Set(["holding-short", "taxiing", "lineup", "rollout"]);
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
  ["BAW472", "Barcelona", "A320", "BA", -3700, 650, -2800],
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
      this.spawnDeparture("27R");
      this.spawnDeparture("27L");
    }
  }
  spawnDeparture(runway) {
    const i = this.serial++,
      t = templates[i % templates.length],
      r = RUNWAYS[runway];
    const holdZ = r.z + (r.z < 0 ? 105 : -105);
    let holdX = r.threshold + 100;
    while (
      this.planes.some(
        (p) =>
          !FINISHED.has(p.state) &&
          p.y < 20 &&
          Math.hypot(p.x - holdX, p.z - holdZ) < 95,
      )
    )
      holdX += 100;
    const p = {
      ...flight(t, t[0].replace(/\d+/, String(600 + i))),
      kind: "departure",
      destination: t[1],
      runway,
      x: holdX,
      y: 5,
      z: holdZ,
      speed: 0,
      state: "holding-short",
    };
    this.planes.push(p);
    return p;
  }
  runwayTraffic(id, except) {
    const r = RUNWAYS[id];
    return this.planes.filter(
      (p) =>
        p !== except &&
        p.runway === id &&
        !FINISHED.has(p.state) &&
        (["lineup", "takeoff", "rollout"].includes(p.state) ||
          (p.state === "departure" && p.y < 90) ||
          (p.state === "approach" && p.x < r.threshold + 1600 && p.y < 150)),
    );
  }
  clear(p, id) {
    if (!p || this.over || FINISHED.has(p.state) || !RUNWAYS[id]) return false;
    if (p.kind === "departure") {
      if (p.state !== "holding-short") return false;
      const r = RUNWAYS[id];
      p.runway = id;
      p.state = "taxiing";
      // Eastern perimeter taxi route, then enter at the threshold.
      p.route = [
        { x: 2110, y: 5, z: p.z },
        { x: 2110, y: 5, z: r.z },
        { x: r.threshold - 50, y: 5, z: r.z },
      ];
      this.events.push(
        `${p.id}, runway ${id}, cleared for takeoff.${this.runwayTraffic(id, p).length ? " WARNING: conflicting runway traffic." : ""}`,
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
    p.state = "approach";
    p.runway = id;
    this.events.push(
      `${p.id}, cleared to land runway ${id}.${this.runwayTraffic(id, p).length ? " WARNING: conflicting runway traffic." : ""}`,
    );
    return true;
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
      if (p.state !== "holding-short") return false;
      this.events.push(`${p.id}, hold short runway ${p.runway}.`);
      return true;
    }
    p.route = [];
    p.runway = null;
    p.state = "holding";
    p.holdCenter = {
      x: p.x - Math.cos(p.heading + Math.PI / 2) * 650,
      z: p.z - Math.sin(p.heading + Math.PI / 2) * 650,
    };
    p.holdPhase = Math.atan2(p.z - p.holdCenter.z, p.x - p.holdCenter.x);
    this.events.push(`${p.id}, hold present position.`);
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
    p.state = "vectoring";
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
    if (p.state === "holding-short") return;
    if (p.state === "taxiing") {
      const q = p.route[0],
        dx = q.x - p.x,
        dz = q.z - p.z,
        d = Math.hypot(dx, dz);
      p.speed = 12;
      p.heading = Math.atan2(dz, dx);
      if (d <= p.speed * dt) {
        p.x = q.x;
        p.z = q.z;
        p.route.shift();
        if (!p.route.length) {
          p.state = "lineup";
          p.lineupTime = 4;
          p.heading = Math.PI;
          p.speed = 0;
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
      if (p.x < -6500) {
        this.finish(p, "departed");
        this.departed++;
        this.score += 100;
        this.events.push(`+100 · ${p.id} handed to London Departure.`);
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
        p.age > (p.kind === "departure" ? 360 : 480) &&
        (p.kind === "departure"
          ? p.state === "holding-short"
          : p.state !== "rollout")
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
        const q = p.route[0],
          dist = Math.hypot(q.x - p.x, q.z - p.z),
          target = Math.atan2(q.z - p.z, q.x - p.x);
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
        if (dist < Math.max(95, speed * dt * 1.8)) {
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
        p.holdPhase += (dt * p.speed) / 650;
        p.x = p.holdCenter.x + Math.cos(p.holdPhase) * 650;
        p.z = p.holdCenter.z + Math.sin(p.holdPhase) * 650;
        p.heading = p.holdPhase + Math.PI / 2;
        p.bank = -0.25;
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
          a.state !== "holding-short" &&
          b.state !== "holding-short" &&
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
            ["lineup", "takeoff"].includes(a.state) &&
            this.runwayTraffic(a.runway, a).includes(b)) ||
          (b.kind === "departure" &&
            ["lineup", "takeoff"].includes(b.state) &&
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
      this.events.push(`${p.id} inbound from ${p.origin}.`);
      if (this.demo) this.clear(p, i % 2 ? "27L" : "27R");
    }
    if (
      !this.demo &&
      this.time >= this.departureAt &&
      active.filter((p) => p.kind === "departure").length < 4
    ) {
      this.departureAt = this.time + 32;
      const p = this.spawnDeparture(this.serial % 2 ? "27L" : "27R");
      this.events.push(
        `${p.id} to ${p.destination}, ready at holding point ${p.runway}.`,
      );
    }
    // Keep a short history without accumulating aircraft during an endless session.
    this.planes = this.planes.filter(
      (p) => !FINISHED.has(p.state) || this.time - p.finishedAt < 120,
    );
    if (this.events.length > 40) this.events.splice(0, this.events.length - 40);
  }
}
