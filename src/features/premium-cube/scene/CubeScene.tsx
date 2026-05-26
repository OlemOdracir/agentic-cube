import { PerspectiveCamera, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import type { Group } from 'three'
import { AdditiveBlending, CanvasTexture, Color, LinearFilter, MathUtils, SRGBColorSpace, Vector2, Vector3 } from 'three'
import {
  playCubeDragTickSound,
  playCubeTransitionSound,
  startCubeDragSound,
  stopCubeDragSound,
  updateCubeDragSound,
} from '../audio/cubeAudio'
import type { CubeSectionId } from '../cubeSections'
import type { CubeSection } from '../cubeSections'
import type { DiagnosticFx } from '../diagnosticFx'
import { CampusEnvironment } from './CampusEnvironment'
import { PremiumCube } from './PremiumCube'
import { WaveField } from './WaveField'

export type CubeSceneHandle = {
  enterSection: (sectionId: CubeSectionId) => void
}

type CubeSceneProps = {
  effects: DiagnosticFx
  onCursorModeChange: (mode: 'default' | 'grab' | 'grabbing') => void
  onSectionEnter: (sectionId: CubeSectionId) => void
  sectionOpen: boolean
  sections: CubeSection[]
  handleRef?: RefObject<CubeSceneHandle | null>
}

type PointerEventLike = {
  clientX: number
  clientY: number
  pointerId?: number
  point?: Vector3
  stopPropagation?: () => void
  target?: EventTarget | null
  nativeEvent?: PointerEvent
}

const FACE_TARGET_ROTATION: Record<CubeSectionId, [number, number, number]> = {
  agentic: [0, 0, 0],
  products: [0, -Math.PI / 2, 0],
  systems: [Math.PI / 2, 0, 0],
  security: [0, Math.PI, 0],
  research: [0, Math.PI / 2, 0],
  contact: [-Math.PI / 2, 0, 0],
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2
}

function createGlowTexture(inner: string, outer: string) {
  const s = 512
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.4, outer)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, s, s)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  return texture
}

function createGridTexture() {
  const s = 1024
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = 'rgba(2, 4, 12, 1)'
  ctx.fillRect(0, 0, s, s)

  const step = 64
  ctx.strokeStyle = 'rgba(150, 155, 220, 0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x <= s; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, s)
    ctx.stroke()
  }
  for (let y = 0; y <= s; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(s, y)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(180, 175, 230, 0.4)'
  for (let x = 0; x <= s; x += step) {
    for (let y = 0; y <= s; y += step) {
      ctx.fillRect(x - 0.5, y - 0.5, 1.4, 1.4)
    }
  }

  const fade = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.55)
  fade.addColorStop(0, 'rgba(2, 4, 12, 0)')
  fade.addColorStop(0.5, 'rgba(2, 4, 12, 0.2)')
  fade.addColorStop(1, 'rgba(2, 4, 12, 1)')
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, s, s)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  return texture
}

function createBeamTexture() {
  const w = 256
  const h = 1024
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createLinearGradient(0, 0, w, 0)
  gradient.addColorStop(0, 'rgba(255,255,255,0)')
  gradient.addColorStop(0.5, 'rgba(220,220,255,0.45)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
  const vfade = ctx.createLinearGradient(0, 0, 0, h)
  vfade.addColorStop(0, 'rgba(0,0,0,0)')
  vfade.addColorStop(0.55, 'rgba(0,0,0,0.4)')
  vfade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = vfade
  ctx.fillRect(0, 0, w, h)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  return texture
}

type PlatformTicksProps = {
  radius: number
  count: number
  faint?: boolean
}

function PlatformTicks({ radius, count, faint = false }: PlatformTicksProps) {
  const ticks = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const isMajor = i % 6 === 0
    const length = (isMajor ? 0.085 : 0.04) * (faint ? 0.7 : 1)
    const opacity = (isMajor ? 0.55 : 0.22) * (faint ? 0.5 : 1)
    return { angle, length, opacity, isMajor }
  })

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.41, 0]}>
      {ticks.map((tick, i) => (
        <mesh key={i} rotation={[0, 0, tick.angle]} position={[Math.cos(tick.angle) * radius, Math.sin(tick.angle) * radius, 0]}>
          <planeGeometry args={[tick.length, 0.0085]} />
          <meshBasicMaterial
            color={tick.isMajor ? '#dcd6ff' : '#8d82ff'}
            transparent
            opacity={tick.opacity}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

export function CubeScene({ effects, onCursorModeChange, onSectionEnter, sectionOpen, sections, handleRef }: CubeSceneProps) {
  const rigRef = useRef<Group>(null)
  const platformGlowTexture = useMemo(
    () => createGlowTexture('rgba(180, 170, 255, 0.85)', 'rgba(110, 96, 230, 0.32)'),
    [],
  )
  const gridTexture = useMemo(() => createGridTexture(), [])
  const beamTexture = useMemo(() => createBeamTexture(), [])
  const pointerRef = useRef(new Vector2(0, 0))
  const transitionRef = useRef({
    active: false,
    complete: false,
    sectionId: 'agentic' as CubeSectionId,
    startedAt: 0,
    duration: 0.7,
    startRotation: [0, 0, 0] as [number, number, number],
    targetRotation: [0, 0, 0] as [number, number, number],
  })
  const dragRef = useRef({
    active: false,
    hovering: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    velocityX: 0,
    velocityY: 0,
    yawOffset: 0,
    pitchOffset: 0,
    totalDistance: 0,
    soundDistance: 0,
    lastResonanceAt: 0,
    clickSectionId: 'agentic' as CubeSectionId,
  })
  const { camera, size } = useThree()
  const isNarrow = size.width < 720
  const cubeScale = isNarrow ? 0.7 : 0.92
  const cubeBaseY = isNarrow ? 0.28 : 0.34
  const platformScale = isNarrow ? 0.78 : 0.98
  const platformBaseY = isNarrow ? 0 : -0.18
  const cameraPosition = isNarrow ? ([0, 0.66, 7.4] as const) : ([0, 0.78, 7.6] as const)
  const cameraTargetY = isNarrow ? 0.06 : -0.04

  const getClickedSectionId = useCallback((point?: Vector3) => {
    if (!rigRef.current || !point) {
      return dragRef.current.clickSectionId
    }

    const localPoint = rigRef.current.worldToLocal(point.clone())
    const absX = Math.abs(localPoint.x)
    const absY = Math.abs(localPoint.y)
    const absZ = Math.abs(localPoint.z)

    if (absX > absY && absX > absZ) {
      return localPoint.x > 0 ? 'products' : 'research'
    }

    if (absY > absX && absY > absZ) {
      return localPoint.y > 0 ? 'systems' : 'contact'
    }

    return localPoint.z > 0 ? 'agentic' : 'security'
  }, [])

  const closestAngle = useCallback((from: number, to: number) => {
    return from + MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI
  }, [])

  const enterSection = useCallback((sectionId: CubeSectionId) => {
    if (transitionRef.current.active || sectionOpen) {
      return
    }

    const currentRotation: [number, number, number] = rigRef.current
      ? [rigRef.current.rotation.x, rigRef.current.rotation.y, rigRef.current.rotation.z]
      : [0, 0, 0]
    const targetRotation = FACE_TARGET_ROTATION[sectionId]

    transitionRef.current = {
      active: true,
      complete: false,
      sectionId,
      startedAt: performance.now() / 1000,
      duration: 0.7,
      startRotation: currentRotation,
      targetRotation: [
        closestAngle(currentRotation[0], targetRotation[0]),
        closestAngle(currentRotation[1], targetRotation[1]),
        closestAngle(currentRotation[2], targetRotation[2]),
      ],
    }
    onCursorModeChange('default')
    void playCubeTransitionSound()
  }, [closestAngle, onCursorModeChange, sectionOpen])

  useImperativeHandle(handleRef, () => ({ enterSection }), [enterSection])

  useFrame(({ clock, pointer }) => {
    if (!rigRef.current) {
      return
    }

    pointerRef.current.lerp(pointer, 0.06)

    const drag = dragRef.current
    drag.yawOffset += drag.velocityX
    drag.pitchOffset += drag.velocityY
    drag.velocityX *= drag.active ? 0.72 : 0.92
    drag.velocityY *= drag.active ? 0.72 : 0.92

    const t = clock.getElapsedTime()
    const idleYaw = -0.45 + (effects.idle ? Math.sin(t * 0.18) * 0.018 : 0)
    const idlePitch = 0.3 + (effects.idle ? Math.sin(t * 0.15) * 0.01 : 0)
    const pointerYaw = drag.active ? 0 : pointerRef.current.x * (isNarrow ? 0.18 : 0.26)
    const pointerPitch = drag.active ? 0 : -pointerRef.current.y * (isNarrow ? 0.1 : 0.13)
    const transition = transitionRef.current
    const transitionTime = performance.now() / 1000
    const rawProgress = transition.active
      ? MathUtils.clamp((transitionTime - transition.startedAt) / transition.duration, 0, 1)
      : sectionOpen
        ? 1
        : 0
    const transitionProgress = easeInOutCubic(rawProgress)

    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2])
    camera.lookAt(0, cameraTargetY, 0)

    if (transition.active && !transition.complete && rawProgress > 0.86) {
      transition.complete = true
      onSectionEnter(transition.sectionId)
    }

    if (transition.active && rawProgress >= 1) {
      transition.active = false
    }

    rigRef.current.scale.setScalar(cubeScale)
    rigRef.current.position.y = cubeBaseY + (effects.idle ? Math.sin(t * 0.72) * 0.035 : 0)
    if (transition.active) {
      rigRef.current.rotation.set(
        MathUtils.lerp(transition.startRotation[0], transition.targetRotation[0], transitionProgress),
        MathUtils.lerp(transition.startRotation[1], transition.targetRotation[1], transitionProgress),
        MathUtils.lerp(transition.startRotation[2], transition.targetRotation[2], transitionProgress),
      )
    } else {
      rigRef.current.rotation.y = MathUtils.lerp(
        rigRef.current.rotation.y,
        idleYaw + pointerYaw + drag.yawOffset,
        drag.active ? 0.28 : 0.08,
      )
      rigRef.current.rotation.x = MathUtils.lerp(
        rigRef.current.rotation.x,
        idlePitch + pointerPitch + drag.pitchOffset,
        drag.active ? 0.24 : 0.075,
      )
    }
  })

  useEffect(() => {
    function continueDrag(event: PointerEvent) {
      const drag = dragRef.current

      if (!drag.active || drag.pointerId !== event.pointerId || transitionRef.current.active || sectionOpen) {
        return
      }

      const deltaX = event.clientX - drag.lastX
      const deltaY = event.clientY - drag.lastY
      const pointerSpeed = Math.hypot(deltaX, deltaY)

      drag.velocityX += deltaX * 0.0032
      drag.velocityY += deltaY * 0.0026
      drag.totalDistance += pointerSpeed
      drag.soundDistance += pointerSpeed
      drag.lastX = event.clientX
      drag.lastY = event.clientY
      updateCubeDragSound(pointerSpeed)

      const now = performance.now()
      if (drag.soundDistance > 46 && now - drag.lastResonanceAt > 170) {
        playCubeDragTickSound(pointerSpeed)
        drag.soundDistance = 0
        drag.lastResonanceAt = now
      }
    }

    function endDrag(event: PointerEvent) {
      const drag = dragRef.current

      if (!drag.active || drag.pointerId !== event.pointerId) {
        return
      }

      drag.active = false
      drag.pointerId = -1
      stopCubeDragSound()

      if (drag.totalDistance < 8) {
        enterSection(drag.clickSectionId)
      }

      drag.totalDistance = 0
      drag.soundDistance = 0
      onCursorModeChange(drag.hovering ? 'grab' : 'default')
    }

    window.addEventListener('pointermove', continueDrag)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)

    return () => {
      window.removeEventListener('pointermove', continueDrag)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [enterSection, onCursorModeChange, sectionOpen])

  function handlePointerDown(event: PointerEventLike) {
    event.stopPropagation?.()
    if (transitionRef.current.active || sectionOpen) {
      return
    }

    const drag = dragRef.current
    drag.active = true
    drag.pointerId = event.pointerId ?? -1
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.velocityX = 0
    drag.velocityY = 0
    drag.totalDistance = 0
    drag.soundDistance = 0
    drag.lastResonanceAt = performance.now()
    drag.clickSectionId = getClickedSectionId(event.point)
    const captureTarget = event.nativeEvent?.target
    if (typeof event.pointerId === 'number' && captureTarget instanceof Element) {
      captureTarget.setPointerCapture?.(event.pointerId)
    }
    void startCubeDragSound()
    onCursorModeChange('grabbing')
  }

  function handlePointerUp(event?: PointerEventLike) {
    const drag = dragRef.current

    if (!drag.active) {
      return
    }

    const wasClick = drag.totalDistance < 8

    drag.active = false
    drag.pointerId = -1
    stopCubeDragSound()

    if (wasClick) {
      enterSection(drag.clickSectionId)
    }

    drag.totalDistance = 0
    drag.soundDistance = 0
    const captureTarget = event?.nativeEvent?.target
    if (event && typeof event.pointerId === 'number' && captureTarget instanceof Element) {
      captureTarget.releasePointerCapture?.(event.pointerId)
    }
    onCursorModeChange(drag.hovering ? 'grab' : 'default')
  }

  return (
    <>
      <color attach="background" args={['#03050b']} />
      <fog attach="fog" args={['#03050b', 9, 24]} />

      <PerspectiveCamera
        makeDefault
        position={cameraPosition}
        fov={isNarrow ? 40 : 37}
        onUpdate={(camera) => camera.lookAt(0, cameraTargetY, 0)}
      />
      <CampusEnvironment />

      <ambientLight intensity={0.08} />

      <directionalLight position={[-4.2, 2.2, -3.4]} intensity={0.55} color={new Color('#5a5cff')} />
      <pointLight position={[0, -1.32, 0.9]} intensity={7.4} color={new Color('#7a6cff')} distance={5.5} />
      <pointLight position={[1.6, 0.6, 2.4]} intensity={1.1} color={new Color('#c9d2ff')} distance={4.2} />
      <pointLight position={[-1.6, 0.6, 2.4]} intensity={1.1} color={new Color('#9387ff')} distance={4.2} />

      <spotLight
        position={[0.4, 7.6, 2.6]}
        target-position={[0, 0.4, 0]}
        angle={0.16}
        penumbra={0.25}
        intensity={22}
        color={new Color('#ffffff')}
        castShadow={effects.shadows}
      />
      <spotLight
        position={[2.4, 6.2, 1.4]}
        target-position={[0.4, 0.6, 0.4]}
        angle={0.2}
        penumbra={0.45}
        intensity={9}
        color={new Color('#e0e4ff')}
      />
      <spotLight
        position={[-2.6, 5.6, 0.8]}
        target-position={[-0.4, 0.6, 0]}
        angle={0.24}
        penumbra={0.5}
        intensity={6.4}
        color={new Color('#c4cbff')}
      />
      <spotLight
        position={[0, 5.2, -2.6]}
        target-position={[0, 0.4, 0]}
        angle={0.34}
        penumbra={0.7}
        intensity={3.4}
        color={new Color('#9aa0ff')}
      />
      <spotLight
        position={[0, -1.2, 0.05]}
        target-position={[0, 0.4, 0]}
        angle={0.62}
        penumbra={0.85}
        intensity={7.4}
        color={new Color('#7c6dff')}
      />

      <group
        ref={rigRef}
        scale={cubeScale}
        position={[0, cubeBaseY, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={() => {
          dragRef.current.hovering = true
          onCursorModeChange(dragRef.current.active ? 'grabbing' : 'grab')
        }}
        onPointerOut={() => {
          dragRef.current.hovering = false
          if (!dragRef.current.active) {
            onCursorModeChange('default')
          }
        }}
      >
        <PremiumCube animateGlints={effects.glints} sections={sections} shadows={effects.shadows} />
      </group>

      <group scale={platformScale} position={[0, platformBaseY, 0]}>
        <mesh position={[0, -1.455, 0]} receiveShadow={effects.shadows} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.72, 180]} />
          <meshStandardMaterial color="#02030a" metalness={0.86} roughness={0.22} transparent opacity={0.42} />
        </mesh>

        <mesh position={[0, -1.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial
            map={platformGlowTexture}
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <mesh position={[0, -1.422, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.12, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={1} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>

        <mesh position={[0, -1.412, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.96, 0.978, 180]} />
          <meshBasicMaterial color="#f4f2ff" transparent opacity={0.85} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>

        <mesh position={[0, -1.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.18, 1.196, 200]} />
          <meshBasicMaterial color="#b8aeff" transparent opacity={0.55} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>

        <mesh position={[0, -1.408, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.52, 1.534, 240]} />
          <meshBasicMaterial color="#8a7eff" transparent opacity={0.42} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>

        <mesh position={[0, -1.406, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.92, 1.93, 260]} />
          <meshBasicMaterial color="#6b66ff" transparent opacity={0.3} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>

        <mesh position={[0, -1.404, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.34, 2.346, 280]} />
          <meshBasicMaterial color="#cfd8ff" transparent opacity={0.14} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>

        <PlatformTicks radius={2.08} count={84} />
        <PlatformTicks radius={2.5} count={120} faint />
      </group>

      <WaveField />

      <mesh position={[0, 1.2, -4.5]}>
        <planeGeometry args={[22, 14]} />
        <meshBasicMaterial map={gridTexture} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>

      <mesh position={[0, 4.6, -0.4]}>
        <planeGeometry args={[1.4, 7]} />
        <meshBasicMaterial
          map={beamTexture}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <Stars radius={25} depth={8} count={120} factor={0.32} saturation={0} fade speed={0} />
    </>
  )
}
