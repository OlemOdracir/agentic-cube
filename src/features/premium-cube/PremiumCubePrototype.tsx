import { Suspense, useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import type { CubeSectionId } from './cubeSections'
import { useSiteContent } from './content/useSiteContent'
import { readDiagnosticFx } from './diagnosticFx'
import { CubeScene } from './scene/CubeScene'

export function PremiumCubePrototype() {
  const [cursorMode, setCursorMode] = useState<'default' | 'grab' | 'grabbing'>('default')
  const [activeSectionId, setActiveSectionId] = useState<CubeSectionId | null>(null)
  const { content, locale, sections, setLocale } = useSiteContent()
  const [effects] = useState(() => readDiagnosticFx())
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }))
  const postProcessingEffects = [
    effects.bloom ? <Bloom key="bloom" intensity={0.58} luminanceThreshold={0.3} luminanceSmoothing={0.62} /> : null,
    effects.noise ? <Noise key="noise" opacity={0.025} /> : null,
    effects.vignette ? <Vignette key="vignette" eskil={false} offset={0.18} darkness={0.72} /> : null,
  ].filter((effect): effect is ReactElement => effect !== null)
  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeSectionId) ?? null,
    [activeSectionId, sections],
  )

  useEffect(() => {
    function syncViewport() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
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
      className={`prototype-shell is-${cursorMode} ${activeSection ? 'has-section' : ''}`}
      aria-label="Premium cube prototype"
      style={{ width: viewport.width || '100vw', height: viewport.height || '100vh' }}
    >
      <div
        className="cube-canvas"
        aria-hidden="true"
        style={{ width: viewport.width || '100vw', height: viewport.height || '100vh' }}
      >
        <Canvas
          camera={{ position: [0, 1.05, 6.8], fov: 42, near: 0.1, far: 80 }}
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          shadows={effects.shadows}
        >
          <Suspense fallback={null}>
            <CubeScene
              effects={effects}
              onCursorModeChange={setCursorMode}
              onSectionEnter={(sectionId) => {
                setActiveSectionId(sectionId)
              }}
              sectionOpen={activeSection !== null}
              sections={sections}
            />
            {postProcessingEffects.length > 0 && (
              <EffectComposer multisampling={4}>{postProcessingEffects}</EffectComposer>
            )}
          </Suspense>
        </Canvas>
      </div>

      <div className="prototype-chrome">
        <div className="prototype-kicker">Agentic design study</div>
        <div className="prototype-mark">{content.identity.displayName} Interface</div>
        <div className="prototype-status">static premium cube pass</div>
      </div>

      <div className="language-toggle" aria-label="Language">
        <button
          aria-pressed={locale === 'en'}
          className={locale === 'en' ? 'is-active' : ''}
          type="button"
          onClick={() => setLocale('en')}
        >
          EN
        </button>
        <button
          aria-pressed={locale === 'es'}
          className={locale === 'es' ? 'is-active' : ''}
          type="button"
          onClick={() => setLocale('es')}
        >
          ES
        </button>
      </div>

      <section className="section-panel" aria-hidden={!activeSection}>
        {activeSection && (
          <div className="section-panel__inner">
            <p className="section-panel__eyebrow">{activeSection.eyebrow}</p>
            <h1>{activeSection.title}</h1>
            <p>{activeSection.summary}</p>
            <button type="button" onClick={() => setActiveSectionId(null)}>
              Back to cube
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
