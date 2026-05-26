export type CubeSectionId = 'agentic' | 'products' | 'systems' | 'security' | 'research' | 'contact'

export const CUBE_FACE_ORDER: CubeSectionId[] = ['agentic', 'products', 'systems', 'security', 'research', 'contact']

export const FEATURE_GLYPHS = ['eye', 'shield', 'rocket', 'chart', 'spark', 'lock'] as const
export type FeatureGlyphId = (typeof FEATURE_GLYPHS)[number]

export type CubeSectionFeature = {
  glyph: FeatureGlyphId
  label: string
  description: string
}

export type CubeSectionFlowStep = {
  label: string
  description: string
}

export type CubeSectionCta = {
  label: string
  href?: string
}

export type CubeSectionDetail = {
  title: string
  summary: string
  points?: string[]
  links?: {
    label: string
    description?: string
    href?: string
  }[]
}

export type CubeSection = {
  id: CubeSectionId
  label: string
  title: string
  eyebrow: string
  summary: string
  intro?: string
  highlights?: string[]
  proofPoints?: string[]
  links?: {
    label: string
    description?: string
    href?: string
  }[]
  cta?: CubeSectionCta
  features?: CubeSectionFeature[]
  flowTitle?: string
  flow?: CubeSectionFlowStep[]
  ctaPrimary?: CubeSectionCta
  ctaSecondary?: CubeSectionCta
  detail?: CubeSectionDetail
}

export const CUBE_SECTIONS: CubeSection[] = [
  {
    id: 'agentic',
    label: 'AGENTIC',
    title: 'Agentic Product Engineering',
    eyebrow: 'Positioning',
    summary: 'AI-assisted product development shaped by specs, fast prototypes, and production-minded iteration.',
    features: [
      { glyph: 'eye', label: 'Practical Vision', description: 'Agents that turn intent into measurable results.' },
      { glyph: 'shield', label: 'Verifiable Systems', description: 'Real constraints, observability, auditable decisions.' },
      { glyph: 'rocket', label: 'Design to Production', description: 'Fast prototypes to reliable, scalable solutions.' },
      { glyph: 'chart', label: 'Real Impact', description: 'Value measurable in business and in people.' },
    ],
    flowTitle: 'AGENTIC FLOW',
    flow: [
      { label: 'SPECIFY', description: 'Define objective, context, and verifiable constraints.' },
      { label: 'PROTOTYPE', description: 'Build fast, iterate with real data, validate assumptions.' },
      { label: 'VERIFY', description: 'Measure, test, ensure the agent meets its purpose.' },
      { label: 'SHIP', description: 'Deploy with monitoring, traceability, and continuous control.' },
    ],
    ctaPrimary: { label: 'EXPLORE APPROACH' },
    ctaSecondary: { label: 'VIEW METHODOLOGY' },
  },
  {
    id: 'products',
    label: 'PRODUCTS',
    title: 'Public Products',
    eyebrow: 'Open Source',
    summary: 'Selected tools and product experiments that demonstrate execution, safety, and usability.',
    features: [
      { glyph: 'rocket', label: 'Main Repository', description: 'The project that best shows current direction.' },
      { glyph: 'spark', label: 'This Prototype', description: 'The site itself as evidence of the workflow.' },
      { glyph: 'eye', label: 'Design Judgment', description: 'Choices made under real constraints, not on a whiteboard.' },
      { glyph: 'chart', label: 'Maintainability', description: 'Code that survives past the demo.' },
    ],
    flowTitle: 'RELEASE FLOW',
    flow: [
      { label: 'SCOPE', description: 'Pick what is worth shipping and what is not.' },
      { label: 'BUILD', description: 'Working software over polished promises.' },
      { label: 'HARDEN', description: 'Tests, docs, error paths, observability.' },
      { label: 'PUBLISH', description: 'Open the artifact and own its evolution.' },
    ],
    ctaPrimary: { label: 'OPEN REPOSITORY' },
    ctaSecondary: { label: 'VIEW PROJECTS' },
  },
  {
    id: 'systems',
    label: 'SYSTEMS',
    title: 'Production Systems',
    eyebrow: 'Architecture',
    summary: 'Legacy modernization, databases, architecture, cloud direction, and real operational constraints.',
    features: [
      { glyph: 'shield', label: 'Legacy Modernization', description: 'Move forward without breaking what already works.' },
      { glyph: 'spark', label: 'Data and Integrations', description: 'Schemas, contracts, and reliable boundaries.' },
      { glyph: 'rocket', label: 'Cloud Direction', description: 'A pragmatic path toward serverless and managed services.' },
      { glyph: 'chart', label: 'Operational Continuity', description: 'Uptime, runbooks, and humane on-call.' },
    ],
    flowTitle: 'DELIVERY FLOW',
    flow: [
      { label: 'OBSERVE', description: 'See the real system before changing it.' },
      { label: 'CONTAIN', description: 'Stabilize the riskiest seams first.' },
      { label: 'EVOLVE', description: 'Incremental rewrites under feature flags.' },
      { label: 'OPERATE', description: 'Logs, metrics, traces, and clear ownership.' },
    ],
    ctaPrimary: { label: 'VIEW ARCHITECTURE' },
    ctaSecondary: { label: 'CASE STUDIES' },
  },
  {
    id: 'security',
    label: 'SECURITY',
    title: 'Security Mindset',
    eyebrow: 'Risk Control',
    summary: 'Secure defaults, MFA, rate limiting, validation, and production risk awareness.',
    features: [
      { glyph: 'lock', label: 'Secure Defaults', description: 'Least privilege, no secrets in repos, signed releases.' },
      { glyph: 'shield', label: 'Strong Auth', description: 'MFA, short-lived tokens, audit trail.' },
      { glyph: 'eye', label: 'Input Validation', description: 'Schema-first inputs, rate limits, abuse controls.' },
      { glyph: 'chart', label: 'Risk Proportion', description: 'Controls matched to actual blast radius.' },
    ],
    flowTitle: 'CONTROLS FLOW',
    flow: [
      { label: 'INVENTORY', description: 'Know what you protect and why.' },
      { label: 'HARDEN', description: 'MFA, secrets, dependency hygiene, WAF where it pays.' },
      { label: 'MONITOR', description: 'Detect abuse, log carefully, avoid sensitive content in logs.' },
      { label: 'RESPOND', description: 'Rotate, contain, write a clean post-mortem.' },
    ],
    ctaPrimary: { label: 'VIEW CONTROLS' },
    ctaSecondary: { label: 'THREAT MODEL' },
  },
  {
    id: 'research',
    label: 'RESEARCH',
    title: 'Independent Research',
    eyebrow: 'Research',
    summary: 'Work on AI, thought, truth, representation, papers, and long-form writing.',
    features: [
      { glyph: 'spark', label: 'Theme: Thought', description: 'How representation shapes what a system can know.' },
      { glyph: 'eye', label: 'Theme: Truth', description: 'Honest interfaces, faithful summaries, no hallucinated UX.' },
      { glyph: 'shield', label: 'Theme: AI Use', description: 'Augmentation with auditability, not replacement.' },
      { glyph: 'chart', label: 'Theme: Writing', description: 'Long-form drafts that hold up under their own claims.' },
    ],
    flowTitle: 'INQUIRY FLOW',
    flow: [
      { label: 'QUESTION', description: 'Frame what is actually unknown.' },
      { label: 'READ', description: 'Build a small, well-cited prior map.' },
      { label: 'DRAFT', description: 'Argue in writing, not in slides.' },
      { label: 'PUBLISH', description: 'Curated, never a dump.' },
    ],
    ctaPrimary: { label: 'READ PAPERS' },
    ctaSecondary: { label: 'OPEN NOTES' },
  },
  {
    id: 'contact',
    label: 'CONTACT',
    title: 'Contact',
    eyebrow: 'Reach Out',
    summary: 'Professional links and contact channels for collaboration and opportunities.',
    features: [
      { glyph: 'spark', label: 'Public Name', description: 'Ricardo Hernan Melo Gallardo.' },
      { glyph: 'rocket', label: 'GitHub', description: 'Open-source work and this prototype.' },
      { glyph: 'eye', label: 'LinkedIn', description: 'Professional context and history.' },
      { glyph: 'shield', label: 'Email', description: 'Direct, low-noise channel for opportunities.' },
    ],
    flowTitle: 'CHANNELS',
    flow: [
      { label: 'OPEN', description: 'Inbox is open for serious collaboration.' },
      { label: 'BRIEF', description: 'Send context: role, scope, constraints.' },
      { label: 'MEET', description: 'Short call to align on fit and scope.' },
      { label: 'COMMIT', description: 'Move only when both sides see the value.' },
    ],
    ctaPrimary: { label: 'WRITE AN EMAIL' },
    ctaSecondary: { label: 'OPEN GITHUB' },
  },
]
