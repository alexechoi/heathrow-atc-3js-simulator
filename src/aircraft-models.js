import * as T from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const models = new Map();
export async function loadAircraftModels() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(
    [
      ...["BA", "VS"].flatMap((airline) =>
        [false, true].map((parked) => ({
          airline,
          parked,
          type: "B789",
          directory: "787",
          groundHeight: 5.5,
          source: "FlightGear 787-family",
        })),
      ),
      {
        airline: "BA",
        parked: false,
        type: "A20N",
        directory: "a320",
        groundHeight: 3.8,
        source: "FlightGear A320-family",
      },
    ].map(
      async ({ airline, parked, type, directory, groundHeight, source }) => {
        const { scene } = await loader.loadAsync(
          `/assets/models/${directory}/${airline}${parked ? "-parked" : ""}.glb?v=${__MODEL_ASSET_VERSION__}`,
        );
        scene.updateMatrixWorld(true);
        const groups = new Map();
        scene.traverse((o) => {
          if (!o.isMesh) return;
          const part =
            /gear|wheel|compressor|hyd[12]|nosedoor|^MLG|^NLG|^SideStay/i.test(
              o.name,
            ) && !/bay/i.test(o.name)
              ? "gear"
              : /beaconlenz|navlite|strobe/i.test(o.name)
                ? "nav"
                : "airframe";
          const key = part + ":" + o.material.uuid;
          if (!groups.has(key))
            groups.set(key, { part, material: o.material, geometries: [] });
          const geometry = o.geometry.clone();
          // Meshopt files can have normalized integer attributes. Bake to float
          // before applying world transforms so metre coordinates never overflow.
          for (const [name, attribute] of Object.entries(geometry.attributes)) {
            if (
              attribute.array instanceof Float32Array &&
              !attribute.isInterleavedBufferAttribute
            )
              continue;
            const values = new Float32Array(
              attribute.count * attribute.itemSize,
            );
            for (let i = 0; i < attribute.count; i++)
              for (let k = 0; k < attribute.itemSize; k++)
                values[i * attribute.itemSize + k] = attribute.getComponent(
                  i,
                  k,
                );
            geometry.setAttribute(
              name,
              new T.Float32BufferAttribute(values, attribute.itemSize),
            );
          }
          geometry.applyMatrix4(o.matrixWorld);
          groups
            .get(key)
            .geometries.push(
              geometry.index ? geometry.toNonIndexed() : geometry,
            );
          if (o.material.map) o.material.map.anisotropy = 16;
          o.material.envMapIntensity = 0.65;
        });
        const root = new T.Group();
        root.userData = {
          type,
          airline,
          groundHeight,
          source,
          parked,
        };
        const gear = new T.Group();
        gear.name = "gear";
        root.add(gear);
        const nav = new T.Group();
        nav.name = "nav";
        root.add(nav);
        for (const { part, material, geometries } of groups.values()) {
          const mesh = new T.Mesh(mergeGeometries(geometries), material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          (part === "gear" ? gear : part === "nav" ? nav : root).add(mesh);
          geometries.forEach((g) => g.dispose());
        }
        models.set(type + airline + (parked ? "-parked" : ""), root);
      },
    ),
  );
}
export function detailedAircraft(airline, type, parked = false) {
  return (
    models.get(type + airline + (parked ? "-parked" : ""))?.clone(true) || null
  );
}
