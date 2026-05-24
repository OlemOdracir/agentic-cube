export type CubeSectionId = 'agentic' | 'products' | 'systems' | 'security' | 'research' | 'contact'

export const CUBE_FACE_ORDER: CubeSectionId[] = ['agentic', 'products', 'systems', 'security', 'research', 'contact']

export type CubeSection = {
  id: CubeSectionId
  label: string
  title: string
  eyebrow: string
  summary: string
}

export const CUBE_SECTIONS: CubeSection[] = [
  {
    id: 'agentic',
    label: 'AGENTIC',
    title: 'Agentic Product Engineering',
    eyebrow: 'Positioning',
    summary: 'AI-assisted product development shaped by specs, fast prototypes, and production-minded iteration.',
  },
  {
    id: 'products',
    label: 'PRODUCTS',
    title: 'Public Products',
    eyebrow: 'Open Source',
    summary: 'Selected tools and product experiments that demonstrate execution, safety, and usability.',
  },
  {
    id: 'systems',
    label: 'SYSTEMS',
    title: 'Production Systems',
    eyebrow: 'Architecture',
    summary: 'Legacy modernization, databases, architecture, cloud direction, and real operational constraints.',
  },
  {
    id: 'security',
    label: 'SECURITY',
    title: 'Security Mindset',
    eyebrow: 'Risk Control',
    summary: 'Secure defaults, MFA, rate limiting, validation, and production risk awareness.',
  },
  {
    id: 'research',
    label: 'RESEARCH',
    title: 'Independent Research',
    eyebrow: 'Research',
    summary: 'Work on AI, thought, truth, representation, papers, and long-form writing.',
  },
  {
    id: 'contact',
    label: 'CONTACT',
    title: 'Contact',
    eyebrow: 'Reach Out',
    summary: 'Professional links and contact channels for collaboration and opportunities.',
  },
]
