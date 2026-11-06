# Heathrow Control

**Two runways. One controller.** A playable, open-source Three.js air traffic control game inspired by Flight Control and [Piccadilly Line Driver](https://github.com/alexechoi/3js-tube-simulator).

**[Play](https://heathrow-simulator.alexchoi.xyz/)** · **[Inspect the models](https://heathrow-simulator.alexchoi.xyz/models)** · **[Watch the camera reel](https://heathrow-simulator.alexchoi.xyz/?demo)**

![Heathrow Control](public/og.jpg)

## Run locally

Requires Node.js 20.19+ or 22.12+ (Node 24 tested).

```sh
npm ci
npm run dev
# Open http://localhost:5173
npm run build
npm run preview
```

No API keys, server, live flight feed, tracking or paid assets are required. Fonts, skies, surface textures and aircraft are bundled or generated locally. Detailed FlightGear 787 and A320neo assets retain GPL-2.0 and include their corresponding source archive. The geographic basemap streams real Esri World Imagery at runtime, with visible attribution; it is a third-party service and is not covered by this repository’s code licence. A mapped procedural surface is used if imagery cannot load. OpenStreetMap geometry is bundled separately under ODbL.

## Play

1. Select **Take control**. Select a flight in the traffic list or click its label in the sky.
2. Clear **27R** (north) or **27L** (south). The aircraft joins a descending final approach and rolls out after touchdown.
3. Use **Hold** to send an arrival to an external racetrack stack, or **Go around** to cancel a clearance and climb away. Radar shows the four stacks outside the airport.
4. For Flight Control-style free routing, select **Draw route**, drag a vector path in the overhead view, then assign a runway to append its approach.
5. Switch to **Departures**. Approve **pushback** at a stand, issue **taxi clearance**, and watch the aircraft follow mapped taxiways to A1 or N1. **Accept tower handover** at the holding point, then clear takeoff on the assigned runway. Once it climbs above 820 ft, **hand off to London Departure**. A safe departure earns 100 points. Amber runway buttons warn about traffic on the runway or short final. A clearance is your decision: warnings do not prevent unsafe releases.
6. Arrivals replenish every 40 simulated seconds and departures every 65 (the first replenishment is after 32), subject to a workload cap of seven arrivals and eight departures. Traffic continues for as long as you keep the shift safe. Aircraft cannot wait forever: an arrival diverts after eight simulated minutes; a delayed ground departure cancels after fifteen.
7. Each safe arrival or departure earns 100 points. Separation losses, conflicting runway use, diversions and cancellations cost a strike and 50 points. Three strikes end the shift. A mid-air or runway collision ends it immediately, with a visible incident and a shift report. Use **Try another shift** to restart.

The first arrival is aligned with 27L and makes a good first landing. Avoid clearing nearby flights onto the same final. The alert monitor uses a deliberately compressed game threshold of **450 m horizontally and 90 m vertically**; this is not an operational separation standard. Runway selection is free-play, rather than Heathrow's actual segregated arrival/departure procedure.

| Control | Action |
| --- | --- |
| Mouse drag / touch drag | Orbit the airport; draw when route mode is active |
| Wheel / pinch | Zoom |
| 1 / 2 / 3 / 4 | Airport / tower / follow / overhead radar |
| Space | Pause / resume |
| H | Hide / show interface for screenshots |
| F | Enter / exit flythrough |
| M | Toggle synthesised radio readbacks |
| Escape | Exit flythrough / restore interface / cancel drawing |
| Golden hour button | Golden hour / daylight / blue hour |
| 1× button | Cycle simulation speed |

Your personal best is saved in this browser. **Copy result** on the shift report prepares a challenge link to share. Help pauses the simulation, the flythrough preserves your current shift, and switching away from the tab pauses an active shift until you resume. Graphics settings are in Help: desktop starts at **High detail**, and phone-sized screens start at **Smooth** to reduce graphics-memory use. Source texture dimensions and runway geometry are identical in both. Your explicit choice is remembered.

The base game clock advances two simulated seconds per real second. Traffic, weather, callsigns, origins and destinations are fictional scenario data. The displayed clock is scenario UTC, not wall-clock time. Browser speech synthesis availability and voices vary by device.

## What's modelled

- The parallel 09L/27R and 09R/27L runways, approximately 3,902 m and 3,660 m long, separated by approximately 1,420 m.
- Terminal 5's western main building and satellite concourses, the central Terminal 2/3 area, southern Terminal 4 and an 87 m tower, aligned with real geographic coordinates.
- Curved metal roofs, glass curtain walls, jet bridges, stands, ramp vehicles, parking structures, apron slabs and wear, taxiway centrelines, runway thresholds, touchdown markings, skid marks and approach lights.
- Detailed FlightGear 787-9 exterior geometry with BA and Virgin liveries, a dedicated BA A320neo G-TTNR exterior with LEAP-1A engines, and separately dimensioned procedural studies for the A350-1000, A380-800 and 777-300ER. Curved fuselages and cockpit glazing, cambered wings, recessed engine fans, multi-axle landing gear, navigation lights and photo-referenced BA, Virgin, Emirates and Singapore paint with actual airline wordmarks. The 787 and A320neo use dedicated exterior models; the A350, A380 and 777 remain procedural studies rather than manufacturer-exact models.
- 764 mapped airfield features and 2,819 OpenStreetMap building footprints, including Terminal 3's grouped concourse outline and courtyard; mapped woodland, real satellite surroundings, and a shared local Web Mercator coordinate frame. Building heights use OSM where available and estimates elsewhere. It is not a surveyed digital twin.
- Bundled CC0 photographic skies and asphalt/concrete/grass PBR textures; world-space material blending, roughness and normal maps, reflective glazing with procedural interior detail, brushed roof seams, HDR bloom, colour grading, MSAA, directional shadows and three lighting moods.
- Departures use a connected graph of 417 OSM taxiway ways and 24 reserved stand lead-ins across T2, T3 and T5. BA departures use T5, Virgin/Emirates use T3, and Singapore uses T2. Ground aircraft queue behind other traffic and stop before runway entry. Opposing taxi routes are held on stand until clear, and mapped feeder routes give each runway queue a consistent entry. The ground → tower → departure sequence is simplified for one player; there are no live radio frequencies.
- Bovingdon, Lambourne, Biggin and Ockham-inspired external holding stacks, with racetrack movement and reserved levels starting at a scenario altitude of 6,000 ft, separated by 1,000 ft. Joining flights reserve their target levels; cleared flights retain physical separation while leaving the stack. Radar labels spread apart around busy stacks and stay clear of the desktop controls. Their positions, dimensions and altitudes are geographically compressed for the game and are not navigation fixes.
- Soft animated shader fire and wind-drifting smoke replace solid explosion meshes.
- Five camera sequences: airport reveal, arrival chase, Terminal 5 flyby, tower view and closing orbit.

This is a visual game, **not a flight dynamics or operational ATC trainer**. It does not implement real approach procedures, wake categories, real traffic, aircraft-specific stand restrictions or a full ground-control system. Heathrow, NATS and the airlines do not endorse this project.

## Inspect the models locally

Open **`/models.html`** on the local dev server, or use the **Models** link in the simulator. The hangar includes BA/Virgin 787s, a BA A320neo, the remaining aircraft studies, T5A/B/C, T2A/B and the mapped T3 complex. Orbit, zoom, switch between perspective/side/front/plan views, or toggle wireframe. Each entry identifies its modelling source and limitations.

Aircraft revisions include per-type swept wing sections, flush spoiler/flap panel textures, corrected cockpit placement, wider landing-gear tracks and the A380’s four main bogies plus nose gear (22 wheels).

[Watch the current aircraft model review](docs/media/aircraft-model-review.mp4) or see [the model screenshots and photo references](docs/references.md#a320neo-replacement-and-widebody-geometry-review--5-november-2026). These models are included in the live release.

Terminal revisions include T2B's mapped 35 m core (the previous 66 m core was too wide), articulated telescopic jet bridges and supports, paired bridge arms, T5 roof trusses, transverse rooflights and separate service levels.

## Validation and capture

```sh
npm test                        # deterministic simulation tests
node scripts/e2e.mjs            # Chromium desktop + mobile interaction checks
node scripts/release-e2e.mjs    # shift preservation, focus, phone layout and score sharing
node scripts/startup-e2e.mjs    # blocked assets, missing imagery and graphics recovery
node scripts/traffic-e2e.mjs    # airline logos, departures, collisions and restart
node scripts/operations-e2e.mjs # gate-to-tower flow, mapped taxi, drawn vectors and external holds
node scripts/touch-route-e2e.mjs # actual mobile touch input assigns a route
node scripts/holding-e2e.mjs    # stack levels, readable radar labels and click selection
node scripts/models-e2e.mjs     # model geometry, gallery, viewpoints and mobile layout
node scripts/aircraft-integration-e2e.mjs # A320neo traffic model and gear visibility
node scripts/capture-models.mjs # 12-second local aircraft model-review MP4
# In another terminal: npm run preview -- --port 4173
npm run capture                 # original 30-second camera reel
node scripts/capture-launch.mjs # current 20-second launch film + social image
```

Browser scripts use `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to your Chromium executable, `TEST_URL` for browser tests, or `CAPTURE_URL` / `CAPTURE_OUT` for recording. Software WebGL is the default for reproducibility in cloud workers; set `CAPTURE_NATIVE_GPU=1` to use an available hardware GPU. The recorder advances the simulation by explicit frame times, so a slow capture machine does not produce a choppy output video. FFmpeg must be on PATH. Temporary screenshots go into ignored `work/screenshots/`.

The in-browser reel includes a blue-hour tower sequence and lasts 42 seconds. The original `npm run capture` export plays those five shots in 30 seconds; the current launch film is a separate 20-second edit with departure and arrival gameplay. Both exports are silent. `?demo` starts the reel; `?play` starts a shift; `?capture` freezes wall-clock animation for capture automation.

## Launch

The [X launch kit](docs/launch.md) contains post copy, current screenshots, a gameplay/flythrough export and repeatable checks. The reviewed app is published at the play URL. Deployments are batched into reviewed milestones.

Aircraft transport assets are compressed from 26.7 MB to 7.5 MB without reducing mesh topology or 2K texture dimensions. Surface textures retain their dimensions, with smaller WebP alternatives. Browser resource timing reported about 14 MB transferred in a desktop capture, versus about 42 MB before this pass; third-party imagery can add traffic not exposed by Resource Timing. Asset versions derive from model contents so returning browsers fetch updates.

## Source layout

- `src/simulation.js` — pure game logic and separation checks.
- `src/geographic-airport.js` — mapped airport geometry, structures, scenery and instancing.
- `src/geography.js` — coordinate reference and runtime satellite tiles.
- `src/materials.js` / `src/postprocessing.js` — PBR surfaces, facade shaders and the HDR rendering pipeline.
- `src/terminal-architecture.js` / `src/runway-markings.js` — photo-studied terminal profiles and metre-scaled vector paint.
- `src/aircraft.js` / `src/aircraft-liveries.js` — procedural airframes and textured liveries.
- `src/incident-effects.js` — instanced fire, smoke and sparks.
- `scripts/build-ground-routes.py` — reproducible OSM taxiway graph and stand routing.
- `src/main.js` — renderer, interaction, cameras, radio and UI.
- `tests/` and `scripts/` — repeatable tests and recording.
- `docs/references.md` — photographic references and visual review notes.
- `netlify.toml` / `public/_headers` — static build and caching configuration.

## Deploy

Connect this repository to Netlify, use `npm run build`, and publish `dist`. Attach your hostname in Netlify domain management and point it to the site using your DNS zone. This deployment uses `heathrow-simulator.alexchoi.xyz` in Netlify DNS. Update the absolute Open Graph image URL in `index.html` if you host elsewhere.

## Licence and credits

Original code and procedural art: [Apache-2.0](LICENSE). Third-party assets keep their original licences; see [CREDITS.md](CREDITS.md). Inspiration is credited without copying the tube simulator's code or assets. [Slop New York](https://github.com/mrdoob/slop-newyork/) informed the layered material and lighting approach; this project uses its own WebGL2 shaders for broad browser support. Contributions welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).
