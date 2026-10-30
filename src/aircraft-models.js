import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const models = new Map();
export async function loadAircraftModels() {
  const loader = new GLTFLoader();
  await Promise.all(
    ["BA", "VS"].flatMap((airline) =>
      [false, true].map(async (parked) => {
        const { scene } = await loader.loadAsync(
          `/assets/models/787/${airline}${parked ? "-parked" : ""}.glb`,
        );
        scene.updateMatrixWorld(true);
        const groups = new Map();
        scene.traverse((o) => {
          if (!o.isMesh) return;
          const part =
            /gear|wheel|compressor|hyd[12]|nosedoor/i.test(o.name) &&
            !/bay/i.test(o.name)
              ? "gear"
              : /beaconlenz|navlite|strobe/i.test(o.name)
                ? "nav"
                : "airframe";
          const key = part + ":" + o.material.uuid;
          if (!groups.has(key))
            groups.set(key, { part, material: o.material, geometries: [] });
          const geometry = o.geometry.clone().applyMatrix4(o.matrixWorld);
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
          type: "B789",
          airline,
          groundHeight: 5.5,
          source: "FlightGear 787-family",
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
        models.set(airline + (parked ? "-parked" : ""), root);
      }),
    ),
  );
}
export function detailedAircraft(airline, type, parked = false) {
  if (type !== "B789") return null;
  return models.get(airline + (parked ? "-parked" : ""))?.clone(true) || null;
}
