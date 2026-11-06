import * as T from "three";
// A local metre-scaled Web Mercator frame, shared with scripts/build-geodata.py.
export const ORIGIN = { lon: -0.46064, lat: 51.47122 };
const R = 6378137,
  k = Math.cos((ORIGIN.lat * Math.PI) / 180),
  ox = (R * ORIGIN.lon * Math.PI) / 180,
  oy = R * Math.log(Math.tan(Math.PI / 4 + (ORIGIN.lat * Math.PI) / 360));
export const IMAGERY_CREDIT =
  "Imagery © Esri, Vantor, Earthstar Geographics · Geometry © OpenStreetMap contributors";
export function imageryURL(width, height, pixels = 4096) {
  const bbox = [
    ox - width / 2 / k,
    oy - height / 2 / k,
    ox + width / 2 / k,
    oy + height / 2 / k,
  ].join(",");
  const params = new URLSearchParams({
    bbox,
    bboxSR: "3857",
    imageSR: "3857",
    size: `${pixels},${Math.round((pixels * height) / width)}`,
    format: "jpg",
    f: "image",
  });
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params}`;
}
export async function loadGeography() {
  const data = await fetch("/data/heathrow.json").then((r) => {
    if (!r.ok) throw new Error("Airport geometry unavailable");
    return r.json();
  });
  // Imagery is optional: a blocked tile service must not block the game.
  const deadline = performance.now() + 8000;
  const loader = new T.TextureLoader();
  const timed = (url) =>
    new Promise((resolve, reject) => {
      let expired = false;
      const timer = setTimeout(
        () => { expired = true; reject(new Error("Imagery tile timed out")); },
        Math.max(1, Math.min(3500, deadline - performance.now())),
      );
      loader.loadAsync(url).then(
        (t) => {
          clearTimeout(timer);
          if (expired) t.dispose();
          else resolve(t);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        },
      );
    });
  // Pre-rendered tiles are much faster and more reliable than asking the export
  // service to render a new multi-megapixel image for every first-time visitor.
  async function mosaic(width, height, zoom, pixels) {
    const canvas = document.createElement("canvas");
    canvas.width = pixels;
    canvas.height = Math.round((pixels * height) / width);
    const ctx = canvas.getContext("2d"),
      world = 2 * Math.PI * R;
    const resolution = world / (256 * 2 ** zoom),
      left = (ox - width / 2 / k + world / 2) / resolution,
      top = (world / 2 - (oy + height / 2 / k)) / resolution;
    const spanX = width / k / resolution,
      spanY = height / k / resolution,
      scale = pixels / spanX;
    const tasks = [];
    let completed = 0,
      missing = 0;
    for (
      let row = Math.floor(top / 256);
      row <= Math.floor((top + spanY) / 256);
      row++
    )
      for (
        let col = Math.floor(left / 256);
        col <= Math.floor((left + spanX) / 256);
        col++
      )
        tasks.push({ row, col });
    async function worker() {
      while (tasks.length && performance.now() < deadline) {
        const { row, col } = tasks.shift();
        let tex = null,
          parent = false;
        for (const host of [
          "server.arcgisonline.com",
          "services.arcgisonline.com",
        ]) {
          if (performance.now() >= deadline) break;
          try {
            tex = await timed(
              `https://${host}/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${row}/${col}`,
            );
            break;
          } catch {}
        }
        if (!tex && performance.now() < deadline) {
          try {
            tex = await timed(
              `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom - 1}/${Math.floor(row / 2)}/${Math.floor(col / 2)}`,
            );
            parent = true;
          } catch {}
        }
        if (tex) {
          ctx.drawImage(
            tex.image,
            parent ? (col % 2) * 128 : 0,
            parent ? (row % 2) * 128 : 0,
            parent ? 128 : 256,
            parent ? 128 : 256,
            (col * 256 - left) * scale,
            (row * 256 - top) * scale,
            256 * scale + 0.1,
            256 * scale + 0.1,
          );
          tex.dispose();
          completed++;
        } else missing++;
      }
    }
    await Promise.all(Array.from({ length: 12 }, worker));
    if (missing || tasks.length)
      throw new Error(`${missing} satellite tiles unavailable`);
    const texture = new T.CanvasTexture(canvas);
    texture.userData.tiles = completed;
    return texture;
  }
  const images = await Promise.allSettled([
    mosaic(7600, 5200, 16, 4096),
    mosaic(32000, 32000, 12, 2048),
  ]);
  for (const r of images)
    if (r.status === "fulfilled") {
      r.value.colorSpace = T.SRGBColorSpace;
      r.value.anisotropy = 8;
    }
  return {
    data,
    near: images[0].status === "fulfilled" ? images[0].value : null,
    far: images[1].status === "fulfilled" ? images[1].value : null,
  };
}
