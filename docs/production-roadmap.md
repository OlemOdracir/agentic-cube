# Production Roadmap

## Phase 0: Concept Lock

Status: in progress.

- Premium cube portal.
- Obsidian visual direction.
- Procedural glass audio.
- Face-to-page transition.
- Environment reflection experiments.
- Agent rules and content strategy.

## Phase 1: Static Public MVP

Goal: publish a polished, indexable, bilingual site without backend complexity.

- Tailwind configured with project tokens.
- Structured content loader.
- Example public content.
- Private deploy content ignored by Git.
- Six static pages from cube faces.
- SEO metadata and JSON-LD.
- README and license.
- Static deploy.

## Phase 2: Spec-Driven Development

Goal: use Spec Kit or equivalent spec-driven process for future milestones.

Suggested specs:

- `001-content-system`
- `002-static-pages`
- `003-tailwind-design-system`
- `004-contact-channel`
- `005-admin-content-panel`
- `006-aws-production-deploy`

## Phase 3: Admin Content Panel

Goal: make content editable without changing code.

- Authenticated admin.
- Content CRUD.
- Preview before publish.
- Schema validation.
- Audit trail.
- Safe publishing flow.

## Phase 4: AWS Production Architecture

Goal: use the project as a real AWS learning and portfolio artifact.

Possible architecture:

- S3 + CloudFront for static site.
- Route 53 or Cloudflare DNS.
- Lambda/API Gateway or Hono serverless API.
- DynamoDB or PostgreSQL depending on content/admin needs.
- Cognito or equivalent for admin auth/MFA.
- Secrets Manager or Parameter Store.
- WAF if public dynamic endpoints become meaningful.
- CI/CD through GitHub Actions.

## Security Baseline

- No secrets in repo.
- Private content gitignored.
- Dependency updates monitored.
- Contact form must have abuse controls before launch.
- Admin must require MFA.
- Public API endpoints must be rate limited.
- Logs must avoid storing sensitive content unnecessarily.
