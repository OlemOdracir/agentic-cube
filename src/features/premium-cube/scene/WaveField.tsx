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

// Ajustables ----------------------------------------------------
const PARTICLE_COUNT = 560
const FIELD_WIDTH = 30
const FIELD_DEPTH = 18
const WAVE_AMP_Y = 0.7
const WAVE_AMP_X = 0.18
const WAVE_AMP_DIAG = 0.22
const WAVE_TIME_SCALE = 0.5
const LINE_DISTANCE = 1.7
const MAX_LINE_SEGMENTS = 7000
const PARTICLE_COLOR = '#9d7bff'
const LINE_COLOR_RGB: [number, number, number] = [0x74 / 255, 0x45 / 255, 0xff / 255]
// ---------------------------------------------------------------

const POINTS_VERTEX = /* glsl */ `
  uniform float uPixelRatio;
  varying float vDepth;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (170.0 / vDepth) * uPixelRatio;
  }
`

const POINTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  varying float vDepth;
  void main() {
    vec4 sprite = texture2D(uMap, gl_PointCoord);
    float depthFade = mix(1.0, 0.55, smoothstep(3.0, 24.0, vDepth));
    float alpha = sprite.a * 1.05 * depthFade;
    gl_FragColor = vec4(uColor * depthFade * 1.15, alpha);
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
  g.addColorStop(0.32, 'rgba(220,210,255,0.55)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.magFilter = LinearFilter
  t.minFilter = LinearFilter
  return t
}

type WaveFieldProps = {
  position?: [number, number, number]
  rotation?: [number, number, number]
  paused?: boolean
}

function makeSeededRandom(seed: number) {
  let s = seed >>> 0
  return function rand() {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function waveDisplacement(x: number, y: number, t: number) {
  const a = Math.sin(x * 0.18 + t * 0.32 * WAVE_TIME_SCALE) * WAVE_AMP_X
  const b = Math.sin(y * 0.24 + t * 0.42 * WAVE_TIME_SCALE + 1.3) * WAVE_AMP_Y
  const c = Math.sin(x * 0.6 + y * 0.22 + t * 0.5 * WAVE_TIME_SCALE + 0.8) * WAVE_AMP_DIAG
  const d = Math.sin(y * 0.55 + t * 0.28 * WAVE_TIME_SCALE) * WAVE_AMP_Y * 0.3
  return a + b + c + d
}

export function WaveField({
  position = [0, -1.5, -3.5],
  rotation = [-Math.PI / 2.35, 0, 0],
  paused = false,
}: WaveFieldProps) {
  const baseXY = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 2)
    const cols = Math.round(Math.sqrt((PARTICLE_COUNT * FIELD_WIDTH) / FIELD_DEPTH))
    const rows = Math.ceil(PARTICLE_COUNT / cols)
    const stepX = FIELD_WIDTH / (cols - 1)
    const stepY = FIELD_DEPTH / (rows - 1)
    const jitter = Math.min(stepX, stepY) * 0.4
    const rand = makeSeededRandom(0xc0ffee)
    let idx = 0
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols && idx < PARTICLE_COUNT; c += 1) {
        const x = -FIELD_WIDTH / 2 + c * stepX + (rand() - 0.5) * jitter
        const y = -FIELD_DEPTH / 2 + r * stepY + (rand() - 0.5) * jitter
        arr[idx * 2] = x
        arr[idx * 2 + 1] = y
        idx += 1
      }
    }
    return arr
  }, [])

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
    const linePositions = new Float32Array(MAX_LINE_SEGMENTS * 2 * 3)
    const lineColors = new Float32Array(MAX_LINE_SEGMENTS * 2 * 3)
    geo.setAttribute('position', new BufferAttribute(linePositions, 3))
    geo.setAttribute('color', new BufferAttribute(lineColors, 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  const dotTexture = useMemo(() => createDotTexture(), [])

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
    const thresholdSq = LINE_DISTANCE * LINE_DISTANCE
    const inv = 1 / LINE_DISTANCE
    let segIdx = 0

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const xi = positions[i * 3]
      const yi = positions[i * 3 + 1]
      const zi = positions[i * 3 + 2]
      for (let j = i + 1; j < PARTICLE_COUNT; j += 1) {
        const dx = xi - positions[j * 3]
        const dy = yi - positions[j * 3 + 1]
        const dz = zi - positions[j * 3 + 2]
        const d2 = dx * dx + dy * dy + dz * dz
        if (d2 < thresholdSq) {
          if (segIdx >= MAX_LINE_SEGMENTS) break
          const dist = Math.sqrt(d2)
          const fade = 1 - dist * inv
          const intensity = 0.35 + fade * 0.85
          const r = LINE_COLOR_RGB[0] * intensity
          const g = LINE_COLOR_RGB[1] * intensity
          const b = LINE_COLOR_RGB[2] * intensity
          const pIdx = segIdx * 6
          linePositions[pIdx] = xi
          linePositions[pIdx + 1] = yi
          linePositions[pIdx + 2] = zi
          linePositions[pIdx + 3] = positions[j * 3]
          linePositions[pIdx + 4] = positions[j * 3 + 1]
          linePositions[pIdx + 5] = positions[j * 3 + 2]
          lineColors[pIdx] = r
          lineColors[pIdx + 1] = g
          lineColors[pIdx + 2] = b
          lineColors[pIdx + 3] = r
          lineColors[pIdx + 4] = g
          lineColors[pIdx + 5] = b
          segIdx += 1
        }
      }
      if (segIdx >= MAX_LINE_SEGMENTS) break
    }

    linesObj.geometry.setDrawRange(0, segIdx * 2)
    linePositionAttr.needsUpdate = true
    lineColorAttr.needsUpdate = true

    const group = groupRef.current
    if (group) {
      const parallaxX = pointer.x * 0.04
      const parallaxY = pointer.y * 0.03
      group.rotation.z = parallaxX
      group.position.x = position[0] + parallaxX * 0.6
      group.position.z = position[2] - parallaxY * 0.4
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <points ref={pointsRef} geometry={particleGeometry} material={pointMaterial} />
      <lineSegments ref={linesRef} geometry={lineGeometry} material={lineMaterial} />
    </group>
  )
}
