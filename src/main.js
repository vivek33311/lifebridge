/**
 * @file main.js
 * @description Main application entry point for the Manhattan Bridge 3D Web Application.
 * Sets up Three.js rendering pipeline, OrbitControls, animation loop,
 * tab visibility management, and responsive resize handling.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { UIStateManager } from './ui/uiState.js';
import { setupControls } from './ui/controls.js';
import { createTowers } from './bridge/towers.js';
import { createCables } from './bridge/cables.js';
import { createDeck } from './bridge/deck.js';
import { createApproaches } from './bridge/approaches.js';
import { createWater } from './scene/water.js';
import { createSkyline } from './scene/skyline.js';
import { createLighting } from './scene/lighting.js';
import { createTraffic } from './scene/traffic.js';

/**
 * Bootstraps the 3D application.
 */
function init() {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container element not found.');
    return;
  }

  // 1. Scene & Perspective Camera
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    48,
    window.innerWidth / window.innerHeight,
    1.0,
    3000.0
  );
  camera.position.set(0, 160, 360);

  // 2. WebGL Renderer with High Performance & Shadow Support
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0)); // Cap pixel ratio at 2
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  container.appendChild(renderer.domElement);

  // 3. OrbitControls with Strict Underground Prevention
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 45, 0);

  // Critical requirement: Camera never goes underground or below water level
  controls.maxPolarAngle = Math.PI / 2 - 0.03; // ~88 degrees, prevents looking from below Y=0
  controls.minDistance = 6.0;
  controls.maxDistance = 850.0;
  controls.update();

  // 4. Instantiate Scene Components
  const lighting = createLighting(scene);
  const water = createWater(scene);
  const skyline = createSkyline(scene);
  const towersGroup = createTowers();
  const cables = createCables();
  const deckGroup = createDeck();
  const approachesGroup = createApproaches();
  const traffic = createTraffic(scene);

  scene.add(towersGroup);
  scene.add(cables.group);
  scene.add(deckGroup);
  scene.add(approachesGroup);

  // 5. State Management & HUD Controls
  const stateManager = new UIStateManager();

  const applyLightingMode = (mode) => {
    lighting.setTimeMode(mode, {
      setCablesNightLights: cables.setNightLights,
      setSkylineNightMode: skyline.setNightMode
    });
  };

  setupControls({
    stateManager,
    camera,
    orbitControls: controls,
    onTimeChange: (mode, hours) => {
      applyLightingMode(mode);
    },
    onTrafficToggle: (isRunning) => {
      // Handled in traffic update loop via state
    },
    onReducedMotionToggle: (isReduced) => {
      // Handled in render loop
    }
  });

  // 6. Animation Loop & Lifecycle Management
  const clock = new THREE.Clock();
  let animationFrameId = null;
  let isTabVisible = true;

  function animate() {
    if (!isTabVisible) return;

    animationFrameId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const totalTime = clock.getElapsedTime();
    const currentState = stateManager.getState();

    // Damping updates
    controls.update();

    // Enforce hard floor on camera Y as secondary safeguard
    if (camera.position.y < 2.0) {
      camera.position.y = 2.0;
    }

    // Water wave ripples
    const lightingState = lighting.getLightingState();
    water.update(delta, totalTime, currentState.reducedMotion, lightingState);

    // Traffic simulation
    const trafficRunning = currentState.trafficRunning && !currentState.reducedMotion;
    traffic.update(delta, trafficRunning);

    renderer.render(scene, camera);
  }

  // 7. Page Visibility Management: Pause when tab is hidden to save energy & GPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isTabVisible = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    } else {
      isTabVisible = true;
      clock.getDelta(); // flush delta lag
      animate();
    }
  });

  // 8. Responsive Viewport Resize Handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  });

  // Start initial render loop
  animate();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
