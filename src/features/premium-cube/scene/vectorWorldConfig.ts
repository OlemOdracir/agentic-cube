// Central visual contract for every vector world.
// Geometry can differ per world, but color, glow, depth, motion and density
// should be tuned here so new backgrounds inherit the same artistic direction.

export const VECTOR_WORLD_STYLE = {
  background: '#08050d',
  lineColorRgb: [0x74 / 255, 0x45 / 255, 0xff / 255] as const,
  particleColor: '#9d7bff',
  horizonGlowColor: '#7956ff',
  lampGlowColor: '#f3f2f8',
  whiteCore: 'rgba(255,255,255,1)',
  violetMid: 'rgba(220,210,255,0.55)',
  transparent: 'rgba(0,0,0,0)',
} as const

export const VECTOR_WORLD_RENDERING = {
  lineGlobalIntensity: 0.6,
  pointSizeFactor: 30.0,
  pointAlphaBase: 0.32,
  pointAlphaCrest: 0.42,
  crestBoostLow: -0.2,
  crestBoostHigh: 0.85,
  depthFadeNear: 4.0,
  depthFadeFar: 20.0,
} as const

export const VECTOR_WORLD_PRESETS = {
  wave: {
    label: 'WAVE-FIELD',
    caption: '?bg=only - plexus topography - particles + distance lines',
    camera: { position: [0, 0.55, 4.6] as const, fov: 48, near: 0.1, far: 80 },
    fog: { near: 9, far: 28 },
    field: {
      particleCols: 85,
      particleRows: 51,
      fieldWidth: 32,
      fieldDepth: 28,
      jitterRatio: 0.32,
      lineDistanceRatio: 1.85,
      neighborRadiusCells: 2,
      maxLineSegments: 32000,
      waveTimeScale: 0.45,
      horizonGlowOpacity: 0.2,
      parallaxX: 0.035,
      parallaxZ: 0.025,
      octaves: [
        [0.36, 0, 0.6, 0, 0.16],
        [0, 0.44, 0.78, 1.3, 0.2],
        [0.7, 0.55, 1.05, 0.8, 0.15],
        [1.15, 0, 1.45, 0, 0.09],
        [0, 1.32, 1.3, 2.1, 0.09],
        [1.9, -1.9, 1.85, 0, 0.06],
        [2.4, -1.9, 2.2, 0.4, 0.05],
      ] as ReadonlyArray<readonly [number, number, number, number, number]>,
    },
  },
  city: {
    label: 'CITY-CORRIDOR',
    caption: '?bg=city - vector street - lamp glow',
    camera: { position: [0, 1.9, 10.8] as const, fov: 52, near: 0.1, far: 80 },
    fog: { near: 14, far: 40 },
    field: {
      farZ: -28,
      nearZ: 13,
      roadRows: 64,
      roadCols: 19,
      buildingCountPerSide: 18,
      treeCountPerSide: 11,
      vehicleCount: 6,
      corridorSpeed: 0.82,
      roadHalfWidthFar: 0.72,
      roadHalfWidthNear: 2.45,
      sidewalkBands: 3,
      lampCurbOffset: 0.22,
      lampGlowSizeMultiplier: 5.6,
      skylineGroundY: -1.0,
      skylineXSpan: 13,
      skylineIntensity: 0.34,
      skylineLayers: [
        [-44, 0.4],
        [-39, 0.62],
        [-34, 0.85],
      ] as ReadonlyArray<readonly [number, number]>,
    },
  },
} as const

export const VECTOR_WORLD_SECTION_BACKGROUNDS = {
  systems: {
    world: 'city',
    position: [0, 0.1, -13] as const,
    scale: 1,
    skylineDepthTest: true,
    fogLines: false,
  },
} as const

export type VectorWorldPreset = keyof typeof VECTOR_WORLD_PRESETS
