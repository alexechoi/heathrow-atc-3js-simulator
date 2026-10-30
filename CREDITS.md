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

Procedural airframes are original simplified models; the detailed 787 assets have separate upstream credits below. Airline artwork and names identify the represented operators; no association or endorsement is implied.

## Inspiration

- [Piccadilly Line Driver](https://github.com/alexechoi/3js-tube-simulator): procedural detail, gameplay, camera reel and screenshot-led review.
- Flight Control: approachable route-drawing air traffic gameplay.


## Surface materials

The following original 1K JPG diffuse, OpenGL normal and roughness maps are bundled from Poly Haven, **CC0**:

- [Asphalt 02](https://polyhaven.com/a/asphalt_02), Rob Tuytel.
- [Concrete](https://polyhaven.com/a/concrete), see the linked asset page for its author.
- [Grass Ground](https://polyhaven.com/a/grass_ground), Poly Haven.

## Geographic data and imagery

- `public/data/heathrow.json` and `public/data/heathrow-ground.json`: derived from **© OpenStreetMap contributors**, **ODbL 1.0**. <https://www.openstreetmap.org/copyright>. Contains selected Heathrow building footprints, airfield ways, roads and woodland, transformed into local coordinates and simplified for rendering. The derived database is offered under ODbL; original application code remains Apache-2.0. Source way IDs are retained. Data retrieved 30 October 2026.
- **Esri World Imagery**, streamed at runtime: **Esri, Vantor, Earthstar Geographics, and the GIS User Community**. <https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer>. Satellite imagery is not bundled or relicensed as open-source art. Provider terms apply. Attribution remains visible in the app and exported footage. Imagery may be historical and is not a live airport feed.
- [Slop New York](https://github.com/mrdoob/slop-newyork/), mrdoob and contributors: reference for layered procedural materials, HDR grading, bloom and geographic scene construction. No source code was copied into this project's original shaders.

- [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02), Poly Haven, CC0: apron diffuse, normal and roughness maps. Used separately from the board-formed concrete wall material.

## Airline identification

`public/assets/airlines/{BA,VS,EK,SQ}.png`: British Airways, Virgin Atlantic, Emirates and Singapore Airlines logos, retrieved from `https://images.kiwi.com/airlines/64/{code}.png` for traffic identification. Airline artwork and trademarks belong to their respective owners and are excluded from the application’s Apache-2.0 licence. No endorsement is implied.

## Aircraft livery artwork

The following SVGs are bundled in `public/assets/liveries/` and used as wordmarks or fin markings, with cropping and recolouring. They remain airline artwork/trademarks and are **excluded from Apache-2.0**. The source pages describe their copyright status; public-domain logo artwork can still carry trademark restrictions.

- `ba-logo.svg`: [British Airways logo](https://commons.wikimedia.org/wiki/File:BRITISH_AIRWAYS_logo.svg).
- `vs-logo.svg`: [Virgin Atlantic logo, 2018](https://commons.wikimedia.org/wiki/File:Virgin_Atlantic_logo_2018.svg).
- `virgin-mark.svg`: [Virgin logo](https://commons.wikimedia.org/wiki/File:Virgin-logo.svg).
- `ek-logo.svg`: [Emirates logo](https://commons.wikimedia.org/wiki/File:Emirates_logo.svg).
- `sq-logo.svg`: [Singapore Airlines wordmark](https://commons.wikimedia.org/wiki/File:Singapore_Airlines_Logo.svg).
- `sq-bird.svg`: [Singapore Airlines logo with bird](https://en.wikipedia.org/wiki/File:Singapore_Airlines_Logo_2.svg), airline identification artwork hosted on English Wikipedia.

BA tail ribbons and Emirates flag paint are simplified original drawings referenced against photographs; they are not official livery files.

## Detailed Boeing 787-9 models

`public/assets/models/787/`: converted exterior models and British Airways / Virgin Atlantic liveries from [FlightGear 787-family](https://github.com/IskenderWang/787-family/tree/02626b5b659d89b9399943ee167bbb0b46f0c871), **GNU GPL version 2**, by IskenderWang, Marsdolphin, Jonathan Redpath, the FGAddon 787-8 authors and other upstream contributors. These assets are excluded from Apache-2.0. Airline artwork and trademarks remain their owners' property.

The directory includes the upstream licence, an adaptation notice and the corresponding AC3D/texture sources in `source/787-family-source.zip`. Conversion uses the original `scripts/convert-flightgear.py` with Blender 4.3: coordinate adjustment, material adaptation, texture downsampling, geometry decimation and removal of simulator-specific light overlays. Runtime batching and instancing preserve the common model geometry. The active and parked variants use different mesh-detail budgets. This project does not include the upstream flight dynamics, systems or cockpit interaction code.
