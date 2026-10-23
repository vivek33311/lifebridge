/**
 * @fileoverview Pure geometry math functions for the 3D Manhattan Bridge model.
 * Provides parabolic cable calculations, vertical hanger positions, and tower dimensions.
 * Completely decoupled from Three.js and DOM for fast, offline unit testing.
 * @module ui/bridgeGeometry
 */

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
