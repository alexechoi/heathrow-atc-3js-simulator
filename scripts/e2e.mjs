import { captureBrowser, captureContext, settleFrame } from "./browser.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const url = process.env.TEST_URL || "http://localhost:4173/";
const browser = await captureBrowser();
const page = await browser.newPage({
  ...captureContext,
  viewport: { width: 1440, height: 900 },
});
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" && /WebGLProgram|Shader Error/.test(m.text()))
    errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));
await fs.mkdir("work/screenshots", { recursive: true });
await page.goto(url + "?capture", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForFunction(() => window.__HEATHROW__?.ready, null, {
  timeout: 120000,
});
await page.evaluate(() => window.__HEATHROW__.step(0.01));
assert.ok(
  await page.evaluate(
    () => window.__HEATHROW__.state.geography.vectorMarkings > 400,
  ),
);
if (process.env.REQUIRE_IMAGERY)
  assert.ok(
    await page.evaluate(() => window.__HEATHROW__.state.geography.satellite),
    "Satellite imagery must load",
  );
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/04-final-desktop.png" });
await page.click("#start");
assert.equal(
  await page.evaluate(() => window.__HEATHROW__.state.playing),
  true,
);
await page.click('[data-runway="27L"]');
assert.equal(
  await page.evaluate(() => window.__HEATHROW__.sim.planes[0].runway),
  "27L",
);
await page.click("#hold");
assert.equal(
  await page.evaluate(() => window.__HEATHROW__.sim.planes[0].state),
  "to-hold",
);
await page.click("#go-around");
assert.equal(
  await page.evaluate(() => window.__HEATHROW__.sim.planes[0].state),
  "go-around",
);
await page.click("#restart");
await page.click("#draw");
await page.mouse.move(820, 400);
await page.mouse.down();
await page.mouse.move(1000, 460, { steps: 8 });
await page.mouse.move(1060, 510, { steps: 8 });
await page.mouse.up();
assert.equal(
  await page.evaluate(() => window.__HEATHROW__.sim.planes[0].state),
  "vectoring",
);
assert.ok(
  (await page.evaluate(() => window.__HEATHROW__.sim.planes[0].route.length)) >
    2,
);
await page.click('[data-runway="27R"]');
assert.equal(
  await page.evaluate(() => window.__HEATHROW__.sim.planes[0].runway),
  "27R",
);
await page.evaluate(() => window.__HEATHROW__.step(0.01));
assert.ok(
  await page.evaluate(
    () => window.__HEATHROW__.state.geography.vectorMarkings > 400,
  ),
);
if (process.env.REQUIRE_IMAGERY)
  assert.ok(
    await page.evaluate(() => window.__HEATHROW__.state.geography.satellite),
    "Satellite imagery must load",
  );
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/05-routing.png" });
await page.click("#restart");
await page.click('[data-runway="27L"]');
await page.evaluate(() => {
  const a = window.__HEATHROW__;
  for (let i = 0; i < 850; i++) a.sim.tick(0.1);
  a.step(0.4);
});
assert.ok((await page.evaluate(() => window.__HEATHROW__.sim.landed)) >= 1);
assert.match(await page.locator("#landed").textContent(), /01/);
await page.click("#pause");
assert.equal(await page.evaluate(() => window.__HEATHROW__.state.paused), true);
await page.click("#pause");
await page.click("#speed");
assert.equal(await page.locator("#speed").textContent(), "2×");
await page.click("#help");
assert.equal(await page.locator("#help-dialog").evaluate((e) => e.open), true);
await page.click("#close-help");
await page.keyboard.press("f");
assert.equal(
  await page.evaluate(() => window.__HEATHROW__.state.cinematic),
  true,
);
await page.evaluate(() => window.__HEATHROW__.captureFrame(12));
await page.evaluate(() => window.__HEATHROW__.step(0.01));
assert.ok(
  await page.evaluate(
    () => window.__HEATHROW__.state.geography.vectorMarkings > 400,
  ),
);
if (process.env.REQUIRE_IMAGERY)
  assert.ok(
    await page.evaluate(() => window.__HEATHROW__.state.geography.satellite),
    "Satellite imagery must load",
  );
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/06-arrival.png" });
await page.evaluate(() => window.__HEATHROW__.captureFrame(20));
await page.evaluate(() => window.__HEATHROW__.step(0.01));
assert.ok(
  await page.evaluate(
    () => window.__HEATHROW__.state.geography.vectorMarkings > 400,
  ),
);
if (process.env.REQUIRE_IMAGERY)
  assert.ok(
    await page.evaluate(() => window.__HEATHROW__.state.geography.satellite),
    "Satellite imagery must load",
  );
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/07-concourse.png" });
await page.evaluate(() => window.__HEATHROW__.captureFrame(28));
await page.evaluate(() => window.__HEATHROW__.step(0.01));
assert.ok(
  await page.evaluate(
    () => window.__HEATHROW__.state.geography.vectorMarkings > 400,
  ),
);
if (process.env.REQUIRE_IMAGERY)
  assert.ok(
    await page.evaluate(() => window.__HEATHROW__.state.geography.satellite),
    "Satellite imagery must load",
  );
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/08-tower.png" });
await page.keyboard.press("Escape");
assert.equal(
  await page.evaluate(() => window.__HEATHROW__.state.cinematic),
  false,
);
await page.click("#daylight");
assert.equal(await page.evaluate(() => window.__HEATHROW__.state.day), "day");
await page.click("#daylight");
assert.equal(await page.evaluate(() => window.__HEATHROW__.state.day), "night");
await page.setViewportSize({ width: 1200, height: 630 });
await page.evaluate(() => {
  const a = window.__HEATHROW__;
  a.enterFilm();
  a.captureFrame(12);
  document.querySelector("#film-title").textContent = "Heathrow Control.";
  document.querySelector("#film-sub").textContent =
    "TWO RUNWAYS. ONE CONTROLLER. PLAY IN YOUR BROWSER.";
  document.querySelector("#exit-film").style.display = "none";
});
await settleFrame(page);
await page.screenshot({
  path: "work/screenshots/social-check.jpg",
  type: "jpeg",
  quality: 92,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.waitForFunction(() => window.__HEATHROW__?.ready, null, {
  timeout: 120000,
});
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  true,
);
await page.evaluate(() => window.__HEATHROW__.step(0.01));
assert.ok(
  await page.evaluate(
    () => window.__HEATHROW__.state.geography.vectorMarkings > 400,
  ),
);
if (process.env.REQUIRE_IMAGERY)
  assert.ok(
    await page.evaluate(() => window.__HEATHROW__.state.geography.satellite),
    "Satellite imagery must load",
  );
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/09-mobile.png" });
await page.click("#start");
await page.click('[data-runway="27L"]');
await page.evaluate(() => window.__HEATHROW__.step(0.01));
assert.ok(
  await page.evaluate(
    () => window.__HEATHROW__.state.geography.vectorMarkings > 400,
  ),
);
if (process.env.REQUIRE_IMAGERY)
  assert.ok(
    await page.evaluate(() => window.__HEATHROW__.state.geography.satellite),
    "Satellite imagery must load",
  );
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/10-mobile-play.png" });
assert.equal(errors.length, 0, errors.join("\n"));
console.log(
  JSON.stringify({
    passed: true,
    checks: [
      "desktop load",
      "start",
      "clearance",
      "hold",
      "go-around",
      "mouse-drawn route",
      "landing + score",
      "pause",
      "speed",
      "help",
      "flythrough",
      "camera shots",
      "lighting",
      "mobile layout + controls",
    ],
    errors,
  }),
);
await browser.close();
