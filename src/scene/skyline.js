/**
 * @file skyline.js
 * @description Instanced 3D skylines for Lower Manhattan and Brooklyn / DUMBO waterfronts
 * complete with procedural skyscrapers, architectural spires, and glowing windows at night.
 */

import * as THREE from 'three';
import { BRIDGE_CONFIG } from '../config/bridgeConfig.js';

/**
 * Creates Lower Manhattan and Brooklyn DUMBO skyline backdrops.
 * @param {THREE.Scene} scene
 * @returns {{group: THREE.Group, setNightMode: Function}}
 */
export function createSkyline(scene) {
  const skylineGroup = new THREE.Group();
  skylineGroup.name = 'CitySkylines';

  const { skyline } = BRIDGE_CONFIG;

  // Materials
  const buildingMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d434d,
    roughness: 0.7,
    metalness: 0.3
  });

  const windowsMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe89e,
    emissive: 0xffd152,
    emissiveIntensity: 0.05, // Subtle during day, boosted at night
    roughness: 0.3,
    metalness: 0.1
  });

  // Collect building specifications
  const buildings = [];
  const windows = [];

  // 1. Lower Manhattan Skyline (West: X from -520 to -950, Z from -500 to 500)
  generateCityCluster({
    centerX: -700,
    centerZ: 0,
    spanX: 350,
    spanZ: 900,
    count: skyline.manhattanCount,
    minHeight: 40,
    maxHeight: 280, // High-rise Manhattan towers
    minWidth: 20,
    maxWidth: 55,
    buildingsOut: buildings,
    windowsOut: windows
  });

  // 2. Brooklyn / DUMBO Skyline (East: X from +520 to +900, Z from -450 to 450)
  generateCityCluster({
    centerX: 680,
    centerZ: 0,
    spanX: 300,
    spanZ: 800,
    count: skyline.brooklynCount,
    minHeight: 25,
    maxHeight: 130, // Mid-rise Brooklyn/DUMBO warehouses and residential towers
    minWidth: 22,
    maxWidth: 50,
    buildingsOut: buildings,
    windowsOut: windows
  });

  // Create InstancedMesh for all buildings
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const buildingsMesh = new THREE.InstancedMesh(unitBoxGeo, buildingMaterial, buildings.length);
  buildingsMesh.name = 'SkylineBuildings';
  buildingsMesh.castShadow = true;
  buildingsMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  buildings.forEach((b, i) => {
    dummy.position.set(b.x, b.height / 2, b.z);
    dummy.scale.set(b.widthX, b.height, b.widthZ);
    dummy.rotation.set(0, b.rotationY, 0);
    dummy.updateMatrix();
    buildingsMesh.setMatrixAt(i, dummy.matrix);

    // Subtle variance in architectural concrete/glass tint
    const tone = 0.22 + (b.height / 300) * 0.15 + (i % 5) * 0.03;
    color.setRGB(tone, tone + 0.02, tone + 0.05);
    buildingsMesh.setColorAt(i, color);
  });

  buildingsMesh.instanceMatrix.needsUpdate = true;
  if (buildingsMesh.instanceColor) buildingsMesh.instanceColor.needsUpdate = true;
  skylineGroup.add(buildingsMesh);

  // Create InstancedMesh for glowing office windows
  const unitWindowGeo = new THREE.BoxGeometry(1, 1, 1);
  const windowsMesh = new THREE.InstancedMesh(unitWindowGeo, windowsMaterial, windows.length);
  windowsMesh.name = 'SkylineWindows';

  windows.forEach((w, i) => {
    dummy.position.set(w.x, w.y, w.z);
    dummy.scale.set(w.sx, w.sy, w.sz);
    dummy.rotation.set(0, w.rotY, 0);
    dummy.updateMatrix();
    windowsMesh.setMatrixAt(i, dummy.matrix);
  });

  windowsMesh.instanceMatrix.needsUpdate = true;
  skylineGroup.add(windowsMesh);

  scene.add(skylineGroup);

  /**
   * Adjusts window emission based on time of day (day, sunset, night).
   * @param {number} intensity - 0.05 (day) up to 1.8 (night)
   */
  function setNightMode(intensity) {
    windowsMaterial.emissiveIntensity = intensity;
  }

  return {
    group: skylineGroup,
    setNightMode
  };
}

/**
 * Procedurally generates building dimensions, coordinates, and window grids.
 * @private
 */
function generateCityCluster({
  centerX,
  centerZ,
  spanX,
  spanZ,
  count,
  minHeight,
  maxHeight,
  minWidth,
  maxWidth,
  buildingsOut,
  windowsOut
}) {
  // Deterministic PRNG for repeatability
  let seed = Math.abs(centerX * 13 + spanZ * 7);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < count; i++) {
    const x = centerX - spanX / 2 + rand() * spanX;
    const z = centerZ - spanZ / 2 + rand() * spanZ;
    // Taller buildings closer to center of cluster
    const distFactor = 1.0 - Math.min(1.0, Math.hypot((x - centerX) / spanX, (z - centerZ) / spanZ));
    const height = minHeight + (maxHeight - minHeight) * Math.pow(distFactor * 0.7 + rand() * 0.4, 1.4);
    const widthX = minWidth + rand() * (maxWidth - minWidth);
    const widthZ = minWidth + rand() * (maxWidth - minWidth);
    const rotY = (rand() - 0.5) * 0.2; // Slight NYC street grid skew

    buildingsOut.push({ x, z, height, widthX, widthZ, rotationY: rotY });

    // Generate lit window bands on facing facades
    const floors = Math.floor(height / 4.5);
    const stepFloor = Math.max(2, Math.floor(floors / 8));

    for (let f = 3; f < floors; f += stepFloor) {
      const y = f * 4.5;
      // Front and rear window ribbons
      const facingOffsets = [
        { dx: 0, dz: widthZ * 0.51, sx: widthX * 0.75, sz: 0.3 },
        { dx: 0, dz: -widthZ * 0.51, sx: widthX * 0.75, sz: 0.3 }
      ];

      facingOffsets.forEach(fo => {
        // Only generate some lit windows for realism
        if (rand() > 0.3) {
          windowsOut.push({
            x: x + fo.dx,
            y: y,
            z: z + fo.dz,
            sx: fo.sx,
            sy: 1.6,
            sz: fo.sz,
            rotY: rotY
          });
        }
      });
    }
  }
}
