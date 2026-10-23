/**
 * @file traffic.js
 * @description Dynamic simulation of Manhattan Bridge vehicular traffic
 * and NYC subway trains on the outer tracks using high-performance InstancedMesh.
 */

import * as THREE from 'three';
import { BRIDGE_CONFIG } from '../config/bridgeConfig.js';
import { calculateDeckCamber } from '../bridge/geometryMath.js';

/**
 * Creates animated roadway cars and outer track subway trains.
 * @param {THREE.Scene} scene
 * @returns {{group: THREE.Group, update: Function}}
 */
export function createTraffic(scene) {
  const trafficGroup = new THREE.Group();
  trafficGroup.name = 'BridgeTraffic';

  const { towers, deck, approaches } = BRIDGE_CONFIG;
  const startX = approaches.manhattanAnchorX;
  const endX = approaches.brooklynAnchorX;
  const totalLength = endX - startX;

  // 1. CAR TRAFFIC (48 instanced passenger cars and taxis)
  const carCount = 48;
  const carGeo = new THREE.BoxGeometry(4.2, 1.4, 1.9);

  const carMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.35,
    metalness: 0.7
  });

  const carsMesh = new THREE.InstancedMesh(carGeo, carMaterial, carCount);
  carsMesh.name = 'RoadwayCars';
  carsMesh.castShadow = true;

  // Authentic NYC car colors (yellow cabs, silver, black, red, white, dark blue)
  const carPalette = [
    new THREE.Color(0xffc20e), // NYC Taxi Yellow
    new THREE.Color(0xffc20e),
    new THREE.Color(0xd8d8d8), // Silver
    new THREE.Color(0x1a1a1a), // Black
    new THREE.Color(0x992222), // Crimson
    new THREE.Color(0xf5f5f5), // White
    new THREE.Color(0x203554)  // Midnight Blue
  ];

  // Lanes: 3 eastbound (toward Brooklyn: +X), 3 westbound (toward Manhattan: -X)
  const lanes = [
    { z: -7.0, direction: 1, speed: 17.0 },
    { z: -3.5, direction: 1, speed: 15.0 },
    { z: 0.0, direction: 1, speed: 18.0 },
    { z: 3.5, direction: -1, speed: 16.0 },
    { z: 7.0, direction: -1, speed: 14.0 }
  ];

  const carsData = [];
  for (let i = 0; i < carCount; i++) {
    const lane = lanes[i % lanes.length];
    const initialT = (i / carCount) + Math.random() * 0.05;
    const speedVariation = 0.85 + Math.random() * 0.3;
    const speed = lane.speed * speedVariation * lane.direction;

    carsData.push({
      t: initialT % 1.0,
      laneZ: lane.z,
      speed,
      direction: lane.direction
    });

    const chosenColor = carPalette[i % carPalette.length];
    carsMesh.setColorAt(i, chosenColor);
  }

  carsMesh.instanceColor.needsUpdate = true;
  trafficGroup.add(carsMesh);

  // 2. SUBWAY TRAINS (NYC Subway Consists: North track towards Manhattan, South track towards Brooklyn)
  // Two trains of 6 stainless-steel cars each
  const carsPerTrain = 6;
  const trainCarLength = 18.0;
  const trainCarGeo = new THREE.BoxGeometry(trainCarLength, 3.2, 3.0);

  const subwayBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8d2d9, // Stainless steel
    roughness: 0.35,
    metalness: 0.8
  });

  const trainsMesh = new THREE.InstancedMesh(trainCarGeo, subwayBodyMaterial, carsPerTrain * 2);
  trainsMesh.name = 'SubwayTrains';
  trainsMesh.castShadow = true;

  const trains = [
    {
      name: 'ManhattanBound_BD',
      trackZ: -15.2,
      direction: -1,
      speed: 22.0,
      t: 0.75
    },
    {
      name: 'BrooklynBound_NQ',
      trackZ: 15.2,
      direction: 1,
      speed: 20.0,
      t: 0.25
    }
  ];

  trafficGroup.add(trainsMesh);
  scene.add(trafficGroup);

  const dummy = new THREE.Object3D();

  /**
   * Updates car and subway train positions along bridge camber curve.
   * @param {number} delta - Seconds elapsed
   * @param {boolean} [isRunning=true] - Play/pause flag
   */
  function update(delta, isRunning = true) {
    if (!isRunning) return;

    // 1. Update Cars
    for (let i = 0; i < carCount; i++) {
      const car = carsData[i];
      // Progress t across span
      const dt = (car.speed * delta) / totalLength;
      car.t += dt;
      if (car.t > 1.0) car.t -= 1.0;
      if (car.t < 0.0) car.t += 1.0;

      const currentX = startX + car.t * totalLength;
      const currentY = calculateDeckCamber(currentX, towers.manhattanX, towers.brooklynX, deck.roadwayElevation + 0.9, deck.camberCrown);

      dummy.position.set(currentX, currentY, car.laneZ);
      dummy.rotation.set(0, car.direction > 0 ? 0 : Math.PI, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      carsMesh.setMatrixAt(i, dummy.matrix);
    }
    carsMesh.instanceMatrix.needsUpdate = true;

    // 2. Update Subway Trains
    let instanceIdx = 0;
    trains.forEach(train => {
      const dt = (train.speed * train.direction * delta) / totalLength;
      train.t += dt;
      if (train.t > 1.2) train.t -= 1.4;
      if (train.t < -0.2) train.t += 1.4;

      const headX = startX + train.t * totalLength;

      for (let c = 0; c < carsPerTrain; c++) {
        // Cars follow head car spaced by trainCarLength
        const carX = headX - c * (trainCarLength + 0.8) * train.direction;
        const carY = calculateDeckCamber(carX, towers.manhattanX, towers.brooklynX, deck.roadwayElevation - 0.1, deck.camberCrown);

        dummy.position.set(carX, carY, train.trackZ);
        dummy.rotation.set(0, train.direction > 0 ? 0 : Math.PI, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        trainsMesh.setMatrixAt(instanceIdx++, dummy.matrix);
      }
    });
    trainsMesh.instanceMatrix.needsUpdate = true;
  }

  return {
    group: trafficGroup,
    update
  };
}
