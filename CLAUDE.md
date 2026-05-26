# Claude Code Orientation

This project uses `AGENTS.md` as the canonical orientation file. Read it first.

Then read the supporting docs in order of relevance for the change you are about to make:

- `docs/site-brief.md` — product purpose, identity, audience, cube faces
- `docs/visual-direction.md` — Obsidian Interface System, materials, motion, layout
- `docs/agent-rules.md` — product, design, engineering, open-source, commit rules
- `docs/content-strategy.md` — bilingual content schema and privacy
- `docs/production-roadmap.md` — phased plan
- `docs/tailwind-foundation.md` — Tailwind tokens once introduced

## Quick Reference (do not let this drift from AGENTS.md)

- The cube is a **persistent focal element** at screen center, not a one-shot portal.
- Selecting a face updates **side panels** in place with minimal content; the cube stays visible.
- Each face's content fits a single viewport on desktop with no scroll; responsive collapse on mobile.
- No `Bloom`, no auto-playing audio, no generic SaaS gradients.
- Purple/violet volumetric ambient is the signature; obsidian black is the surface.
- Target background: a slow violet "wave-field" point-and-line mesh behind the cube that moves like a calm sea.
- Always run `npm run build` and `npm run lint` before reporting completion.
- Preserve React + TypeScript + Vite + Three.js stack unless a spec justifies a change.

If `AGENTS.md` and this file disagree, `AGENTS.md` wins.
