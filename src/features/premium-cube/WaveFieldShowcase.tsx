import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { WaveField } from './scene/WaveField'

export function WaveFieldShowcase() {
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
          camera={{ position: [0, 0.55, 4.6], fov: 48, near: 0.1, far: 80 }}
          dpr={[1.5, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <color attach="background" args={['#08050d']} />
            <fog attach="fog" args={['#08050d', 9, 28]} />
            <ambientLight intensity={0.18} />
            <WaveField position={[0, -0.8, -1.4]} rotation={[-Math.PI / 2.3, 0, 0]} />
          </Suspense>
        </Canvas>
      </div>

      <header className="wave-showcase__chrome">
        <div>
          <span>WAVE-FIELD</span>
          <small>?bg=only · plexus topography · particles + distance lines</small>
        </div>
        <a href={typeof window !== 'undefined' ? window.location.pathname : '/'}>← back to cube</a>
      </header>
    </main>
  )
}
