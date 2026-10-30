# Reference study and visual review

## Photographs inspected

1. [Heathrow Airport from the air](https://commons.wikimedia.org/wiki/File:Heathrow_Airport_from_the_air.jpg), Andy Mabbett, 20 April 2013, CC BY-SA 3.0. Used to check the two parallel runway strips, western Terminal 5 complex, central terminal area, and reservoirs southwest of the airport. This is a historical reference, not proof of the current airport layout.
2. [Terminal 5 from the runway at Heathrow](https://commons.wikimedia.org/wiki/File:Terminal_5_from_the_runway_at_Heathrow_-_geograph.org.uk_-_5892240.jpg), Mike Pennington / Geograph, 31 August 2018, CC BY-SA 2.0. Used to check curved silver roof profiles, dark glass facades, and low building height relative to aircraft.
3. [Heathrow Terminal 5 (4694745368)](https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_5_(4694745368).jpg), Wikimedia Commons source page. Used to check the satellite concourse: nose-in stands on both sides, elevated jet bridges, apron markings, service vehicles and the barrel roof. Consult its source page for author and licence details; it is reference-only and is not redistributed.
4. [Heathrow Airport](https://en.wikipedia.org/wiki/Heathrow_Airport): airport dimensions and terminal relationships, cross-checked with aerial references.
5. [NATS EGLL northern runway supplement](https://www.aurora.nats.co.uk/htmlAIP/Publications/2026-05-28/html/eSUP/EG-eSUP-2026-047-en-GB.html): real runway designation context. The game does not attempt to reproduce temporary works or current operational charts.

## Screenshot reviews

Screenshots were taken from real Chromium WebGL rendering throughout implementation, rather than mocked up.

- **First overview and aircraft chase:** exposed overly uniform lighting, sparse surroundings and excessive draw calls. Reduced ambient illumination, introduced more directional light, road-aligned houses with roofs, and merged static parked-aircraft meshes.
- **Terminal 5 comparison:** matched the curved roof and flanking aircraft arrangement to the aerial photograph. Removed roof beams protruding through the roof, added slab wear, stand outlines, jet bridges, glass mullions and ramp equipment. Satellite buildings remain simplified and evenly spaced.
- **Second airport / concourse review:** added CC0 photographic sky environments, improved horizon haze, locally bundled fonts, and SVG controls after unsupported Unicode icons appeared as boxes.
- **Interaction screenshots:** captured the routing map, arrival chase, concourse flyby, tower view, mobile landing page and mobile play state. Browser automation exercised controls and checked for page errors and horizontal overflow.
- **Video capture:** deterministic frames from the actual app, including samples every three seconds. No AI-generated footage or external flight-simulator footage is used.

The strongest fidelity is in the runway scale, terminal placement relationships and concourse / aircraft details. Surrounding buildings, taxiways, terminal footprints, airline fleets and operational procedures are approximations. The result is a reference-informed game rather than a photogrammetric reproduction.


## Geographic rebuild after satellite comparison

Real [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) was retrieved and visually inspected. It showed that the first procedural layout misplaced the tower, Terminal 4 and several concourses. The first layout was replaced by a geographic build using OSM coordinates, rather than stretching the image to fit the initial model.

The shared frame is local Web Mercator scaled into metres at 51.47122° N, 0.46064° W. Terminal 5, its satellites and Terminal 2B are rebuilt over mapped core footprints; other buildings use simplified OSM polygons. The tower position is based on OSM node 12886892988 (51.4717604, -0.4655094), with its reported height of 86.87 m. Runway thresholds were adjusted to the geographic frame. Satellite export bounds are generated from this same frame, so the ground texture and geometry line up.

The scene now uses mapped pavement shapes, 764 airfield features, 2,787 building footprints and woodland polygons. Thin jet-bridge extensions are removed from terminal core polygons during preprocessing; simplified 3D bridges are added separately. Building heights without mapped values are estimates. Satellite photography has baked shadows and may contain historical features; it is used as a basemap, not represented as live data.

The New York example prompted a second rendering pass: real CC0 surface maps, reflective facade shaders with interior variation, roof seams and HVAC units, HDR bloom and colour grading. Screenshots exposed excessive ground gloss and missing Terminal 5 parked aircraft; the gloss was reduced and stand selection was distributed across the whole airport.

## Terminal-specific rebuild and close-range surface review

Additional photographs were downloaded to the ignored `work/references/` folder and visually inspected individually. They are research references, not bundled textures:

- [Terminal 5A exterior, 2008](https://commons.wikimedia.org/wiki/File:Terminal_5_at_London_Heathrow_Airport,_2008.jpg): shallow ogee roof, glazed gable, primary vertical steel columns, white gate service blocks and darker glass.
- [Terminal 5 from the air](https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_5_from_the_air.jpg): rooflights across the main hall, maintenance cradles, one airside long facade and the western departures viaduct.
- [Heathrow Terminal 5C — Iwelumo](https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_5C_Iwelumo-1.jpg): lower satellite roof, closed curved glass end walls, flat end annex, articulated bridges and dense apron servicing.
- [Terminal 2B — Geograph 5251719](https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_2B_-_geograph.org.uk_-_5251719.jpg): flat roof and projecting dark gate pods; this building must not share the T5 barrel roof.
- [Terminal 2 under construction, 2012](https://commons.wikimedia.org/wiki/File:Heathrow_Terminal_2_under_construction_2012.jpg): undulating hall profile and thin projecting eaves. Used only for the completed hall's structural profile, not for current surroundings.
- [Terminal 4 from the air — Geograph 465209](https://commons.wikimedia.org/wiki/File:Terminal_4_from_the_air_-_geograph.org.uk_-_465209.jpg): low, elongated stepped pier, ribbon windows and contrasting service roofs. Historical fleet and ground arrangements are not treated as current.

The terminal generator was replaced with separate T5A, T5B/C, T2A and T2B architecture. Other mapped airport buildings now use airport cladding and low industrial roofs rather than suburban house materials. Review cameras reproduce elevated end views and oblique facade views. Remaining geometric details are modeled approximations, not survey data.

Runway paint is now separate vector geometry: threshold stripes, edge lines, centerline dashes, designators, aiming points and touchdown bars. Taxi and stand centerlines also use narrow vector strips. Surface height ordering was checked near the threshold to remove pavement overlap. Aprons use a dedicated CC0 floor texture, with world-space concrete slab joints and servicing lanes. Grass uses 502 mapped turf polygons and irregular multiscale dry/green texture variation.

A review discovered that the screenshot browser had sometimes timed out on Esri's image export service and used the fallback. Imagery now uses pre-rendered Esri tiles, and final video capture explicitly fails if the satellite mosaic is absent. Capture also waits for GPU completion to prevent partial frames with software WebGL.

The close-range ground was subsequently rebuilt completely inside the playable airport boundary. Reference imagery remains for geolocation and distant surroundings, while terminal precincts, taxiway shoulders, service roads and turf use real-scale mesh surfaces. A dedicated photographic grass texture replaced the rocky aerial texture. The material shader cache now distinguishes each surface variant; shader compile errors are included in browser checks. The distant terrain is a ring with no overlapping central plane, and terrain depth layers are ordered explicitly.

## Aircraft and ground-control review

These four real photographs were downloaded and inspected for silhouettes, cockpit windows, engines, gear and paint placement; they are reference-only, not bundled image textures:

- [British Airways 787-9 G-ZBKF, Boston, March 2025](https://commons.wikimedia.org/wiki/File:British_Airways_Boeing_787-9_G-ZBKF_departing_Boston_March_2025_2.jpg): navy belly and nacelles, red speedmarque, Chatham tail, raked wingtips and two-axle main bogies.
- [Virgin Atlantic A350-1000 G-VJAM](https://commons.wikimedia.org/wiki/File:Virgin_Atlantic_airbus_a350-1000_G-VJAM.jpg): cockpit mask, red engines, white Virgin tail mark, curved wingtips and three-axle bogies.
- [Emirates A380 A6-EOG, Perth, 2024](https://commons.wikimedia.org/wiki/File:Emirates_Airbus_A380_A6-EOG_Perth_2024_(01).jpg): double-deck fuselage, four engines, gold wordmark and UAE flag fin.
- [Singapore Airlines 777-300ER 9V-SNC at Heathrow](https://commons.wikimedia.org/wiki/File:Singapore_Airlines,_Boeing_777-300ER,_9V-SNC_-_LHR_(23932929890).jpg): blue/gold cheatline, gold bird fin and large GE90-style nacelles.

Studio renders and in-airport screenshots were reviewed for both livery fit and silhouette. This exposed oversized UV lettering, buried flat cockpit panes, open engine interiors and the wrong Singapore logo crop; these were corrected. Fire now uses animated soft noise particles with a rising smoke plume rather than solid faceted spheres. These remain procedural game aircraft, not photogrammetric assets.

Ground paths are generated from the same mapped taxiway centrelines used to render the pavement. The generator joins coincident endpoints, excludes paths outside the central runway boundaries, and computes connected routes from reserved stand lead-ins to the mapped A1/N1 holding points. Active stands are removed from static parking. Tests check that taxi positions remain on the selected polyline, require a ground/tower handover before takeoff clearance, and verify the departure handoff. Stand assignments and runway-entry clearances are simplified game procedures.

Four external racetracks replace local orbits above the airport. Their names and relative quadrants reference Heathrow's holding system; their coordinates, spacing, altitude and orientation are compressed game values. The radar overlay is a game diagram, not an aeronautical chart.

### Reviewed screenshots

- [Mapped taxiway movement](screenshots/mapped-taxi.jpg)
- [External holding patterns on radar](screenshots/external-holds.jpg)
- [787 geometry, painted wordmark and recessed intake](screenshots/787-livery.jpg)
- [A350 Virgin livery and cockpit mask](screenshots/a350-livery.jpg)
- [Animated flame and smoke particles](screenshots/incident-effects.jpg)

## Holding-level and radar interaction review

[Stacked traffic screenshot](screenshots/holding-stacks.jpg): three aircraft share the external Bovingdon-inspired racetrack at scenario levels of 6,000, 7,000 and 8,000 ft. Labels use leader lines and search for space outside the desktop controls; the browser check verifies all seven displayed arrival labels are unobscured and that selecting the highest aircraft works. The altitude assignments reserve levels for joining aircraft and keep physical clearance from aircraft leaving the hold. A separate 30-minute simulated ground-control run completed 26 departures without collisions, delay strikes or queue deadlock.

## Model hangar and exterior replacement

The previous shared aircraft loft produced incorrect noses, cockpit glazing and a generic wing/body intersection. The BA and Virgin 787-9 now use the dedicated GPL-2.0 FlightGear 787-family exterior and original airline textures, converted through Blender with source bundled. The other airframes remain procedural studies: their forebodies now use distinct elliptical profiles and continuous aft-body tangents instead of the shared stepped cone. The model hangar explicitly identifies those differences.

A footprint recheck found Terminal 2B's mapped core spans roughly x=1199–1234 m along its main section, about 35 m; the earlier 66 m core was almost twice as wide. The corrected core retains the 522 m mapped length. T5A's rooflights previously intersected the roof because they sampled the profile at the wrong width; their profile now follows the underlying roof at the same world-space coordinates. Jet bridges now have two telescopic sections, pivot drums, paired arms where appropriate, cabs, bellows, wheel supports and access stairs. T5 gables include exposed truss members, while T2B has separate glazed floor bands and a flat grey roof. These are photo-informed models, not surveyed as-built structures.


Current local model review renders:

- [BA 787-9 exterior](screenshots/model-787.jpg) and [Virgin 787-9 exterior](screenshots/model-virgin-787.jpg). FlightGear 787-family geometry and liveries, GPL-2.0; corresponding source is bundled under `public/assets/models/787/source/`.
- [Terminal 5A](screenshots/model-t5a.jpg), including the added end gates and corrected rooflight profile.
- [Terminal 5C](screenshots/model-t5c.jpg) and [Terminal 2B](screenshots/model-t2b.jpg), with different roof forms and corrected mapped proportions.
- [Terminal 5A in the airport](screenshots/model-t5a-airport.jpg), including instanced parked 787 models.

The local `/models.html` hangar shows 11 aircraft/terminal entries with orbit, zoom, side/front/plan views and wireframe. Browser checks cover selection, camera framing and mobile layout; the ground-control interaction check passes with the replacement meshes. Parked 787s use separate 16,305-triangle meshes, while the detailed exterior has 133,825 triangles.
