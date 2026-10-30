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
- **Video capture:** deterministic frames from the actual app, including samples every five seconds. No AI-generated footage or external flight-simulator footage is used.

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
