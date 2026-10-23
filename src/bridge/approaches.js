/**
 * @file approaches.js
 * @description 3D model generator for the Manhattan and Brooklyn approach viaducts,
 * massive cable anchorages, and the iconic Carrère & Hastings Beaux-Arts Stone Arch & Colonnade
 * at the Manhattan entrance (Flatbush Ave Ext / Canal St).
 */

import * as THREE from 'three';
import { BRIDGE_CONFIG } from '../config/bridgeConfig.js';

/**
 * Creates the anchorages, masonry approaches, and Manhattan Beaux-Arts monumental arch.
 * @returns {THREE.Group} Group containing approach structures
 */
export function createApproaches() {
  const approachesGroup = new THREE.Group();
  approachesGroup.name = 'ApproachesGroup';

  const { approaches, deck, colors } = BRIDGE_CONFIG;

  // Materials
  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: colors.beauxArtsStone,
    roughness: 0.88,
    metalness: 0.05
  });

  const darkStoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x8a7e72,
    roughness: 0.9,
    metalness: 0.05
  });

  const pierMaterial = new THREE.MeshStandardMaterial({
    color: colors.granitePiers,
    roughness: 0.85,
    metalness: 0.1
  });

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: colors.roadwayAsphalt,
    roughness: 0.9,
    metalness: 0.05
  });

  // 1. Massive Cable Anchorages (Manhattan X=-450, Brooklyn X=+450)
  createAnchorage(approachesGroup, approaches.manhattanAnchorX, 'ManhattanAnchorage', stoneMaterial, darkStoneMaterial);
  createAnchorage(approachesGroup, approaches.brooklynAnchorX, 'BrooklynAnchorage', stoneMaterial, darkStoneMaterial);

  // 2. Approach Viaducts (Ramp piers leading inland to grade)
  createViaductRamp(approachesGroup, approaches.manhattanAnchorX, approaches.manhattanEnd, -1, pierMaterial, roadMaterial, deck.roadwayElevation);
  createViaductRamp(approachesGroup, approaches.brooklynAnchorX, approaches.brooklynEnd, 1, pierMaterial, roadMaterial, deck.roadwayElevation);

  // 3. Iconic Beaux-Arts Stone Arch & Curved Colonnade at Manhattan Portal
  createManhattanBeauxArtsPlaza(approachesGroup, approaches.archX, stoneMaterial, darkStoneMaterial);

  return approachesGroup;
}

/**
 * Creates a monumental granite/limestone cable anchorage building.
 * @private
 */
function createAnchorage(parent, posX, name, stoneMat, darkMat) {
  const anchorage = new THREE.Group();
  anchorage.name = name;
  anchorage.position.set(posX, 0, 0);

  // Heavy rusticated base (40m long, 42m wide, 28m high)
  const baseGeo = new THREE.BoxGeometry(40, 28, 42);
  const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
  baseMesh.position.set(0, 14, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  anchorage.add(baseMesh);

  // Decorative stepped cornice/attic story
  const corniceGeo = new THREE.BoxGeometry(42, 4, 44);
  const corniceMesh = new THREE.Mesh(corniceGeo, darkMat);
  corniceMesh.position.set(0, 30, 0);
  corniceMesh.castShadow = true;
  anchorage.add(corniceMesh);

  // Cable saddle housing block on top
  const saddleHousingGeo = new THREE.BoxGeometry(24, 7, 36);
  const saddleHousing = new THREE.Mesh(saddleHousingGeo, stoneMat);
  saddleHousing.position.set(0, 35.5, 0);
  saddleHousing.castShadow = true;
  anchorage.add(saddleHousing);

  parent.add(anchorage);
}

/**
 * Creates masonry viaduct arches supporting the ramp onto city streets.
 * @private
 */
function createViaductRamp(parent, startX, endX, direction, pierMat, roadMat, startY) {
  const rampGroup = new THREE.Group();
  const count = 5;
  const dx = (endX - startX) / count;

  for (let i = 0; i < count; i++) {
    const x = startX + (i + 0.5) * dx;
    const progress = (i + 1) / (count + 1);
    // Slope down from roadway elevation (40m) towards ground (12m)
    const currentY = startY - progress * 24.0;
    const pierHeight = currentY;

    // Masonry arched pier
    const pierGeo = new THREE.BoxGeometry(Math.abs(dx) * 0.75, pierHeight, 38);
    const pier = new THREE.Mesh(pierGeo, pierMat);
    pier.position.set(x, pierHeight / 2, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    rampGroup.add(pier);

    // Roadbed on top
    const roadBedGeo = new THREE.BoxGeometry(Math.abs(dx) * 1.05, 1.2, 36.6);
    const roadBed = new THREE.Mesh(roadBedGeo, roadMat);
    roadBed.position.set(x, currentY + 0.6, 0);
    roadBed.receiveShadow = true;
    rampGroup.add(roadBed);
  }

  parent.add(rampGroup);
}

/**
 * Creates Carrère and Hastings' famous Beaux-Arts triumphal arch and semicircular colonnade.
 * Real monument stands at the Manhattan portal (Canal St & Bowery).
 * @private
 */
function createManhattanBeauxArtsPlaza(parent, posX, stoneMat, accentMat) {
  const plazaGroup = new THREE.Group();
  plazaGroup.name = 'BeauxArtsPortal';
  plazaGroup.position.set(posX, 16.0, 0); // Elevation on the approach slope

  // 1. Central Triumphal Arch (Porte Saint-Denis inspired)
  const archGroup = new THREE.Group();

  // Left & Right massive pylon piers
  const pierWidth = 6.0;
  const pierDepth = 6.0;
  const pierHeight = 22.0;

  const leftPylonGeo = new THREE.BoxGeometry(pierDepth, pierHeight, pierWidth);
  const leftPylon = new THREE.Mesh(leftPylonGeo, stoneMat);
  leftPylon.position.set(0, pierHeight / 2, -12);
  leftPylon.castShadow = true;
  archGroup.add(leftPylon);

  const rightPylonGeo = new THREE.BoxGeometry(pierDepth, pierHeight, pierWidth);
  const rightPylon = new THREE.Mesh(rightPylonGeo, stoneMat);
  rightPylon.position.set(0, pierHeight / 2, 12);
  rightPylon.castShadow = true;
  archGroup.add(rightPylon);

  // Arch Header / Spandrel / Attic Story
  const atticGeo = new THREE.BoxGeometry(pierDepth + 2, 7.0, 30);
  const atticMesh = new THREE.Mesh(atticGeo, accentMat);
  atticMesh.position.set(0, pierHeight + 3.5, 0);
  atticMesh.castShadow = true;
  archGroup.add(atticMesh);

  // Carved crowning frieze / pediment
  const friezeGeo = new THREE.BoxGeometry(pierDepth + 1, 2.5, 26);
  const friezeMesh = new THREE.Mesh(friezeGeo, stoneMat);
  friezeMesh.position.set(0, pierHeight + 8.25, 0);
  friezeMesh.castShadow = true;
  archGroup.add(friezeMesh);

  // Semicircular arch vault span
  const archVaultGeo = new THREE.TorusGeometry(8.5, 2.0, 8, 24, Math.PI);
  archVaultGeo.rotateY(Math.PI / 2);
  const archVault = new THREE.Mesh(archVaultGeo, stoneMat);
  archVault.position.set(0, 13.5, 0);
  archGroup.add(archVault);

  plazaGroup.add(archGroup);

  // 2. Curved Beaux-Arts Colonnade (Wings sweeping outward from the arch)
  const colonnadeRadius = 38.0;
  const columnCount = 14;
  const columnGeo = new THREE.CylinderGeometry(0.7, 0.85, 14.0, 10);
  const entablatureGeo = new THREE.BoxGeometry(2.4, 2.0, 6.0);

  // Semicircular curved arc on North and South sides
  for (let i = 0; i < columnCount; i++) {
    // North wing
    const angleN = 0.25 + (i / columnCount) * 0.9;
    const zN = -16.0 - Math.sin(angleN) * colonnadeRadius * 0.55;
    const xN = -Math.cos(angleN) * colonnadeRadius * 0.35;

    const colMeshN = new THREE.Mesh(columnGeo, stoneMat);
    colMeshN.position.set(xN, 7.0, zN);
    colMeshN.castShadow = true;
    plazaGroup.add(colMeshN);

    const entMeshN = new THREE.Mesh(entablatureGeo, accentMat);
    entMeshN.position.set(xN, 14.8, zN);
    entMeshN.rotation.y = angleN;
    plazaGroup.add(entMeshN);

    // South wing
    const angleS = 0.25 + (i / columnCount) * 0.9;
    const zS = 16.0 + Math.sin(angleS) * colonnadeRadius * 0.55;
    const xS = -Math.cos(angleS) * colonnadeRadius * 0.35;

    const colMeshS = new THREE.Mesh(columnGeo, stoneMat);
    colMeshS.position.set(xS, 7.0, zS);
    colMeshS.castShadow = true;
    plazaGroup.add(colMeshS);

    const entMeshS = new THREE.Mesh(entablatureGeo, accentMat);
    entMeshS.position.set(xS, 14.8, zS);
    entMeshS.rotation.y = -angleS;
    plazaGroup.add(entMeshS);
  }

  parent.add(plazaGroup);
}
