/**
 * @fileoverview Procedural 3D Manhattan Bridge for LifeBridge Hero Stage.
 *
 * Implements:
 * 1. Geometry mathematical functions (cable parabolic curve, vertical hangers, tower dimensions).
 * 2. Three.js procedural modeling (steel towers with X-bracing, 4 main cables, InstancedMesh hangers,
 *    deep side stiffening trusses, approach spans, water plane, rust-red sun accent).
 * 3. Interactive behaviors: slow auto-rotate, pointer drag orbit bounded above water, no zoom,
 *    arrow-key accessibility rotation, tab visibility & IntersectionObserver pausing, full disposal.
 */

/* ==========================================================================
   1. SEPARATE GEOMETRY MATHEMATICAL FUNCTIONS (Testable in Vitest & Node)
   ========================================================================== */

/**
 * Returns structural dimensions for the Manhattan Bridge steel towers.
 * @returns {{
 *   totalHeight: number,
 *   deckClearance: number,
 *   legWidth: number,
 *   legDepth: number,
 *   legSpacing: number,
 *   crossBracingCount: number,
 *   pierHeight: number,
 *   pierWidth: number,
 *   pierDepth: number
 * }}
 */
export function getTowerDimensions() {
  return {
    totalHeight: 48,       // Height of tower pinnacles above water (y = 0)
    deckClearance: 12,     // Height of roadway deck above water
    legWidth: 2.2,         // Width of each tower leg
    legDepth: 2.2,         // Depth of each tower leg
    legSpacing: 14,        // Distance between the two tower legs (along Z-axis)
    crossBracingCount: 4,  // Number of X-bracing bays between legs
    pierHeight: 4,         // Height of granite water piers
    pierWidth: 5.5,
    pierDepth: 19
  };
}

/**
 * Computes smooth parabolic points for the suspension cables across main and side spans.
 *
 * @param {Object} [options]
 * @param {number} [options.mainSpan=70] - Distance between the two suspension towers.
 * @param {number} [options.sideSpan=25] - Length of each side span to anchorage.
 * @param {number} [options.sag=22] - Vertical sag of the main cable at midspan.
 * @param {number} [options.towerTopY=48] - Peak cable saddle elevation.
 * @param {number} [options.deckY=12] - Roadway deck elevation.
 * @param {number} [options.numPoints=90] - Total resolution of curve sample points.
 * @returns {Array<{ x: number, y: number, z: number }>} Array of 3D coordinates.
 */
export function calculateCableCurve({
  mainSpan = 70,
  sideSpan = 25,
  sag = 22,
  towerTopY = 48,
  deckY = 12,
  numPoints = 90
} = {}) {
  const points = [];
  const t1X = -mainSpan / 2; // -35
  const t2X = mainSpan / 2;  // +35
  const anch1X = t1X - sideSpan; // -60
  const anch2X = t2X + sideSpan; // +60
  const anchY = deckY; // Cable enters anchorage near deck height

  const sidePoints = Math.max(8, Math.round(numPoints * (sideSpan / (mainSpan + 2 * sideSpan))));
  const mainPoints = Math.max(16, numPoints - 2 * sidePoints);

  // 1. Left side span: from left anchorage (-60, anchY) up to Tower 1 (-35, towerTopY)
  for (let i = 0; i <= sidePoints; i++) {
    const t = i / sidePoints;
    const x = anch1X + t * (t1X - anch1X);
    // Smooth sagging curve for side span
    const y = anchY + (towerTopY - anchY) * Math.pow(t, 1.25);
    points.push({ x, y, z: 0 });
  }

  // 2. Main span: from Tower 1 (-35) through center (x=0, y=towerTopY - sag) to Tower 2 (+35)
  const lowestY = towerTopY - sag; // 48 - 22 = 26
  for (let i = 1; i <= mainPoints; i++) {
    const t = i / mainPoints;
    const x = t1X + t * (t2X - t1X);
    const nx = x / (mainSpan / 2); // Normalized between -1 and 1
    const y = lowestY + sag * (nx * nx);
    points.push({ x, y, z: 0 });
  }

  // 3. Right side span: from Tower 2 (+35, towerTopY) down to right anchorage (+60, anchY)
  for (let i = 1; i <= sidePoints; i++) {
    const t = i / sidePoints;
    const x = t2X + t * (anch2X - t2X);
    const y = towerTopY - (towerTopY - anchY) * Math.pow(t, 0.8);
    points.push({ x, y, z: 0 });
  }

  return points;
}

/**
 * Calculates vertical hanger wire positions between the main cables and the deck.
 *
 * @param {Object} [options]
 * @param {number} [options.mainSpan=70]
 * @param {number} [options.towerTopY=48]
 * @param {number} [options.deckY=12]
 * @param {number} [options.sag=22]
 * @param {number} [options.spacing=2.5]
 * @param {number[]} [options.cableZOffsets=[-7, 7]]
 * @returns {Array<{
 *   x: number,
 *   y: number,
 *   z: number,
 *   height: number,
 *   topY: number,
 *   bottomY: number
 * }>}
 */
export function calculateHangerPositions({
  mainSpan = 70,
  towerTopY = 48,
  deckY = 12,
  sag = 22,
  spacing = 2.5,
  cableZOffsets = [-7, 7]
} = {}) {
  const hangers = [];
  const t1X = -mainSpan / 2;
  const t2X = mainSpan / 2;
  const lowestY = towerTopY - sag;
  const deckAttachmentY = deckY + 0.6; // Top of side stiffening truss

  // Place hangers along main span (excluding exact tower coordinates)
  for (let x = t1X + spacing; x <= t2X - spacing; x += spacing) {
    const nx = x / (mainSpan / 2);
    const cableY = lowestY + sag * (nx * nx);
    const height = cableY - deckAttachmentY;

    if (height > 0.5) {
      for (const z of cableZOffsets) {
        hangers.push({
          x,
          y: deckAttachmentY + height / 2,
          z,
          height,
          topY: cableY,
          bottomY: deckAttachmentY
        });
      }
    }
  }

  return hangers;
}

/* ==========================================================================
   2. THREE.JS RENDERING & PROCEDURAL MODELING
   ========================================================================== */

/**
 * Builds the Manhattan Bridge 3D procedural scene within the provided DOM container.
 *
 * @param {HTMLElement} container - Target container element in the hero.
 * @returns {Promise<() => void>} Cleanup disposal function.
 */
export async function initBridge3D(container) {
  if (!container) return () => {};

  // Clear existing content and set accessibility
  container.innerHTML = '';
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', 'Interactive 3D model of Manhattan Bridge suspension span and steel towers');
  if (!container.hasAttribute('tabindex')) {
    container.setAttribute('tabindex', '0');
  }

  // 1. Lazy-load Three.js (no CDN, self-hosted via npm)
  let THREE;
  try {
    THREE = await import('/vendor/three/three.module.js');
  } catch {
    try {
      THREE = await import('three');
    } catch (err) {
      console.warn('Three.js could not be loaded dynamically:', err);
      renderStaticFallback(container);
      return () => {};
    }
  }

  // Check prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scene dimensions
  let width = container.clientWidth || 500;
  let height = container.clientHeight || 500;

  // 2. Scene & Transparent WebGL Renderer
  const scene = new THREE.Scene();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (e) {
    console.warn('WebGL initialization failed, rendering static view:', e);
    renderStaticFallback(container);
    return () => {};
  }

  renderer.setClearColor(0x000000, 0); // Transparent background for bone ground
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  // 3. Perspective Camera framed so the whole bridge fits at a slight angle
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 1000);
  const targetLookAt = new THREE.Vector3(0, 15, 0);

  // Camera Orbit State (elevation strictly limited above water)
  let cameraRadius = 115;
  let azimuthAngle = 0.55;    // Slight 3/4 angle
  let polarAngle = 0.42;      // Elevated perspective looking down towards bridge
  const minPolarAngle = 0.12; // High elevation (~83° from horizon)
  const maxPolarAngle = 1.38; // Lower elevation (~11° above water plane, never below water!)

  function updateCameraPosition() {
    const x = cameraRadius * Math.sin(polarAngle) * Math.sin(azimuthAngle);
    const y = targetLookAt.y + cameraRadius * Math.cos(polarAngle);
    const z = cameraRadius * Math.sin(polarAngle) * Math.cos(azimuthAngle);
    camera.position.set(x, Math.max(y, 4), z); // Guard: always strictly above water
    camera.lookAt(targetLookAt);
  }
  updateCameraPosition();

  // 4. Lighting: Soft directional light and ambient fill
  const ambientLight = new THREE.AmbientLight(0xFFF7EC, 1.4);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xFFEBD4, 2.2);
  mainLight.position.set(70, 90, 60);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x8FA4B5, 0.9);
  fillLight.position.set(-60, 45, -50);
  scene.add(fillLight);

  // 5. Materials: Muted blue-grey steel and single rust-red accent
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x516475,
    roughness: 0.46,
    metalness: 0.65
  });

  const pierMat = new THREE.MeshStandardMaterial({
    color: 0xC8C2B3,
    roughness: 0.88,
    metalness: 0.12
  });

  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x415262,
    roughness: 0.38,
    metalness: 0.75
  });

  const hangerMat = new THREE.MeshStandardMaterial({
    color: 0x667888,
    roughness: 0.32,
    metalness: 0.82
  });

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x363F47,
    roughness: 0.8,
    metalness: 0.25
  });

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x8FA6B5,
    roughness: 0.22,
    metalness: 0.35,
    transparent: true,
    opacity: 0.55
  });

  const sunMat = new THREE.MeshBasicMaterial({
    color: 0x8F2B12 // Single rust-red accent sun
  });

  // Root group for all bridge geometry
  const bridgeGroup = new THREE.Group();
  scene.add(bridgeGroup);

  const towerDims = getTowerDimensions();
  const towerPositionsX = [-35, 35];

  // A. Two Steel Towers with two legs, X-bracing, top strut, and piers
  towerPositionsX.forEach((tx) => {
    // 1. Granite Pier in water
    const pierGeom = new THREE.BoxGeometry(towerDims.pierWidth, towerDims.pierHeight, towerDims.pierDepth);
    const pier = new THREE.Mesh(pierGeom, pierMat);
    pier.position.set(tx, towerDims.pierHeight / 2, 0);
    bridgeGroup.add(pier);

    // 2. Two Vertical Steel Tower Legs
    const legHeight = towerDims.totalHeight - towerDims.pierHeight;
    const legGeom = new THREE.BoxGeometry(towerDims.legWidth, legHeight, towerDims.legDepth);

    [-towerDims.legSpacing / 2, towerDims.legSpacing / 2].forEach((lz) => {
      const leg = new THREE.Mesh(legGeom, steelMat);
      leg.position.set(tx, towerDims.pierHeight + legHeight / 2, lz);
      bridgeGroup.add(leg);

      // Saddle cap on top
      const capGeom = new THREE.BoxGeometry(towerDims.legWidth * 1.3, 1.4, towerDims.legDepth * 1.3);
      const cap = new THREE.Mesh(capGeom, steelMat);
      cap.position.set(tx, towerDims.totalHeight + 0.7, lz);
      bridgeGroup.add(cap);
    });

    // 3. Top Horizontal Strut
    const topStrutGeom = new THREE.BoxGeometry(towerDims.legWidth * 1.1, 1.8, towerDims.legSpacing + towerDims.legDepth);
    const topStrut = new THREE.Mesh(topStrutGeom, steelMat);
    topStrut.position.set(tx, towerDims.totalHeight - 0.9, 0);
    bridgeGroup.add(topStrut);

    // 4. Intermediate Horizontal Strut above deck
    const midStrutGeom = new THREE.BoxGeometry(towerDims.legWidth * 0.9, 1.2, towerDims.legSpacing + towerDims.legDepth);
    const midStrut = new THREE.Mesh(midStrutGeom, steelMat);
    midStrut.position.set(tx, towerDims.deckClearance + 2.5, 0);
    bridgeGroup.add(midStrut);

    // 5. X-Bracing Bays between legs
    const bayStartY = towerDims.deckClearance + 3.5;
    const bayEndY = towerDims.totalHeight - 2.5;
    const bayHeight = (bayEndY - bayStartY) / towerDims.crossBracingCount;
    const braceLength = Math.sqrt(Math.pow(towerDims.legSpacing, 2) + Math.pow(bayHeight, 2));

    for (let b = 0; b < towerDims.crossBracingCount; b++) {
      const yCenter = bayStartY + (b + 0.5) * bayHeight;
      const angle = Math.atan2(bayHeight, towerDims.legSpacing);

      // Strut 1
      const brace1Geom = new THREE.BoxGeometry(0.7, 0.7, braceLength);
      const brace1 = new THREE.Mesh(brace1Geom, steelMat);
      brace1.position.set(tx, yCenter, 0);
      brace1.rotation.x = angle;
      bridgeGroup.add(brace1);

      // Strut 2
      const brace2Geom = new THREE.BoxGeometry(0.7, 0.7, braceLength);
      const brace2 = new THREE.Mesh(brace2Geom, steelMat);
      brace2.position.set(tx, yCenter, 0);
      brace2.rotation.x = -angle;
      bridgeGroup.add(brace2);
    }
  });

  // B. Main Suspension Cables (Two cables per side: North pair and South pair)
  const cablePointsBase = calculateCableCurve({
    mainSpan: 70,
    sideSpan: 25,
    sag: 22,
    towerTopY: towerDims.totalHeight,
    deckY: towerDims.deckClearance,
    numPoints: 90
  });

  // Cable offsets (two per side)
  const cableOffsets = [
    { z: -7.2, radius: 0.32 },
    { z: -6.6, radius: 0.32 },
    { z: 6.6, radius: 0.32 },
    { z: 7.2, radius: 0.32 }
  ];

  cableOffsets.forEach(({ z, radius }) => {
    const v3Points = cablePointsBase.map((p) => new THREE.Vector3(p.x, p.y, z));
    const curve = new THREE.CatmullRomCurve3(v3Points);
    const cableGeom = new THREE.TubeGeometry(curve, 100, radius, 8, false);
    const cableMesh = new THREE.Mesh(cableGeom, cableMat);
    bridgeGroup.add(cableMesh);
  });

  // C. Thin Vertical Hangers (ONE InstancedMesh for maximum efficiency)
  const hangerData = calculateHangerPositions({
    mainSpan: 70,
    towerTopY: towerDims.totalHeight,
    deckY: towerDims.deckClearance,
    sag: 22,
    spacing: 2.5,
    cableZOffsets: [-6.9, 6.9]
  });

  const hangerBaseGeom = new THREE.CylinderGeometry(0.08, 0.08, 1, 6);
  const hangerInstancedMesh = new THREE.InstancedMesh(hangerBaseGeom, hangerMat, hangerData.length);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();

  hangerData.forEach((h, idx) => {
    position.set(h.x, h.y, h.z);
    scale.set(1, h.height, 1);
    matrix.compose(position, quaternion, scale);
    hangerInstancedMesh.setMatrixAt(idx, matrix);
  });
  hangerInstancedMesh.instanceMatrix.needsUpdate = true;
  bridgeGroup.add(hangerInstancedMesh);

  // D. Roadway Deck with Deep Side Stiffening Trusses
  const totalDeckLength = 120; // from -60 to +60
  const deckWidth = 15;
  const deckThickness = 1.0;

  const deckSlabGeom = new THREE.BoxGeometry(totalDeckLength, deckThickness, deckWidth);
  const deckSlab = new THREE.Mesh(deckSlabGeom, deckMat);
  deckSlab.position.set(0, towerDims.deckClearance, 0);
  bridgeGroup.add(deckSlab);

  // Deep Lattice Trusses along both edges of the deck
  const trussDepth = 3.2;
  const trussZPositions = [-deckWidth / 2 + 0.3, deckWidth / 2 - 0.3];

  trussZPositions.forEach((tz) => {
    // Top chord
    const topChordGeom = new THREE.BoxGeometry(totalDeckLength, 0.5, 0.5);
    const topChord = new THREE.Mesh(topChordGeom, steelMat);
    topChord.position.set(0, towerDims.deckClearance + trussDepth, tz);
    bridgeGroup.add(topChord);

    // Bottom chord
    const btmChordGeom = new THREE.BoxGeometry(totalDeckLength, 0.5, 0.5);
    const btmChord = new THREE.Mesh(btmChordGeom, steelMat);
    btmChord.position.set(0, towerDims.deckClearance + 0.3, tz);
    bridgeGroup.add(btmChord);

    // Vertical posts along truss
    const postCount = 48;
    const postSpacing = totalDeckLength / postCount;
    const postGeom = new THREE.BoxGeometry(0.3, trussDepth, 0.3);
    for (let p = 0; p <= postCount; p++) {
      const px = -totalDeckLength / 2 + p * postSpacing;
      const post = new THREE.Mesh(postGeom, steelMat);
      post.position.set(px, towerDims.deckClearance + trussDepth / 2, tz);
      bridgeGroup.add(post);
    }
  });

  // E. Approach Spans & Anchorages
  [-60, 60].forEach((ax) => {
    const anchGeom = new THREE.BoxGeometry(8, 14, 18);
    const anch = new THREE.Mesh(anchGeom, pierMat);
    anch.position.set(ax, 7, 0);
    bridgeGroup.add(anch);
  });

  // F. Flat Water Plane at y = 0
  const waterGeom = new THREE.PlaneGeometry(240, 140);
  const water = new THREE.Mesh(waterGeom, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0, 0);
  bridgeGroup.add(water);

  // G. Rust-Red Accent: Minimalist Japanese/Editorial Sun Sphere in the sky
  const sunGeom = new THREE.SphereGeometry(4.8, 32, 32);
  const sunMesh = new THREE.Mesh(sunGeom, sunMat);
  sunMesh.position.set(-42, 45, -45);
  bridgeGroup.add(sunMesh);

  // 6. Interactive Drag-to-Orbit (Limits: Never Below Water, No Zoom)
  let isDragging = false;
  let previousMouseX = 0;
  let previousMouseY = 0;
  let isPaused = false;
  let animFrameId = null;

  function onPointerDown(e) {
    isDragging = true;
    previousMouseX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    previousMouseY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    container.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const deltaX = clientX - previousMouseX;
    const deltaY = clientY - previousMouseY;

    // Azimuth rotation
    azimuthAngle -= deltaX * 0.007;

    // Elevation angle (clamped strictly above water level)
    polarAngle += deltaY * 0.007;
    polarAngle = Math.max(minPolarAngle, Math.min(maxPolarAngle, polarAngle));

    previousMouseX = clientX;
    previousMouseY = clientY;
    updateCameraPosition();
  }

  function onPointerUp() {
    isDragging = false;
    container.style.cursor = 'grab';
  }

  // Prevent scroll zoom inside container
  function onWheel(e) {
    // Intentionally no zoom - allows natural page scrolling without trapping user
  }

  // Arrow key rotation for accessibility
  function onKeyDown(e) {
    let handled = false;
    if (e.key === 'ArrowLeft') {
      azimuthAngle += 0.06;
      handled = true;
    } else if (e.key === 'ArrowRight') {
      azimuthAngle -= 0.06;
      handled = true;
    } else if (e.key === 'ArrowUp') {
      polarAngle = Math.max(minPolarAngle, polarAngle - 0.04);
      handled = true;
    } else if (e.key === 'ArrowDown') {
      polarAngle = Math.min(maxPolarAngle, polarAngle + 0.04);
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      updateCameraPosition();
      renderer.render(scene, camera);
    }
  }

  container.style.cursor = 'grab';
  container.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  container.addEventListener('wheel', onWheel, { passive: true });
  container.addEventListener('keydown', onKeyDown);

  // 7. Responsive Resizing
  function onResize() {
    if (!container) return;
    width = container.clientWidth || 500;
    height = container.clientHeight || 500;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', onResize);

  // 8. Visibility and IntersectionObserver Pausing
  function handleVisibilityChange() {
    isPaused = document.visibilityState === 'hidden';
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);

  let observer = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isPaused = !entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);
  }

  // 9. Animation Loop (Slow Auto-Rotate unless prefers-reduced-motion)
  function animate() {
    animFrameId = requestAnimationFrame(animate);

    if (isPaused) return;

    if (!prefersReducedMotion && !isDragging) {
      azimuthAngle += 0.0025; // Gentle cinematic auto-rotate
      updateCameraPosition();
    }

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    // Single static render frame
    updateCameraPosition();
    renderer.render(scene, camera);
  } else {
    animate();
  }

  // 10. Cleanup & Resource Disposal on Unmount
  return function cleanup() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (observer) observer.disconnect();

    // Traverse and dispose geometries and materials
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  };
}

/**
 * Fallback visual when WebGL is unavailable.
 * @param {HTMLElement} container
 */
function renderStaticFallback(container) {
  container.innerHTML = `
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:transparent;">
      <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" style="max-width:90%;max-height:80%;">
        <line x1="20" y1="160" x2="380" y2="160" stroke="#363F47" stroke-width="4"/>
        <line x1="120" y1="40" x2="120" y2="180" stroke="#516475" stroke-width="6"/>
        <line x1="280" y1="40" x2="280" y2="180" stroke="#516475" stroke-width="6"/>
        <path d="M 40 160 Q 120 40 200 110 Q 280 40 360 160" stroke="#415262" stroke-width="3" fill="none"/>
        <circle cx="80" cy="70" r="14" fill="#8F2B12"/>
      </svg>
    </div>
  `;
}
