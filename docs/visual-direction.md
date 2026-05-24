# Visual Direction: Obsidian Interface System

## North Star

The visual system should feel like polished obsidian: dark, precise, reflective, quiet, and premium. It should signal engineering discipline and independent thought, not generic startup energy.

## Core Aesthetic

- Material: polished obsidian, dark glass, mineral reflection.
- Light: controlled highlights, ice-blue glints, restrained warm reflection.
- Tone: technical, editorial, serious, calm.
- Motion: deliberate, slow enough to feel intentional, never flashy.
- Sound: subtle glass/cup resonance, only after user interaction.

## Current Design Language

Name: Obsidian Technical Luxury.

The design should read as premium because it is precise, not because it is decorated. Use restraint:

- Use black glass surfaces, fine mineral borders, and controlled reflection.
- Use copper/gold only as a micro-accent: numeration, corner marks, active states, and thin rules.
- Use ice-blue for technical signal: glyphs, focus lines, status, and spatial depth.
- Prefer custom geometric glyphs over generic icon packs when the symbol is part of the cube language.
- Avoid filling empty space with decoration unless it reinforces navigation, structure, or hierarchy.

## Cube Rules

- The cube is the portal.
- The page is the destination.
- Once a face is entered, the cube must disappear and content becomes normal static HTML.
- The cube should not remain as a decorative background behind content.
- Avoid postprocessing that creates instability.
- `Bloom` is prohibited for production because it caused visible flicker.

## Background

Default:

- Charcoal/black background.
- Minimal grid/noise only if extremely subtle.
- The cube remains the focal point.

Environment reflection:

- Warmth should come from reflection, not from a busy background.
- Avoid green tint dominating the cube.
- Prefer high-contrast light bands, pale sky, distant dark forms, and subtle gold/ice highlights.

## Page Style

Pages entered from the cube should be:

- Static and readable.
- Editorial, not card-heavy.
- Spacious but not empty.
- Built for recruiters and AI parsers.
- Semantic HTML first, visual enhancement second.

Surface rules:

- Cards should feel like polished obsidian panels: dark, reflective, thin bordered, and responsive to the pointer.
- Cards may use tiny corner marks, inner highlights, and cursor-following light.
- Do not nest cards inside cards.
- Do not use large rounded SaaS-style cards.
- Repeated cards should share a common interaction model and visual grammar.

Transition rules:

- Clicking a face should feel like entering that face, not like opening a separate route.
- Use a brief aperture/scan-light transition from cube to page.
- Once the page is visible, the cube must be gone.
- The page may preserve the selected face's glyph and accent color as continuity.

## Color Tokens

Working palette:

- `obsidian-950`: `#020307`
- `obsidian-900`: `#05070d`
- `obsidian-800`: `#090d14`
- `ice-300`: `#9acbf2`
- `ice-100`: `#eef7ff`
- `mineral-500`: `#8a97a6`
- `copper-400`: `#c08b5a`
- `glass-line`: `rgba(222, 232, 242, 0.14)`

## Typography

- Use a sober sans-serif.
- Avoid oversized marketing headlines except on true section entrances.
- Use tight, readable editorial blocks.
- Letter spacing should be restrained.

## Motion

- Use 400-900ms transitions for page/cube shifts.
- Use smooth cubic easing.
- No bounce effects.
- No permanent distracting motion.
- Respect future reduced-motion support.

## Prohibited Visual Patterns

- Generic purple gradients.
- Decorative orb/bokeh backgrounds.
- Excessive cards.
- Floating nested cards.
- Busy sci-fi dashboards.
- Hero sections that look like a SaaS template.
- Bloom-driven glow.
- Stock-like imagery that does not reveal useful meaning.
- Gold ornament used as luxury decoration without structural purpose.
- Icon styles that do not match the cube glyph geometry.

## Tailwind Policy

Tailwind is allowed and recommended for the static pages and future admin UI, but only after tokens and rules are defined.

- Tailwind should implement the visual system, not replace it.
- Avoid arbitrary colors except for documented exceptions.
- Keep Three.js/canvas visuals controlled by scene code.
- Prefer reusable components for repeated page patterns.
