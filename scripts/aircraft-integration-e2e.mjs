import { captureBrowser, captureContext } from "./browser.mjs";
import assert from "node:assert/strict";
const b = await captureBrowser();
try {
  const p = await b.newPage({
    ...captureContext,
    viewport: { width: 1280, height: 720 },
  });
  p.setDefaultTimeout(90000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto((process.env.TEST_URL || "http://localhost:4173/") + "?capture");
  await p.waitForFunction(() => window.__HEATHROW__?.ready, null, {
    timeout: 180000,
  });
  const result = await p.evaluate(() => {
    const a = window.__HEATHROW__,
      plane = a.sim.planes.find((p) => p.type === "A20N");
    const mesh = a.scene.children.find((m) => m.userData.type === "A20N");
    const gear = mesh.getObjectByName("gear");
    const source = mesh.userData.source,
      airborneHidden = !gear.visible;
    plane.y = 5;
    plane.bank = plane.pitch = 0;
    a.step(0);
    const groundVisible = gear.visible,
      groundHeight = mesh.position.y;
    let fixedMin = Infinity;
    gear.visible = false;
    mesh.traverseVisible((o) => {
      if (!o.isMesh) return;
      const v = o.geometry.attributes.position;
      for (let i = 0; i < v.count; i++)
        fixedMin = Math.min(fixedMin, v.getY(i) + groundHeight);
    });
    plane.y = 220;
    a.step(0);
    return {
      source,
      airborneHidden,
      groundVisible,
      groundHeight,
      fixedMin,
      retractedAgain: !gear.visible,
    };
  });
  assert.equal(result.source, "FlightGear A320-family");
  assert.equal(result.airborneHidden, true);
  assert.equal(result.groundVisible, true);
  assert.ok(Math.abs(result.groundHeight - 3.8) < 1e-8);
  assert.ok(
    result.fixedMin > 0.6,
    "No landing-gear stays should remain below the retracted aircraft",
  );
  assert.equal(result.retractedAgain, true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(result));
} finally {
  await b.close();
}
