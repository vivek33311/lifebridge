/**
 * @file geometryMath.js
 * @description Pure mathematical and geometric calculations for the Manhattan Bridge.
 * Independent of rendering engine (no Three.js dependency) for high testability and determinism.
 */

/**
 * Calculates elevation Y on the main central parabolic suspension cable.
 * Curve: y = 4 * sag / (L^2) * (x - midX)^2 + midY
 * 
 * @param {number} x - Current X position along the span
 * @param {number} towerX1 - X coordinate of Manhattan tower (left)
 * @param {number} towerX2 - X coordinate of Brooklyn tower (right)
 * @param {number} saddleY - Cable elevation at the tower saddles (meters)
 * @param {number} midY - Cable elevation at midspan dip (meters)
 * @returns {number} Elevation Y in meters
 */
export function calculateMainCableY(x, towerX1, towerX2, saddleY, midY) {
  const midX = (towerX1 + towerX2) / 2;
  const span = Math.abs(towerX2 - towerX1);
  const sag = saddleY - midY;
  const dx = x - midX;
  return midY + (4 * sag / (span * span)) * (dx * dx);
}

/**
 * Calculates elevation Y on side span cables (from tower saddle down to anchorage).
 * Parabolic or catenary approximation smoothly connecting saddle to anchor.
 * 
 * @param {number} x - Current X position
 * @param {number} towerX - Tower saddle X position
 * @param {number} anchorX - Anchorage entry X position
 * @param {number} saddleY - Tower saddle elevation Y
 * @param {number} anchorY - Anchorage entry elevation Y
 * @param {number} sagFactor - Slight natural cable droop ratio (typically 0.1 to 0.2)
 * @returns {number} Elevation Y in meters
 */
export function calculateSideCableY(x, towerX, anchorX, saddleY, anchorY, sagFactor = 0.12) {
  const t = (x - towerX) / (anchorX - towerX);
  // Linear baseline
  const linearY = saddleY + t * (anchorY - saddleY);
  // Parabolic natural sag: maximum at t = 0.5
  const sag = 4 * sagFactor * Math.abs(saddleY - anchorY) * t * (1 - t);
  return linearY - sag;
}

/**
 * Calculates vertical deck camber elevation.
 * Real bridges possess a gentle parabolic crown for drainage and thermal expansion.
 * 
 * @param {number} x - Current X position
 * @param {number} spanStart - Start X coordinate
 * @param {number} spanEnd - End X coordinate
 * @param {number} baseY - Base roadway elevation (meters)
 * @param {number} camberCrown - Maximum camber height at midspan (meters)
 * @returns {number} Camber elevation Y in meters
 */
export function calculateDeckCamber(x, spanStart, spanEnd, baseY, camberCrown = 1.8) {
  const midX = (spanStart + spanEnd) / 2;
  const halfSpan = Math.abs(spanEnd - spanStart) / 2;
  const dist = Math.abs(x - midX);
  if (dist > halfSpan) return baseY;
  const normalized = dist / halfSpan;
  return baseY + camberCrown * (1 - normalized * normalized);
}

/**
 * Generates regular hanger cable attachment points along a span.
 * 
 * @param {Object} options
 * @param {number} options.startX - Starting X coordinate for hangers
 * @param {number} options.endX - Ending X coordinate for hangers
 * @param {number} options.spacing - Distance between adjacent hangers in meters
 * @param {Function} options.cableYFn - Function mapping x => cable Y
 * @param {Function} options.deckYFn - Function mapping x => deck Y
 * @param {number} [options.offsetZ=0] - Z offset coordinate for this cable line
 * @returns {Array<{x: number, yBottom: number, yTop: number, z: number, height: number}>}
 */
export function generateHangerCoordinates({
  startX,
  endX,
  spacing,
  cableYFn,
  deckYFn,
  offsetZ = 0
}) {
  if (spacing <= 0) throw new Error('Spacing must be strictly positive');
  if (startX >= endX) throw new Error('startX must be less than endX');

  const hangers = [];
  const spanLength = endX - startX;
  const count = Math.floor(spanLength / spacing);
  const actualSpacing = spanLength / (count + 1);

  for (let i = 1; i <= count; i++) {
    const x = startX + i * actualSpacing;
    const yTop = cableYFn(x);
    const yBottom = deckYFn(x);
    const height = Math.max(0.1, yTop - yBottom);

    hangers.push({
      x,
      yBottom,
      yTop,
      z: offsetZ,
      height
    });
  }

  return hangers;
}

/**
 * Generates key sample points along the full length of a main suspension cable.
 * Covers: Manhattan anchorage -> Tower 1 -> Midspan -> Tower 2 -> Brooklyn anchorage.
 * 
 * @param {Object} config - Bridge dimension configuration
 * @param {number} samplesPerSegment - Number of curve sample vertices
 * @returns {Array<{x: number, y: number}>}
 */
export function generateFullCableProfile(config, samplesPerSegment = 40) {
  const points = [];
  const { towers, cables, deck } = config;
  const anchorY = deck.roadwayElevation - 4;

  // Segment 1: Manhattan anchorage to Tower 1
  for (let i = 0; i <= samplesPerSegment; i++) {
    const t = i / samplesPerSegment;
    const x = cables.manhattanAnchorX + t * (towers.manhattanX - cables.manhattanAnchorX);
    const y = calculateSideCableY(x, towers.manhattanX, cables.manhattanAnchorX, towers.saddleElevation, anchorY);
    points.push({ x, y });
  }

  // Segment 2: Tower 1 to Tower 2 (Main Span)
  for (let i = 1; i <= samplesPerSegment; i++) {
    const t = i / samplesPerSegment;
    const x = towers.manhattanX + t * (towers.brooklynX - towers.manhattanX);
    const y = calculateMainCableY(x, towers.manhattanX, towers.brooklynX, towers.saddleElevation, cables.midspanElevation);
    points.push({ x, y });
  }

  // Segment 3: Tower 2 to Brooklyn anchorage
  for (let i = 1; i <= samplesPerSegment; i++) {
    const t = i / samplesPerSegment;
    const x = towers.brooklynX + t * (cables.brooklynAnchorX - towers.brooklynX);
    const y = calculateSideCableY(x, towers.brooklynX, cables.brooklynAnchorX, towers.saddleElevation, anchorY);
    points.push({ x, y });
  }

  return points;
}
