import { captureBrowser, captureContext, settleFrame } from "./browser.mjs";
import assert from "node:assert/strict";
const browser = await captureBrowser();
try {
  const page = await browser.newPage({
      ...captureContext,
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  // Full-airport screenshots can exceed 30 seconds on software WebGL workers.
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /WebGLProgram|Shader Error|TypeError/.test(m.text())
    )
      errors.push(m.text());
  });
  await page.goto(
    (process.env.TEST_URL || "http://localhost:4173/") + "?capture",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForFunction(() => window.__HEATHROW__?.ready, null, {
    timeout: 180000,
  });
  await page.click("#start");
  await page.click("#departure-tab");
  assert.match(
    await page.locator("#ground-action").textContent(),
    /tower handover/,
  );
  assert.equal(await page.locator('[data-runway="27R"]').isVisible(), false);
  await page.click("#ground-action");
  assert.equal(await page.locator('[data-runway="27R"]').isEnabled(), true);
  assert.equal(await page.locator('[data-runway="27L"]').isDisabled(), true);
  await page.click('[data-runway="27R"]');
  assert.equal(
    await page.evaluate(
      () =>
        window.__HEATHROW__.sim.planes.find((p) => p.kind === "departure")
          .state,
    ),
    "entering-runway",
  );
  const gate = await page.evaluate(
    () => window.__HEATHROW__.sim.planes.find((p) => p.state === "at-gate").id,
  );
  await page.click(`[data-flight="${gate}"]`);
  assert.match(await page.locator("#ground-action").textContent(), /pushback/);
  await page.click("#ground-action");
  await page.evaluate((id) => {
    const a = window.__HEATHROW__,
      p = a.sim.planes.find((p) => p.id === id);
    a.sim.planes = [p];
    a.sim.spawnAt = a.sim.departureAt = Infinity;
    for (let i = 0; i < 1200; i++) a.sim.tick(0.1);
    a.step(0.4);
  }, gate);
  assert.match(
    await page.locator("#ground-action").textContent(),
    /taxi clearance/,
  );
  await page.click("#ground-action");
  await page.evaluate(() => {
    const a = window.__HEATHROW__;
    for (let i = 0; i < 350; i++) a.sim.tick(0.1);
    a.setView("follow");
    a.step(0.4);
  });
  assert.equal(
    await page.evaluate(() => window.__HEATHROW__.sim.planes[0].state),
    "taxiing",
  );
  await settleFrame(page);
  await page.screenshot({ path: "work/screenshots/operations-taxi.png" });
  await page.evaluate(() => {
    const a = window.__HEATHROW__;
    for (let i = 0; i < 6000 && a.sim.planes[0].state === "taxiing"; i++)
      a.sim.tick(0.1);
    a.step(0.4);
  });
  assert.match(
    await page.locator("#ground-action").textContent(),
    /tower handover/,
  );
  await page.click("#ground-action");
  await page.click('[data-runway="27R"]');
  await page.click("#restart");
  await page.click("#draw");
  const points = await page.evaluate(() => {
    const a = window.__HEATHROW__,
      V = a.camera.position.constructor;
    return [
      [3600, 710],
      [2500, 1700],
      [1000, 2400],
    ].map(([x, z]) => {
      const p = new V(x, 0, z).project(a.camera);
      return {
        x: (p.x * 0.5 + 0.5) * innerWidth,
        y: (-p.y * 0.5 + 0.5) * innerHeight,
      };
    });
  });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1))
    await page.mouse.move(p.x, p.y, { steps: 12 });
  await page.mouse.up();
  const before = await page.evaluate(() => {
    const p = window.__HEATHROW__.sim.planes[0];
    return { state: p.state, remaining: p.route.length, x: p.x, z: p.z };
  });
  assert.equal(before.state, "vectoring");
  assert.ok(before.remaining > 5);
  await page.evaluate(() => {
    const a = window.__HEATHROW__;
    for (let i = 0; i < 220; i++) a.sim.tick(0.1);
    a.step(0.4);
  });
  const after = await page.evaluate(() => {
    const p = window.__HEATHROW__.sim.planes[0];
    return { remaining: p.route.length, x: p.x, z: p.z };
  });
  assert.ok(after.remaining < before.remaining);
  assert.ok(after.x < before.x - 500);
  await settleFrame(page);
  await page.screenshot({ path: "work/screenshots/operations-vector.png" });
  await page.click("#restart");
  const holds = await page.evaluate(() =>
    window.__HEATHROW__.sim.planes
      .filter((p) => p.state === "holding")
      .map((p) => Math.hypot(p.x, p.z)),
  );
  assert.equal(holds.length, 4);
  assert.ok(holds.every((d) => d > 6500));
  await page.click('[data-view="radar"]');
  await page.evaluate(() => window.__HEATHROW__.step(0.4));
  await settleFrame(page);
  await page.screenshot({ path: "work/screenshots/operations-holds.png" });
  await page.evaluate(() => {
    const a = window.__HEATHROW__,
      p = a.sim.planes[0];
    Object.assign(p, {
      x: 1600,
      y: 5,
      z: -710,
      state: "rollout",
      speed: 0,
      route: [],
    });
    a.sim.planes = [p, { ...p, id: "TEST", x: 1620, route: [] }];
    a.sim.tick(0.1);
    for (let i = 0; i < 20; i++) a.step(0.5);
  });
  assert.equal(await page.locator("#shift-report").isVisible(), true);
  await settleFrame(page);
  await page.screenshot({ path: "work/screenshots/operations-fire.png" });
  await page.click("#retry-shift");
  await page.setViewportSize({ width: 390, height: 667 });
  await page.click("#departure-tab");
  await page.evaluate(() => window.__HEATHROW__.step(0.4));
  await settleFrame(page);
  await page.screenshot({ path: "work/screenshots/operations-mobile.png" });
  assert.equal(await page.locator("#ground-action").isVisible(), true);
  await page.click("#ground-action");
  assert.equal(await page.locator('[data-runway="27R"]').isEnabled(), true);
  const bounds = await page.locator('[data-runway="27R"]').boundingBox();
  assert.ok(bounds.y + bounds.height < 667);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      groundToTower: true,
      mappedTaxi: true,
      mouseRouteProgress: true,
      externalHolds: true,
      softFire: true,
      mobile: true,
      errors,
    }),
  );
} finally {
  await browser.close();
}
