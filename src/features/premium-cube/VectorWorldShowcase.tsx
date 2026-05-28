import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { CUBE_FACE_ORDER } from './cubeSections'
import type { CubeSectionId } from './cubeSections'
import { VECTOR_WORLD_THEME } from './scene/vector-worlds/base/theme'
import { isWorldId, WORLD_REGISTRY } from './scene/vector-worlds/registry'

// Drives the showcase camera to look at a fixed target each frame. Used when
// a world wants the showcase view to tilt away from origin (e.g. RESEARCH
// pointing up at the sky).
function CameraLookAt({ target }: { target: readonly [number, number, number] }) {
  const vec = useMemo(() => new Vector3(target[0], target[1], target[2]), [target])
  useFrame(({ camera }) => {
    camera.lookAt(vec)
  })
  return null
}

function readWorldId(): CubeSectionId {
  if (typeof window === 'undefined') return 'agentic'
  const bg = new URLSearchParams(window.location.search).get('bg')
  if (bg && isWorldId(bg)) return bg
  return 'agentic'
}

export function VectorWorldShowcase() {
  const worldId = readWorldId()
  const entry = WORLD_REGISTRY[worldId]
  const { Component, showcase, label, caption } = entry

  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }))

  useEffect(() => {
    function syncViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    syncViewport()
    window.addEventListener('resize', syncViewport)
    window.addEventListener('orientationchange', syncViewport)
    return () => {
      window.removeEventListener('resize', syncViewport)
      window.removeEventListener('orientationchange', syncViewport)
    }
  }, [])

  // Arrow keys cycle through worlds — fast iteration during design work.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const currentIndex = CUBE_FACE_ORDER.indexOf(worldId)
      if (currentIndex === -1) return
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const nextIndex = (currentIndex + delta + CUBE_FACE_ORDER.length) % CUBE_FACE_ORDER.length
      window.location.search = `?bg=${CUBE_FACE_ORDER[nextIndex]}`
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [worldId])

  const worldOptions = useMemo(
    () => CUBE_FACE_ORDER.map((id) => ({ id, label: WORLD_REGISTRY[id].label })),
    [],
  )

  const showcaseProps = showcase.props ?? {}
  // Systems world owns its CameraLookAt; expose it via prop when previewed standalone.
  const extraProps = worldId === 'systems' ? { controlsCamera: true, fogLines: true, skylineDepthTest: false } : {}

  return (
    <main
      className="wave-showcase"
      aria-label="Vector world showcase"
      style={{ width: viewport.width || '100vw', height: viewport.height || '100vh' }}
    >
      <div
        className="wave-showcase__canvas"
        style={{ width: viewport.width || '100vw', height: viewport.height || '100vh' }}
      >
        <Canvas
          camera={showcase.camera}
          dpr={[1.5, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={[VECTOR_WORLD_THEME.background]} />
            <fog attach="fog" args={[VECTOR_WORLD_THEME.background, showcase.fog.near, showcase.fog.far]} />
            <ambientLight intensity={0.18} />
            {showcase.lookAt && <CameraLookAt target={showcase.lookAt} />}
            <Component {...showcaseProps} {...extraProps} />
          </Suspense>
        </Canvas>
      </div>

      <header className="wave-showcase__chrome">
        <div>
          <span>{label}</span>
          <small>?bg={worldId} — {caption} — ←/→ to cycle</small>
        </div>
        <nav className="wave-showcase__switcher" aria-label="Switch world">
          {worldOptions.map((option) => (
            <a
              key={option.id}
              href={`?bg=${option.id}`}
              aria-current={option.id === worldId ? 'page' : undefined}
              className={option.id === worldId ? 'is-active' : undefined}
            >
              {option.id}
            </a>
          ))}
        </nav>
        <a href={typeof window !== 'undefined' ? window.location.pathname : '/'}>back to cube</a>
      </header>
    </main>
  )
}
