# Agent Orientation

This project is an open-source, agentic portfolio/product prototype for Ricardo Melo.

Before making product, content, UI, or architecture changes, read:

- `docs/site-brief.md`
- `docs/visual-direction.md`
- `docs/agent-rules.md`
- `docs/content-strategy.md`
- `docs/production-roadmap.md`

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

## Core Rules

- The cube is a portal, not permanent decoration.
- After entering a cube face, the page becomes normal static content.
- Do not publish the full CV.
- Do not publish private/personal production content in the public repo.
- Do not use `Bloom` in production; it caused visible flicker.
- Do not add automatic audio. Audio must be user-gesture driven and subtle.
- Keep the visual system premium, sober, technical, and editorial.
- Every meaningful implementation must pass `npm run build` and `npm run lint`.
- Preserve the existing React + TypeScript + Vite + Three.js foundation unless a spec justifies a change.
