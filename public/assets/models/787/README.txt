BOEING 787-9 EXTERIOR MODELS

Upstream: FlightGear 787-family, IskenderWang and contributors
https://github.com/IskenderWang/787-family
Pinned revision: 02626b5b659d89b9399943ee167bbb0b46f0c871
Based on FlightGear FGAddon 787-8 and Jonathan Redpath's 787-9.

The upstream exterior geometry and livery textures, and the converted GLB
assets in this directory, are distributed under GNU GPL version 2.
See LICENSE. Airline trademarks remain their respective owners' property.

Corresponding source is included in source/787-family-source.zip:
original AC3D files, texture sources, animation XML for reference, upstream
licence/readmes, and the Blender conversion script. No flightdeck, avionics
or flight-dynamics code is included in the application.

Modifications: AC3D-to-glTF conversion, coordinate/ground-height adjustment,
removal of simulator light overlays and blurred fan discs, mesh decimation,
texture downsampling to 2048 px, static gear pose, PBR material adaptation.
The parked variants use stronger mesh decimation. Runtime geometry is
batched by material and parked aircraft use instancing.

Rebuild from the repository with Blender 4.3:
blender -b -t 2 --python scripts/convert-flightgear.py -- SOURCE OUTPUT.glb BAW
Use VIR for Virgin, and append lod for a parked variant. SOURCE is the
extracted 787-family folder.

Release transport encoding (6 November 2026): Meshopt geometry compression
and WebP texture encoding at quality 90. Mesh topology and 2048 px texture
dimensions are retained. Positions use 16-bit quantization; normals 12-bit.
After the Blender conversions, put the five files in an uncompressed model
folder with 787/ and a320/ subdirectories, then run from the repository:
  npm ci
  MODEL_INPUT=work/uncompressed-models MODEL_OUTPUT=public/assets/models node scripts/optimize-models.mjs
The encoding script and locked JavaScript dependencies are included in source/.
