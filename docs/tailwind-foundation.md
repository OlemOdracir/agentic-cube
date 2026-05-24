# Tailwind Foundation

Tailwind is used as the implementation layer for static pages and future admin UI. It must follow the Obsidian Interface System defined in `docs/visual-direction.md`.

## Current Setup

- Tailwind is installed through `@tailwindcss/vite`.
- Tokens are defined in `src/index.css` using Tailwind v4 `@theme`.
- Existing Three.js scene styling remains controlled by scene code and focused CSS.

## Token Rules

Use project tokens first:

- `obsidian-950`
- `obsidian-900`
- `obsidian-800`
- `ice-300`
- `ice-100`
- `mineral-500`
- `copper-400`

Avoid arbitrary colors unless there is a documented design reason.

## Usage Rules

- Use Tailwind for static page layouts, typography, spacing, and future admin UI.
- Do not use Tailwind to improvise around the cube material or 3D scene.
- Prefer reusable React components for repeated page patterns.
- Do not introduce generic SaaS/landing-page visual patterns.
- Keep pages semantic and readable for recruiters and AI parsers.

## Next Components

Planned components:

- `StaticPageShell`
- `SectionHero`
- `ProjectEntry`
- `CapabilityBlock`
- `ResearchNote`
- `ContactPanel`
- `LanguageToggle`
