/**
 * @file water.js
 * @description East River 3D water simulation with animated rippling waves,
 * specular highlights, and river surface reflections.
 */

import * as THREE from 'three';
import { BRIDGE_CONFIG } from '../config/bridgeConfig.js';

/**
 * Creates the East River water surface.
 * @param {THREE.Scene} scene
 * @returns {{mesh: THREE.Mesh, update: Function}}
 */
export function createWater(scene) {
  const { river, colors } = BRIDGE_CONFIG;

  // Custom vertex and fragment shaders for physically inspired water rippling & Fresnel reflections
  const waterVertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Realistic multi-octave sinusoidal East River surface ripples
      float wave1 = sin(pos.x * 0.035 + uTime * 1.4) * cos(pos.y * 0.025 + uTime * 1.1) * 0.45;
      float wave2 = sin(pos.x * 0.08 - uTime * 1.8 + pos.y * 0.06) * 0.22;
      float wave3 = cos(pos.x * 0.15 + pos.y * 0.12 - uTime * 2.5) * 0.10;

      pos.z += wave1 + wave2 + wave3;

      // Calculate analytical normal for sharp specular ripples
      float dZdx = 0.035 * cos(pos.x * 0.035 + uTime * 1.4) * cos(pos.y * 0.025 + uTime * 1.1) * 0.45
                 + 0.08 * cos(pos.x * 0.08 - uTime * 1.8 + pos.y * 0.06) * 0.22;
      float dZdy = -0.025 * sin(pos.x * 0.035 + uTime * 1.4) * sin(pos.y * 0.025 + uTime * 1.1) * 0.45
                 + 0.06 * cos(pos.x * 0.08 - uTime * 1.8 + pos.y * 0.06) * 0.22;

      vec3 normalVec = normalize(vec3(-dZdx, -dZdy, 1.0));
      vNormal = normalMatrix * normalVec;

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const waterFragmentShader = `
    uniform vec3 uBaseColor;
    uniform vec3 uShallowColor;
    uniform vec3 uSkyColor;
    uniform vec3 uSunDirection;
    uniform vec3 uSunColor;
    uniform float uSunIntensity;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 normal = normalize(vNormal);

      // Fresnel approximation for water reflectivity
      float fresnel = clamp(1.0 - dot(viewDir, normal), 0.0, 1.0);
      fresnel = pow(fresnel, 3.5);

      // Base water depth tint
      vec3 deepWater = uBaseColor;
      vec3 shallowWater = uShallowColor;
      vec3 waterColor = mix(deepWater, shallowWater, fresnel * 0.5);

      // Sky reflection blend
      vec3 reflection = mix(waterColor, uSkyColor, fresnel * 0.75);

      // Blinn-Phong Specular glint from sun / moon
      vec3 halfDir = normalize(uSunDirection + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), 128.0);
      vec3 specularHighlight = uSunColor * spec * uSunIntensity * 2.2;

      gl_FragColor = vec4(reflection + specularHighlight, 0.94);
    }
  `;

  const uniforms = {
    uTime: { value: 0 },
    uBaseColor: { value: new THREE.Color(colors.waterBase) },
    uShallowColor: { value: new THREE.Color(colors.waterShallow) },
    uSkyColor: { value: new THREE.Color(0x8cb1d1) },
    uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.4).normalize() },
    uSunColor: { value: new THREE.Color(0xffffff) },
    uSunIntensity: { value: 1.0 }
  };

  const waterMaterial = new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: uniforms,
    transparent: true,
    depthWrite: true
  });

  // Flat horizontal river plane lying on the X-Z plane at Y = 0
  const riverGeo = new THREE.PlaneGeometry(river.lengthX, river.widthZ, 120, 80);
  riverGeo.rotateX(-Math.PI / 2); // Orient horizontal

  const riverMesh = new THREE.Mesh(riverGeo, waterMaterial);
  riverMesh.name = 'EastRiverWater';
  riverMesh.position.set(0, 0, 0);
  riverMesh.receiveShadow = true;
  scene.add(riverMesh);

  /**
   * Updates water wave animation and time-of-day reflection colors.
   */
  function update(delta, totalTime, isReducedMotion = false, lightingState = null) {
    if (!isReducedMotion) {
      uniforms.uTime.value = totalTime;
    }

    if (lightingState) {
      if (lightingState.skyColor) uniforms.uSkyColor.value.copy(lightingState.skyColor);
      if (lightingState.sunColor) uniforms.uSunColor.value.copy(lightingState.sunColor);
      if (lightingState.sunDirection) uniforms.uSunDirection.value.copy(lightingState.sunDirection);
      if (lightingState.sunIntensity !== undefined) uniforms.uSunIntensity.value = lightingState.sunIntensity;
    }
  }

  return {
    mesh: riverMesh,
    update
  };
}
