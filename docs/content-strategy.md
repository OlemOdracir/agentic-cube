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
