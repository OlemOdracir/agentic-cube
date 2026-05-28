import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import type { Group, LineSegments, Points } from 'three'
import {
  createCrestPointMaterial,
  createVectorLineMaterial,
} from '../base/materials'
import {
  createDotTexture,
  createHorizonGlowTexture,
  makeSeededRandom,
} from '../base/textures'
import { VECTOR_WORLD_THEME } from '../base/theme'
import type { WorldProps } from '../types'

// ── World-local config ────────────────────────────────────────────────────────
// Everything that differs from theme defaults lives here so this single file
// fully describes the agentic plexus look.

const CONFIG = {
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
} as const

const PARTICLE_COUNT = CONFIG.particleCols * CONFIG.particleRows
const LINE_COLOR_RGB = VECTOR_WORLD_THEME.lineColorRgb
const LINE_GLOBAL_INTENSITY = VECTOR_WORLD_THEME.lineGlobalIntensity
const CREST_BOOST_LOW = VECTOR_WORLD_THEME.crestBoostLow
const CREST_BOOST_HIGH = VECTOR_WORLD_THEME.crestBoostHigh

function waveDisplacement(x: number, y: number, t: number) {
  const tt = t * CONFIG.waveTimeScale
  let z = 0
  for (const [freqX, freqY, freqT, phase, amp] of CONFIG.octaves) {
    // freqY < 0 encodes a diagonal (x − y) wave
    const spatial = freqY < 0 ? freqX * x + freqY * y : freqX * x + freqY * y
    z += Math.sin(spatial + freqT * tt + phase) * amp
  }
  return z
}

export function AgenticWorld({
  position = [0, -1.5, -3.5],
  rotation = [-Math.PI / 2.35, 0, 0],
  paused = false,
}: WorldProps = {}) {
  const stepX = CONFIG.fieldWidth / (CONFIG.particleCols - 1)
  const stepY = CONFIG.fieldDepth / (CONFIG.particleRows - 1)
  const cellSize = (stepX + stepY) * 0.5
  const lineDistance = cellSize * CONFIG.lineDistanceRatio
  const lineDistanceSq = lineDistance * lineDistance
  const invLineDistance = 1 / lineDistance

  const baseXY = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 2)
    const rand = makeSeededRandom(0xc0ffee)
    const jitter = cellSize * CONFIG.jitterRatio
    for (let r = 0; r < CONFIG.particleRows; r += 1) {
      for (let c = 0; c < CONFIG.particleCols; c += 1) {
        const idx = r * CONFIG.particleCols + c
        arr[idx * 2] = -CONFIG.fieldWidth / 2 + c * stepX + (rand() - 0.5) * jitter
        arr[idx * 2 + 1] = -CONFIG.fieldDepth / 2 + r * stepY + (rand() - 0.5) * jitter
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
    geo.setAttribute('position', new BufferAttribute(new Float32Array(CONFIG.maxLineSegments * 2 * 3), 3))
    geo.setAttribute('color', new BufferAttribute(new Float32Array(CONFIG.maxLineSegments * 2 * 3), 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  const dotTexture = useMemo(() => createDotTexture(), [])
  const horizonGlowTexture = useMemo(() => createHorizonGlowTexture(), [])

  const pointMaterial = useMemo(
    () => createCrestPointMaterial({ dotTexture }),
    [dotTexture],
  )

  const lineMaterial = useMemo(
    () => createVectorLineMaterial({ fog: true, depthTest: true, depthWrite: false }),
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
    const horizonStart = CONFIG.particleRows * 0.45
    const horizonRange = CONFIG.particleRows - horizonStart
    let segIdx = 0

    outer: for (let r = 0; r < CONFIG.particleRows; r += 1) {
      for (let c = 0; c < CONFIG.particleCols; c += 1) {
        const i = r * CONFIG.particleCols + c
        const xi = positions[i * 3]
        const yi = positions[i * 3 + 1]
        const zi = positions[i * 3 + 2]
        for (let dr = 0; dr <= CONFIG.neighborRadiusCells; dr += 1) {
          const minDc = dr === 0 ? 1 : -CONFIG.neighborRadiusCells
          for (let dc = minDc; dc <= CONFIG.neighborRadiusCells; dc += 1) {
            const nr = r + dr
            const nc = c + dc
            if (nr >= CONFIG.particleRows || nc < 0 || nc >= CONFIG.particleCols) continue
            const j = nr * CONFIG.particleCols + nc
            const dx = xi - positions[j * 3]
            const dy = yi - positions[j * 3 + 1]
            const dz = zi - positions[j * 3 + 2]
            const d2 = dx * dx + dy * dy + dz * dz
            if (d2 < lineDistanceSq) {
              if (segIdx >= CONFIG.maxLineSegments) break outer
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
              // fade² keeps intensity → 0 at the cutoff so wave-driven crossings don't pop.
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
      const parallaxX = pointer.x * CONFIG.parallaxX
      const parallaxY = pointer.y * CONFIG.parallaxZ
      group.rotation.z = parallaxX
      group.position.x = position[0] + parallaxX * 0.6
      group.position.z = position[2] - parallaxY * 0.4
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh position={[0, CONFIG.fieldDepth * 0.42, -0.4]} rotation={[Math.PI / 2.1, 0, 0]}>
        <planeGeometry args={[CONFIG.fieldWidth * 0.7, CONFIG.fieldDepth * 0.32]} />
        <meshBasicMaterial
          map={horizonGlowTexture}
          transparent
          opacity={CONFIG.horizonGlowOpacity}
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
