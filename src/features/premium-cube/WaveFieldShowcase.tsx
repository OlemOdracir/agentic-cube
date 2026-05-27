import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CityCorridorField } from './scene/CityCorridorField'
import { WaveField } from './scene/WaveField'

export function WaveFieldShowcase() {
  const variant =
    typeof window === 'undefined' ? 'wave' : new URLSearchParams(window.location.search).get('bg') === 'city' ? 'city' : 'wave'
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
          camera={{ position: variant === 'city' ? [0, 1.9, 10.8] : [0, 0.55, 4.6], fov: variant === 'city' ? 52 : 48, near: 0.1, far: 80 }}
          dpr={[1.5, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={['#08050d']} />
            <fog attach="fog" args={['#08050d', variant === 'city' ? 14 : 9, variant === 'city' ? 40 : 28]} />
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
          <span>{variant === 'city' ? 'CITY-CORRIDOR' : 'WAVE-FIELD'}</span>
          <small>
            {variant === 'city'
              ? '?bg=city · vector street · lamp glow'
              : '?bg=only · plexus topography · particles + distance lines'}
          </small>
        </div>
        <a href={typeof window !== 'undefined' ? window.location.pathname : '/'}>← back to cube</a>
      </header>
    </main>
  )
}
