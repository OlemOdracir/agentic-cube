export type CubeSectionId = 'work' | 'systems' | 'design' | 'contact' | 'about' | 'lab'

export type CubeSection = {
  id: CubeSectionId
  label: string
  title: string
  eyebrow: string
  summary: string
}

export const CUBE_SECTIONS: CubeSection[] = [
  {
    id: 'work',
    label: 'WORK',
    title: 'Selected Work',
    eyebrow: 'Portfolio',
    summary: 'A focused entry point for polished projects, case studies, and measurable outcomes.',
  },
  {
    id: 'systems',
    label: 'SYSTEMS',
    title: 'Systems Thinking',
    eyebrow: 'Architecture',
    summary: 'Backend, cloud, automation, security, and production-minded engineering notes.',
  },
  {
    id: 'design',
    label: 'DESIGN',
    title: 'Agentic Design',
    eyebrow: 'Prototype Lab',
    summary: 'Fast visual experiments, interaction systems, and design decisions shaped with AI agents.',
  },
  {
    id: 'contact',
    label: 'CONTACT',
    title: 'Contact',
    eyebrow: 'Reach Out',
    summary: 'A direct channel for collaborations, opportunities, and focused technical conversations.',
  },
  {
    id: 'about',
    label: 'ABOUT',
    title: 'About Ricardo',
    eyebrow: 'Profile',
    summary: 'A compact professional narrative around learning, execution, and practical AI systems.',
  },
  {
    id: 'lab',
    label: 'LAB',
    title: 'Experimental Lab',
    eyebrow: 'Research',
    summary: 'Small prototypes used to explore interaction, agentic workflows, and production patterns.',
  },
]
