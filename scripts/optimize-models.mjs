// Keep geometry and 2K livery resolution; compress transport with Meshopt and WebP.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  meshopt,
  textureCompress,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const paths = [
  "787/BA.glb",
  "787/VS.glb",
  "787/BA-parked.glb",
  "787/VS-parked.glb",
  "a320/BA.glb",
];
for (const rel of paths) {
  const input = path.join(
      process.env.MODEL_INPUT || "public/assets/models",
      rel,
    ),
    output = path.join(
      process.env.MODEL_OUTPUT || "work/optimized-models",
      rel,
    );
  const before = (await fs.stat(input)).size;
  const doc = await io.read(input);
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      quality: 90,
      effort: 6,
    }),
    meshopt({
      encoder: MeshoptEncoder,
      level: "high",
      quantizePosition: 16,
      quantizeNormal: 12,
      quantizeTexcoord: 16,
    }),
  );
  await fs.mkdir(path.dirname(output), { recursive: true });
  await io.write(output, doc);
  console.log(
    JSON.stringify({ file: rel, before, after: (await fs.stat(output)).size }),
  );
}
