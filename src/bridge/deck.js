/**
 * @file deck.js
 * @description 3D model generator for the Manhattan Bridge double-deck superstructure.
 * Real Manhattan Bridge deck features:
 * - Deep steel stiffening trusses (Warren truss configuration)
 * - 4 subway tracks on the lower outer cantilever decks (B, D, N, Q train lines)
 * - Central roadway with traffic lanes
 * - Elevated pedestrian / bicycle walkway
 */

import * as THREE from 'three';
import { BRIDGE_CONFIG } from '../config/bridgeConfig.js';
import { calculateDeckCamber } from './geometryMath.js';

/**
 * Creates the complete double-deck structure with stiffening trusses,
 * subway tracks, central roadway, and walkway.
 * @returns {THREE.Group} Group containing deck assembly
 */
export function createDeck() {
  const deckGroup = new THREE.Group();
  deckGroup.name = 'DeckSuperstructure';

  const { towers, deck, colors, approaches } = BRIDGE_CONFIG;

  // Materials
  const steelMaterial = new THREE.MeshStandardMaterial({
    color: colors.bridgeSteel,
    roughness: 0.5,
    metalness: 0.55
  });

  const darkSteelMaterial = new THREE.MeshStandardMaterial({
    color: colors.bridgeSteelDark,
    roughness: 0.6,
    metalness: 0.5
  });

  const asphaltMaterial = new THREE.MeshStandardMaterial({
    color: colors.roadwayAsphalt,
    roughness: 0.9,
    metalness: 0.05
  });

  const trackBedMaterial = new THREE.MeshStandardMaterial({
    color: colors.subwayTracks,
    roughness: 0.8,
    metalness: 0.2
  });

  const walkwayMaterial = new THREE.MeshStandardMaterial({
    color: colors.walkwayWood,
    roughness: 0.75,
    metalness: 0.1
  });

  const railSteelMaterial = new THREE.MeshStandardMaterial({
    color: 0x90989e,
    roughness: 0.3,
    metalness: 0.8
  });

  const laneLineMaterial = new THREE.MeshBasicMaterial({
    color: colors.roadwayMarkings
  });

  // Span ranges
  const startX = approaches.manhattanAnchorX;
  const endX = approaches.brooklynAnchorX;
  const totalSpanX = endX - startX; // 900m
  const segmentCount = 90;
  const dx = totalSpanX / segmentCount;

  // 1. Central Roadway Deck
  // Width: 20m centered at Z = 0
  const roadwayWidth = 20.0;
  const roadwayGeo = new THREE.BoxGeometry(dx * 1.02, 0.6, roadwayWidth);

  // 2. Outer Subway Track Beds
  // North subway bed: Z = -15.5, width 7.0
  // South subway bed: Z = 15.5, width 7.0
  const subwayWidth = 7.0;
  const subwayNorthZ = -15.2;
  const subwaySouthZ = 15.2;
  const subwayGeo = new THREE.BoxGeometry(dx * 1.02, 0.8, subwayWidth);

  // 3. Walkway Deck
  // South side above subway track: Z = 17.5, width 3.2
  const walkwayWidth = 3.2;
  const walkwayGeo = new THREE.BoxGeometry(dx * 1.02, 0.4, walkwayWidth);

  // Build segmented road & subway segments adhering to camber
  for (let i = 0; i < segmentCount; i++) {
    const x = startX + (i + 0.5) * dx;
    const yCamber = calculateDeckCamber(x, towers.manhattanX, towers.brooklynX, deck.roadwayElevation, deck.camberCrown);

    // Roadway segment
    const roadSegment = new THREE.Mesh(roadwayGeo, asphaltMaterial);
    roadSegment.position.set(x, yCamber, 0);
    roadSegment.receiveShadow = true;
    deckGroup.add(roadSegment);

    // Subway track beds (slightly lower level, authentic to Manhattan Bridge double-deck)
    const subwayNorth = new THREE.Mesh(subwayGeo, trackBedMaterial);
    subwayNorth.position.set(x, yCamber - 1.2, subwayNorthZ);
    subwayNorth.receiveShadow = true;
    deckGroup.add(subwayNorth);

    const subwaySouth = new THREE.Mesh(subwayGeo, trackBedMaterial);
    subwaySouth.position.set(x, yCamber - 1.2, subwaySouthZ);
    subwaySouth.receiveShadow = true;
    deckGroup.add(subwaySouth);

    // Elevated Walkway on south side
    const walkwaySegment = new THREE.Mesh(walkwayGeo, walkwayMaterial);
    walkwaySegment.position.set(x, yCamber + 0.6, 17.4);
    walkwaySegment.receiveShadow = true;
    deckGroup.add(walkwaySegment);
  }

  // 4. Stiffening Trusses (Both North and South Sides)
  // Deep steel trusses running continuously alongside the roadway
  createStiffeningTruss(deckGroup, startX, endX, -11.5, deck.trussDepth, deck.roadwayElevation, steelMaterial, darkSteelMaterial);
  createStiffeningTruss(deckGroup, startX, endX, 11.5, deck.trussDepth, deck.roadwayElevation, steelMaterial, darkSteelMaterial);

  // Outer safety barriers & railings
  createBridgeRailings(deckGroup, startX, endX, deck.roadwayElevation, railSteelMaterial);

  // Roadway lane striping
  createRoadwayMarkings(deckGroup, startX, endX, deck.roadwayElevation, laneLineMaterial);

  // Continuous Subway Rails (4 physical steel tracks)
  createSubwayRails(deckGroup, startX, endX, deck.roadwayElevation - 0.7, subwayNorthZ, subwaySouthZ, railSteelMaterial);

  return deckGroup;
}

/**
 * Creates deep Warren stiffening trusses with top & bottom chords, verticals, and diagonals.
 * @private
 */
function createStiffeningTruss(parent, startX, endX, zPos, depth, baseY, steelMat, darkMat) {
  const trussGroup = new THREE.Group();
  trussGroup.position.set(0, baseY, zPos);

  const totalLength = endX - startX;
  const bayWidth = 6.0;
  const bays = Math.floor(totalLength / bayWidth);

  // Continuous Top and Bottom Chords
  const chordGeo = new THREE.BoxGeometry(totalLength, 0.8, 0.8);
  const bottomChord = new THREE.Mesh(chordGeo, darkMat);
  bottomChord.position.set((startX + endX) / 2, -depth / 2, 0);
  trussGroup.add(bottomChord);

  const topChord = new THREE.Mesh(chordGeo, darkMat);
  topChord.position.set((startX + endX) / 2, depth / 2, 0);
  trussGroup.add(topChord);

  // Instanced Vertical and Diagonal Truss Members
  const verticalGeo = new THREE.BoxGeometry(0.5, depth, 0.5);
  const verticalMesh = new THREE.InstancedMesh(verticalGeo, steelMat, bays + 1);

  const diagLen = Math.sqrt(bayWidth * bayWidth + depth * depth);
  const diagGeo = new THREE.BoxGeometry(0.4, diagLen, 0.4);
  const diagMesh = new THREE.InstancedMesh(diagGeo, steelMat, bays);

  const angle = Math.atan2(depth, bayWidth);
  const dummy = new THREE.Object3D();

  for (let i = 0; i <= bays; i++) {
    const x = startX + i * bayWidth;
    dummy.position.set(x, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    verticalMesh.setMatrixAt(i, dummy.matrix);

    if (i < bays) {
      const midX = x + bayWidth / 2;
      dummy.position.set(midX, 0, 0);
      dummy.rotation.set(0, 0, i % 2 === 0 ? angle : -angle);
      dummy.updateMatrix();
      diagMesh.setMatrixAt(i, dummy.matrix);
    }
  }

  verticalMesh.instanceMatrix.needsUpdate = true;
  diagMesh.instanceMatrix.needsUpdate = true;

  trussGroup.add(verticalMesh);
  trussGroup.add(diagMesh);
  parent.add(trussGroup);
}

/**
 * Creates outer railings and pedestrian balustrades.
 * @private
 */
function createBridgeRailings(parent, startX, endX, baseY, material) {
  const length = endX - startX;
  const railingGeo = new THREE.BoxGeometry(length, 1.1, 0.2);

  // Walkway outer railing
  const walkRail = new THREE.Mesh(railingGeo, material);
  walkRail.position.set((startX + endX) / 2, baseY + 1.2, 19.0);
  parent.add(walkRail);

  // Walkway inner safety fence (separating from roadway/truss)
  const innerFence = new THREE.Mesh(railingGeo, material);
  innerFence.position.set((startX + endX) / 2, baseY + 1.2, 15.8);
  parent.add(innerFence);

  // North side outer barrier
  const northBarrier = new THREE.Mesh(railingGeo, material);
  northBarrier.position.set((startX + endX) / 2, baseY + 0.6, -18.8);
  parent.add(northBarrier);
}

/**
 * Creates dashed lane lines on the central roadway.
 * @private
 */
function createRoadwayMarkings(parent, startX, endX, baseY, material) {
  const dashCount = 80;
  const dashGeo = new THREE.BoxGeometry(4.0, 0.05, 0.25);
  const dashMesh = new THREE.InstancedMesh(dashGeo, material, dashCount * 2);

  const dx = (endX - startX) / dashCount;
  const dummy = new THREE.Object3D();

  let idx = 0;
  // Two lane divider lines at Z = -3.5 and Z = +3.5
  [-3.5, 3.5].forEach(z => {
    for (let i = 0; i < dashCount; i++) {
      const x = startX + i * dx + dx * 0.5;
      dummy.position.set(x, baseY + 0.35, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      dashMesh.setMatrixAt(idx++, dummy.matrix);
    }
  });

  dashMesh.instanceMatrix.needsUpdate = true;
  parent.add(dashMesh);
}

/**
 * Creates continuous physical steel rails for the 4 subway tracks.
 * @private
 */
function createSubwayRails(parent, startX, endX, baseY, northZ, southZ, railMat) {
  const length = endX - startX;
  const railGeo = new THREE.BoxGeometry(length, 0.25, 0.15);

  // Two tracks on North side, two tracks on South side
  // Track gauge ~1.435m
  const railOffsets = [
    northZ - 1.2, northZ - 0.2, // Track 1
    northZ + 0.8, northZ + 1.8, // Track 2
    southZ - 1.8, southZ - 0.8, // Track 3
    southZ + 0.2, southZ + 1.2  // Track 4
  ];

  railOffsets.forEach(z => {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set((startX + endX) / 2, baseY, z);
    parent.add(rail);
  });
}
