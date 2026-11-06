import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
const root = process.env.TEXTURE_INPUT || "public/assets/textures";
const out = process.env.TEXTURE_OUTPUT || "work/optimized-textures";
await fs.mkdir(out, { recursive: true });
for (const name of (await fs.readdir(root)).filter((n) => n.endsWith(".jpg"))) {
  const input = path.join(root, name),
    output = path.join(out, name.replace(".jpg", ".webp"));
  await sharp(input)
    .webp({ quality: name.includes("nor_gl") ? 95 : 90, effort: 6 })
    .toFile(output);
  console.log(name, (await fs.stat(input)).size, (await fs.stat(output)).size);
}
