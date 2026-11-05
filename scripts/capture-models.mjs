// Reproducible 12-second model review reel; renderer time does not depend on GPU speed.
import { captureBrowser, captureContext } from "./browser.mjs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
const out = process.env.CAPTURE_OUT || "work/aircraft-model-review.mp4";
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.mkdir("work/screenshots", { recursive: true });
const b = await captureBrowser();
let ff;
try {
  const p = await b.newPage({
    ...captureContext,
    viewport: { width: 1280, height: 720 },
  });
  p.setDefaultTimeout(90000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(
    (process.env.CAPTURE_URL || "http://localhost:4173/") + "models.html",
  );
  await p.waitForFunction(() => window.__MODELS__?.ready, null, {
    timeout: 180000,
  });
  await p.addStyleTag({
    content:
      '.model-sidebar,.model-toolbar,.model-caption{display:none} #model-stage{inset:0} #model-credit{left:35px;bottom:20px;font-size:10px} #reel-title{position:fixed;top:30px;left:35px;color:#193035;z-index:5;font:500 30px "Space Grotesk Variable"} #reel-title small{display:block;font:12px "DM Sans Variable";letter-spacing:2px;margin-top:8px}',
  });
  await p.evaluate(() => {
    const d = document.createElement("div");
    d.id = "reel-title";
    document.body.append(d);
    window.dispatchEvent(new Event("resize"));
    window.__MODELS__.controls.enableDamping = false;
  });
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
      "24",
      "-i",
      "pipe:0",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "19",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      out,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const shots = [
    [
      "BA-A20N",
      "British Airways A320neo",
      "G-TTNR · CFM LEAP-1A · DETAILED EXTERIOR",
    ],
    [
      "VS-A35K",
      "Virgin Atlantic A350-1000",
      "REVISED WING, COCKPIT AND LANDING GEAR",
    ],
    ["EK-A388", "Emirates A380-800", "DOUBLE DECK · FOUR ENGINES · 22 WHEELS"],
  ];
  for (let frame = 0; frame < 288; frame++) {
    const shot = Math.floor(frame / 96),
      u = (frame % 96) / 95;
    await p.evaluate(
      ({ shot, u, entry }) => {
        const a = window.__MODELS__;
        if (u === 0) {
          a.select(entry[0]);
          a.setAngle("perspective");
          window.__reelDistance = a.camera.position.distanceTo(
            a.controls.target,
          );
          document.querySelector("#reel-title").innerHTML =
            entry[1] + "<small>" + entry[2] + "</small>";
          a.renderer.shadowMap.autoUpdate = false;
          a.renderer.shadowMap.needsUpdate = true;
        }
        const theta = 0.5 + u * 0.7,
          d = window.__reelDistance * 0.9,
          center = a.controls.target;
        a.camera.position.set(
          center.x + Math.cos(theta) * d,
          center.y + d * 0.25,
          center.z + Math.sin(theta) * d,
        );
        a.controls.update();
        a.renderer.render(a.scene, a.camera);
        a.renderer.getContext().finish();
      },
      { shot, u, entry: shots[shot] },
    );
    const bytes = await p.screenshot({ type: "jpeg", quality: 94 });
    if (!ff.stdin.write(bytes)) await once(ff.stdin, "drain");
    if (frame % 96 === 0) {
      await fs.writeFile(`work/screenshots/reel-${shots[shot][0]}.jpg`, bytes);
      console.log("Captured", shots[shot][0]);
    }
  }
  ff.stdin.end();
  const [code] = await once(ff, "close");
  if (code || errors.length) throw Error(JSON.stringify({ code, errors }));
  console.log(out);
} finally {
  ff?.kill();
  await b.close();
}
