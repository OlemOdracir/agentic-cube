import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
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
  const sectionPanelRef = useRef<HTMLElement | null>(null)
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
  const activeSectionIndex = activeSection ? sections.findIndex((section) => section.id === activeSection.id) + 1 : 0
  const sectionCopy =
    locale === 'es'
      ? { highlights: 'Enfoque', proof: 'Evidencia', links: 'Enlaces', faces: 'Caras', back: 'Volver al cubo' }
      : { highlights: 'Focus', proof: 'Evidence', links: 'Links', faces: 'Faces', back: 'Back to cube' }

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

  useEffect(() => {
    sectionPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeSectionId])

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

      <section className="section-panel" aria-hidden={!activeSection} ref={sectionPanelRef}>
        {activeSection && (
          <div className="section-panel__inner">
            <nav className="section-panel__face-nav" aria-label={sectionCopy.faces}>
              <span>{sectionCopy.faces}</span>
              <div>
                {sections.map((section, index) => (
                  <button
                    aria-current={section.id === activeSection.id ? 'page' : undefined}
                    className={section.id === activeSection.id ? 'is-active' : ''}
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <strong>{String(index + 1).padStart(2, '0')}</strong>
                    {section.label}
                  </button>
                ))}
              </div>
            </nav>

            <div className="section-panel__masthead">
              <div className="section-panel__index" aria-hidden="true">
                {String(activeSectionIndex).padStart(2, '0')}
              </div>
              <div className="section-panel__title-block">
                <p className="section-panel__eyebrow">{activeSection.eyebrow}</p>
                <h1>{activeSection.title}</h1>
              </div>
              <div className="section-panel__summary-block">
                <p className="section-panel__section-label">{activeSection.label}</p>
                <p className="section-panel__summary">{activeSection.summary}</p>
              </div>
            </div>

            <div className="section-panel__body">
              <div className="section-panel__rail" aria-hidden="true" />
              <div className="section-panel__narrative">
                {activeSection.intro && <p className="section-panel__intro">{activeSection.intro}</p>}
                {activeSection.highlights && activeSection.highlights.length > 0 && (
                  <section className="section-panel__chapter" aria-label="Highlights">
                    <h2>{sectionCopy.highlights}</h2>
                    <div className="section-panel__content-grid">
                      {activeSection.highlights.map((highlight, index) => (
                        <article className="section-panel__highlight" key={highlight}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <p>{highlight}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                {activeSection.proofPoints && activeSection.proofPoints.length > 0 && (
                  <section className="section-panel__proof" aria-label="Proof points">
                    <h2>{sectionCopy.proof}</h2>
                    <ul>
                      {activeSection.proofPoints.map((proofPoint) => (
                        <li key={proofPoint}>{proofPoint}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {activeSection.links && activeSection.links.length > 0 && (
                  <section className="section-panel__links" aria-label={sectionCopy.links}>
                    <h2>{sectionCopy.links}</h2>
                    <div>
                      {activeSection.links.map((link) =>
                        link.href ? (
                          <a href={link.href} key={link.label} rel="noreferrer" target="_blank">
                            <span>{link.label}</span>
                            {link.description && <p>{link.description}</p>}
                          </a>
                        ) : (
                          <article key={link.label}>
                            <span>{link.label}</span>
                            {link.description && <p>{link.description}</p>}
                          </article>
                        ),
                      )}
                    </div>
                  </section>
                )}
                <div className="section-panel__actions">
                  {activeSection.cta?.href && (
                    <a className="section-panel__cta" href={activeSection.cta.href} rel="noreferrer" target="_blank">
                      {activeSection.cta.label}
                    </a>
                  )}
                  <button type="button" onClick={() => setActiveSectionId(null)}>
                    {sectionCopy.back}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
