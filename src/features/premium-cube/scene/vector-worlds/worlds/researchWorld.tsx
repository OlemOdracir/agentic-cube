import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { VectorPlexusField } from '../base/VectorPlexusField'
import { createVectorLineMaterial } from '../base/materials'
import { makeSeededRandom } from '../base/textures'
import { VECTOR_WORLD_THEME } from '../base/theme'
import type { WorldProps } from '../types'

// ── Local coordinate convention ───────────────────────────────────────────────
// The containing group applies rotation [-Math.PI / 2.1, 0, 0], which tilts
// the local XY plane to appear horizontal in world space.
//   Local X = left / right   (unchanged in world)
//   Local Y = near / far     (depth into the scene)
//   Local Z = up / down      (displacement — same axis as the plexus field)
//
// Everything in this file (heightmap, trees, shrubs) uses this convention so
// the geometry aligns with the plexus surface without any coordinate transforms.

const FIELD_WIDTH = 56 // local X span
const FIELD_DEPTH = 36 // local Y span (near → far)
const FIELD_COLS  = 90
const FIELD_ROWS  = 72

// yNorm: 0 = near foreground, 1 = far background
const YNORM = (y: number) =>
  Math.max(0, Math.min(1, (y + FIELD_DEPTH / 2) / FIELD_DEPTH))

const LINE_COLOR = VECTOR_WORLD_THEME.lineColorRgb
const LINE_GLOBAL_INTENSITY = VECTOR_WORLD_THEME.lineGlobalIntensity
// Trees/shrubs use the same line-darkness principle as the plexus base.
const TREE_LINE_SCALE = LINE_GLOBAL_INTENSITY * 0.24

// ── Terrain displacement ──────────────────────────────────────────────────────
// Passed to VectorPlexusField as the displacement function.
// Returns local Z (height) for a point at local (x, y).

const HEIGHT_OCTAVES: ReadonlyArray<readonly [number, number, number]> = [
  [0.20, 0.17, 0.08],
  [0.44, 0.38, 0.05],
  [0.88, 0.76, 0.025],
]
const BASE_Z      = -1.5
const MOUNTAIN_START = 0.58
const MOUNTAIN_END   = 0.92
const MOUNTAIN_AMP   = 5.2
const MOUNTAIN_FX    = 0.26
const MOUNTAIN_FY    = 0.16
const FLATTEN_END    = 0.22

function mountainBand(yNorm: number): number {
  if (yNorm <= MOUNTAIN_START || yNorm >= MOUNTAIN_END) return 0
  const span  = MOUNTAIN_END - MOUNTAIN_START
  const local = (yNorm - MOUNTAIN_START) / span
  return Math.sin(local * Math.PI)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function terrainDisplacement(x: number, y: number, _t?: number): number {
  const yNorm = YNORM(y)

  let h = 0
  for (const [fx, fy, amp] of HEIGHT_OCTAVES) {
    h += Math.sin(fx * x + 0.3 * fy * y) * amp
  }

  // Flatten foreground — level ground between camera and horizon.
  const flatMult = Math.min(1, Math.max(0, yNorm / FLATTEN_END))
  h *= flatMult

  // Sharpened mountain peaks in the far band.
  const band     = mountainBand(yNorm)
  const peakBase = Math.sin(MOUNTAIN_FX * x + 0.7) * Math.cos(MOUNTAIN_FY * y)
  const peakShape = Math.pow(Math.max(0, peakBase), 1.6) * 1.8
  h += band * peakShape * MOUNTAIN_AMP

  return BASE_Z + h
}

// ── Tree geometry ─────────────────────────────────────────────────────────────
// Araucaria araucana: vertical trunk along local Z + tiered umbrella canopies
// spreading in the local XY plane. Same visual logic as before, Z↔Y swapped.

const ARAUCARIAS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [-6.4,  -13.1, 1.15, 6, 7, 0x9a51],
  [ 6.4,  -12.9, 1.1,  6, 7, 0x8b62],
  [-11.0,  -8.7, 0.75, 5, 6, 0x7c73],
  [ 10.4,  -8.3, 0.78, 5, 6, 0x6d84],
  [ -3.4,  -5.1, 0.55, 4, 5, 0x5e95],
  [  3.8,  -4.8, 0.55, 4, 5, 0x4fa6],
  [-15.0,   0.2, 0.42, 4, 5, 0x30b7],
  [ 14.0,   0.7, 0.44, 4, 5, 0x21c8],
  [ -8.2,  -2.0, 0.45, 4, 5, 0x41d9],
  [  8.6,  -1.6, 0.47, 4, 5, 0x52ea],
]

function buildAraucaria(
  cx: number, cy: number,
  scale: number, layerCount: number, branchesPerLayer: number, seed: number,
) {
  const rand = makeSeededRandom(seed)
  const positions: number[] = []
  const colors: number[]    = []

  const baseZ       = terrainDisplacement(cx, cy) + 0.02
  const trunkHeight = (3.0 + rand() * 1.4) * scale
  const apexZ       = baseZ + trunkHeight
  const nearTopZ    = baseZ + trunkHeight * 0.97

  function seg(
    dx1: number, dy1: number, z1: number,
    dx2: number, dy2: number, z2: number,
    br: number,
  ) {
    positions.push(cx + dx1, cy + dy1, z1, cx + dx2, cy + dy2, z2)
    const i = br * TREE_LINE_SCALE
    colors.push(
      LINE_COLOR[0] * i, LINE_COLOR[1] * i, LINE_COLOR[2] * i,
      LINE_COLOR[0] * i, LINE_COLOR[1] * i, LINE_COLOR[2] * i,
    )
  }

  // Trunk spine + 4 radial verticals for wireframe volume.
  seg(0, 0, baseZ, 0, 0, nearTopZ, 0.92)
  const tr = 0.06 * scale
  seg(-tr, 0, baseZ, -tr * 0.5, 0, baseZ + trunkHeight * 0.92, 0.62)
  seg( tr, 0, baseZ,  tr * 0.5, 0, baseZ + trunkHeight * 0.92, 0.62)
  seg(0, -tr, baseZ, 0, -tr * 0.5, baseZ + trunkHeight * 0.92, 0.5)
  seg(0,  tr, baseZ, 0,  tr * 0.5, baseZ + trunkHeight * 0.92, 0.5)

  // Root flare in XY plane.
  for (let a = 0; a < 4; a += 1) {
    const ang = (a / 4) * Math.PI * 2 + 0.4
    seg(0, 0, baseZ, Math.cos(ang) * 0.13 * scale, Math.sin(ang) * 0.13 * scale, baseZ, 0.4)
  }

  // Tiered umbrella canopies — the araucaria silhouette.
  for (let layer = 0; layer < layerCount; layer += 1) {
    const layerT      = (layer + 1) / layerCount
    const layerZ      = baseZ + trunkHeight * (0.32 + layerT * 0.62)
    const taper       = 1 - layerT * 0.55
    const branchLen   = (0.85 + rand() * 0.25) * scale * taper
    const canopyR     = branchLen * 0.36
    const droop       = -0.08 - rand() * 0.07
    const jitter      = (rand() - 0.5) * 0.22

    for (let b = 0; b < branchesPerLayer; b += 1) {
      const ang  = (b / branchesPerLayer) * Math.PI * 2 + layer * 0.42 + jitter
      const tipX = Math.cos(ang) * branchLen
      const tipY = Math.sin(ang) * branchLen
      const tipZ = layerZ + droop * branchLen

      seg(0, 0, layerZ, tipX, tipY, tipZ, 0.66)

      const segs = 6
      const ring: Array<[number, number, number]> = []
      for (let s = 0; s < segs; s += 1) {
        const sa = (s / segs) * Math.PI * 2 + ang
        ring.push([tipX + Math.cos(sa) * canopyR, tipY + Math.sin(sa) * canopyR, tipZ - 0.015 * scale])
      }
      for (let s = 0; s < segs; s += 1) {
        const [x1, y1, z1] = ring[s]
        const [x2, y2, z2] = ring[(s + 1) % segs]
        seg(x1 - cx, y1 - cy, z1, x2 - cx, y2 - cy, z2, 0.58)
      }
      for (let s = 0; s < segs; s += 2) {
        const [rx, ry, rz] = ring[s]
        seg(tipX, tipY, tipZ, rx - cx, ry - cy, rz - 0.04 * scale, 0.46)
      }
      seg(tipX, tipY, tipZ, tipX, tipY, tipZ - canopyR * 0.42, 0.34)
    }
  }

  // Apex tuft.
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2
    seg(0, 0, nearTopZ, Math.cos(a) * 0.08 * scale, Math.sin(a) * 0.08 * scale, apexZ, 0.6)
  }

  return { positions, colors }
}

function buildShrub(cx: number, cy: number, scale: number, seed: number) {
  const rand = makeSeededRandom(seed)
  const positions: number[] = []
  const colors: number[]    = []

  const baseZ  = terrainDisplacement(cx, cy) + 0.01
  const blades = 6 + Math.floor(rand() * 4)
  const height = (0.22 + rand() * 0.14) * scale

  function seg(
    dx1: number, dy1: number, z1: number,
    dx2: number, dy2: number, z2: number,
    br: number,
  ) {
    positions.push(cx + dx1, cy + dy1, z1, cx + dx2, cy + dy2, z2)
    const intensity = br * TREE_LINE_SCALE
    colors.push(
      LINE_COLOR[0] * intensity, LINE_COLOR[1] * intensity, LINE_COLOR[2] * intensity,
      LINE_COLOR[0] * intensity, LINE_COLOR[1] * intensity, LINE_COLOR[2] * intensity,
    )
  }

  for (let b = 0; b < blades; b += 1) {
    const angle  = rand() * Math.PI * 2
    const lean   = 0.5 + rand() * 0.5
    const length = height * (0.7 + rand() * 0.7)
    const startX = (rand() - 0.5) * 0.16 * scale
    const startY = (rand() - 0.5) * 0.16 * scale
    const tipX   = startX + Math.cos(angle) * length * (1 - lean) * 1.3
    const tipY   = startY + Math.sin(angle) * length * (1 - lean) * 1.3
    const tipZ   = baseZ + length * lean
    seg(startX, startY, baseZ, tipX, tipY, tipZ, 0.45 + rand() * 0.4)
  }

  return { positions, colors }
}

// ── React component ──────────────────────────────────────────────────────────

export function ResearchWorld({
  position = [0, -1.5, -13],
  rotation = [-Math.PI / 2.1, 0, 0],
}: WorldProps = {}) {
  const treesData = useMemo(() => {
    const positions: number[] = []
    const colors: number[]    = []
    for (const [x, y, s, layers, branches, seed] of ARAUCARIAS) {
      const tree = buildAraucaria(x, y, s, layers, branches, seed)
      positions.push(...tree.positions)
      colors.push(...tree.colors)
    }
    return { positions: new Float32Array(positions), colors: new Float32Array(colors) }
  }, [])

  const shrubsData = useMemo(() => {
    const positions: number[] = []
    const colors: number[]    = []
    const rand = makeSeededRandom(0xd1f17b3)
    for (let i = 0; i < 60; i += 1) {
      const x    = (rand() - 0.5) * 34
      const y    = -19 + rand() * 16          // local Y: near → mid
      const s    = 0.7 + rand() * 0.5
      const shrub = buildShrub(x, y, s, Math.floor(rand() * 0xffff))
      positions.push(...shrub.positions)
      colors.push(...shrub.colors)
    }
    return { positions: new Float32Array(positions), colors: new Float32Array(colors) }
  }, [])

  const treesGeometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(treesData.positions, 3))
    g.setAttribute('color',    new BufferAttribute(treesData.colors, 3))
    return g
  }, [treesData])

  const shrubsGeometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(shrubsData.positions, 3))
    g.setAttribute('color',    new BufferAttribute(shrubsData.colors, 3))
    return g
  }, [shrubsData])

  const vegMaterial = useMemo(
    () => createVectorLineMaterial({ fog: true, depthTest: true, depthWrite: false }),
    [],
  )

  return (
    <group position={position as [number, number, number]} rotation={rotation as [number, number, number]}>
      {/* Plexus base — same grid, same points, same line logic as agenticWorld */}
      <VectorPlexusField
        displacement={terrainDisplacement}
        animated={false}
        width={FIELD_WIDTH}
        depth={FIELD_DEPTH}
        cols={FIELD_COLS}
        rows={FIELD_ROWS}
        horizonGlow
        parallax={false}
      />
      {/* Vegetation in same local coordinate space (X=left/right, Y=depth, Z=up) */}
      <lineSegments geometry={treesGeometry}  material={vegMaterial} />
      <lineSegments geometry={shrubsGeometry} material={vegMaterial} />
    </group>
  )
}
