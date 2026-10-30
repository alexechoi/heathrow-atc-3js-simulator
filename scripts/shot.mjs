import { captureBrowser, captureContext, settleFrame } from "./browser.mjs";
import fs from "node:fs/promises";
const browser = await captureBrowser();
const page = await browser.newPage({
  ...captureContext,
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on(
  "pageerror",
  (e) => (errors.push(e.message), console.log("ERROR", e.message)),
);
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  console.log(m.text());
});
await page.goto(
  (process.env.TEST_URL || "http://localhost:4173/") + "?capture",
  { waitUntil: "domcontentloaded", timeout: 60000 },
);
await page.waitForFunction(() => window.__HEATHROW__?.ready, null, {
  timeout: 120000,
});
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/01-overview.png" });
console.log(
  JSON.stringify({
    errors,
    state: await page.evaluate(() => window.__HEATHROW__.state),
  }),
);
await page.evaluate(() => {
  window.__HEATHROW__.setView("follow");
  window.__HEATHROW__.step(0.01);
});
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/02-aircraft.png" });
await page.evaluate(() => {
  window.__HEATHROW__.enterFilm();
  window.__HEATHROW__.captureFrame(19);
});
await settleFrame(page);
await page.screenshot({ path: "work/screenshots/03-terminal.png" });
await browser.close();
