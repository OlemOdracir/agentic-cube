import { PerspectiveCamera, Stars } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { Color, MathUtils, Vector2 } from 'three'
import { CampusEnvironment } from './CampusEnvironment'
import { PremiumCube } from './PremiumCube'

type CubeSceneProps = {
  onCursorModeChange: (mode: 'default' | 'grab' | 'grabbing') => void
}

type PointerEventLike = {
  clientX: number
  clientY: number
  pointerId?: number
  stopPropagation?: () => void
  target?: EventTarget | null
  nativeEvent?: PointerEvent
}

export function CubeScene({ onCursorModeChange }: CubeSceneProps) {
  const rigRef = useRef<Group>(null)
  const pointerRef = useRef(new Vector2(0, 0))
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
  })
  const { size } = useThree()
  const isNarrow = size.width < 720
  const cubeScale = isNarrow ? 0.62 : 0.74
  const cubeBaseY = isNarrow ? 0.14 : 0.18
  const platformScale = isNarrow ? 0.7 : 0.8
  const platformBaseY = isNarrow ? 0.08 : -0.05
  const cameraPosition = isNarrow ? ([0, 0.66, 7.4] as const) : ([0, 0.86, 7.45] as const)
  const cameraTargetY = isNarrow ? 0.02 : -0.14

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime()

    if (!rigRef.current) {
      return
    }

    pointerRef.current.lerp(pointer, 0.06)

    const drag = dragRef.current
    drag.yawOffset += drag.velocityX
    drag.pitchOffset += drag.velocityY
    drag.velocityX *= drag.active ? 0.72 : 0.92
    drag.velocityY *= drag.active ? 0.72 : 0.92

    const idleYaw = -0.43 + Math.sin(t * 0.18) * 0.018
    const idlePitch = 0.34 + Math.sin(t * 0.15) * 0.01
    const pointerYaw = drag.active ? 0 : pointerRef.current.x * (isNarrow ? 0.18 : 0.26)
    const pointerPitch = drag.active ? 0 : -pointerRef.current.y * (isNarrow ? 0.1 : 0.13)

    rigRef.current.position.y = cubeBaseY + Math.sin(t * 0.72) * 0.035
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
  })

  useEffect(() => {
    function continueDrag(event: PointerEvent) {
      const drag = dragRef.current

      if (!drag.active || drag.pointerId !== event.pointerId) {
        return
      }

      const deltaX = event.clientX - drag.lastX
      const deltaY = event.clientY - drag.lastY

      drag.velocityX += deltaX * 0.0032
      drag.velocityY += deltaY * 0.0026
      drag.lastX = event.clientX
      drag.lastY = event.clientY
    }

    function endDrag(event: PointerEvent) {
      const drag = dragRef.current

      if (!drag.active || drag.pointerId !== event.pointerId) {
        return
      }

      drag.active = false
      drag.pointerId = -1
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
  }, [onCursorModeChange])

  function handlePointerDown(event: PointerEventLike) {
    event.stopPropagation?.()
    const drag = dragRef.current
    drag.active = true
    drag.pointerId = event.pointerId ?? -1
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.velocityX = 0
    drag.velocityY = 0
    const captureTarget = event.nativeEvent?.target
    if (typeof event.pointerId === 'number' && captureTarget instanceof Element) {
      captureTarget.setPointerCapture?.(event.pointerId)
    }
    onCursorModeChange('grabbing')
  }

  function handlePointerUp(event?: PointerEventLike) {
    const drag = dragRef.current
    drag.active = false
    drag.pointerId = -1
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

      <ambientLight intensity={0.44} />
      <directionalLight position={[3.7, 4.8, 4.6]} intensity={2.8} color={new Color('#d9efff')} castShadow />
      <directionalLight position={[-4.8, 1.8, -3.4]} intensity={1.34} color={new Color('#c28a5a')} />
      <pointLight position={[0, -1.2, 2.1]} intensity={3.6} color={new Color('#78aee6')} distance={8} />
      <pointLight position={[1.2, 0.4, 2.2]} intensity={2.4} color={new Color('#c8efff')} distance={4.5} />
      <spotLight
        position={[0.3, 4.2, 3.4]}
        angle={0.42}
        penumbra={0.78}
        intensity={5.4}
        color={new Color('#f7fbff')}
        castShadow
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
        <PremiumCube />
      </group>

      <group scale={platformScale} position={[0, platformBaseY, 0]}>
        <mesh position={[0, -1.44, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.7, 128]} />
          <meshStandardMaterial color="#05060c" metalness={0.6} roughness={0.38} transparent opacity={0.74} />
        </mesh>

        <mesh position={[0, -1.425, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.16, 160]} />
          <meshBasicMaterial color="#9acbf2" transparent opacity={0.5} />
        </mesh>

        <mesh position={[0, -1.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.78, 1.79, 160]} />
          <meshBasicMaterial color="#c28a5a" transparent opacity={0.28} />
        </mesh>
      </group>

      <Stars radius={25} depth={8} count={180} factor={0.45} saturation={0} fade speed={0.14} />
    </>
  )
}
