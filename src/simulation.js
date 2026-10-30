// Deterministic game simulation. Metres, seconds, radians; deliberately compressed separation.
export const RUNWAYS = {
  "27R": { z: -710, threshold: 1898, length: 3902 },
  "27L": { z: 710, threshold: 1844, length: 3660 },
};
export const SEPARATION = { horizontal: 450, vertical: 90 };
export function separationConflict(a, b) {
  return (
    !["landed", "rollout"].includes(a.state) &&
    !["landed", "rollout"].includes(b.state) &&
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
export class Simulation {
  constructor() {
    this.reset();
  }
  reset(demo = false) {
    this.time = 0;
    this.landed = 0;
    this.score = 0;
    this.strikes = 0;
    this.over = false;
    this.demo = demo;
    this.events = [];
    this.conflicts = new Set();
    this.spawnAt = 45;
    this.serial = 0;
    this.planes = templates.map((t, i) => ({
      id: t[0],
      origin: t[1],
      type: t[2],
      airline: t[3],
      x: t[4],
      y: t[5],
      z: t[6],
      heading: Math.PI,
      speed: 72 + i * 3,
      state: "inbound",
      route: [],
      runway: null,
      holdPhase: i,
      age: 0,
      trail: [],
    }));
    if (demo) {
      this.clear(this.planes[0], "27L");
      this.clear(this.planes[1], "27R");
      this.planes[0].route = approachPoints("27L").slice(1);
      this.planes[0].x = 3000;
      this.planes[0].y = 95;
      this.planes[0].z = 710;
    }
  }
  clear(p, id) {
    if (!p || p.state === "rollout" || p.state === "landed" || !RUNWAYS[id])
      return false;
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
    this.events.push(`${p.id}, cleared to land runway ${id}.`);
    return true;
  }
  hold(p) {
    if (!p || ["rollout", "landed"].includes(p.state)) return;
    p.route = [];
    p.runway = null;
    p.state = "holding";
    p.holdCenter = {
      x: p.x - Math.cos(p.heading + Math.PI / 2) * 650,
      z: p.z - Math.sin(p.heading + Math.PI / 2) * 650,
    };
    p.holdPhase = Math.atan2(p.z - p.holdCenter.z, p.x - p.holdCenter.x);
    this.events.push(`${p.id}, hold present position.`);
  }
  goAround(p) {
    if (!p || ["rollout", "landed"].includes(p.state)) return;
    p.route = [
      { x: p.x - 1300, y: 450, z: p.z },
      { x: p.x - 2000, y: 700, z: p.z - 1800 },
    ];
    p.state = "go-around";
    p.runway = null;
    this.events.push(`${p.id}, go around. Climb and maintain 2,300 feet.`);
  }
  vector(p, points) {
    if (!p || points.length < 2 || ["rollout", "landed"].includes(p.state))
      return false;
    p.route = points.map((v) => ({ x: v.x, y: Math.max(p.y, 300), z: v.z }));
    p.state = "vectoring";
    p.runway = null;
    return true;
  }
  tick(dt) {
    if (this.over) return;
    this.time += dt;
    for (const p of this.planes) {
      p.age += dt;
      if (p.state === "landed") continue;
      if (p.route.length) {
        const q = p.route[0];
        const dist = Math.hypot(q.x - p.x, q.z - p.z);
        const target = Math.atan2(q.z - p.z, q.x - p.x);
        let diff = Math.atan2(
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
              p.state = "landed";
              this.landed++;
              this.score += 100;
              this.events.push(`+100 · ${p.id} safely on stand.`);
            } else this.hold(p);
          }
        } else {
          p.x += Math.cos(p.heading) * speed * dt;
          p.z += Math.sin(p.heading) * speed * dt;
          const desiredY = p.y + (q.y - p.y) * Math.min(1, (speed * dt) / dist);
          p.y = Math.max(5, desiredY);
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
    const active = this.planes.filter((p) => p.state !== "landed");
    const now = new Set();
    for (let i = 0; i < active.length; i++)
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i],
          b = active[j];
        if (separationConflict(a, b)) {
          const key = [a.id, b.id].sort().join("/");
          now.add(key);
          if (!this.conflicts.has(key) && !this.demo) {
            this.strikes++;
            this.score = Math.max(0, this.score - 50);
            this.events.push(
              `Separation alert: ${a.id} / ${b.id}. Vector apart or go around.`,
            );
            if (this.strikes >= 3) {
              this.over = true;
              this.events.push(
                `Shift ended · ${this.landed} landed · ${this.score} points. Restart to try again.`,
              );
            }
          }
        }
      }
    this.conflicts = now;
    if (this.time > this.spawnAt && active.length < 7) {
      this.spawnAt = this.time + 45;
      const i = this.serial++;
      const t = templates[i % templates.length];
      const p = {
        id: t[0] + (i + 1),
        origin: t[1],
        type: t[2],
        airline: t[3],
        x: 6500 + (i % 2) * 1800,
        y: 400 + (i % 3) * 160,
        z: i % 2 ? 2100 : -2200,
        heading: Math.PI,
        speed: 80,
        state: "inbound",
        route: [],
        age: 0,
        trail: [],
      };
      this.planes.push(p);
      if (this.demo) this.clear(p, i % 2 ? "27L" : "27R");
    }
  }
}
