import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LineBasicMaterial,
  LinearFilter,
  LineSegments,
  Points,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import {
  DEPTH_FADE_FAR,
  DEPTH_FADE_NEAR,
  LINE_COLOR_RGB,
  LINE_GLOBAL_INTENSITY,
  PARTICLE_COLOR,
  POINT_ALPHA_BASE,
  POINT_ALPHA_CREST,
  POINT_SIZE_FACTOR,
} from './waveFieldConfig'

const FAR_Z = -28
// Recycle point sits behind the camera (city camera is at z≈10.8) so the
// wrap-around happens off-screen: elements fly past and exit at the frame
// edges instead of snapping back toward the center while still visible.
const NEAR_Z = 13
const DEPTH = NEAR_Z - FAR_Z
const ROAD_ROWS = 64
const ROAD_COLS = 19
const BUILDING_COUNT_PER_SIDE = 18
const TREE_COUNT_PER_SIDE = 11
const SKYLINE_TOWER_COUNT = 13
const CORRIDOR_SPEED = 0.82
const ROAD_HALF_WIDTH_FAR = 0.72
const ROAD_HALF_WIDTH_NEAR = 2.45
const SIDEWALK_BANDS = 3
const LAMP_CURB_OFFSET = 0.22

// Lamp glow appearance
const LAMP_GLOW_COLOR = '#f3f2f8'
const LAMP_GLOW_SIZE_FACTOR = POINT_SIZE_FACTOR * 5.6

type CityNode =
  | {
      kind: 'road'
      row: number
      col: number
      x: number
    }
  | {
      kind: 'sidewalk'
      row: number
      side: -1 | 1
      band: number
    }
  | {
      kind: 'building'
      baseZ: number
      centerX: number
      localX: number
      localY: number
      localZ: number
      speed: number
    }
  | {
      kind: 'tree'
      baseZ: number
      centerX: number
      localX: number
      localY: number
      localZ: number
      speed: number
    }
  | {
      kind: 'lamp'
      baseZ: number
      side: -1 | 1
      localX: number
      localY: number
      localZ: number
    }
  | {
      kind: 'skyline'
      x: number
      y: number
      z: number
      phase: number
    }

type LinePair = {
  a: number
  b: number
  strength: number
}

function wrapDepth(z: number) {
  return FAR_Z + ((((z - FAR_Z) % DEPTH) + DEPTH) % DEPTH)
}

function roadHalfWidth(near: number) {
  return ROAD_HALF_WIDTH_FAR + near * (ROAD_HALF_WIDTH_NEAR - ROAD_HALF_WIDTH_FAR)
}

function lateralScale(near: number) {
  return 0.72 + near * 0.22
}

function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function createDotTexture() {
  const s = 64
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.34, 'rgba(220,210,255,0.55)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, s, s)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  return texture
}

function createGlowTexture() {
  const s = 128
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,0.92)')
  gradient.addColorStop(0.12, 'rgba(230,218,255,0.48)')
  gradient.addColorStop(0.4, 'rgba(160,130,255,0.13)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, s, s)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  return texture
}

function CameraLookAt() {
  const target = useMemo(() => new Vector3(0, 0.04, -8.5), [])
  useFrame(({ camera }) => {
    camera.lookAt(target)
  })
  return null
}

function buildCityGraph() {
  const nodes: CityNode[] = []
  const pairs: LinePair[] = []
  const roadIndex: number[][] = []
  const sidewalkIndex: Record<-1 | 1, number[][]> = { '-1': [], 1: [] }
  const lampHeadIndices: number[] = []

  for (let row = 0; row < ROAD_ROWS; row += 1) {
    roadIndex[row] = []
    const roadWidth = roadHalfWidth(row / (ROAD_ROWS - 1))
    for (let col = 0; col < ROAD_COLS; col += 1) {
      const x = -roadWidth + (col / (ROAD_COLS - 1)) * roadWidth * 2
      roadIndex[row][col] = nodes.push({ kind: 'road', row, col, x }) - 1
    }
  }

  for (const side of [-1, 1] as const) {
    for (let row = 0; row < ROAD_ROWS; row += 1) {
      sidewalkIndex[side][row] = []
      for (let band = 0; band < SIDEWALK_BANDS; band += 1) {
        sidewalkIndex[side][row][band] = nodes.push({ kind: 'sidewalk', row, side, band }) - 1
      }
    }
  }

  for (let row = 0; row < ROAD_ROWS; row += 1) {
    for (let col = 0; col < ROAD_COLS - 1; col += 1) {
      pairs.push({ a: roadIndex[row][col], b: roadIndex[row][col + 1], strength: 0.52 })
    }
  }
  for (let col = 0; col < ROAD_COLS; col += 1) {
    for (let row = 0; row < ROAD_ROWS - 1; row += 1) {
      const isCurb = col === 0 || col === ROAD_COLS - 1
      const isCenter = col === Math.floor(ROAD_COLS / 2)
      pairs.push({ a: roadIndex[row][col], b: roadIndex[row + 1][col], strength: isCurb ? 1.08 : isCenter ? 0.72 : 0.3 })
    }
  }
  for (const side of [-1, 1] as const) {
    for (let row = 0; row < ROAD_ROWS - 1; row += 1) {
      for (let band = 0; band < SIDEWALK_BANDS; band += 1) {
        pairs.push({
          a: sidewalkIndex[side][row][band],
          b: sidewalkIndex[side][row + 1][band],
          strength: band === 0 ? 1.18 : band === 2 ? 0.78 : 0.36,
        })
      }
    }
    for (let row = 0; row < ROAD_ROWS; row += 4) {
      for (let band = 0; band < SIDEWALK_BANDS - 1; band += 1) {
        pairs.push({
          a: sidewalkIndex[side][row][band],
          b: sidewalkIndex[side][row][band + 1],
          strength: 0.24,
        })
      }
    }
  }

  const rand = seeded(0x5157c17)
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < BUILDING_COUNT_PER_SIDE; i += 1) {
      const width = 0.85 + rand() * 1.2
      const depth = 0.9 + rand() * 1.55
      const height = 1.6 + rand() * 3.8
      const levels = 6 + Math.floor(rand() * 7)
      const centerX = side * (1.84 + rand() * 1.36)
      const baseZ = FAR_Z + (i / BUILDING_COUNT_PER_SIDE) * DEPTH
      const speed = CORRIDOR_SPEED
      const frontGrid: number[][] = []
      const rearGrid: number[][] = []
      const frontX = side > 0 ? -width / 2 : width / 2
      const rearX = -frontX

      for (let level = 0; level <= levels; level += 1) {
        frontGrid[level] = []
        rearGrid[level] = []
        const y = -1.02 + (level / levels) * height
        const horizontalCells = 4
        for (let cell = 0; cell <= horizontalCells; cell += 1) {
          const localY = y
          const localZ = -depth / 2 + (cell / horizontalCells) * depth
          frontGrid[level][cell] =
            nodes.push({
              kind: 'building',
              baseZ,
              centerX,
              localX: frontX,
              localY,
              localZ,
              speed,
            }) - 1
          rearGrid[level][cell] =
            nodes.push({
              kind: 'building',
              baseZ,
              centerX,
              localX: rearX,
              localY,
              localZ,
              speed,
            }) - 1
        }
      }

      for (let level = 0; level <= levels; level += 1) {
        for (let corner = 0; corner < frontGrid[level].length - 1; corner += 1) {
          pairs.push({
            a: frontGrid[level][corner],
            b: frontGrid[level][corner + 1],
            strength: level === levels ? 0.58 : 0.34,
          })
          pairs.push({
            a: rearGrid[level][corner],
            b: rearGrid[level][corner + 1],
            strength: level === levels ? 0.36 : 0.22,
          })
          if (level < levels) {
            pairs.push({
              a: frontGrid[level][corner],
              b: frontGrid[level + 1][corner],
              strength: 0.46,
            })
            pairs.push({
              a: rearGrid[level][corner],
              b: rearGrid[level + 1][corner],
              strength: 0.28,
            })
          }
        }
      }
      for (let level = 0; level < levels; level += 1) {
        const last = frontGrid[level].length - 1
        pairs.push({ a: frontGrid[level][0], b: frontGrid[level + 1][0], strength: 0.46 })
        pairs.push({ a: frontGrid[level][last], b: frontGrid[level + 1][last], strength: 0.46 })
        pairs.push({ a: rearGrid[level][0], b: rearGrid[level + 1][0], strength: 0.26 })
        pairs.push({ a: rearGrid[level][last], b: rearGrid[level + 1][last], strength: 0.26 })
      }
      for (let level = 0; level <= levels; level += Math.max(1, Math.floor(levels / 4))) {
        const last = frontGrid[level].length - 1
        pairs.push({ a: frontGrid[level][0], b: rearGrid[level][0], strength: 0.38 })
        pairs.push({ a: frontGrid[level][last], b: rearGrid[level][last], strength: 0.38 })
      }
      for (const level of [0, levels]) {
        const last = frontGrid[level].length - 1
        for (let cell = 0; cell <= last; cell += 2) {
          pairs.push({ a: frontGrid[level][cell], b: rearGrid[level][cell], strength: level === levels ? 0.42 : 0.24 })
        }
      }
    }
  }

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < TREE_COUNT_PER_SIDE; i += 1) {
      const baseZ = FAR_Z + (i / TREE_COUNT_PER_SIDE) * DEPTH
      const centerX = side * (0.62 + rand() * 0.16)
      const speed = CORRIDOR_SPEED
      const trunkHeight = 0.72 + rand() * 0.28
      const canopyRadius = 0.42 + rand() * 0.18
      const trunkWidth = 0.055 + rand() * 0.025
      const planterRadius = canopyRadius * 0.34
      const trunkBottom = nodes.push({ kind: 'tree', baseZ, centerX, localX: 0, localY: -1.02, localZ: 0, speed }) - 1
      const trunkMid = nodes.push({ kind: 'tree', baseZ, centerX, localX: 0, localY: -1.02 + trunkHeight * 0.48, localZ: 0, speed }) - 1
      const trunkTop = nodes.push({ kind: 'tree', baseZ, centerX, localX: 0, localY: -1.02 + trunkHeight, localZ: 0, speed }) - 1
      const trunkLeftBottom =
        nodes.push({ kind: 'tree', baseZ, centerX, localX: -trunkWidth, localY: -1.02, localZ: -trunkWidth * 0.5, speed }) - 1
      const trunkLeftTop =
        nodes.push({ kind: 'tree', baseZ, centerX, localX: -trunkWidth * 0.62, localY: -1.02 + trunkHeight * 0.9, localZ: 0, speed }) - 1
      const trunkRightBottom =
        nodes.push({ kind: 'tree', baseZ, centerX, localX: trunkWidth, localY: -1.02, localZ: trunkWidth * 0.5, speed }) - 1
      const trunkRightTop =
        nodes.push({ kind: 'tree', baseZ, centerX, localX: trunkWidth * 0.62, localY: -1.02 + trunkHeight * 0.9, localZ: 0, speed }) - 1

      pairs.push({ a: trunkBottom, b: trunkMid, strength: 0.9 })
      pairs.push({ a: trunkMid, b: trunkTop, strength: 0.9 })
      pairs.push({ a: trunkLeftBottom, b: trunkLeftTop, strength: 0.64 })
      pairs.push({ a: trunkRightBottom, b: trunkRightTop, strength: 0.64 })
      pairs.push({ a: trunkLeftBottom, b: trunkRightBottom, strength: 0.42 })
      pairs.push({ a: trunkLeftTop, b: trunkRightTop, strength: 0.42 })

      const planterNodes: number[] = []
      for (const [localX, localZ] of [
        [-planterRadius, -planterRadius * 0.55],
        [planterRadius, -planterRadius * 0.55],
        [planterRadius, planterRadius * 0.55],
        [-planterRadius, planterRadius * 0.55],
      ] as const) {
        planterNodes.push(nodes.push({ kind: 'tree', baseZ, centerX, localX, localY: -1.035, localZ, speed }) - 1)
      }
      for (let p = 0; p < planterNodes.length; p += 1) {
        pairs.push({ a: planterNodes[p], b: planterNodes[(p + 1) % planterNodes.length], strength: 0.58 })
        pairs.push({ a: planterNodes[p], b: trunkBottom, strength: 0.28 })
      }

      for (const rootSide of [-1, 1] as const) {
        const root =
          nodes.push({
            kind: 'tree',
            baseZ,
            centerX,
            localX: rootSide * (canopyRadius * 0.36),
            localY: -1.02,
            localZ: rootSide * trunkWidth * 1.8,
            speed,
          }) - 1
        pairs.push({ a: trunkBottom, b: root, strength: 0.36 })
      }

      for (let ring = 0; ring < 2; ring += 1) {
        const ringNodes: number[] = []
        const radius = canopyRadius * (ring === 0 ? 1 : 0.62)
        const y = -1.02 + trunkHeight + ring * canopyRadius * 0.38
        const segments = 8
        for (let s = 0; s < segments; s += 1) {
          const angle = (s / segments) * Math.PI * 2
          const node =
            nodes.push({
              kind: 'tree',
              baseZ,
              centerX,
              localX: Math.cos(angle) * radius,
              localY: y + Math.sin(angle * 2) * 0.04,
              localZ: Math.sin(angle) * radius,
              speed,
            }) - 1
          ringNodes.push(node)
        }
        for (let s = 0; s < segments; s += 1) {
          pairs.push({ a: ringNodes[s], b: ringNodes[(s + 1) % segments], strength: 0.92 })
          pairs.push({ a: trunkTop, b: ringNodes[s], strength: ring === 0 ? 0.42 : 0.36 })
          if (s % 2 === 0) {
            pairs.push({ a: trunkMid, b: ringNodes[s], strength: 0.3 })
          }
          if (ring === 1) {
            pairs.push({ a: ringNodes[s], b: ringNodes[(s + 3) % segments], strength: 0.22 })
          }
        }
      }
    }
  }

  const lampDepths = [-25.6, -19.2, -12.8, -6.4, 0]
  for (const side of [-1, 1] as const) {
    for (const baseZ of lampDepths) {
      const xOffset = 0.28
      const poleHeight = 1.42
      const armLength = 0.3
      const poleBase =
        nodes.push({ kind: 'lamp', baseZ, side, localX: xOffset, localY: -1.02, localZ: 0 }) - 1
      const poleMid =
        nodes.push({ kind: 'lamp', baseZ, side, localX: xOffset, localY: -1.02 + poleHeight * 0.52, localZ: 0 }) - 1
      const poleTop =
        nodes.push({ kind: 'lamp', baseZ, side, localX: xOffset, localY: -1.02 + poleHeight, localZ: 0 }) - 1
      const armEnd =
        nodes.push({ kind: 'lamp', baseZ, side, localX: xOffset - armLength, localY: -1.02 + poleHeight * 0.93, localZ: 0 }) - 1
      const lampHead =
        nodes.push({ kind: 'lamp', baseZ, side, localX: xOffset - armLength * 1.18, localY: -1.02 + poleHeight * 0.82, localZ: 0 }) - 1
      const baseLeft =
        nodes.push({ kind: 'lamp', baseZ, side, localX: xOffset - 0.08, localY: -1.02, localZ: -0.08 }) - 1
      const baseRight =
        nodes.push({ kind: 'lamp', baseZ, side, localX: xOffset + 0.08, localY: -1.02, localZ: 0.08 }) - 1

      lampHeadIndices.push(lampHead)

      pairs.push({ a: poleBase, b: poleMid, strength: 0.86 })
      pairs.push({ a: poleMid, b: poleTop, strength: 0.86 })
      pairs.push({ a: poleTop, b: armEnd, strength: 0.76 })
      pairs.push({ a: armEnd, b: lampHead, strength: 1.12 })
      pairs.push({ a: baseLeft, b: poleBase, strength: 0.42 })
      pairs.push({ a: baseRight, b: poleBase, strength: 0.42 })
      pairs.push({ a: baseLeft, b: baseRight, strength: 0.34 })
    }
  }

  const skylineBaseZ = FAR_Z + 2.4
  for (let i = 0; i < SKYLINE_TOWER_COUNT; i += 1) {
    const x = -1.85 + (i / (SKYLINE_TOWER_COUNT - 1)) * 3.7
    const height = 1.3 + (1 - Math.abs(i - (SKYLINE_TOWER_COUNT - 1) / 2) / 7) * 3.4 + rand() * 0.6
    const width = 0.14 + rand() * 0.22
    const base = nodes.push({ kind: 'skyline', x, y: -0.95, z: skylineBaseZ + rand() * 1.3, phase: rand() * 10 }) - 1
    const top = nodes.push({ kind: 'skyline', x, y: -0.95 + height, z: skylineBaseZ + rand() * 1.3, phase: rand() * 10 }) - 1
    const left = nodes.push({ kind: 'skyline', x: x - width, y: -0.95 + height * 0.82, z: skylineBaseZ, phase: rand() * 10 }) - 1
    const right = nodes.push({ kind: 'skyline', x: x + width, y: -0.95 + height * 0.82, z: skylineBaseZ, phase: rand() * 10 }) - 1
    pairs.push({ a: base, b: top, strength: 1.1 })
    pairs.push({ a: left, b: right, strength: 0.72 })
    pairs.push({ a: left, b: top, strength: 0.54 })
    pairs.push({ a: right, b: top, strength: 0.54 })
    if (i > 0) {
      pairs.push({ a: top - 4, b: top, strength: 0.32 })
    }
  }

  return { nodes, pairs, lampHeadIndices }
}

// ── Shaders ───────────────────────────────────────────────────────────────────

const POINTS_VERTEX = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uPointSizeFactor;
  varying float vDepth;
  varying float vHeight;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    vHeight = position.y;
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (uPointSizeFactor / vDepth) * uPixelRatio * (0.95 + smoothstep(-1.1, 2.8, vHeight) * 0.48);
  }
`

const POINTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  uniform float uDepthNear;
  uniform float uDepthFar;
  uniform float uAlphaBase;
  uniform float uAlphaCrest;
  varying float vDepth;
  varying float vHeight;
  void main() {
    vec4 sprite = texture2D(uMap, gl_PointCoord);
    float depthFade = mix(1.0, 0.06, smoothstep(uDepthNear, uDepthFar, vDepth));
    float nearFade = smoothstep(1.0, 2.8, vDepth);
    float heightBoost = smoothstep(-0.6, 2.8, vHeight);
    float alpha = sprite.a * (uAlphaBase + heightBoost * uAlphaCrest) * depthFade * nearFade * 1.25;
    gl_FragColor = vec4(uColor * (0.72 + depthFade * 0.42), alpha);
  }
`

const GLOW_VERTEX = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uPointSizeFactor;
  varying float vDepth;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (uPointSizeFactor / vDepth) * uPixelRatio;
  }
`

const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  uniform float uDepthNear;
  uniform float uDepthFar;
  varying float vDepth;
  void main() {
    vec4 sprite = texture2D(uMap, gl_PointCoord);
    float depthFade = mix(1.0, 0.02, smoothstep(uDepthNear, uDepthFar, vDepth));
    float nearFade = smoothstep(1.2, 3.5, vDepth);
    float alpha = sprite.a * 0.3 * depthFade * nearFade;
    gl_FragColor = vec4(uColor, alpha);
  }
`

export function CityCorridorField() {
  const graph = useMemo(() => buildCityGraph(), [])

  const pointGeometry = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(graph.nodes.length * 3), 3))
    return geometry
  }, [graph.nodes.length])

  const lineGeometry = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(graph.pairs.length * 2 * 3), 3))
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(graph.pairs.length * 2 * 3), 3))
    return geometry
  }, [graph.pairs.length])

  const glowGeometry = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(graph.lampHeadIndices.length * 3), 3))
    return geometry
  }, [graph.lampHeadIndices.length])

  const dotTexture = useMemo(() => createDotTexture(), [])
  const glowTexture = useMemo(() => createGlowTexture(), [])

  const pointMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: POINTS_VERTEX,
        fragmentShader: POINTS_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: new Color(PARTICLE_COLOR) },
          uMap: { value: dotTexture },
          uPixelRatio: { value: Math.min(window.devicePixelRatio ?? 1, 2) },
          uPointSizeFactor: { value: POINT_SIZE_FACTOR * 1.08 },
          uAlphaBase: { value: POINT_ALPHA_BASE },
          uAlphaCrest: { value: POINT_ALPHA_CREST * 0.9 },
          uDepthNear: { value: DEPTH_FADE_NEAR },
          uDepthFar: { value: DEPTH_FADE_FAR + 8 },
        },
      }),
    [dotTexture],
  )

  const glowMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: GLOW_VERTEX,
        fragmentShader: GLOW_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: new Color(LAMP_GLOW_COLOR) },
          uMap: { value: glowTexture },
          uPixelRatio: { value: Math.min(window.devicePixelRatio ?? 1, 2) },
          uPointSizeFactor: { value: LAMP_GLOW_SIZE_FACTOR },
          uDepthNear: { value: DEPTH_FADE_NEAR },
          uDepthFar: { value: DEPTH_FADE_FAR + 8 },
        },
      }),
    [glowTexture],
  )

  const lineMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthTest: true,
        depthWrite: true,
        blending: AdditiveBlending,
      }),
    [],
  )

  const pointsRef = useRef<Points>(null)
  const linesRef = useRef<LineSegments>(null)
  const glowRef = useRef<Points>(null)
  const nodePositions = useMemo(() => new Float32Array(graph.nodes.length * 3), [graph.nodes.length])

  useFrame(({ clock }) => {
    const points = pointsRef.current
    const lines = linesRef.current
    const glowPoints = glowRef.current
    if (!points || !lines || !glowPoints) return

    const t = clock.getElapsedTime()

    graph.nodes.forEach((node, index) => {
      const base = index * 3
      if (node.kind === 'road') {
        const z = wrapDepth(FAR_Z + (node.row / ROAD_ROWS) * DEPTH + t * CORRIDOR_SPEED)
        const near = (z - FAR_Z) / DEPTH
        const roadWidth = roadHalfWidth(near)
        const x = -roadWidth + (node.col / (ROAD_COLS - 1)) * roadWidth * 2
        const breathe = Math.sin(t * 0.42 + node.row * 0.22 + node.col * 0.31) * 0.018
        nodePositions[base] = x * lateralScale(near)
        nodePositions[base + 1] = -1.04 + breathe
        nodePositions[base + 2] = z
      } else if (node.kind === 'sidewalk') {
        const z = wrapDepth(FAR_Z + (node.row / ROAD_ROWS) * DEPTH + t * CORRIDOR_SPEED)
        const near = (z - FAR_Z) / DEPTH
        const offsets = [0.18, 0.86, 1.56]
        const x = node.side * (roadHalfWidth(near) + offsets[node.band]) * lateralScale(near)
        const breathe = Math.sin(t * 0.36 + node.row * 0.18 + node.band) * 0.012
        nodePositions[base] = x
        nodePositions[base + 1] = -1.025 + breathe + node.band * 0.006
        nodePositions[base + 2] = z
      } else if (node.kind === 'building') {
        const anchorZ = wrapDepth(node.baseZ + t * CORRIDOR_SPEED)
        const z = wrapDepth(anchorZ + node.localZ)
        const near = (anchorZ - FAR_Z) / DEPTH
        const sway = Math.sin(t * 0.35 + node.centerX + node.localY) * 0.018
        const side = node.centerX < 0 ? -1 : 1
        const blockX = side * (roadHalfWidth(near) + Math.abs(node.centerX)) * lateralScale(near)
        nodePositions[base] = blockX + node.localX * (0.92 + near * 0.16) + sway
        nodePositions[base + 1] = node.localY
        nodePositions[base + 2] = z
      } else if (node.kind === 'tree') {
        const anchorZ = wrapDepth(node.baseZ + t * CORRIDOR_SPEED)
        const z = wrapDepth(anchorZ + node.localZ)
        const near = (anchorZ - FAR_Z) / DEPTH
        const sway = Math.sin(t * 0.58 + node.centerX + node.localY * 1.7) * 0.035
        const side = node.centerX < 0 ? -1 : 1
        const treeX = side * (roadHalfWidth(near) + Math.abs(node.centerX)) * lateralScale(near)
        nodePositions[base] = treeX + node.localX * (0.82 + near * 0.18) + sway
        nodePositions[base + 1] = node.localY + Math.sin(t * 0.44 + node.baseZ) * 0.018
        nodePositions[base + 2] = z
      } else if (node.kind === 'lamp') {
        const z = wrapDepth(node.baseZ + node.localZ + t * CORRIDOR_SPEED)
        const near = (z - FAR_Z) / DEPTH
        const sidewalkX = node.side * (roadHalfWidth(near) + LAMP_CURB_OFFSET + node.localX) * lateralScale(near)
        const metalTension = Math.sin(t * 0.28 + node.baseZ) * 0.006
        nodePositions[base] = sidewalkX
        nodePositions[base + 1] = node.localY + metalTension
        nodePositions[base + 2] = z
      } else if (node.kind === 'skyline') {
        const shimmer = Math.sin(t * 0.38 + node.phase) * 0.02
        nodePositions[base] = node.x + shimmer
        nodePositions[base + 1] = node.y
        nodePositions[base + 2] = node.z
      }
    })

    const pointPositions = points.geometry.attributes.position as BufferAttribute
    ;(pointPositions.array as Float32Array).set(nodePositions)
    pointPositions.needsUpdate = true

    // Copy lamp head positions into glow geometry
    const glowPositionAttr = glowPoints.geometry.attributes.position as BufferAttribute
    const glowArr = glowPositionAttr.array as Float32Array
    for (let g = 0; g < graph.lampHeadIndices.length; g += 1) {
      const srcBase = graph.lampHeadIndices[g] * 3
      glowArr[g * 3] = nodePositions[srcBase]
      glowArr[g * 3 + 1] = nodePositions[srcBase + 1]
      glowArr[g * 3 + 2] = nodePositions[srcBase + 2]
    }
    glowPositionAttr.needsUpdate = true

    const linePositions = lines.geometry.attributes.position as BufferAttribute
    const lineColors = lines.geometry.attributes.color as BufferAttribute
    const linePositionArray = linePositions.array as Float32Array
    const lineColorArray = lineColors.array as Float32Array

    graph.pairs.forEach((pair, index) => {
      const aBase = pair.a * 3
      const bBase = pair.b * 3
      const out = index * 6
      const za = nodePositions[aBase + 2]
      const zb = nodePositions[bBase + 2]
      const near = ((za + zb) * 0.5 - FAR_Z) / DEPTH
      const wrapGap = Math.abs(za - zb)
      const nearCull = near < 0.78 ? 1.0 : Math.max(0, 1.0 - (near - 0.78) / 0.22)
      const intensity =
        wrapGap > DEPTH * 0.45
          ? 0
          : LINE_GLOBAL_INTENSITY * pair.strength * (0.16 + near * 0.55) * nearCull * (0.84 + Math.sin(t * 0.5 + index) * 0.08)

      linePositionArray[out] = nodePositions[aBase]
      linePositionArray[out + 1] = nodePositions[aBase + 1]
      linePositionArray[out + 2] = za
      linePositionArray[out + 3] = nodePositions[bBase]
      linePositionArray[out + 4] = nodePositions[bBase + 1]
      linePositionArray[out + 5] = zb

      const colorBase = index * 6
      const r = LINE_COLOR_RGB[0] * intensity
      const g = LINE_COLOR_RGB[1] * intensity
      const b = LINE_COLOR_RGB[2] * intensity
      lineColorArray[colorBase] = r
      lineColorArray[colorBase + 1] = g
      lineColorArray[colorBase + 2] = b
      lineColorArray[colorBase + 3] = r
      lineColorArray[colorBase + 4] = g
      lineColorArray[colorBase + 5] = b
    })

    linePositions.needsUpdate = true
    lineColors.needsUpdate = true
  })

  return (
    <>
      <CameraLookAt />
      <points ref={pointsRef} geometry={pointGeometry} material={pointMaterial} />
      <lineSegments ref={linesRef} geometry={lineGeometry} material={lineMaterial} />
      <points ref={glowRef} geometry={glowGeometry} material={glowMaterial} />
    </>
  )
}
