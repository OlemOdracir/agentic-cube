import { PerspectiveCamera, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef } from 'react'
import type { Group } from 'three'
import { Color, MathUtils, Vector2, Vector3 } from 'three'
import {
  playCubeDragTickSound,
  playCubeTransitionSound,
  startCubeDragSound,
  stopCubeDragSound,
  updateCubeDragSound,
} from '../audio/cubeAudio'
import type { CubeSectionId } from '../cubeSections'
import type { DiagnosticFx } from '../diagnosticFx'
import { CampusEnvironment } from './CampusEnvironment'
import { PremiumCube } from './PremiumCube'

type CubeSceneProps = {
  effects: DiagnosticFx
  onCursorModeChange: (mode: 'default' | 'grab' | 'grabbing') => void
  onSectionEnter: (sectionId: CubeSectionId) => void
  sectionOpen: boolean
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
  work: [0, 0, 0],
  systems: [0, -Math.PI / 2, 0],
  design: [Math.PI / 2, 0, 0],
  contact: [0, Math.PI, 0],
  about: [0, Math.PI / 2, 0],
  lab: [-Math.PI / 2, 0, 0],
}

function easeInOutCubic(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2
}

export function CubeScene({ effects, onCursorModeChange, onSectionEnter, sectionOpen }: CubeSceneProps) {
  const rigRef = useRef<Group>(null)
  const pointerRef = useRef(new Vector2(0, 0))
  const transitionRef = useRef({
    active: false,
    complete: false,
    sectionId: 'work' as CubeSectionId,
    startedAt: 0,
    duration: 1.28,
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
    clickSectionId: 'work' as CubeSectionId,
  })
  const { camera, size } = useThree()
  const isNarrow = size.width < 720
  const cubeScale = isNarrow ? 0.62 : 0.74
  const cubeBaseY = isNarrow ? 0.14 : 0.18
  const platformScale = isNarrow ? 0.7 : 0.8
  const platformBaseY = isNarrow ? 0.08 : -0.05
  const cameraPosition = isNarrow ? ([0, 0.66, 7.4] as const) : ([0, 0.86, 7.45] as const)
  const cameraTargetY = isNarrow ? 0.02 : -0.14

  const getClickedSectionId = useCallback((point?: Vector3) => {
    if (!rigRef.current || !point) {
      return dragRef.current.clickSectionId
    }

    const localPoint = rigRef.current.worldToLocal(point.clone())
    const absX = Math.abs(localPoint.x)
    const absY = Math.abs(localPoint.y)
    const absZ = Math.abs(localPoint.z)

    if (absX > absY && absX > absZ) {
      return localPoint.x > 0 ? 'systems' : 'about'
    }

    if (absY > absX && absY > absZ) {
      return localPoint.y > 0 ? 'design' : 'lab'
    }

    return localPoint.z > 0 ? 'work' : 'contact'
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
      duration: 1.28,
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
    const idleYaw = -0.43 + (effects.idle ? Math.sin(t * 0.18) * 0.018 : 0)
    const idlePitch = 0.34 + (effects.idle ? Math.sin(t * 0.15) * 0.01 : 0)
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
    const baseCameraPosition = new Vector3(...cameraPosition)
    const targetCameraPosition = isNarrow ? new Vector3(0, 0.18, 2.35) : new Vector3(0, 0.12, 2.05)
    const targetScale = cubeScale * (isNarrow ? 2.6 : 3.05)

    camera.position.lerpVectors(baseCameraPosition, targetCameraPosition, transitionProgress)
    camera.lookAt(0, MathUtils.lerp(cameraTargetY, 0.02, transitionProgress), 0)

    if (transition.active && !transition.complete && rawProgress > 0.86) {
      transition.complete = true
      onSectionEnter(transition.sectionId)
    }

    if (transition.active && rawProgress >= 1) {
      transition.active = false
    }

    rigRef.current.scale.setScalar(MathUtils.lerp(cubeScale, targetScale, transitionProgress))
    rigRef.current.position.y = cubeBaseY + (effects.idle ? Math.sin(t * 0.72) * 0.035 : 0) + transitionProgress * 0.05
    if (transitionProgress > 0) {
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

      <ambientLight intensity={0.36} />
      <directionalLight
        position={[3.7, 4.8, 4.6]}
        intensity={3.1}
        color={new Color('#d9efff')}
        castShadow={effects.shadows}
      />
      <directionalLight position={[-4.8, 1.8, -3.4]} intensity={1.18} color={new Color('#c28a5a')} />
      <pointLight position={[0, -1.2, 2.1]} intensity={3.2} color={new Color('#78aee6')} distance={8} />
      <pointLight position={[1.2, 0.4, 2.2]} intensity={2.8} color={new Color('#c8efff')} distance={4.5} />
      <pointLight position={[-1.8, 0.9, 1.8]} intensity={1.6} color={new Color('#b89cff')} distance={5} />
      <spotLight
        position={[0.3, 4.2, 3.4]}
        angle={0.42}
        penumbra={0.78}
        intensity={5.4}
        color={new Color('#f7fbff')}
        castShadow={effects.shadows}
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
        <PremiumCube animateGlints={effects.glints} shadows={effects.shadows} />
      </group>

      <group scale={platformScale} position={[0, platformBaseY, 0]}>
        <mesh position={[0, -1.44, 0]} receiveShadow={effects.shadows} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.7, 128]} />
          <meshStandardMaterial color="#05060c" metalness={0.75} roughness={0.22} transparent opacity={0.52} />
        </mesh>

        <mesh position={[0, -1.425, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.12, 1.145, 180]} />
          <meshBasicMaterial color="#9acbf2" transparent opacity={0.68} />
        </mesh>

        <mesh position={[0, -1.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.78, 1.786, 180]} />
          <meshBasicMaterial color="#c28a5a" transparent opacity={0.2} />
        </mesh>

        <mesh position={[0, -1.418, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.22, 2.226, 220]} />
          <meshBasicMaterial color="#f2e0c8" transparent opacity={0.08} />
        </mesh>
      </group>

      <Stars radius={25} depth={8} count={180} factor={0.45} saturation={0} fade speed={0} />
    </>
  )
}
