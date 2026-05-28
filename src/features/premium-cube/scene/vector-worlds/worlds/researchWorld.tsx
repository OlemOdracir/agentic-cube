import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, MeshBasicMaterial } from 'three'
import { createDepthPointMaterial, createVectorLineMaterial } from '../base/materials'
import { createDotTexture, makeSeededRandom } from '../base/textures'
import { VECTOR_WORLD_THEME } from '../base/theme'
import type { WorldProps } from '../types'

// ── World-local config ────────────────────────────────────────────────────────
// Starlit nightscape: low-poly violet terrain with araucarias and shrubs.
// Star trails will be added in a separate pass once the páramo is approved.

const CONFIG = {
  // Terrain (procedural triangulated wireframe with solid backdrop)
  terrainCols: 76,
  terrainRows: 64,
  terrainXSpan: 56,
  terrainZNear: -1.5, // stops behind the cube so embedded mode is not occluded
  terrainZFar: -42,   // farther back so mountains sit on a real horizon line
  terrainBaseY: -1.5,
  // Subtle octave noise for rolling foreground; mountain band handles peaks.
  heightOctaves: [
    [0.20, 0.17, 0.08],
    [0.44, 0.38, 0.05],
    [0.88, 0.76, 0.025],
  ] as ReadonlyArray<readonly [number, number, number]>,
  // Foreground is level — no big bumps between camera and horizon.
  foregroundFlattenStart: 0.0,
  foregroundFlattenEnd: 0.22,
  // Mountains occupy the far third — sharp silhouettes on the horizon.
  mountainBandStart: 0.58,
  mountainBandEnd: 0.92,
  mountainPeakAmp: 5.2,
  mountainFreqX: 0.26,
  mountainFreqZ: 0.16,
  terrainFillColor: '#04060e',

  // Araucarias: [x, z, scale, layerCount, branchesPerLayer, seed]
  // Multiple depth layers — foreground anchors + midground + near mountain base.
  araucarias: [
    [-6.4,  -7.0,  1.15, 6, 7, 0x9a51],
    [ 6.4,  -7.2,  1.1,  6, 7, 0x8b62],
    [-11.0, -12.0, 0.75, 5, 6, 0x7c73],
    [ 10.4, -12.4, 0.78, 5, 6, 0x6d84],
    [-3.4,  -16.0, 0.55, 4, 5, 0x5e95],
    [ 3.8,  -16.4, 0.55, 4, 5, 0x4fa6],
    [-15.0, -22.0, 0.42, 4, 5, 0x30b7],
    [ 14.0, -22.5, 0.44, 4, 5, 0x21c8],
    [-8.2,  -19.5, 0.45, 4, 5, 0x41d9],
    [ 8.6,  -20.0, 0.47, 4, 5, 0x52ea],
  ] as ReadonlyArray<readonly [number, number, number, number, number, number]>,

  // Shrubs scattered across the rolling terrain.
  shrubCount: 60,
  shrubXSpread: 34,
  shrubZRange: [-18, -2.5] as const,
} as const

const LINE_COLOR = VECTOR_WORLD_THEME.lineColorRgb
const LINE_GLOBAL_INTENSITY = VECTOR_WORLD_THEME.lineGlobalIntensity
// Lines are intentionally dark — points carry the luminosity, same as agenticWorld.
// 0.22 keeps lines in the 0.05–0.13 intensity band, matching the wave visual grammar.
const LINE_SCALE = LINE_GLOBAL_INTENSITY * 0.22

// ── Shared heightmap ──────────────────────────────────────────────────────────
// Single source of truth: terrain mesh, araucarias, and shrubs all sample this
// so vegetation never floats above the ground.

function mountainBand(zNorm: number): number {
  if (zNorm <= CONFIG.mountainBandStart || zNorm >= CONFIG.mountainBandEnd) return 0
  const span = CONFIG.mountainBandEnd - CONFIG.mountainBandStart
  const local = (zNorm - CONFIG.mountainBandStart) / span
  return Math.sin(local * Math.PI)
}

function sampleTerrainHeight(x: number, z: number): number {
  // zNorm = 0 near (foreground), 1 far (back of scene)
  const zNorm = Math.max(
    0,
    Math.min(1, (CONFIG.terrainZNear - z) / (CONFIG.terrainZNear - CONFIG.terrainZFar)),
  )

  let h = 0
  for (const [fx, fz, amp] of CONFIG.heightOctaves) {
    h += Math.sin(fx * x + 0.3 * fz * z) * amp
  }

  // Flatten foreground so the area between camera and horizon reads as level.
  const flattenSpan = CONFIG.foregroundFlattenEnd - CONFIG.foregroundFlattenStart
  const flatMult = Math.min(
    1,
    Math.max(0, (zNorm - CONFIG.foregroundFlattenStart) / flattenSpan),
  )
  h *= flatMult

  // Sharpened peaks: pow(max(sin, 0), 1.6) gives triangular silhouettes.
  const band = mountainBand(zNorm)
  const peakBase = Math.sin(CONFIG.mountainFreqX * x + 0.7) * Math.cos(CONFIG.mountainFreqZ * z)
  const peakShape = Math.pow(Math.max(0, peakBase), 1.6) * 1.8
  h += band * peakShape * CONFIG.mountainPeakAmp

  return CONFIG.terrainBaseY + h
}

// ── Geometry generators ───────────────────────────────────────────────────────

// Low-poly triangulated terrain. Flat foreground, mountain peaks in the
// midground band. Renders as wireframe over a solid fill for clean facets.
function buildTerrain() {
  const cols = CONFIG.terrainCols
  const rows = CONFIG.terrainRows
  const heights = new Float32Array(rows * cols)
  const xs = new Float32Array(cols)
  const zs = new Float32Array(rows)

  for (let c = 0; c < cols; c += 1) {
    xs[c] = -CONFIG.terrainXSpan / 2 + (c / (cols - 1)) * CONFIG.terrainXSpan
  }
  for (let r = 0; r < rows; r += 1) {
    const zNorm = r / (rows - 1)
    zs[r] = CONFIG.terrainZFar + zNorm * (CONFIG.terrainZNear - CONFIG.terrainZFar)
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      heights[r * cols + c] = sampleTerrainHeight(xs[c], zs[r])
    }
  }

  const positions: number[] = []
  const colors: number[] = []

  function vertex(r: number, c: number): [number, number, number] {
    return [xs[c], heights[r * cols + c], zs[r]]
  }

  function brightnessFor(r: number, _c: number): number {
    // Lines fade only with depth — no height boost here.
    // Height contrast is handled by the point material shader (position.y → size/alpha).
    const zNorm = 1 - r / (rows - 1) // 0 = near, 1 = far
    const horizonFade = zNorm < 0.45 ? 1 : Math.max(0, 1 - (zNorm - 0.45) / 0.55)
    return horizonFade
  }

  function addEdge(r1: number, c1: number, r2: number, c2: number) {
    const [x1, y1, z1] = vertex(r1, c1)
    const [x2, y2, z2] = vertex(r2, c2)
    const b1 = brightnessFor(r1, c1) * LINE_SCALE
    const b2 = brightnessFor(r2, c2) * LINE_SCALE
    positions.push(x1, y1, z1, x2, y2, z2)
    colors.push(
      LINE_COLOR[0] * b1, LINE_COLOR[1] * b1, LINE_COLOR[2] * b1,
      LINE_COLOR[0] * b2, LINE_COLOR[1] * b2, LINE_COLOR[2] * b2,
    )
  }

  // Horizontal edges
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) addEdge(r, c, r, c + 1)
  }
  // Depth edges
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols; c += 1) addEdge(r, c, r + 1, c)
  }
  // Diagonals — triangulation reads clearly
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) addEdge(r, c, r + 1, c + 1)
  }

  // Solid mesh: same height field, two triangles per cell.
  // depthWrite=true so the fill occludes anything behind the terrain surface.
  const meshPositions = new Float32Array(rows * cols * 3)
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const base = (r * cols + c) * 3
      meshPositions[base]     = xs[c]
      meshPositions[base + 1] = heights[r * cols + c]
      meshPositions[base + 2] = zs[r]
    }
  }
  const meshIndices: number[] = []
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const a  =  r      * cols +  c
      const b  =  r      * cols + (c + 1)
      const cc = (r + 1) * cols + (c + 1)
      const d  = (r + 1) * cols +  c
      meshIndices.push(a, b, cc, a, cc, d)
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    meshPositions,
    meshIndices: new Uint32Array(meshIndices),
  }
}

// Procedural araucaria: vertical trunk + tiered umbrella canopies.
// Araucaria araucana (Patagonian endemic) has a distinctive flat-shelf silhouette.
function buildAraucaria(
  centerX: number,
  centerZ: number,
  scale: number,
  layerCount: number,
  branchesPerLayer: number,
  seed: number,
) {
  const rand = makeSeededRandom(seed)
  const positions: number[] = []
  const colors: number[] = []

  const baseY = sampleTerrainHeight(centerX, centerZ) + 0.02
  const trunkHeight = (3.0 + rand() * 1.4) * scale
  const apexY = baseY + trunkHeight
  const nearTopY = baseY + trunkHeight * 0.97

  function addEdge(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    brightness: number,
  ) {
    positions.push(centerX + x1, y1, centerZ + z1, centerX + x2, y2, centerZ + z2)
    const intensity = brightness * LINE_SCALE
    const r = LINE_COLOR[0] * intensity
    const g = LINE_COLOR[1] * intensity
    const b = LINE_COLOR[2] * intensity
    colors.push(r, g, b, r, g, b)
  }

  // Trunk spine + 4 cardinal verticals for wireframe volume.
  addEdge(0, baseY, 0, 0, nearTopY, 0, 0.92)
  const trunkR = 0.06 * scale
  addEdge(-trunkR, baseY, 0, -trunkR * 0.5, baseY + trunkHeight * 0.92, 0, 0.62)
  addEdge( trunkR, baseY, 0,  trunkR * 0.5, baseY + trunkHeight * 0.92, 0, 0.62)
  addEdge(0, baseY, -trunkR, 0, baseY + trunkHeight * 0.92, -trunkR * 0.5, 0.5)
  addEdge(0, baseY,  trunkR, 0, baseY + trunkHeight * 0.92,  trunkR * 0.5, 0.5)

  // Root flare
  for (let a = 0; a < 4; a += 1) {
    const ang = (a / 4) * Math.PI * 2 + 0.4
    addEdge(0, baseY, 0, Math.cos(ang) * 0.13 * scale, baseY, Math.sin(ang) * 0.13 * scale, 0.4)
  }

  // Tiered umbrella canopies — the araucaria silhouette.
  for (let layer = 0; layer < layerCount; layer += 1) {
    const layerT = (layer + 1) / layerCount
    const layerY = baseY + trunkHeight * (0.32 + layerT * 0.62)
    const taper = 1 - layerT * 0.55
    const branchLen = (0.85 + rand() * 0.25) * scale * taper
    const canopyRadius = branchLen * 0.36
    const branchDroop = -0.08 - rand() * 0.07
    const layerJitter = (rand() - 0.5) * 0.22

    for (let b = 0; b < branchesPerLayer; b += 1) {
      const angle = (b / branchesPerLayer) * Math.PI * 2 + layer * 0.42 + layerJitter
      const ax = Math.cos(angle) * trunkR * 0.6
      const az = Math.sin(angle) * trunkR * 0.6
      const tipX = Math.cos(angle) * branchLen
      const tipZ = Math.sin(angle) * branchLen
      const tipY = layerY + branchDroop * branchLen

      addEdge(ax, layerY, az, tipX, tipY, tipZ, 0.66)

      // 6-node umbrella ring at branch tip + sparse struts to centre.
      const segs = 6
      const ringNodes: Array<[number, number, number]> = []
      for (let s = 0; s < segs; s += 1) {
        const sa = (s / segs) * Math.PI * 2 + angle
        ringNodes.push([
          tipX + Math.cos(sa) * canopyRadius,
          tipY - 0.015 * scale,
          tipZ + Math.sin(sa) * canopyRadius,
        ])
      }
      for (let s = 0; s < segs; s += 1) {
        const [x1, y1, z1] = ringNodes[s]
        const [x2, y2, z2] = ringNodes[(s + 1) % segs]
        addEdge(x1, y1, z1, x2, y2, z2, 0.58)
      }
      for (let s = 0; s < segs; s += 2) {
        const [rx, ry, rz] = ringNodes[s]
        addEdge(tipX, tipY, tipZ, rx, ry - 0.04 * scale, rz, 0.46)
      }
      // Fringe drop — gives the umbrella some weight.
      addEdge(tipX, tipY, tipZ, tipX, tipY - canopyRadius * 0.42, tipZ, 0.34)
    }
  }

  // Apex tuft.
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2
    addEdge(
      0, nearTopY, 0,
      Math.cos(a) * 0.08 * scale, apexY, Math.sin(a) * 0.08 * scale,
      0.6,
    )
  }

  return { positions, colors }
}

function buildShrub(centerX: number, centerZ: number, scale: number, seed: number) {
  const rand = makeSeededRandom(seed)
  const positions: number[] = []
  const colors: number[] = []

  const baseY = sampleTerrainHeight(centerX, centerZ) + 0.01
  const blades = 6 + Math.floor(rand() * 4)
  const height = (0.22 + rand() * 0.14) * scale

  function addEdge(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    brightness: number,
  ) {
    positions.push(centerX + x1, y1, centerZ + z1, centerX + x2, y2, centerZ + z2)
    const intensity = brightness * LINE_SCALE
    const r = LINE_COLOR[0] * intensity
    const g = LINE_COLOR[1] * intensity
    const b = LINE_COLOR[2] * intensity
    colors.push(r, g, b, r, g, b)
  }

  for (let b = 0; b < blades; b += 1) {
    const angle = rand() * Math.PI * 2
    const lean = 0.5 + rand() * 0.5
    const length = height * (0.7 + rand() * 0.7)
    const startX = (rand() - 0.5) * 0.16 * scale
    const startZ = (rand() - 0.5) * 0.16 * scale
    const tipX = startX + Math.cos(angle) * length * (1 - lean) * 1.3
    const tipZ = startZ + Math.sin(angle) * length * (1 - lean) * 1.3
    const tipY = baseY + length * lean
    addEdge(startX, baseY, startZ, tipX, tipY, tipZ, 0.45 + rand() * 0.4)
  }

  return { positions, colors }
}

// ── React component ──────────────────────────────────────────────────────────

export function ResearchWorld({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: WorldProps = {}) {
  const dotTexture = useMemo(() => createDotTexture(), [])
  const terrainData = useMemo(() => buildTerrain(), [])

  const treesData = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []
    for (const [x, z, s, layers, branches, seed] of CONFIG.araucarias) {
      const tree = buildAraucaria(x, z, s, layers, branches, seed)
      positions.push(...tree.positions)
      colors.push(...tree.colors)
    }
    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
    }
  }, [])

  const shrubsData = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []
    const rand = makeSeededRandom(0xd1f17b3)
    for (let i = 0; i < CONFIG.shrubCount; i += 1) {
      const x = (rand() - 0.5) * CONFIG.shrubXSpread
      const z = CONFIG.shrubZRange[0] + rand() * (CONFIG.shrubZRange[1] - CONFIG.shrubZRange[0])
      const s = 0.7 + rand() * 0.5
      const shrub = buildShrub(x, z, s, Math.floor(rand() * 0xffff))
      positions.push(...shrub.positions)
      colors.push(...shrub.colors)
    }
    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
    }
  }, [])

  const terrainGeometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(terrainData.positions, 3))
    g.setAttribute('color', new BufferAttribute(terrainData.colors, 3))
    return g
  }, [terrainData])

  const terrainFillGeometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(terrainData.meshPositions, 3))
    g.setIndex(new BufferAttribute(terrainData.meshIndices, 1))
    return g
  }, [terrainData])

  // Points subsampled every 2nd row/col — same visual density as agenticWorld particles.
  // All 4,864 vertices is too dense; ~1,200 gives the right luminous-dot grammar.
  const terrainPointsGeometry = useMemo(() => {
    const stride = 2
    const sampled: number[] = []
    for (let r = 0; r < CONFIG.terrainRows; r += stride) {
      for (let c = 0; c < CONFIG.terrainCols; c += stride) {
        const base = (r * CONFIG.terrainCols + c) * 3
        sampled.push(
          terrainData.meshPositions[base],
          terrainData.meshPositions[base + 1],
          terrainData.meshPositions[base + 2],
        )
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(sampled), 3))
    return g
  }, [terrainData])

  const treesGeometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(treesData.positions, 3))
    g.setAttribute('color', new BufferAttribute(treesData.colors, 3))
    return g
  }, [treesData])

  const shrubsGeometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(shrubsData.positions, 3))
    g.setAttribute('color', new BufferAttribute(shrubsData.colors, 3))
    return g
  }, [shrubsData])

  const groundMaterial = useMemo(
    () => createVectorLineMaterial({ fog: true, depthTest: true, depthWrite: false }),
    [],
  )

  // Luminous point sprites at terrain intersections — same visual language as agenticWorld.
  // pointSizeFactor tuned to match wave dot size at typical viewing distance.
  // depthFar covers full terrain depth (camera z≈7, terrain far z≈-42 → ~49 units).
  const pointMaterial = useMemo(
    () => createDepthPointMaterial({ dotTexture, pointSizeFactor: 20, depthNear: 5.0, depthFar: 52.0 }),
    [dotTexture],
  )

  // Solid fill writes depth first so the wireframe lines on top render correctly.
  // Color matches the scene background so fill cells are invisible — only the
  // wireframe edges are seen.
  const terrainFillMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: CONFIG.terrainFillColor,
        fog: true,
        depthWrite: true,
        depthTest: true,
      }),
    [],
  )

  return (
    <group position={position} rotation={rotation as [number, number, number]} scale={scale}>
      {/* Fill renders first to write depth buffer — everything else reads it. */}
      <mesh geometry={terrainFillGeometry} material={terrainFillMaterial} renderOrder={-1} />
      {/* Dark wireframe — structure only */}
      <lineSegments geometry={terrainGeometry} material={groundMaterial} />
      <lineSegments geometry={treesGeometry} material={groundMaterial} />
      <lineSegments geometry={shrubsGeometry} material={groundMaterial} />
      {/* Luminous points at every terrain intersection — same visual grammar as agenticWorld */}
      <points geometry={terrainPointsGeometry} material={pointMaterial} />
    </group>
  )
}
