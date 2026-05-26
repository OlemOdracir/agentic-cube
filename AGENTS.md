# Agent Orientation

This project is an open-source, agentic portfolio/product prototype for Ricardo Melo.

Before making product, content, UI, or architecture changes, read:

- `docs/site-brief.md`
- `docs/visual-direction.md`
- `docs/agent-rules.md`
- `docs/content-strategy.md`
- `docs/production-roadmap.md`
- `docs/tailwind-foundation.md`

## Product Positioning

The project is not a public CV. It is a visible, open-source proof of transition from senior software engineering into Agentic Product Engineering.

Primary public identity:

- Human-facing name: Ricardo Melo
- SEO/legal full name: Ricardo Hernan Melo Gallardo
- Technical handle: OlemOdracir

Primary audience:

- Recruiters who already saw or may see the CV.
- AI/recruiter systems that parse public profiles and project pages.
- Developers are a secondary audience.

## Experience Architecture (Current Direction)

The site is a **single-screen experience** built around a persistent obsidian cube.

- The cube stays visible at the center of the screen at all times on desktop.
- Selecting a face does **not** navigate to a separate page or full-screen overlay. Instead, the surrounding side panels update in place to reveal that face's minimal content.
- Layout (desktop): cube center, primary narrative on the left rail, supporting structure (process / metrics / numbered flow) on the right rail, breadcrumb/section navigation on the bottom strip.
- Content per face is intentionally minimal: it must fit a single viewport without scroll on a standard 1440-1920px desktop. No long-form essays inside the cube experience.
- Responsive: on narrow viewports the side panels collapse below/above the cube while the cube remains the visual anchor.
- The prior "cube → full-page section route" pattern is deprecated. Existing full-page panels remain in code as legacy until the side-panel layout replaces them.

## Core Rules

- The cube is the **persistent focal element**, not a one-shot portal.
- Selecting a face reveals minimal in-place content on the surrounding side panels; the cube does not disappear.
- Each face's content must fit a single viewport on desktop without scrolling; treat the layout as a poster, not a page.
- Side panels must be responsive: collapse gracefully on narrow viewports.
- Do not publish the full CV.
- Do not publish private/personal production content in the public repo.
- Do not use `Bloom` in production; it caused visible flicker.
- Do not add automatic audio. Audio must be user-gesture driven and subtle.
- Keep the visual system premium, sober, technical, and editorial — purple/violet volumetric glow is the signature ambient, not generic SaaS gradients.
- Behind the cube, target a slowly animated violet "wave-field" (point-and-line mesh moving like a calm sea). It must reinforce the cube, never compete with it.
- Every meaningful implementation must pass `npm run build` and `npm run lint`.
- Preserve the existing React + TypeScript + Vite + Three.js foundation unless a spec justifies a change.
