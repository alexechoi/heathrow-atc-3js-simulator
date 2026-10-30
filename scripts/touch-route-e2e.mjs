import { captureBrowser, captureContext, settleFrame } from "./browser.mjs";
import assert from "node:assert/strict";
const b = await captureBrowser();
try {
  const p = await b.newPage({
    ...captureContext,
    viewport: { width: 390, height: 667 },
    hasTouch: true,
  });
  await p.goto(
    (process.env.TEST_URL || "http://localhost:4173/") + "?capture",
    { waitUntil: "domcontentloaded" },
  );
  await p.waitForFunction(() => window.__HEATHROW__?.ready, null, {
    timeout: 180000,
  });
  await p.click("#start");
  await p.click("#draw");
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 330, y: 355, id: 1 }],
  });
  for (let i = 0; i < 18; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 330 - i * 9, y: 355 + i * 4, id: 1 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const state = await p.evaluate(() => {
    const a = window.__HEATHROW__,
      flight = a.sim.planes[0];
    return {
      state: flight.state,
      points: flight.route.length,
      drawing: document.body.classList.contains("drawing"),
    };
  });
  assert.equal(state.state, "vectoring");
  assert.ok(state.points > 4);
  assert.equal(state.drawing, false);
  await settleFrame(p);
  await p.screenshot({ path: "work/screenshots/mobile-touch-route.png" });
  console.log(JSON.stringify({ touchDrawing: true, ...state }));
} finally {
  await b.close();
}
