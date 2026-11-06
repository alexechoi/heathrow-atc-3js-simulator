import assert from "node:assert/strict";
import { captureBrowser, captureContext } from "./browser.mjs";
const b = await captureBrowser();
const url = process.env.TEST_URL || "http://localhost:4173/";
try {
  const p = await b.newPage({
    ...captureContext,
    viewport: { width: 960, height: 640 },
  });
  p.setDefaultTimeout(120000);
  // A device without WebGL must get a visible recovery screen, not a spinner.
  await p.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : get.call(this, type, ...args);
    };
  });
  await p.goto(url + "?capture");
  await p.waitForSelector(".load-failed");
  assert.match(await p.locator("#loading-detail").textContent(), /WebGL/);
  assert.ok(await p.locator("#load-retry").isVisible());
  await p.goto(url + "models.html");
  await p.waitForSelector(".model-error");
  assert.match(await p.locator("#model-loading").textContent(), /WebGL 2/);
  await p.close();
  const q = await b.newPage({
    ...captureContext,
    viewport: { width: 960, height: 640 },
  });
  q.setDefaultTimeout(120000);
  await q.route("**/assets/sunset.hdr", (r) => r.abort());
  await q.goto(url + "?capture");
  await q.waitForSelector(".load-failed");
  assert.ok(await q.locator("#load-retry").isVisible());
  await q.close();
  const r = await b.newPage({
    ...captureContext,
    viewport: { width: 960, height: 640 },
  });
  r.setDefaultTimeout(120000);
  await r.route("**/*arcgisonline.com/**", (route) => route.abort());
  await r.goto(url + "?capture");
  await r.waitForFunction(() => window.__HEATHROW__?.ready);
  assert.equal(
    await r.evaluate(() => __HEATHROW__.state.geography.satellite),
    false,
  );
  assert.ok(
    await r.locator("#start").isVisible(),
    "Missing imagery does not block play",
  );
  await r.evaluate(() =>
    __HEATHROW__.renderer
      .getContext()
      .getExtension("WEBGL_lose_context")
      .loseContext(),
  );
  await r.waitForSelector(".load-failed");
  assert.match(
    await r.locator("#loading-detail").textContent(),
    /lost its graphics/,
  );
  assert.equal(await r.evaluate(() => __HEATHROW__.state.paused), true);
  console.log(
    JSON.stringify({
      webglRecovery: true,
      missingAssetRecovery: true,
      imageryFallback: true,
      contextLossRecovery: true,
    }),
  );
} finally {
  await b.close();
}
