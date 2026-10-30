# Credits and licences

## Bundled assets

- `public/assets/sunset.hdr`: **Kloppenheim 06 (Pure Sky)**, Greg Zaal (original), Jarod Guest (sky edits), Poly Haven, **CC0**. <https://polyhaven.com/a/kloppenheim_06_puresky>. Original 1K HDR, unmodified. A representative lighting environment, not a photograph taken at Heathrow.
- `public/assets/sky.hdr`: **Kloofendal 48d Partly Cloudy (Pure Sky)**, Greg Zaal (original), Jarod Guest (sky edits), Poly Haven, **CC0**. <https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky>. Original 1K HDR, unmodified.
- **DM Sans**, Colophon Foundry / Google, **SIL Open Font License 1.1**, distributed by `@fontsource-variable/dm-sans`. Licence in the installed package.
- **Space Grotesk**, Florian Karsten, **SIL Open Font License 1.1**, distributed by `@fontsource-variable/space-grotesk`. Licence in the installed package.
- **Three.js**, three.js authors, **MIT**. <https://threejs.org/>

Font licence copies are included in `public/assets/licenses/`.

## Reference only

The Wikimedia / Geograph photographs listed in `docs/references.md` were inspected during modelling. They are not embedded in the game or relicensed as Apache-2.0. Their creators and licences remain as described on their source pages.

Aircraft airline names are descriptive. Geometric liveries and airframes are original simplified models, not official airline artwork. No association or endorsement is implied.

## Inspiration

- [Piccadilly Line Driver](https://github.com/alexechoi/3js-tube-simulator): procedural detail, gameplay, camera reel and screenshot-led review.
- Flight Control: approachable route-drawing air traffic gameplay.


## Surface materials

The following original 1K JPG diffuse, OpenGL normal and roughness maps are bundled from Poly Haven, **CC0**:

- [Asphalt 02](https://polyhaven.com/a/asphalt_02), Rob Tuytel.
- [Concrete](https://polyhaven.com/a/concrete), see the linked asset page for its author.
- [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock), Rob Tuytel.

## Geographic data and imagery

- `public/data/heathrow.json`: derived from **© OpenStreetMap contributors**, **ODbL 1.0**. <https://www.openstreetmap.org/copyright>. Contains selected Heathrow building footprints, airfield ways, roads and woodland, transformed into local coordinates and simplified for rendering. The derived database is offered under ODbL; original application code remains Apache-2.0. Source way IDs are retained. Data retrieved 30 October 2026.
- **Esri World Imagery**, streamed at runtime: **Esri, Vantor, Earthstar Geographics, and the GIS User Community**. <https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer>. Satellite imagery is not bundled or relicensed as open-source art. Provider terms apply. Attribution remains visible in the app and exported footage. Imagery may be historical and is not a live airport feed.
- [Slop New York](https://github.com/mrdoob/slop-newyork/), mrdoob and contributors: reference for layered procedural materials, HDR grading, bloom and geographic scene construction. No source code was copied into this project's original shaders.

- [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02), Poly Haven, CC0: apron diffuse, normal and roughness maps. Used separately from the board-formed concrete wall material.
