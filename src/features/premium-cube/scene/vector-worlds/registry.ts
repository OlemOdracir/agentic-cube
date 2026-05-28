import type { CubeSectionId } from '../../cubeSections'
import type { WorldEntry } from './types'
import { AgenticWorld } from './worlds/agenticWorld'
import { ContactWorld } from './worlds/contactWorld'
import { ProductsWorld } from './worlds/productsWorld'
import { ResearchWorld } from './worlds/researchWorld'
import { SecurityWorld } from './worlds/securityWorld'
import { SystemsWorld } from './worlds/systemsWorld'

// Adding a new background = (1) create file in worlds/, (2) register it here.
// Showcase config is used by ?bg=<id> standalone preview. Embedded defaults
// live inside each world component so the cube scene can render them with a
// single <VectorWorldStage activeSectionId={...} />.
export const WORLD_REGISTRY: Record<CubeSectionId, WorldEntry> = {
  agentic: {
    id: 'agentic',
    label: 'AGENTIC PLEXUS',
    caption: 'plexus wave field — signature ambient',
    Component: AgenticWorld,
    showcase: {
      camera: { position: [0, 0.55, 4.6], fov: 48, near: 0.1, far: 80 },
      fog: { near: 9, far: 28 },
      props: { position: [0, -0.8, -1.4], rotation: [-Math.PI / 2.3, 0, 0] },
    },
  },
  products: {
    id: 'products',
    label: 'PRODUCTS GRID',
    caption: 'placeholder — design pending',
    Component: ProductsWorld,
    showcase: {
      camera: { position: [0, 0.55, 4.6], fov: 48, near: 0.1, far: 80 },
      fog: { near: 9, far: 28 },
    },
  },
  systems: {
    id: 'systems',
    label: 'CITY CORRIDOR',
    caption: 'vector street with lamp glow',
    Component: SystemsWorld,
    showcase: {
      camera: { position: [0, 1.9, 10.8], fov: 52, near: 0.1, far: 80 },
      fog: { near: 14, far: 40 },
      props: { position: [0, 0, 0], scale: 1 },
    },
  },
  security: {
    id: 'security',
    label: 'SECURITY LATTICE',
    caption: 'placeholder — design pending',
    Component: SecurityWorld,
    showcase: {
      camera: { position: [0, 0.55, 4.6], fov: 48, near: 0.1, far: 80 },
      fog: { near: 9, far: 28 },
    },
  },
  research: {
    id: 'research',
    label: 'STARLIT NIGHTSCAPE',
    caption: 'low-poly páramo + araucaria silhouettes (stars pending)',
    Component: ResearchWorld,
    showcase: {
      // Wide FOV, slightly elevated, looking toward the mountain horizon so
      // the foreground páramo fills the lower half and peaks dominate the back.
      camera: { position: [0, 1.2, 7.0], fov: 62, near: 0.1, far: 100 },
      fog: { near: 14, far: 58 },
      lookAt: [0, 0.6, -20],
    },
  },
  contact: {
    id: 'contact',
    label: 'CONTACT SIGNAL',
    caption: 'placeholder — design pending',
    Component: ContactWorld,
    showcase: {
      camera: { position: [0, 0.55, 4.6], fov: 48, near: 0.1, far: 80 },
      fog: { near: 9, far: 28 },
    },
  },
}

export function isWorldId(value: string): value is CubeSectionId {
  return value in WORLD_REGISTRY
}
