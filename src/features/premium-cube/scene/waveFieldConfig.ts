// ─────────────────────────────────────────────────────────────────────────────
// Wave-field tunable configuration
// Edit this file to adjust the appearance and feel of the background.
// ─────────────────────────────────────────────────────────────────────────────

// ── Grid & field ─────────────────────────────────────────────────────────────
export const PARTICLE_COLS = 85          // columns of particles
export const PARTICLE_ROWS = 51          // rows of particles
export const FIELD_WIDTH = 32            // world-unit width of the grid
export const FIELD_DEPTH = 28            // world-unit depth of the grid
export const JITTER_RATIO = 0.32         // random offset per particle (0=grid, 1=full-cell)

// ── Lines ─────────────────────────────────────────────────────────────────────
export const LINE_DISTANCE_RATIO = 1.85  // connect particles within this × avg cell size
export const NEIGHBOR_RADIUS_CELLS = 2   // grid cells to scan per particle (perf knob)
export const MAX_LINE_SEGMENTS = 32000   // hard cap on simultaneous line segments
export const LINE_GLOBAL_INTENSITY = 0.6 // master dimmer for all lines (0..1)

// ── Wave animation ────────────────────────────────────────────────────────────
export const WAVE_TIME_SCALE = 0.45      // global speed multiplier (higher = faster)

// Six additive sine octaves. Each row: [freqX, freqY, freqT, phase, amplitude]
// freqX / freqY: spatial frequency along each axis
// freqT: temporal multiplier (applied after WAVE_TIME_SCALE)
// phase: initial phase offset in radians
// amplitude: peak displacement in world units
export const WAVE_OCTAVES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  // [freqX,  freqY,  freqT,  phase,  amp ]
  [  0.36,   0,      0.60,   0,      0.16 ],  // primary swell (X)
  [  0,      0.44,   0.78,   1.30,   0.20 ],  // primary swell (Y)
  [  0.70,   0.55,   1.05,   0.80,   0.15 ],  // diagonal cross
  [  1.15,   0,      1.45,   0,      0.09 ],  // chop X
  [  0,      1.32,   1.30,   2.10,   0.09 ],  // chop Y
  [  1.90,  -1.90,   1.85,   0,      0.06 ],  // fine diagonal   (freqY used as -freqX for x−y)
  [  2.40,  -1.90,   2.20,   0.40,   0.05 ],  // noise
]

// ── Colors ────────────────────────────────────────────────────────────────────
export const PARTICLE_COLOR = '#9d7bff'
export const LINE_COLOR_RGB: readonly [number, number, number] = [
  0x74 / 255,
  0x45 / 255,
  0xff / 255,
]
export const HORIZON_GLOW_COLOR = '#7956ff'

// ── Particle appearance ───────────────────────────────────────────────────────
export const POINT_SIZE_FACTOR = 30.0    // base point size (divided by depth in shader)
export const POINT_ALPHA_BASE  = 0.32    // minimum alpha per particle
export const POINT_ALPHA_CREST = 0.42    // extra alpha at wave crest
export const CREST_BOOST_LOW   = -0.2    // height below which crest effect is zero
export const CREST_BOOST_HIGH  =  0.85   // height above which crest effect is full

// ── Depth fade ────────────────────────────────────────────────────────────────
export const DEPTH_FADE_NEAR = 4.0       // start fading at this distance from camera
export const DEPTH_FADE_FAR  = 20.0      // fully faded at this distance

// ── Horizon glow plane ────────────────────────────────────────────────────────
export const HORIZON_GLOW_OPACITY = 0.2  // master opacity of the back-light mesh

// ── Parallax ─────────────────────────────────────────────────────────────────
export const PARALLAX_X = 0.035          // roll (rotation.z) per pointer.x unit
export const PARALLAX_Z = 0.025          // depth shift (position.z) per pointer.y unit
