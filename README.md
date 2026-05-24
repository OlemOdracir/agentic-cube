# Agentic Cube Prototype

Open-source agentic portfolio prototype for Ricardo Melo.

This project is not a public CV. It is a visible product artifact for a transition into Agentic Product Engineering: building AI-assisted products with real production systems experience, security awareness, open-source practice, and independent research depth.

## Current Concept

- Premium Three.js cube as an entry portal.
- Polished obsidian visual direction.
- Procedural glass/cup resonance audio.
- Face-to-page transition.
- Static readable pages after entering a cube face.
- Public example content with private deploy content kept out of Git.

## Stack

- React
- TypeScript
- Vite
- Three.js / React Three Fiber
- Drei
- Web Audio API
- Tailwind CSS

Planned:

- Structured bilingual content loader.
- Spec-driven development workflow.
- Future admin content panel.
- Future AWS production deployment.

## Getting Started

```bash
npm install
npm run dev
```

Run checks:

```bash
npm run build
npm run lint
```

## Development Orientation

Before making product, design, content, or architecture changes, read:

- `AGENTS.md`
- `docs/site-brief.md`
- `docs/visual-direction.md`
- `docs/agent-rules.md`
- `docs/content-strategy.md`
- `docs/production-roadmap.md`

## Content Strategy

The repository includes example content:

- `public/content/site.example.en.json`
- `public/content/site.example.es.json`

Personal deployment content should use:

- `public/content/site.en.json`
- `public/content/site.es.json`

Those private files are ignored by Git.

## Visual Direction

The project follows the Obsidian Interface System:

- Dark, premium, sober, technical.
- The cube is a portal, not permanent decoration.
- After entering a face, the site becomes normal static content.
- No production `Bloom`; it caused visible flicker.
- Audio is subtle and only starts after user interaction.

## License

MIT
