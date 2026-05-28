import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CityCorridorField } from './scene/CityCorridorField'
import { VECTOR_WORLD_PRESETS, VECTOR_WORLD_STYLE } from './scene/vectorWorldConfig'
import type { VectorWorldPreset } from './scene/vectorWorldConfig'
import { WaveField } from './scene/WaveField'

function readVectorWorldPreset(): VectorWorldPreset {
  if (typeof window === 'undefined') return 'wave'
  const bg = new URLSearchParams(window.location.search).get('bg')
  return typeof bg === 'string' && bg in VECTOR_WORLD_PRESETS ? (bg as VectorWorldPreset) : 'wave'
}

export function WaveFieldShowcase() {
  const variant = readVectorWorldPreset()
  const preset = VECTOR_WORLD_PRESETS[variant]
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

  return (
    <main
      className="wave-showcase"
      aria-label="Wave-field showcase"
      style={{ width: viewport.width || '100vw', height: viewport.height || '100vh' }}
    >
      <div
        className="wave-showcase__canvas"
        style={{ width: viewport.width || '100vw', height: viewport.height || '100vh' }}
      >
        <Canvas
          camera={preset.camera}
          dpr={[1.5, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={[VECTOR_WORLD_STYLE.background]} />
            <fog attach="fog" args={[VECTOR_WORLD_STYLE.background, preset.fog.near, preset.fog.far]} />
            <ambientLight intensity={0.18} />
            {variant === 'city' ? (
              <CityCorridorField />
            ) : (
              <WaveField position={[0, -0.8, -1.4]} rotation={[-Math.PI / 2.3, 0, 0]} />
            )}
          </Suspense>
        </Canvas>
      </div>

      <header className="wave-showcase__chrome">
        <div>
          <span>{preset.label}</span>
          <small>{preset.caption}</small>
        </div>
        <a href={typeof window !== 'undefined' ? window.location.pathname : '/'}>back to cube</a>
      </header>
    </main>
  )
}
