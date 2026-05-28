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
  ShaderMaterial,
  SRGBColorSpace,
} from 'three'
import type { Group, LineSegments, Points } from 'three'
import {
  VECTOR_WORLD_PRESETS,
  VECTOR_WORLD_RENDERING,
  VECTOR_WORLD_STYLE,
} from './vectorWorldConfig'

const WAVE_FIELD = VECTOR_WORLD_PRESETS.wave.field
const PARTICLE_COLS = WAVE_FIELD.particleCols
const PARTICLE_ROWS = WAVE_FIELD.particleRows
const FIELD_WIDTH = WAVE_FIELD.fieldWidth
const FIELD_DEPTH = WAVE_FIELD.fieldDepth
const JITTER_RATIO = WAVE_FIELD.jitterRatio
const LINE_DISTANCE_RATIO = WAVE_FIELD.lineDistanceRatio
const NEIGHBOR_RADIUS_CELLS = WAVE_FIELD.neighborRadiusCells
const MAX_LINE_SEGMENTS = WAVE_FIELD.maxLineSegments
const WAVE_TIME_SCALE = WAVE_FIELD.waveTimeScale
const WAVE_OCTAVES = WAVE_FIELD.octaves
const HORIZON_GLOW_OPACITY = WAVE_FIELD.horizonGlowOpacity
const PARALLAX_X = WAVE_FIELD.parallaxX
const PARALLAX_Z = WAVE_FIELD.parallaxZ

const {
  crestBoostHigh: CREST_BOOST_HIGH,
  crestBoostLow: CREST_BOOST_LOW,
  depthFadeFar: DEPTH_FADE_FAR,
  depthFadeNear: DEPTH_FADE_NEAR,
  lineGlobalIntensity: LINE_GLOBAL_INTENSITY,
  pointAlphaBase: POINT_ALPHA_BASE,
  pointAlphaCrest: POINT_ALPHA_CREST,
  pointSizeFactor: POINT_SIZE_FACTOR,
} = VECTOR_WORLD_RENDERING

const {
  horizonGlowColor: HORIZON_GLOW_COLOR,
  lineColorRgb: LINE_COLOR_RGB,
  particleColor: PARTICLE_COLOR,
} = VECTOR_WORLD_STYLE

const PARTICLE_COUNT = PARTICLE_COLS * PARTICLE_ROWS

const POINTS_VERTEX = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uPointSizeFactor;
  uniform float uCrestLow;
  uniform float uCrestHigh;
  varying float vDepth;
  varying float vHeight;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    vHeight = position.z;
    float crestBoost = smoothstep(uCrestLow, uCrestHigh, vHeight);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (uPointSizeFactor / vDepth) * uPixelRatio * (0.6 + crestBoost * 0.9);
  }
`

const POINTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  uniform float uDepthNear;
  uniform float uDepthFar;
  uniform float uAlphaBase;
  uniform float uAlphaCrest;
  uniform float uCrestLow;
  uniform float uCrestHigh;
  varying float vDepth;
  varying float vHeight;
  void main() {
    vec4 sprite = texture2D(uMap, gl_PointCoord);
    float depthFade = mix(1.0, 0.05, smoothstep(uDepthNear, uDepthFar, vDepth));
    float crestBoost = smoothstep(uCrestLow, uCrestHigh, vHeight);
    float colorBoost = 0.5 + crestBoost * 0.6;
    float alpha = sprite.a * (uAlphaBase + crestBoost * uAlphaCrest) * depthFade;
    vec3 rgb = uColor * colorBoost * (0.45 + 0.55 * depthFade);
    gl_FragColor = vec4(rgb, alpha);
  }
`

function createDotTexture() {
  const s = 64
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.34, 'rgba(220,210,255,0.55)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.magFilter = LinearFilter
  t.minFilter = LinearFilter
  return t
}

function createHorizonGlowTexture(color: string) {
  const w = 1024
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(w / 2, h * 0.95, 0, w / 2, h * 0.95, w * 0.55)
  g.addColorStop(0, color)
  g.addColorStop(0.18, `${color}66`)
  g.addColorStop(0.5, `${color}22`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.magFilter = LinearFilter
  t.minFilter = LinearFilter
  return t
}

function makeSeededRandom(seed: number) {
  let s = seed >>> 0
  return function rand() {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function waveDisplacement(x: number, y: number, t: number) {
  const tt = t * WAVE_TIME_SCALE
  let z = 0
  for (const [freqX, freqY, freqT, phase, amp] of WAVE_OCTAVES) {
    // When freqY is negative it encodes a diagonal (x − y) wave
    const spatial = freqY < 0 ? freqX * x + freqY * y : freqX * x + freqY * y
    z += Math.sin(spatial + freqT * tt + phase) * amp
  }
  return z
}

type WaveFieldProps = {
  position?: [number, number, number]
  rotation?: [number, number, number]
  paused?: boolean
}

export function WaveField({
  position = [0, -1.5, -3.5],
  rotation = [-Math.PI / 2.35, 0, 0],
  paused = false,
}: WaveFieldProps) {
  const stepX = FIELD_WIDTH / (PARTICLE_COLS - 1)
  const stepY = FIELD_DEPTH / (PARTICLE_ROWS - 1)
  const cellSize = (stepX + stepY) * 0.5
  const lineDistance = cellSize * LINE_DISTANCE_RATIO
  const lineDistanceSq = lineDistance * lineDistance
  const invLineDistance = 1 / lineDistance

  const baseXY = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 2)
    const rand = makeSeededRandom(0xc0ffee)
    const jitter = cellSize * JITTER_RATIO
    for (let r = 0; r < PARTICLE_ROWS; r += 1) {
      for (let c = 0; c < PARTICLE_COLS; c += 1) {
        const idx = r * PARTICLE_COLS + c
        arr[idx * 2] = -FIELD_WIDTH / 2 + c * stepX + (rand() - 0.5) * jitter
        arr[idx * 2 + 1] = -FIELD_DEPTH / 2 + r * stepY + (rand() - 0.5) * jitter
      }
    }
    return arr
  }, [cellSize, stepX, stepY])

  const particleGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      positions[i * 3] = baseXY[i * 2]
      positions[i * 3 + 1] = baseXY[i * 2 + 1]
      positions[i * 3 + 2] = 0
    }
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    return geo
  }, [baseXY])

  const lineGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(MAX_LINE_SEGMENTS * 2 * 3), 3))
    geo.setAttribute('color', new BufferAttribute(new Float32Array(MAX_LINE_SEGMENTS * 2 * 3), 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  const dotTexture = useMemo(() => createDotTexture(), [])
  const horizonGlowTexture = useMemo(() => createHorizonGlowTexture(HORIZON_GLOW_COLOR), [])

  const pointMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: POINTS_VERTEX,
        fragmentShader: POINTS_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uColor:           { value: new Color(PARTICLE_COLOR) },
          uMap:             { value: dotTexture },
          uPixelRatio:      { value: Math.min(window.devicePixelRatio ?? 1, 2) },
          uPointSizeFactor: { value: POINT_SIZE_FACTOR },
          uAlphaBase:       { value: POINT_ALPHA_BASE },
          uAlphaCrest:      { value: POINT_ALPHA_CREST },
          uDepthNear:       { value: DEPTH_FADE_NEAR },
          uDepthFar:        { value: DEPTH_FADE_FAR },
          uCrestLow:        { value: CREST_BOOST_LOW },
          uCrestHigh:       { value: CREST_BOOST_HIGH },
        },
      }),
    [dotTexture],
  )

  const lineMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )

  const groupRef = useRef<Group>(null)
  const pointsRef = useRef<Points>(null)
  const linesRef = useRef<LineSegments>(null)

  useFrame(({ clock, pointer }) => {
    if (paused) return
    const pointsObj = pointsRef.current
    const linesObj = linesRef.current
    if (!pointsObj || !linesObj) return
    const t = clock.getElapsedTime()
    const positionAttr = pointsObj.geometry.attributes.position as BufferAttribute
    const positions = positionAttr.array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const x = baseXY[i * 2]
      const y = baseXY[i * 2 + 1]
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = waveDisplacement(x, y, t)
    }
    positionAttr.needsUpdate = true

    const linePositionAttr = linesObj.geometry.attributes.position as BufferAttribute
    const lineColorAttr = linesObj.geometry.attributes.color as BufferAttribute
    const linePositions = linePositionAttr.array as Float32Array
    const lineColors = lineColorAttr.array as Float32Array
    const horizonStart = PARTICLE_ROWS * 0.45
    const horizonRange = PARTICLE_ROWS - horizonStart
    let segIdx = 0

    outer: for (let r = 0; r < PARTICLE_ROWS; r += 1) {
      for (let c = 0; c < PARTICLE_COLS; c += 1) {
        const i = r * PARTICLE_COLS + c
        const xi = positions[i * 3]
        const yi = positions[i * 3 + 1]
        const zi = positions[i * 3 + 2]
        for (let dr = 0; dr <= NEIGHBOR_RADIUS_CELLS; dr += 1) {
          const minDc = dr === 0 ? 1 : -NEIGHBOR_RADIUS_CELLS
          for (let dc = minDc; dc <= NEIGHBOR_RADIUS_CELLS; dc += 1) {
            const nr = r + dr
            const nc = c + dc
            if (nr >= PARTICLE_ROWS || nc < 0 || nc >= PARTICLE_COLS) continue
            const j = nr * PARTICLE_COLS + nc
            const dx = xi - positions[j * 3]
            const dy = yi - positions[j * 3 + 1]
            const dz = zi - positions[j * 3 + 2]
            const d2 = dx * dx + dy * dy + dz * dz
            if (d2 < lineDistanceSq) {
              if (segIdx >= MAX_LINE_SEGMENTS) break outer
              const dist = Math.sqrt(d2)
              const fade = 1 - dist * invLineDistance
              if (fade <= 0) continue
              const avgRow = (r + nr) * 0.5
              const horizonFade =
                avgRow <= horizonStart ? 1 : Math.max(0, 1 - (avgRow - horizonStart) / horizonRange)
              const avgHeight = (zi + positions[j * 3 + 2]) * 0.5
              const crestBoost = Math.max(
                0,
                Math.min(1, (avgHeight - CREST_BOOST_LOW) / (CREST_BOOST_HIGH - CREST_BOOST_LOW)),
              )
              // fade² ensures intensity → 0 at the distance threshold, eliminating the
              // in/out pop when waves push pairs across the cutoff.
              const intensity =
                LINE_GLOBAL_INTENSITY *
                fade *
                (0.45 + fade * 0.55) *
                (0.35 + crestBoost * 0.85) *
                (0.25 + horizonFade * 0.95)
              const r0 = LINE_COLOR_RGB[0] * intensity
              const g0 = LINE_COLOR_RGB[1] * intensity
              const b0 = LINE_COLOR_RGB[2] * intensity
              const pIdx = segIdx * 6
              linePositions[pIdx] = xi
              linePositions[pIdx + 1] = yi
              linePositions[pIdx + 2] = zi
              linePositions[pIdx + 3] = positions[j * 3]
              linePositions[pIdx + 4] = positions[j * 3 + 1]
              linePositions[pIdx + 5] = positions[j * 3 + 2]
              lineColors[pIdx] = r0
              lineColors[pIdx + 1] = g0
              lineColors[pIdx + 2] = b0
              lineColors[pIdx + 3] = r0
              lineColors[pIdx + 4] = g0
              lineColors[pIdx + 5] = b0
              segIdx += 1
            }
          }
        }
      }
    }

    linesObj.geometry.setDrawRange(0, segIdx * 2)
    linePositionAttr.needsUpdate = true
    lineColorAttr.needsUpdate = true

    const group = groupRef.current
    if (group) {
      const parallaxX = pointer.x * PARALLAX_X
      const parallaxY = pointer.y * PARALLAX_Z
      group.rotation.z = parallaxX
      group.position.x = position[0] + parallaxX * 0.6
      group.position.z = position[2] - parallaxY * 0.4
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Horizon backlight glow — soft violet aura behind the far edge of the field */}
      <mesh position={[0, FIELD_DEPTH * 0.42, -0.4]} rotation={[Math.PI / 2.1, 0, 0]}>
        <planeGeometry args={[FIELD_WIDTH * 0.7, FIELD_DEPTH * 0.32]} />
        <meshBasicMaterial
          map={horizonGlowTexture}
          transparent
          opacity={HORIZON_GLOW_OPACITY}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <points ref={pointsRef} geometry={particleGeometry} material={pointMaterial} />
      <lineSegments ref={linesRef} geometry={lineGeometry} material={lineMaterial} />
    </group>
  )
}
