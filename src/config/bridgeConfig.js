/**
 * @fileoverview Engineering parameters, dimensions, and color palettes for the Manhattan Bridge 3D model.
 * Real-world proportions scaled in metric meters (1 unit = 1 meter).
 * @module config/bridgeConfig
 */

export const CAMERA_PRESETS = Object.freeze({
  aerial: {
    name: 'Aerial View',
    position: [0, 160, 360],
    target: [0, 45, 0],
    description: 'High elevation birds-eye view showing both towers, 4 cables, and East River'
  },
  walkway: {
    name: 'Walkway View',
    position: [-180, 43.5, 17.2],
    target: [0, 44, 17.2],
    description: 'Pedestrian walkway perspective looking through the steel stiffening truss'
  },
  brooklyn: {
    name: 'Brooklyn / DUMBO',
    position: [320, 25, 140],
    target: [120, 50, 0],
    description: 'Iconic Washington St / DUMBO perspective framing the Brooklyn tower'
  },
  underSpan: {
    name: 'Under the Span',
    position: [0, 6, 90],
    target: [0, 42, 0],
    description: 'Water-level view looking up at the double-deck substructure and rippling river'
  }
});

export const BRIDGE_FACTS = Object.freeze([
  { label: 'Opened', value: 'December 31, 1909' },
  { label: 'Chief Engineer', value: 'Othniel Foster Nichols & Leon Moisseiff' },
  { label: 'Consulting Architects', value: 'Carrère and Hastings (Beaux-Arts Colonnade)' },
  { label: 'Main Span Length', value: '1,470 ft (448 m)' },
  { label: 'Total Length', value: '6,855 ft (2,089 m)' },
  { label: 'Tower Height', value: '336 ft (102 m) above mean high water' },
  { label: 'Engineering Innovation', value: 'First suspension bridge built using Josef Melan’s Deflection Theory' },
  { label: 'Subway Routes', value: 'B, D, N, Q trains (4 outer cantilever tracks)' },
  { label: 'Daily Traffic', value: '~80,000 vehicles, 450,000 transit riders, 6,000 cyclists' },
  { label: 'Official Color', value: 'Manhattan Bridge Blue (Federal Standard 595b #25184)' }
]);

export const BRIDGE_CONFIG = Object.freeze({
  // Dimensions and coordinates
  dimensions: {
    mainSpanLength: 448.0,
    sideSpanLength: 226.0,
    totalLength: 2089.0,
    scale: 1.0
  },

  towers: {
    manhattanX: -224.0,
    brooklynX: 224.0,
    totalHeight: 102.0,
    saddleElevation: 101.0,
    pierBaseY: -4.0,
    pierTopY: 10.0,
    legSpacingZ: 28.0,
    legWidthX: 4.5,
    legWidthZ: 4.5
  },

  cables: {
    cableCount: 4,
    zOffsets: [-16.8, -15.0, 15.0, 16.8],
    cableRadius: 0.35,
    midspanElevation: 53.0,
    manhattanAnchorX: -450.0,
    brooklynAnchorX: 450.0,
    anchorageCableY: 26.0,
    hangerSpacing: 6.0,
    hangerRadius: 0.06
  },

  deck: {
    totalWidth: 36.6,
    trussDepth: 8.5,
    roadwayElevation: 40.0,
    camberCrown: 2.2,
    subwayTracksCount: 4,
    roadwayLanes: 7,
    walkwayWidth: 3.5
  },

  approaches: {
    manhattanAnchorX: -450.0,
    brooklynAnchorX: 450.0,
    manhattanEnd: -560.0,
    brooklynEnd: 560.0,
    archX: -490.0
  },

  colors: {
    bridgeSteel: 0x4d7287, // Manhattan Bridge Blue
    bridgeSteelDark: 0x385566,
    bridgeSteelLight: 0x648fa8,
    cables: 0x8a9fa8,
    hangers: 0x9cb0b8,
    roadwayAsphalt: 0x222426,
    roadwayMarkings: 0xe0e0e0,
    walkwayWood: 0x5a534c,
    subwayTracks: 0x38393b,
    subwayTrainBody: 0xc8d0d6,
    subwayTrainWindows: 0xfae29c,
    granitePiers: 0x8f8c85,
    beauxArtsStone: 0xbaa493,
    waterBase: 0x132a3d,
    waterShallow: 0x1d3f57,
    nightCableLights: 0xffefb8,
    nightStreetLamps: 0xffd27d,
    carHeadlights: 0xfff9e6,
    carTaillights: 0xff2211
  },

  traffic: {
    carCount: 48,
    carSpeedMin: 12.0,
    carSpeedMax: 18.0,
    trainCarsPerConsist: 6,
    trainLength: 120.0,
    trainSpeed: 16.0
  },

  river: {
    widthZ: 1200.0,
    lengthX: 1800.0
  },

  skyline: {
    manhattanCount: 75,
    brooklynCount: 60,
    manhattanXStart: -520.0,
    brooklynXStart: 520.0
  },

  historicalFacts: BRIDGE_FACTS
});
