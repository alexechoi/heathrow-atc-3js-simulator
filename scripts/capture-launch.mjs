// Current-build footage, captured at deterministic 24 fps. No frame interpolation.
// Taxi/line-up time is advanced between shots; the visible aircraft movement
// runs through the same simulation used by players.
import { captureBrowser, captureContext, settleFrame } from "./browser.mjs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
const out = process.env.CAPTURE_OUT || "docs/media/heathrow-launch.mp4";
const preview = process.env.PREVIEW_ONLY === "1";
const fps = 24,
  duration = 20;
const firstFrame = Number(process.env.CAPTURE_FRAME_START || 0);
const endFrame = Number(process.env.CAPTURE_FRAME_END || duration * fps);
if (
  !Number.isInteger(firstFrame) ||
  !Number.isInteger(endFrame) ||
  firstFrame < 0 ||
  endFrame > duration * fps ||
  firstFrame >= endFrame
)
  throw new Error("Capture frame range must be within 0–480 and nonempty.");
const partial = firstFrame !== 0 || endFrame !== duration * fps;
if (partial && !process.env.CAPTURE_OUT)
  throw new Error("Set CAPTURE_OUT when recording a frame range.");
// Preserve the last good export if Chromium or FFmpeg fails during capture.
const temporaryOut = out.replace(/\.mp4$/i, "") + ".partial.mp4";
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.mkdir("work/screenshots", { recursive: true });
const b = await captureBrowser();
let ff;
try {
  const p = await b.newPage({
    ...captureContext,
    viewport: { width: 1280, height: 720 },
  });
  p.setDefaultTimeout(120000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error" && /WebGLProgram|Shader Error/.test(m.text()))
      errors.push(m.text());
  });
  await p.goto(
    (process.env.CAPTURE_URL || "http://localhost:4173/") + "?capture",
    { waitUntil: "domcontentloaded" },
  );
  await p.waitForFunction(() => window.__HEATHROW__?.ready);
  if (!(await p.evaluate(() => __HEATHROW__.state.geography.satellite)))
    throw Error("Satellite imagery is required for release footage");
  await p.addStyleTag({
    content: `#exit-film,#tip,#toast,.weather,.top-status,.view-toolbar,.header-actions,footer,#labels{display:none!important} #film{display:none!important} #launch-caption{position:fixed;z-index:12;left:35px;bottom:74px;max-width:760px;color:#edf7ed;text-shadow:0 2px 18px #09191d;font:500 48px/1.1 "Space Grotesk Variable";letter-spacing:-1px} #launch-caption small{display:block;margin-top:12px;font:600 13px/1.5 "DM Sans Variable";letter-spacing:2px;color:#cce6d5} #game-stats{top:110px;bottom:auto} .traffic{top:110px} #imagery-credit{bottom:16px} #interface:before{content:'';position:fixed;inset:55% 0 0;pointer-events:none;background:linear-gradient(transparent,#0b1920aa)}`,
  });
  await p.evaluate(() => {
    const c = document.createElement("div");
    c.id = "launch-caption";
    document.body.append(c);
    window.__launchShot = -1;
  });
  const render = async (frame) => {
    await p.evaluate(
      ({ frame, fps }) => {
        const a = __HEATHROW__,
          t = frame / fps,
          shot = t < 4 ? 0 : t < 10 ? 1 : t < 16 ? 2 : 3;
        const start = [0, 4, 10, 16][shot],
          u = (t - start) / [4, 6, 6, 4][shot];
        if (window.__launchShot !== shot) {
          if (a.state.cinematic) a.exitFilm();
          a.start();
          a.setDay("golden");
          window.__launchShot = shot;
          const titles = [
            ["Can you run Heathrow?", "A THREE.JS AIR TRAFFIC CONTROL GAME"],
            ["Ground → tower → takeoff.", "YOUR CLEARANCE. YOUR RUNWAY."],
            [
              "Keep the arrivals separated.",
              "CONTINUOUS TRAFFIC · MISTAKES END YOUR SHIFT",
            ],
            [
              "Two runways. One controller.",
              "PLAY HEATHROW-SIMULATOR.ALEXCHOI.XYZ · OPEN SOURCE",
            ],
          ];
          document.querySelector("#launch-caption").innerHTML =
            titles[shot][0] + "<small>" + titles[shot][1] + "</small>";
          if (shot === 0 || shot === 3) {
            a.enterFilm();
            document.querySelector("#interface").classList.add("hidden");
          }
          if (shot === 1) {
            const d = a.sim.planes.find((p) => p.kind === "departure");
            a.select(d.id);
            a.setView("follow");
          }
          if (shot === 2) {
            a.select(a.sim.planes[0].id);
            a.command("27L");
            for (let i = 0; i < 850 && a.sim.planes[0].x > 2100; i++)
              a.sim.tick(0.1);
            a.setView("follow");
          }
          a.refreshUI();
          a.renderer.shadowMap.needsUpdate = true;
        }
        if (shot === 1) {
          const d = a.sim.planes.find((p) => p.id === a.state.selectedId);
          if (t - start >= 0.5 && d.state === "await-tower")
            document.querySelector("#ground-action").click();
          if (t - start >= 1 && d.state === "holding-short") {
            document.querySelector(`[data-runway="${d.runway}"]`).click();
            // Cut across taxi/line-up time after visibly accepting the handover and
            // issuing the clearance through the actual game controls.
            for (
              let i = 0;
              i < 1200 && (d.state !== "takeoff" || d.speed < 60);
              i++
            )
              a.sim.tick(0.1);
            if (a.sim.over)
              throw Error("Departure shot entered an unsafe state");
            a.refreshUI();
          }
        }
        // Dynamic flights keep their shadows; static architecture shots reuse them.
        a.renderer.shadowMap.autoUpdate = shot === 1 || shot === 2;
        if (shot === 0 || shot === 3) {
          a.captureFrame(
            shot === 0 ? 17 + u * 5 : 33 + u * 6,
            shot === 0
              ? {
                  position: [-600 - u * 120, 260 - u * 35, 650 - u * 130],
                  target: [-1500, 15, 100],
                }
              : {
                  position: [2200 - u * 350, 1250 + u * 100, 2300 - u * 250],
                  target: [-400, 0, 0],
                },
          );
        } else a.step(1 / fps, { offset: [105, 40, 110] });
      },
      { frame, fps },
    );
    await settleFrame(p);
    return p.screenshot({ type: "jpeg", quality: 94 });
  };
  // Open Graph uses its own viewport so attribution and captions remain intact.
  if (!preview && !partial) {
    await p.setViewportSize({ width: 1200, height: 630 });
    const og = await render(0);
    await fs.writeFile("public/og.jpg", og);
    await p.setViewportSize({ width: 1280, height: 720 });
  }
  if (preview) {
    for (const frame of [0, 4 * fps, 7 * fps, 10 * fps, 13 * fps, 16 * fps]) {
      const bytes = await render(frame);
      await fs.writeFile(
        `work/screenshots/launch-preview-${frame / fps}.jpg`,
        bytes,
      );
      console.log("Preview", frame / fps);
    }
  } else {
    ff = spawn(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "-framerate",
        String(fps),
        "-i",
        "pipe:0",
        "-vf",
        "colorspace=iprimaries=bt709:itrc=iec61966-2-1:ispace=bt470bg:irange=pc:all=bt709:range=tv:format=yuv420p",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-color_range",
        "tv",
        "-colorspace",
        "bt709",
        "-color_primaries",
        "bt709",
        "-color_trc",
        "bt709",
        "-movflags",
        "+faststart",
        temporaryOut,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    for (let frame = firstFrame; frame < endFrame; frame++) {
      const bytes = await render(frame);
      if (!ff.stdin.write(bytes)) await once(ff.stdin, "drain");
      if (frame % (fps * 2) === 0) {
        await fs.writeFile(`work/screenshots/launch-${frame / fps}.jpg`, bytes);
      }
      if (frame % (fps / 2) === 0)
        console.log(`Captured ${frame / fps}/${duration}s`);
    }
    ff.stdin.end();
    const [code] = await once(ff, "close");
    if (code !== 0) throw Error(`ffmpeg exited ${code}`);
    ff = null;
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  if (!preview) await fs.rename(temporaryOut, out);
  console.log(preview ? "Preview complete" : `Saved ${out}`);
} finally {
  ff?.kill();
  await b.close();
}
