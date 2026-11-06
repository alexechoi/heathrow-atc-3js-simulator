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
      ...(process.env.CAPTURE_NATIVE_GPU === "1"
        ? []
        : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
    ],
  });
}
export const captureContext = { ignoreHTTPSErrors: !!process.env.HTTPS_PROXY };
export async function settleFrame(page) {
  await page.evaluate(async () => {
    // Resize events can arrive after Playwright resolves setViewportSize.
    // Let the renderer/composer resize, then redraw a cleared framebuffer.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    const app = window.__HEATHROW__;
    const viewport = `${innerWidth}x${innerHeight}`;
    if (app && window.__settledViewport !== viewport) {
      app.post.render();
      window.__settledViewport = viewport;
    }
    app?.renderer.getContext().finish();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}
