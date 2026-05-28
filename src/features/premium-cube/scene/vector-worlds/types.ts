import type { ComponentType } from 'react'

export type WorldProps = {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  paused?: boolean
}

export type WorldCamera = {
  position: readonly [number, number, number]
  fov: number
  near: number
  far: number
}

export type WorldFog = {
  near: number
  far: number
}

// Showcase config lets the standalone preview (?bg=<id>) override world defaults
// that are tuned for embedded mode inside the cube scene.
export type WorldShowcaseConfig = {
  camera: WorldCamera
  fog: WorldFog
  // Optional target the camera should look at each frame. Useful when a world
  // wants the showcase to tilt up (sky-dominant) instead of looking at origin.
  lookAt?: readonly [number, number, number]
  props?: WorldProps
}

export type WorldEntry = {
  id: string
  label: string
  caption: string
  Component: ComponentType<WorldProps>
  showcase: WorldShowcaseConfig
}
