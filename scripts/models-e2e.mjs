import { captureBrowser, captureContext } from "./browser.mjs";
import assert from "node:assert/strict";
const b = await captureBrowser();
try {
  const p = await b.newPage({
      ...captureContext,
      viewport: { width: 1600, height: 1000 },
    }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (
      m.type() === "error" &&
      /WebGLProgram|Shader Error|mergeBufferGeometries|mergeGeometries/.test(
        m.text(),
      )
    )
      errors.push(m.text());
  });
  await p.goto(
    (process.env.TEST_URL || "http://localhost:4173/") + "models.html",
    { waitUntil: "domcontentloaded" },
  );
  await p.waitForFunction(() => window.__MODELS__?.ready, null, {
    timeout: 180000,
  });
  for (const id of [
    "BA-B789",
    "VS-B789",
    "VS-A35K",
    "EK-A388",
    "SQ-B77W",
    "BA-A320",
    "T5A",
    "T5B",
    "T5C",
    "T2B",
    "T2A",
  ]) {
    await p.evaluate((id) => {
      const a = window.__MODELS__;
      a.select(id);
      a.setAngle("perspective");
      a.renderer.getContext().finish();
    }, id);
    await p.screenshot({ path: `work/screenshots/hangar-${id}.png` });
    for (const angle of ["side", "front", "top"]) {
      const framing = await p.evaluate((angle) => {
        const a = window.__MODELS__;
        a.setAngle(angle);
        a.model.updateMatrixWorld(true);
        const V = a.camera.position.constructor;
        let max = 0;
        a.model.traverse((o) => {
          if (!o.isMesh) return;
          o.geometry.computeBoundingBox();
          const b = o.geometry.boundingBox;
          for (const x of [b.min.x, b.max.x])
            for (const y of [b.min.y, b.max.y])
              for (const z of [b.min.z, b.max.z]) {
                const v = new V(x, y, z)
                  .applyMatrix4(o.matrixWorld)
                  .project(a.camera);
                max = Math.max(max, Math.abs(v.x), Math.abs(v.y));
              }
        });
        return max;
      }, angle);
      assert.ok(framing < 1, `${id} ${angle} clipped: ${framing}`);
    }

    assert.equal(
      await p.locator(".model-option.active").getAttribute("data-model"),
      id,
    );
  }
  await p.click('[data-angle="front"]');
  await p.click("#wireframe");
  assert.equal(await p.locator("#wireframe").getAttribute("class"), "active");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => window.__MODELS__.select("BA-B789"));
  await p.screenshot({ path: "work/screenshots/hangar-mobile.png" });
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      models: 11,
      views: true,
      wireframe: true,
      mobile: true,
      errors,
    }),
  );
} finally {
  await b.close();
}
