# Contributing to Heathrow Control

Use Node 24, run `npm ci`, then `npm run dev`. Before opening a PR, run `npm test` and `npm run build`. The simulation tests include continuous traffic, taxi queues, holding stacks, runway conflicts and collisions.

For visual changes, include an actual browser screenshot and the reference used. `/models.html` provides perspective, side, front, plan and wireframe views for aircraft and terminals. Check a phone-sized viewport as well as desktop. Browser-check commands and their requirements are in the [README](README.md#validation-and-capture); run the full-airport captures sequentially on software WebGL machines.

## Coordinates and simulation

Positions use metres in the airport's local geographic frame, with Y up. `src/geography.js` defines the origin and projection. The pure simulation owns aircraft positions, routes, clearances and scoring; Three.js renders that state. Keep operational changes in `src/simulation.js` and test their observable effects.

Ground routes come from the bundled OpenStreetMap geometry. Run `python scripts/build-ground-routes.py` after changing route selection. Paths must stay between the active runways, have no loops, and join the mapped holding points. Include extended traffic tests when changing queue priority or route reservations.

`scripts/build-geodata.py` imports standalone ways and building multipolygon relations. Preserve inner rings: they represent open courtyards. T3's main building is a relation, so omitting relation import removes most of that terminal. `src/mapped-shape.js` shares footprint triangulation between the airport and model viewer.

## Models and references

Record reference URLs in `docs/references.md`. Do not copy a third-party model or photograph into the repository without its licence and attribution. The detailed FlightGear aircraft retain GPL-2.0; their original meshes, textures, conversion recipes and licences are bundled under `public/assets/models/`. The original app code uses Apache-2.0. Keep those asset licences distinct.

For GLB changes, rebuild from the corresponding sources, then use `scripts/optimize-models.mjs` with `MODEL_INPUT` pointing to fresh, uncompressed Blender exports. Keep the source archive and conversion instructions current. Vite derives a cache version from the model contents. Compare dimensions, wheel-to-ground alignment, gear visibility, livery and camera framing after conversion.

## Deployment and media

Vite outputs to `dist`. Hashed bundles live in `/build/`; stable assets live in `/assets/`. `public/_headers` is the canonical Netlify header configuration for Git builds and direct ZIP uploads.

`python scripts/deploy-netlify.py --package-only` creates a reviewable ZIP without contacting Netlify. Actual deployment requires the owner's Netlify credentials and a site ID. Never commit tokens or `.env` files.

The launch recorder renders actual game frames at explicit time steps, keeping the export frame rate independent of capture-machine speed. Captures and downloaded reference images belong in ignored `work/`; only reviewed release media belong in `docs/`.
