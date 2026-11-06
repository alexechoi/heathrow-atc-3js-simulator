AIRBUS A320neo EXTERIOR — BRITISH AIRWAYS G-TTNR

Source: https://github.com/legoboyvdlp/A320-family
Pinned revision: fec1ecba767c8fffd145337b27012e89c01e3ade
Aircraft: A320-251N, CFM LEAP-1A26 engines, sharklets.
Copyright: Josh Davidson, Jonathan Redpath, merspieler, Matthew Maring,
Thorsten Herrmann, Semir Gebran and A320-family contributors.

Original meshes, textures and this converted GLB retain GPL version 2.
See LICENSE and COPYRIGHT.md. Airline marks belong to their owners.

Modifications: exterior-only AC3D conversion to glTF; coordinates centred;
static landing gear; removal of the alternate wingtip fences, optional Wi-Fi
fairings, deployed emergency turbine, cargo container and blurred fan meshes; PBR material adaptation; texture downsampling
to 2048 px; light mesh decimation. No aircraft systems or flightdeck included.

Corresponding source is bundled in source/a320-family-source.zip, including
original AC3D meshes, source images, configuration XML, copyright, licence,
readme and conversion script. The script does not evaluate FlightGear animation
logic; it exports a static exterior pose, with gear visibility handled by the app.

Rebuild with Blender 4.3:
blender -b -t 2 --python scripts/convert-a320.py -- SOURCE OUTPUT.glb BAW
SOURCE is the extracted a320-family source directory.

Release transport encoding (6 November 2026): Meshopt geometry compression
and WebP texture encoding at quality 90. Mesh topology and 2048 px texture
dimensions are retained. Positions use 16-bit quantization; normals 12-bit.
After the Blender conversions, put the five files in an uncompressed model
folder with 787/ and a320/ subdirectories, then run from the repository:
  npm ci
  MODEL_INPUT=work/uncompressed-models MODEL_OUTPUT=public/assets/models node scripts/optimize-models.mjs
The encoding script and locked JavaScript dependencies are included in source/.
