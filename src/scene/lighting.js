/**
 * @file lighting.js
 * @description Dynamic atmospheric lighting, sky, directional sun/moon,
 * soft shadows, and light depth fog for the Manhattan Bridge East River scene.
 */

import * as THREE from 'three';

/**
 * Lighting presets for Day, Sunset, and Night.
 */
export const LIGHTING_PRESETS = {
  day: {
    skyColor: 0x93bfe3,
    groundColor: 0x223344,
    fogColor: 0xa8cbeb,
    fogDensity: 0.0007,
    ambientColor: 0xffffff,
    ambientIntensity: 0.65,
    sunColor: 0xfffaed,
    sunIntensity: 1.4,
    sunPosition: [300, 450, 200],
    emissiveCableLights: 0.0,
    emissiveWindows: 0.05
  },
  sunset: {
    skyColor: 0xf58c58,
    groundColor: 0x3d2729,
    fogColor: 0xd9755b,
    fogDensity: 0.0009,
    ambientColor: 0xff9977,
    ambientIntensity: 0.5,
    sunColor: 0xff6622,
    sunIntensity: 1.2,
    sunPosition: [-400, 120, 250],
    emissiveCableLights: 0.5,
    emissiveWindows: 0.8
  },
  night: {
    skyColor: 0x070c18,
    groundColor: 0x020408,
    fogColor: 0x091122,
    fogDensity: 0.0011,
    ambientColor: 0x243355,
    ambientIntensity: 0.35,
    sunColor: 0x9bc2ff, // Moonlight
    sunIntensity: 0.45,
    sunPosition: [200, 350, -200],
    emissiveCableLights: 1.8,
    emissiveWindows: 1.6
  }
};

/**
 * Creates atmospheric lighting and fog setup.
 * @param {THREE.Scene} scene
 * @returns {Object} Lighting controller
 */
export function createLighting(scene) {
  // 1. Fog for aerial perspective and realistic river haze
  const fog = new THREE.FogExp2(LIGHTING_PRESETS.day.fogColor, LIGHTING_PRESETS.day.fogDensity);
  scene.fog = fog;

  // 2. Hemisphere ambient light (sky vs ground bounce)
  const hemiLight = new THREE.HemisphereLight(
    LIGHTING_PRESETS.day.skyColor,
    LIGHTING_PRESETS.day.groundColor,
    LIGHTING_PRESETS.day.ambientIntensity
  );
  hemiLight.position.set(0, 300, 0);
  scene.add(hemiLight);

  // 3. Directional Sun / Moon light with soft shadows
  const sunLight = new THREE.DirectionalLight(
    LIGHTING_PRESETS.day.sunColor,
    LIGHTING_PRESETS.day.sunIntensity
  );
  sunLight.position.set(...LIGHTING_PRESETS.day.sunPosition);
  sunLight.castShadow = true;

  // Shadow frustum tuned for the bridge span
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 50;
  sunLight.shadow.camera.far = 1200;
  sunLight.shadow.camera.left = -450;
  sunLight.shadow.camera.right = 450;
  sunLight.shadow.camera.top = 200;
  sunLight.shadow.camera.bottom = -100;
  sunLight.shadow.bias = -0.0004;

  scene.add(sunLight);

  // Current active mode
  let currentMode = 'day';

  /**
   * Applies lighting parameters with smooth interpolation.
   * @param {string} mode - 'day' | 'sunset' | 'night'
   * @param {Object} [callbacks] - Handlers for cables and skyline updates
   */
  function setTimeMode(mode, callbacks = {}) {
    currentMode = mode;
    const target = LIGHTING_PRESETS[mode] || LIGHTING_PRESETS.day;

    scene.background = new THREE.Color(target.skyColor);
    fog.color.setHex(target.fogColor);
    fog.density = target.fogDensity;

    hemiLight.color.setHex(target.skyColor);
    hemiLight.groundColor.setHex(target.groundColor);
    hemiLight.intensity = target.ambientIntensity;

    sunLight.color.setHex(target.sunColor);
    sunLight.intensity = target.sunIntensity;
    sunLight.position.set(...target.sunPosition);

    if (callbacks.setCablesNightLights) {
      callbacks.setCablesNightLights(target.emissiveCableLights);
    }
    if (callbacks.setSkylineNightMode) {
      callbacks.setSkylineNightMode(target.emissiveWindows);
    }
  }

  /**
   * Returns current lighting parameters for water shader uniforms.
   */
  function getLightingState() {
    const p = LIGHTING_PRESETS[currentMode];
    return {
      skyColor: new THREE.Color(p.skyColor),
      sunColor: new THREE.Color(p.sunColor),
      sunDirection: sunLight.position.clone().normalize(),
      sunIntensity: p.sunIntensity
    };
  }

  // Initialize with daytime
  setTimeMode('day');

  return {
    hemiLight,
    sunLight,
    fog,
    setTimeMode,
    getLightingState
  };
}
