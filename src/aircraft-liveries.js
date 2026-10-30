import * as T from "three";
const art = {};
export async function loadAirlineMarkings() {
  await Promise.all(
    ["ba-logo", "vs-logo", "sq-logo", "ek-logo", "virgin-mark", "sq-bird"].map(
      async (name) => {
        const img = new Image();
        img.src = `/assets/liveries/${name}.svg`;
        await img.decode();
        art[name] = img;
      },
    ),
  );
}
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function texture(c) {
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}
function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
export function bodyLivery(airline, spec) {
  const c = canvas(4096, 1024),
    ctx = c.getContext("2d"),
    W = c.width,
    H = c.height,
    L = spec.length;
  ctx.fillStyle = airline === "VS" ? "#edf0ee" : "#f4f5f2";
  ctx.fillRect(0, 0, W, H);
  const x = (v) => (v / L + 0.5) * W;
  const row = (height, side) =>
    ((side > 0
      ? Math.acos(height / spec.ry)
      : 2 * Math.PI - Math.acos(height / spec.ry)) /
      (2 * Math.PI)) *
    H;
  if (airline === "BA") {
    ctx.fillStyle = "#081e43";
    ctx.fillRect(0, H * 0.305, W, H * 0.39);
  }
  for (const side of [1, -1]) {
    const cy = row(0.6, side);
    if (airline === "SQ") {
      ctx.fillStyle = "#142344";
      ctx.fillRect(
        x(-L * 0.43),
        cy + (side > 0 ? -10 : -25),
        x(L * 0.385) - x(-L * 0.43),
        35,
      );
      ctx.fillStyle = "#d4aa45";
      ctx.fillRect(
        x(-L * 0.44),
        cy + (side > 0 ? 25 : -43),
        x(L * 0.385) - x(-L * 0.44),
        18,
      );
      ctx.fillStyle = "#c38734";
      ctx.fillRect(
        x(-L * 0.44),
        cy + (side > 0 ? 20 : -24),
        x(L * 0.385) - x(-L * 0.44),
        4,
      );
    }
    const doors =
      spec.type === "A320"
        ? [-0.32, -0.08, 0.08, 0.33]
        : [-0.35, -0.13, 0.12, 0.34];
    const heights = spec.type === "A388" ? [-0.7, 1.7] : [0.65];
    for (const height of heights) {
      for (
        let xx = -L * 0.36;
        xx < L * 0.36;
        xx += spec.type === "A320" ? 0.55 : 0.64
      ) {
        if (doors.some((d) => Math.abs(xx - L * d) < 0.8)) continue;
        const yy = row(height, side),
          ww = (W / L) * 0.28,
          hh = (H / (2 * Math.PI * spec.ry)) * 0.43;
        ctx.fillStyle = "#a3a9ad";
        rounded(
          ctx,
          x(xx) - ww / 2 - 1,
          yy - hh / 2 - 1,
          ww + 2,
          hh + 2,
          ww * 0.45,
        );
        ctx.fillStyle = "#14222f";
        rounded(ctx, x(xx) - ww / 2, yy - hh / 2, ww, hh, ww * 0.45);
        ctx.fillStyle = "#435362";
        rounded(
          ctx,
          x(xx) - ww * 0.32,
          yy - hh * 0.28,
          ww * 0.64,
          hh * 0.28,
          2,
        );
      }
      for (const d of doors) {
        const ww = (W / L) * 0.96,
          hh = (H / (2 * Math.PI * spec.ry)) * 1.95,
          yy = row(height - 0.3, side);
        ctx.strokeStyle = "#8a969c";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(x(d * L) - ww / 2, yy - hh / 2, ww, hh, 6);
        ctx.stroke();
        ctx.fillStyle = "#69757a";
        ctx.fillRect(x(d * L) - ww * 0.12, yy + hh * 0.14, ww * 0.28, 2);
        ctx.fillStyle = "#a33932";
        ctx.fillRect(x(d * L) - 5, yy - hh * 0.25, 10, 3);
      }
    }
    let logo = art[`${airline.toLowerCase()}-logo`];
    if (logo) {
      const source = logo,
        paint = canvas(2048, 512),
        pc = paint.getContext("2d");
      if (airline === "VS") {
        // Rasterize first: viewBox-only SVGs have browser-dependent intrinsic crop units.
        const raster = canvas(2048, 512);
        raster.getContext("2d").drawImage(source, 0, 0, 2048, 512);
        pc.drawImage(raster, 0, 225, 1761, 287, 0, 0, 2048, 512);
      } else pc.drawImage(source, 0, 0, 2048, 512);
      pc.globalCompositeOperation = "source-in";
      pc.fillStyle = {
        BA: "#0b2145",
        VS: "#3e2944",
        SQ: "#102347",
        EK: "#a28341",
      }[airline];
      pc.fillRect(0, 0, 2048, 512);
      paint.naturalWidth = source.naturalWidth;
      paint.naturalHeight =
        source.naturalHeight * (airline === "VS" ? 0.55 : 1);
      logo = paint;
    }
    ctx.save();
    const titleX = x(L * 0.14),
      titleY = row(
        airline === "BA" ? -0.4 : spec.type === "A388" ? 0.75 : 1.72,
        side,
      );
    ctx.translate(titleX, titleY);
    ctx.scale(side > 0 ? 1 : -1, side > 0 ? 1 : -1);
    if (airline === "EK") {
      if (logo) {
        ctx.drawImage(logo, 0, 340, 2048, 172, -W * 0.18, -28, W * 0.36, 56);
        ctx.drawImage(logo, 0, 0, 2048, 340, W * 0.19, -36, 90, 28);
      }
    } else if (logo) {
      const width =
        W * (airline === "VS" ? 0.4 : airline === "SQ" ? 0.4 : 0.26);
      const ratio = logo.naturalHeight / logo.naturalWidth;
      // UV pixels have different metre scales longitudinally and around the body.
      const physicalRatio = L / W / ((2 * Math.PI * spec.ry) / H);
      const height =
        width *
        ratio *
        physicalRatio *
        (airline === "BA" ? 0.65 : airline === "VS" ? 0.6 : 1);
      // Virgin's horizontal wordmark is tall and is placed above the cabin line.
      ctx.drawImage(logo, -width / 2, -height / 2, width, height);
    }
    if (airline === "BA") {
      ctx.fillStyle = "#c71838";
      ctx.beginPath();
      ctx.moveTo(W * 0.12, -43);
      ctx.bezierCurveTo(W * 0.18, -53, W * 0.22, -45, W * 0.25, -53);
      ctx.bezierCurveTo(W * 0.22, -34, W * 0.17, -35, W * 0.12, -33);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(x(-L * 0.29), row(-0.25, side));
    ctx.scale(side > 0 ? 1 : -1, side > 0 ? 1 : -1);
    ctx.fillStyle = airline === "BA" ? "#23334c" : "#2a3340";
    ctx.font = `${(W / L) * 0.34}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(
      {
        BA: spec.type === "A320" ? "G-EUYY" : "G-ZBKF",
        VS: "G-VJAM",
        EK: "A6-EOG",
        SQ: "9V-SNC",
      }[airline],
      0,
      0,
    );
    ctx.restore();
  }
  return texture(c);
}
export function tailLivery(airline, mirrored = false) {
  const c = canvas(1024, 1024),
    ctx = c.getContext("2d");

  ctx.fillStyle = {
    BA: "#0b1d45",
    VS: "#b10a31",
    EK: "#f8f8f4",
    SQ: "#112148",
  }[airline];
  ctx.fillRect(0, 0, 1024, 1024);
  const ribbon = (color, y, width) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-90, y);
    ctx.bezierCurveTo(180, y - 170, 460, y + 210, 1120, y + 440);
    ctx.lineTo(1120, y + 440 + width);
    ctx.bezierCurveTo(
      450,
      y + 210 + width,
      180,
      y - 170 + width,
      -90,
      y + width,
    );
    ctx.fill();
  };
  if (airline === "BA") {
    ribbon("#f4f6f4", 40, 320);
    ribbon("#cf1532", 115, 160);
    ribbon("#f4f6f4", 650, 220);
    ribbon("#d51b39", 760, 85);
  } else if (airline === "EK") {
    // UAE flag sweeps up the fin; the red band continues onto the aft fuselage.
    ctx.save();
    ctx.translate(470, 420);
    ctx.rotate(-0.58);
    for (const [i, color] of ["#078248", "#f7f7f5", "#141b20"].entries()) {
      ctx.fillStyle = color;
      ctx.fillRect(-700, -200 + i * 120, 1400, 120);
    }
    ctx.fillStyle = "#d31236";
    ctx.fillRect(-700, -200, 230, 360);
    ctx.restore();
  } else if (airline === "VS" && art["virgin-mark"]) {
    const tmp = canvas(1024, 1024),
      t = tmp.getContext("2d");
    if (mirrored) {
      t.translate(550, 0);
      t.scale(-1, 1);
    }
    t.drawImage(art["virgin-mark"], 55, 410, 440, 440);
    t.globalCompositeOperation = "source-in";
    t.fillStyle = "white";
    t.fillRect(0, 0, 1024, 1024);
    ctx.drawImage(tmp, 0, 0);
  } else if (airline === "SQ" && art["sq-bird"]) {
    const img = art["sq-bird"];
    ctx.save();
    if (mirrored) {
      ctx.translate(550, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      img,
      img.naturalWidth * 0.735,
      0,
      img.naturalWidth * 0.265,
      img.naturalHeight,
      70,
      230,
      410,
      580,
    );
    ctx.restore();
    ctx.fillStyle = "#d5a84e";
    ctx.fillRect(30, 0, 18, 1024);
  }
  ctx.strokeStyle = "#00000025";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(140, 1024);
  ctx.stroke();
  return texture(c);
}
export function engineLogo(airline) {
  const c = canvas(512, 256),
    ctx = c.getContext("2d");
  const img =
    art[airline === "VS" ? "virgin-mark" : `${airline.toLowerCase()}-logo`];
  if (img) {
    const r = img.naturalWidth / img.naturalHeight,
      w = Math.min(430, 200 * r),
      h = w / r;
    ctx.drawImage(img, (512 - w) / 2, (256 - h) / 2, w, h);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle =
      airline === "VS" ? "#ffffff" : airline === "EK" ? "#a58943" : "#203450";
    ctx.fillRect(0, 0, 512, 256);
  }
  return texture(c);
}
