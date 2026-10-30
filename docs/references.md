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
