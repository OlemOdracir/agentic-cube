import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { CubeScene } from './scene/CubeScene'

export function PremiumCubePrototype() {
  const [cursorMode, setCursorMode] = useState<'default' | 'grab' | 'grabbing'>('default')

  return (
    <main className={`prototype-shell is-${cursorMode}`} aria-label="Premium cube prototype">
      <div className="cube-canvas" aria-hidden="true">
        <Canvas
          camera={{ position: [0, 1.05, 6.8], fov: 42, near: 0.1, far: 80 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
          }}
          shadows
        >
          <Suspense fallback={null}>
            <CubeScene onCursorModeChange={setCursorMode} />
            <EffectComposer multisampling={4}>
              <Bloom intensity={0.74} luminanceThreshold={0.24} luminanceSmoothing={0.56} />
              <Noise opacity={0.025} />
              <Vignette eskil={false} offset={0.18} darkness={0.72} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      <div className="prototype-chrome">
        <div className="prototype-kicker">Agentic design study</div>
        <div className="prototype-mark">Ricardo Portfolio Interface</div>
        <div className="prototype-status">static premium cube pass</div>
      </div>
    </main>
  )
}
