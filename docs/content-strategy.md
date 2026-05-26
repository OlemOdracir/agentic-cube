# Content Strategy

## Goals

- Support bilingual content.
- Keep the public repo free of private personal content.
- Make the site readable by humans and machines.
- Allow a future admin panel to manage the same schema.

## Languages

Primary language:

- English

Secondary language:

- Spanish

Runtime language behavior:

- `?lang=en` forces English.
- `?lang=es` forces Spanish.
- Without explicit language, use `navigator.language`.
- If the browser language starts with `es`, use Spanish.
- Otherwise use English.

## Content Files

Public example content:

- `public/content/site.example.en.json`
- `public/content/site.example.es.json`

Private deploy content:

- `public/content/site.en.json`
- `public/content/site.es.json`

The private files must be gitignored.

## Face Content Model

The home experience is not a page. It is a single-screen scene built around the persistent cube, so each face needs two content levels:

Primary scene content:

- `title`: two to four strong words.
- `summary`: one compact thesis line.
- `features`: three or four named signals for the left rail.
- `flowTitle`: short technical label for the right rail.
- `flow`: four short procedural steps.
- `ctaPrimary` and `ctaSecondary`: one opens detail, one may link outward when justified.

Extended content:

- `detail.title`
- `detail.summary`
- `detail.points`
- `detail.links`

Use `detail` for information that is useful but too dense for the main scene. Do not push long-form paragraphs into the left or right rails. The modal may hold context, external links, contact channels, methodology notes, or evidence summaries. Full essays and project archives still belong on future deep-dive routes.

## Loading Strategy

For a requested language:

1. Try `/content/site.{lang}.json`.
2. If missing, fall back to `/content/site.example.{lang}.json`.
3. Validate shape before rendering.
4. If validation fails, fall back to embedded defaults.

## Future Admin Panel

The admin panel should not invent a new content model. It should edit the same schema used by the static JSON files.

Future flow:

1. Admin edits private content.
2. Content is validated.
3. Content is published as JSON.
4. Public site reads published JSON.

## Privacy

Do not publish:

- Full CV.
- Private phone numbers.
- Sensitive client details.
- Internal project names not already public.
- Unreleased philosophical manuscripts unless intentionally published.

Do publish:

- Public name and professional positioning.
- GitHub handle.
- LinkedIn URL.
- Professional email or future domain email.
- Selected public projects.
- Short research framing.
