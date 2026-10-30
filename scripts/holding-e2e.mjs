import { captureBrowser, captureContext, settleFrame } from "./browser.mjs";
import assert from "node:assert/strict";
const b = await captureBrowser();
try {
  const page = await b.newPage({
    ...captureContext,
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /WebGLProgram|Shader Error/.test(m.text()))
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
  await page.evaluate(() => {
    const a = window.__HEATHROW__,
      template = a.sim.planes[1];
    for (const id of ["STACK7000", "STACK8000"]) {
      const p = { ...template, id, route: [], trail: [] };
      a.sim.planes.push(p);
      a.sim.placeInHold(p, 0);
    }
    a.setView("radar");
    a.step(0.4);
  });
  await settleFrame(page);
  const labels = await page
    .locator(".radar-label:visible")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        text: n.textContent,
        ...Object.fromEntries(
          ["left", "right", "top", "bottom"].map((k) => [
            k,
            n.getBoundingClientRect()[k],
          ]),
        ),
      })),
    );
  assert.equal(labels.length, 7);
  const blocked = await page
    .locator(".radar-label:visible")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          const r = n.getBoundingClientRect();
          return !n.contains(
            document.elementFromPoint(
              r.left + r.width / 2,
              r.top + r.height / 2,
            ),
          );
        })
        .map((n) => n.textContent),
    );
  assert.deepEqual(blocked, [], "radar labels must be clickable above the HUD");
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i],
        b = labels[j];
      assert.ok(
        a.right <= b.left ||
          b.right <= a.left ||
          a.bottom <= b.top ||
          b.bottom <= a.top,
        `Overlapping labels: ${a.text} / ${b.text}`,
      );
    }
  assert.ok(labels.some((l) => l.text.includes("7000 FT")));
  assert.ok(labels.some((l) => l.text.includes("8000 FT")));
  await page.screenshot({ path: "work/screenshots/holding-stacks.png" });
  await page.locator(".radar-label").filter({ hasText: "STACK8000" }).click();
  assert.equal(
    await page.locator("#selected-title").textContent(),
    "STACK8000",
  );
  assert.match(await page.locator("#command-hint").textContent(), /8,000 FT/);
  await page.click("#hold");
  assert.equal(
    await page.evaluate(
      () =>
        window.__HEATHROW__.sim.planes.find((p) => p.id === "STACK8000").state,
    ),
    "holding",
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      levels: [6000, 7000, 8000],
      readableLabels: labels.length,
      selectFromRadar: true,
      errors,
    }),
  );
} finally {
  await b.close();
}
