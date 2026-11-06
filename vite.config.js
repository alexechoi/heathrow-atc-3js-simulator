import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
// Old deployments used year-long caching for stable GLB paths. Content-derived
// query versions also update those returning browsers, not just new visitors.
const modelRoot = new URL("./public/assets/models/", import.meta.url);
const modelHash = createHash("sha256");
for (const file of readdirSync(modelRoot, { recursive: true }).filter((f) => f.endsWith(".glb")).sort())
  modelHash.update(readFileSync(new URL(file, modelRoot)));
const modelVersion = modelHash.digest("hex").slice(0, 12);
export default defineConfig({
  define: { __MODEL_ASSET_VERSION__: JSON.stringify(modelVersion) },
  build: {
    rollupOptions: { input: { main: "index.html", models: "models.html" } },
  },
});
