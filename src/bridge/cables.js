/**
 * @file cables.js
 * @description 3D model generator for the Manhattan Bridge 4 main suspension cables
 * and dense vertical hangers (suspenders) using high-efficiency InstancedMesh.
 */

import * as THREE from 'three';
import { BRIDGE_CONFIG } from '../config/bridgeConfig.js';
import {
  calculateMainCableY,
  calculateSideCableY,
  calculateDeckCamber,
  generateHangerCoordinates
} from './geometryMath.js';

/**
 * Creates the complete cable and hanger suspension system.
 * @returns {{group: THREE.Group, setNightLights: Function}}
 */
export function createCables() {
  const cablesGroup = new THREE.Group();
  cablesGroup.name = 'CablesGroup';

  const { towers, cables, deck, colors } = BRIDGE_CONFIG;

  // Materials
  const cableMaterial = new THREE.MeshStandardMaterial({
    color: colors.cables,
    roughness: 0.35,
    metalness: 0.7
  });

  const hangerMaterial = new THREE.MeshStandardMaterial({
    color: colors.hangers,
    roughness: 0.4,
    metalness: 0.6
  });

  const nightLightsMaterial = new THREE.MeshStandardMaterial({
    color: colors.nightCableLights,
    emissive: colors.nightCableLights,
    emissiveIntensity: 0.0, // starts off during daytime
    roughness: 0.2
  });

  // Calculate cable paths for all 4 main cables (Z = -16.8, -15.0, 15.0, 16.8)
  const zOffsets = cables.zOffsets;

  // 1. Generate 4 Main Cables via TubeGeometry
  zOffsets.forEach((zOffset, cableIndex) => {
    const curvePoints = [];
    const anchorY = deck.roadwayElevation - 4.0;
    const numSteps = 50;

    // Manhattan side span: anchorage (-450) -> tower (-224)
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const x = cables.manhattanAnchorX + t * (towers.manhattanX - cables.manhattanAnchorX);
      const y = calculateSideCableY(x, towers.manhattanX, cables.manhattanAnchorX, towers.saddleElevation, anchorY);
      curvePoints.push(new THREE.Vector3(x, y, zOffset));
    }

    // Main span: tower 1 (-224) -> tower 2 (+224)
    for (let i = 1; i <= numSteps * 2; i++) {
      const t = i / (numSteps * 2);
      const x = towers.manhattanX + t * (towers.brooklynX - towers.manhattanX);
      const y = calculateMainCableY(x, towers.manhattanX, towers.brooklynX, towers.saddleElevation, cables.midspanElevation);
      curvePoints.push(new THREE.Vector3(x, y, zOffset));
    }

    // Brooklyn side span: tower (+224) -> anchorage (+450)
    for (let i = 1; i <= numSteps; i++) {
      const t = i / numSteps;
      const x = towers.brooklynX + t * (cables.brooklynAnchorX - towers.brooklynX);
      const y = calculateSideCableY(x, towers.brooklynX, cables.brooklynAnchorX, towers.saddleElevation, anchorY);
      curvePoints.push(new THREE.Vector3(x, y, zOffset));
    }

    const path = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(path, 180, cables.cableRadius, 8, false);
    const cableMesh = new THREE.Mesh(tubeGeo, cableMaterial);
    cableMesh.name = `MainCable_${cableIndex}`;
    cableMesh.castShadow = true;
    cablesGroup.add(cableMesh);
  });

  // 2. Generate Dense Vertical Hangers (InstancedMesh for maximum efficiency)
  const allHangerData = [];

  const mainCableYFn = (x) => calculateMainCableY(x, towers.manhattanX, towers.brooklynX, towers.saddleElevation, cables.midspanElevation);
  const deckYFn = (x) => calculateDeckCamber(x, towers.manhattanX, towers.brooklynX, deck.roadwayElevation + 2.0, deck.camberCrown);

  zOffsets.forEach(zOffset => {
    // Main span hangers between -215 and +215
    const mainSpanHangers = generateHangerCoordinates({
      startX: towers.manhattanX + 8.0,
      endX: towers.brooklynX - 8.0,
      spacing: cables.hangerSpacing,
      cableYFn: mainCableYFn,
      deckYFn: deckYFn,
      offsetZ: zOffset
    });
    allHangerData.push(...mainSpanHangers);

    // Side span Manhattan hangers (-430 to -232)
    const sideManhattanHangers = generateHangerCoordinates({
      startX: cables.manhattanAnchorX + 20.0,
      endX: towers.manhattanX - 8.0,
      spacing: cables.hangerSpacing,
      cableYFn: (x) => calculateSideCableY(x, towers.manhattanX, cables.manhattanAnchorX, towers.saddleElevation, deck.roadwayElevation - 4.0),
      deckYFn: () => deck.roadwayElevation + 2.0,
      offsetZ: zOffset
    });
    allHangerData.push(...sideManhattanHangers);

    // Side span Brooklyn hangers (232 to 430)
    const sideBrooklynHangers = generateHangerCoordinates({
      startX: towers.brooklynX + 8.0,
      endX: cables.brooklynAnchorX - 20.0,
      spacing: cables.hangerSpacing,
      cableYFn: (x) => calculateSideCableY(x, towers.brooklynX, cables.brooklynAnchorX, towers.saddleElevation, deck.roadwayElevation - 4.0),
      deckYFn: () => deck.roadwayElevation + 2.0,
      offsetZ: zOffset
    });
    allHangerData.push(...sideBrooklynHangers);
  });

  // Create single InstancedMesh for all vertical hangers
  // Base geometry is a unit cylinder of height 1.0, scaled in Y per instance
  const unitHangerGeo = new THREE.CylinderGeometry(cables.hangerRadius, cables.hangerRadius, 1.0, 6);
  const hangerInstancedMesh = new THREE.InstancedMesh(unitHangerGeo, hangerMaterial, allHangerData.length);
  hangerInstancedMesh.name = 'HangerSuspenders';
  hangerInstancedMesh.castShadow = true;

  const dummy = new THREE.Object3D();
  allHangerData.forEach((hanger, i) => {
    dummy.position.set(hanger.x, hanger.yBottom + hanger.height / 2, hanger.z);
    dummy.scale.set(1.0, hanger.height, 1.0);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    hangerInstancedMesh.setMatrixAt(i, dummy.matrix);
  });
  hangerInstancedMesh.instanceMatrix.needsUpdate = true;
  cablesGroup.add(hangerInstancedMesh);

  // 3. Night Cable Lights (Instanced decorative string lights along the outer cables)
  const outerCableZ = [zOffsets[0], zOffsets[zOffsets.length - 1]];
  const lightCountPerCable = 120;
  const totalLights = outerCableZ.length * lightCountPerCable;
  const lightGeo = new THREE.SphereGeometry(0.35, 6, 6);
  const cableLightsMesh = new THREE.InstancedMesh(lightGeo, nightLightsMaterial, totalLights);
  cableLightsMesh.name = 'CableNightLights';

  let lightIdx = 0;
  outerCableZ.forEach(zOffset => {
    for (let i = 0; i < lightCountPerCable; i++) {
      const t = i / (lightCountPerCable - 1);
      // Map t [0..1] across full span (-450 to +450)
      const x = cables.manhattanAnchorX + t * (cables.brooklynAnchorX - cables.manhattanAnchorX);
      let y;
      if (x < towers.manhattanX) {
        y = calculateSideCableY(x, towers.manhattanX, cables.manhattanAnchorX, towers.saddleElevation, deck.roadwayElevation - 4);
      } else if (x > towers.brooklynX) {
        y = calculateSideCableY(x, towers.brooklynX, cables.brooklynAnchorX, towers.saddleElevation, deck.roadwayElevation - 4);
      } else {
        y = mainCableYFn(x);
      }
      dummy.position.set(x, y + 0.35, zOffset);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cableLightsMesh.setMatrixAt(lightIdx++, dummy.matrix);
    }
  });
  cableLightsMesh.instanceMatrix.needsUpdate = true;
  cablesGroup.add(cableLightsMesh);

  /**
   * Adjusts cable night illumination intensity.
   * @param {number} intensity - 0.0 for daytime, up to 1.5 for full night
   */
  const setNightLights = (intensity) => {
    nightLightsMaterial.emissiveIntensity = intensity;
  };

  return {
    group: cablesGroup,
    setNightLights
  };
}
