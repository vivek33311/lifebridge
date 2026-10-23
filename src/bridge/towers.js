/**
 * @file towers.js
 * @description 3D model generator for the Manhattan Bridge steel towers.
 * Real Manhattan Bridge towers feature two steel legs connected by X-bracing,
 * transverse arched portals, and granite foundation piers in the East River.
 */

import * as THREE from 'three';
import { BRIDGE_CONFIG } from '../config/bridgeConfig.js';

/**
 * Creates the two main steel towers of the Manhattan Bridge.
 * @returns {THREE.Group} Group containing both tower assemblies
 */
export function createTowers() {
  const towersGroup = new THREE.Group();
  towersGroup.name = 'TowersGroup';

  const { towers, colors } = BRIDGE_CONFIG;

  // Shared high-performance materials
  const steelMaterial = new THREE.MeshStandardMaterial({
    color: colors.bridgeSteel,
    roughness: 0.45,
    metalness: 0.55
  });

  const darkSteelMaterial = new THREE.MeshStandardMaterial({
    color: colors.bridgeSteelDark,
    roughness: 0.5,
    metalness: 0.6
  });

  const pierMaterial = new THREE.MeshStandardMaterial({
    color: colors.granitePiers,
    roughness: 0.85,
    metalness: 0.1
  });

  // Build both towers: Manhattan (West) & Brooklyn (East)
  const towerPositionsX = [towers.manhattanX, towers.brooklynX];

  towerPositionsX.forEach((posX, index) => {
    const singleTower = createSingleTower({
      x: posX,
      name: index === 0 ? 'ManhattanTower' : 'BrooklynTower',
      steelMaterial,
      darkSteelMaterial,
      pierMaterial,
      config: towers
    });
    towersGroup.add(singleTower);
  });

  return towersGroup;
}

/**
 * Creates an individual bridge tower assembly.
 * @private
 */
function createSingleTower({ x, name, steelMaterial, darkSteelMaterial, pierMaterial, config }) {
  const tower = new THREE.Group();
  tower.name = name;
  tower.position.set(x, 0, 0);

  const pierHeight = config.pierTopY - config.pierBaseY; // 14m
  const pierCenterY = (config.pierTopY + config.pierBaseY) / 2; // 3m

  // 1. Granite Pier Foundation with cutwaters (pointed ends facing river current)
  const pierShape = new THREE.Shape();
  const halfZ = config.legSpacingZ / 2 + 8.0;
  const halfX = 9.0;
  pierShape.moveTo(-halfX, -halfZ + 4);
  pierShape.lineTo(-halfX, halfZ - 4);
  pierShape.lineTo(0, halfZ + 2); // North cutwater tip
  pierShape.lineTo(halfX, halfZ - 4);
  pierShape.lineTo(halfX, -halfZ + 4);
  pierShape.lineTo(0, -halfZ - 2); // South cutwater tip
  pierShape.closePath();

  const pierGeo = new THREE.ExtrudeGeometry(pierShape, {
    depth: pierHeight,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.5,
    bevelThickness: 0.5
  });
  pierGeo.rotateX(Math.PI / 2); // Orient vertically along Y
  const pierMesh = new THREE.Mesh(pierGeo, pierMaterial);
  pierMesh.position.set(0, config.pierTopY, 0);
  pierMesh.castShadow = true;
  pierMesh.receiveShadow = true;
  tower.add(pierMesh);

  // Coping rim at top of granite pier
  const copingGeo = new THREE.BoxGeometry(19, 1.2, halfZ * 2 + 1.5);
  const copingMesh = new THREE.Mesh(copingGeo, pierMaterial);
  copingMesh.position.set(0, config.pierTopY + 0.6, 0);
  copingMesh.castShadow = true;
  tower.add(copingMesh);

  // 2. Twin Steel Legs (North & South)
  const legHeight = config.totalHeight - config.pierTopY; // ~92m
  const legCenterY = config.pierTopY + legHeight / 2;

  const legZOffsets = [-config.legSpacingZ / 2, config.legSpacingZ / 2];

  legZOffsets.forEach((zOffset, i) => {
    // Tapered column geometry: slightly broader base, narrower top
    const legGeo = new THREE.CylinderGeometry(
      config.legWidthX * 0.78, // top radius
      config.legWidthX,        // bottom radius
      legHeight,
      4 // 4-sided square prism
    );
    legGeo.rotateY(Math.PI / 4); // Align flat faces with X and Z axes
    const legMesh = new THREE.Mesh(legGeo, steelMaterial);
    legMesh.position.set(0, legCenterY, zOffset);
    legMesh.castShadow = true;
    legMesh.receiveShadow = true;
    tower.add(legMesh);

    // Cable Saddle housing at top of each leg
    const saddleGeo = new THREE.BoxGeometry(config.legWidthX + 1.2, 3.2, config.legWidthZ + 1.6);
    const saddleMesh = new THREE.Mesh(saddleGeo, darkSteelMaterial);
    saddleMesh.position.set(0, config.saddleElevation, zOffset);
    saddleMesh.castShadow = true;
    tower.add(saddleMesh);

    // Decorative crown finials
    const finialGeo = new THREE.ConeGeometry(0.8, 3.5, 4);
    finialGeo.rotateY(Math.PI / 4);
    const finialMesh = new THREE.Mesh(finialGeo, darkSteelMaterial);
    finialMesh.position.set(0, config.totalHeight + 1.75, zOffset);
    tower.add(finialMesh);
  });

  // 3. Transverse Cross-Bracing (Real Manhattan Bridge X-trusses between the legs)
  const braceWidth = config.legSpacingZ - config.legWidthZ;

  // Lower tier cross strut (under the deck)
  const lowerStrutGeo = new THREE.BoxGeometry(config.legWidthX * 0.9, 2.5, braceWidth);
  const lowerStrut = new THREE.Mesh(lowerStrutGeo, steelMaterial);
  lowerStrut.position.set(0, 32.0, 0);
  tower.add(lowerStrut);

  // Portal Arch Header above the deck
  const portalHeaderGeo = new THREE.BoxGeometry(config.legWidthX * 0.85, 3.2, braceWidth);
  const portalHeader = new THREE.Mesh(portalHeaderGeo, steelMaterial);
  portalHeader.position.set(0, 52.0, 0);
  tower.add(portalHeader);

  // Upper X-braces between Y=54 and Y=96 in two stacked bays
  createTowerXBraceBay(tower, 54, 75, braceWidth, steelMaterial);
  createTowerXBraceBay(tower, 75, 96, braceWidth, steelMaterial);

  // Top strut joining tower summits
  const topStrutGeo = new THREE.BoxGeometry(config.legWidthX * 0.9, 3.0, braceWidth);
  const topStrut = new THREE.Mesh(topStrutGeo, darkSteelMaterial);
  topStrut.position.set(0, 99.5, 0);
  tower.add(topStrut);

  return tower;
}

/**
 * Creates an X-brace module between the tower legs.
 * @private
 */
function createTowerXBraceBay(parent, yMin, yMax, spanZ, material) {
  const height = yMax - yMin;
  const centerY = (yMin + yMax) / 2;
  const diagonalLen = Math.sqrt(height * height + spanZ * spanZ);
  const angle = Math.atan2(height, spanZ);

  // Cross horizontal cap
  const capGeo = new THREE.BoxGeometry(2.0, 1.4, spanZ);
  const capMesh = new THREE.Mesh(capGeo, material);
  capMesh.position.set(0, yMax, 0);
  parent.add(capMesh);

  // Diagonal 1
  const diag1Geo = new THREE.BoxGeometry(1.2, 1.2, diagonalLen);
  const diag1 = new THREE.Mesh(diag1Geo, material);
  diag1.position.set(0, centerY, 0);
  diag1.rotation.x = angle;
  parent.add(diag1);

  // Diagonal 2
  const diag2Geo = new THREE.BoxGeometry(1.2, 1.2, diagonalLen);
  const diag2 = new THREE.Mesh(diag2Geo, material);
  diag2.position.set(0, centerY, 0);
  diag2.rotation.x = -angle;
  parent.add(diag2);
}
