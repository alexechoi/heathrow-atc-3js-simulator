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
    "BA-A20N",
    "T5A",
    "T5B",
    "T5C",
    "T2B",
    "T2A",
    "T3",
  ]) {
    await p.evaluate((id) => {
      const a = window.__MODELS__;
      a.select(id);
      a.setAngle("perspective");
      a.renderer.getContext().finish();
    }, id);
    await p.screenshot({ path: `work/screenshots/hangar-${id}.png` });
    if (id === "EK-A388")
      assert.equal(
        await p.evaluate(() => window.__MODELS__.model.userData.wheelCount),
        22,
      );
    if (id === "BA-A20N") {
      const dimensions = await p.evaluate(() => {
        const a = window.__MODELS__,
          g = a.model.getObjectByName("gear");
        let min = [Infinity, Infinity, Infinity],
          max = [-Infinity, -Infinity, -Infinity];
        a.model.traverse((o) => {
          if (!o.isMesh) return;
          const p = o.geometry.attributes.position;
          for (let i = 0; i < p.count; i++)
            for (let k = 0; k < 3; k++) {
              const v = p.array[i * 3 + k];
              min[k] = Math.min(min[k], v);
              max[k] = Math.max(max[k], v);
            }
        });
        return {
          length: max[0] - min[0],
          span: max[2] - min[2],
          bottom: min[1] + a.model.userData.groundHeight,
          gear: g.children.length,
          source: a.model.userData.source,
        };
      });
      assert.ok(Math.abs(dimensions.length - 37.57) < 0.15, "A320neo length");
      assert.ok(Math.abs(dimensions.span - 35.8) < 0.15, "A320neo span");
      assert.ok(
        Math.abs(dimensions.bottom) < 0.01,
        "A320neo wheels touch the ground",
      );
      assert.ok(dimensions.gear > 0, "A320neo landing gear can retract");
      assert.equal(dimensions.source, "FlightGear A320-family");
    }

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
      models: 12,
      views: true,
      wireframe: true,
      mobile: true,
      errors,
    }),
  );
} finally {
  await b.close();
}
