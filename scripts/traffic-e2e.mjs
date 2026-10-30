import { captureBrowser, captureContext, settleFrame } from "./browser.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const b = await captureBrowser();
try {
  const p = await b.newPage({
      ...captureContext,
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error" && /WebGLProgram|Shader Error/.test(m.text()))
      errors.push(m.text());
  });
  await p.goto(
    (process.env.TEST_URL || "http://localhost:4173/") + "?capture",
    { waitUntil: "domcontentloaded" },
  );
  await p.waitForFunction(() => window.__HEATHROW__?.ready, null, {
    timeout: 180000,
  });
  await p.click("#start");
  assert.equal(await p.locator("#flight-list .airline-mark img").count(), 5);
  await p.waitForFunction(() =>
    [...document.querySelectorAll("#flight-list img")].every(
      (i) => i.complete && i.naturalWidth === 64,
    ),
  );
  assert.equal(
    await p
      .locator("#flight-list img")
      .evaluateAll((imgs) => new Set(imgs.map((i) => i.alt)).size),
    4,
  );
  await p.click("#departure-tab");
  assert.equal(await p.locator(".flight-row").count(), 2);
  assert.match(
    await p.locator("#command-hint").textContent(),
    /To Los Angeles/,
  );
  assert.equal(await p.locator("#go-around").isDisabled(), true);
  assert.match(
    await p.locator('[data-runway="27R"] b').textContent(),
    /TAKEOFF/,
  );
  await p.evaluate(() => window.__HEATHROW__.step(0.4));
  await settleFrame(p);
  await p.screenshot({ path: "work/screenshots/departures-desktop.png" });
  await p.click('[data-runway="27R"]');
  assert.equal(
    await p.evaluate(
      () =>
        window.__HEATHROW__.sim.planes.find((p) => p.kind === "departure")
          .state,
    ),
    "taxiing",
  );
  await p.evaluate(() => {
    const a = window.__HEATHROW__,
      d = a.sim.planes.find((p) => p.kind === "departure");
    a.sim.planes = [d];
    a.sim.spawnAt = a.sim.departureAt = Infinity;
    for (let i = 0; i < 1500; i++) a.sim.tick(0.1);
    a.step(0.4);
  });
  assert.equal(await p.locator("#departed").textContent(), "01");
  await p.click("#restart");
  await p.evaluate(() => {
    const a = window.__HEATHROW__,
      p = a.sim.planes[0];
    a.sim.planes = [p, { ...p, id: "TEST-COLLISION", x: p.x + 20, route: [] }];
    a.sim.tick(0.1);
    a.step(0.4);
  });
  assert.equal(await p.locator("#shift-report").isVisible(), true);
  assert.match(await p.locator("#shift-reason").textContent(), /collision/);
  await settleFrame(p);
  await p.screenshot({ path: "work/screenshots/collision-desktop.png" });
  await p.click("#retry-shift");
  assert.equal(await p.evaluate(() => window.__HEATHROW__.sim.over), false);
  assert.equal(await p.locator("#shift-report").isVisible(), false);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.click("#departure-tab");
  await p.evaluate(() => window.__HEATHROW__.step(0.4));
  await settleFrame(p);
  await p.screenshot({ path: "work/screenshots/departures-mobile.png" });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  const bounds = await p.locator('[data-runway="27R"]').boundingBox();
  assert.ok(
    bounds.x >= 0 &&
      bounds.x + bounds.width <= 390 &&
      bounds.y + bounds.height <= 844,
  );
  await p.click('[data-runway="27R"]');
  assert.equal(
    await p.evaluate(
      () =>
        window.__HEATHROW__.sim.planes.find((p) => p.kind === "departure")
          .state,
    ),
    "taxiing",
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      logos: 4,
      departures: true,
      handoff: true,
      collision: true,
      restart: true,
      mobile: true,
      errors,
    }),
  );
} finally {
  await b.close();
}
