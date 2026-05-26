# Agent Rules

These rules guide future AI-assisted development sessions.

## Before Editing

1. Read `AGENTS.md`.
2. Read relevant docs in `docs/`.
3. Check `git status --short`.
4. Preserve user changes.
5. Keep changes scoped to the current hito.

## Product Rules

- Do not turn the site into a CV.
- Keep the primary message around Agentic Product Engineering.
- Preserve the distinction between public example content and private personal content.
- Do not expose private client details or sensitive history.
- Every visible page should be understandable by a recruiter in under 30 seconds.
- Every visible page should also contain semantic text useful to search and AI parsers.

## Design Rules

- Follow the Obsidian Interface System.
- The cube is the **persistent focal element** at screen center; selecting a face updates side panels in place, the cube does not disappear.
- Each face's primary content must fit a single viewport on desktop with no scroll, and must collapse responsively on narrow viewports.
- Long-form deep-dive pages (methodology, project archive, research index) live on separate routes reached from side-panel CTAs.
- Do not use `Bloom` in production.
- Do not add auto-playing sound.
- Permanent motion is allowed only when it reinforces the obsidian-ambient identity (e.g. the violet wave-field background); never as random decoration.
- Verify desktop and mobile after meaningful visual changes (use Playwright when available).
- Avoid design drift: no generic gradients, cards, or landing page templates.
- All six cube faces share the same visual grammar (diamond glyph, inset bevel, corner brackets); only the section label changes.

## Engineering Rules

- Use React + TypeScript + Vite as the frontend base.
- Use Three.js/React Three Fiber for 3D.
- Tailwind may be introduced for pages/admin once configured with project tokens.
- Prefer structured content with schema validation.
- Run `npm run build` and `npm run lint` before reporting completion.
- Keep public repo content safe and generic.
- Use specs for large changes.

## Open Source Rules

- Public repo should be reusable by others.
- Provide example content.
- Do not commit `public/content/site.en.json` or `public/content/site.es.json`.
- Commit `public/content/site.example.en.json` and `public/content/site.example.es.json`.
- README must explain setup, content strategy, and project intent.

## Commit Rules

- Commit only coherent milestones.
- Commit messages should describe the product hito.
- Do not mix unrelated refactors with feature changes.
