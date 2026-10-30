import { chromium } from "playwright";
// Managed environments use an outbound proxy and its session TLS certificate.
// This affects automated capture only, never a visitor's browser configuration.
export async function captureBrowser() {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    proxy: process.env.HTTPS_PROXY
      ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" }
      : undefined,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
}
export const captureContext = { ignoreHTTPSErrors: !!process.env.HTTPS_PROXY };
export async function settleFrame(page) {
  await page.evaluate(() => {
    window.__HEATHROW__?.renderer.getContext().finish();
    return new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
}
